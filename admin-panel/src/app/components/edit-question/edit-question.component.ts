import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { Question, PopulatedHierarchyField, Translation, Option as QuestionOption } from '../../models/question.model'; // IMPORT Question model

@Component({
  selector: 'app-edit-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-question.component.html',
  styleUrls: ['./edit-question.component.scss'],
})
export class EditQuestionComponent implements OnInit {
  private questionService = inject(QuestionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  id!: string;
  // MODIFIED: Ensure options is non-optional in the binding part of the type and initialized
  question: Partial<Question> & {
    branchId?: string;
    subjectId?: string;
    topicId?: string;
    subTopicId?: string;
    questionText?: string;
    options: QuestionOption[]; // Made non-optional for form binding
    explanation?: string;
  } = {
    translations: [], 
    difficulty: '',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], // Initialize options
    // Initialize other Question fields as needed, ensure type and status are handled
    type: 'MCQ', // Default type
    status: 'Draft' // Default status
  };

  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  subtopics: any[] = [];

  isLoading = false;

  // ADDED: Basic language handling (to be expanded)
  currentLang: string = 'en';
  currentTranslationIndex: number = 0;
  availableLangs: string[] = ['en', 'hi']; // Example, can be dynamic

  // ADDED: Helper to get ID from hierarchical fields
  private getHierarchicalId(field: string | { $oid: string } | PopulatedHierarchyField | undefined): string | undefined {
    if (!field) { return undefined; }
    if (typeof field === 'string') { return field; } // Already an ID
    if ((field as { $oid: string }).$oid) { return (field as { $oid: string }).$oid; } // MongoDB $oid object
    if ((field as PopulatedHierarchyField)._id) { // Populated object
      const idField = (field as PopulatedHierarchyField)._id;
      return typeof idField === 'string' ? idField : idField.$oid;
    }
    return undefined;
  }

  ngOnInit() {
    this.fetchBranches();
    this.id = this.route.snapshot.paramMap.get('id')!;
    if (this.id) { // Editing an existing question
      this.questionService.getQuestionById(this.id).subscribe({
        next: (data: Question) => {
          this.question = {
            ...data, 
            branchId: this.getHierarchicalId(data.branch),
            subjectId: this.getHierarchicalId(data.subject),
            topicId: this.getHierarchicalId(data.topic),
            subTopicId: this.getHierarchicalId(data.subTopic),
            // Ensure options is initialized even if data.translations is empty or first translation has no options
            options: [], // Will be populated below
            questionText: '', // Will be populated below
            explanation: '' // Will be populated below
          };

          if (!this.question.translations || this.question.translations.length === 0) {
            this.question.translations = [{ lang: 'en', questionText: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], explanations: [] }];
          }
          this.currentLang = this.question.translations[0]?.lang || 'en';
          this.currentTranslationIndex = this.question.translations.findIndex(t => t.lang === this.currentLang);
          if (this.currentTranslationIndex === -1) {
            this.currentTranslationIndex = 0;
             // Ensure a default translation exists if findIndex fails (e.g. currentLang not in translations)
            if (!this.question.translations[this.currentTranslationIndex]) {
                 this.question.translations.push({ lang: this.currentLang, questionText: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], explanations: [] });
            }
          }

          const currentTranslationData = this.question.translations[this.currentTranslationIndex];
          this.question.questionText = currentTranslationData?.questionText || '';
          this.question.options = currentTranslationData?.options && currentTranslationData.options.length > 0 ? currentTranslationData.options : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
          
          const currentExplanations = currentTranslationData?.explanations;
          this.question.explanation = (currentExplanations && currentExplanations.length > 0 && currentExplanations[0].text) ? currentExplanations[0].text : '';

          if (this.question.branchId) this.fetchSubjects(this.question.branchId);
          if (this.question.subjectId) this.fetchTopics(this.question.subjectId);
          if (this.question.topicId) this.fetchSubtopics(this.question.topicId);
        },
        error: err => console.error('Error loading question:', err)
      });
    } else { // Creating a new question
      this.question = {
        translations: [{ lang: 'en', questionText: '', options: [{text:'', isCorrect:false},{text:'', isCorrect:false}], explanations: [] }],
        difficulty: '',
        questionText: '', 
        options: [{text:'', isCorrect:false},{text:'', isCorrect:false}], 
        explanation: '', 
        type: 'MCQ', 
        status: 'Draft',
        // Initialize other necessary fields from Question model if not covered by Partial<Question>
        branch: undefined, // Or appropriate default
        subject: undefined,
        topic: undefined,
        subTopic: undefined,
        // etc.
      };
      this.currentLang = 'en';
      this.currentTranslationIndex = 0;
    }
  }

  // ... fetchBranches, fetchSubjects, fetchTopics, fetchSubtopics methods remain similar ...
  // Ensure they are correctly implemented

  fetchBranches() {
    this.questionService.getBranches().subscribe({
      next: data => this.branches = Array.isArray(data) ? data : data.branches || [],
      error: err => console.error('Error fetching branches:', err)
    });
  }

  fetchSubjects(branchId: string) {
    if (!branchId) return;
    this.questionService.getSubjects(branchId).subscribe({
      next: data => this.subjects = data.subjects || data || [],
      error: err => console.error('Error fetching subjects:', err)
    });
  }

  fetchTopics(subjectId: string) {
    if (!subjectId) return;
    this.questionService.getTopics(subjectId).subscribe({
      next: data => this.topics = data.topics || data || [],
      error: err => console.error('Error fetching topics:', err)
    });
  }

  fetchSubtopics(topicId: string) {
    if(!topicId) return;
    this.questionService.getSubtopics(topicId).subscribe({
      next: data => this.subtopics = data.subtopics || data || [],
      error: err => console.error('Error fetching subtopics:', err)
    });
  }
  
  // MODIFIED: Event handlers for dropdowns
  onBranchChange(branchIdValue: string) {
    this.question.branchId = branchIdValue;
    this.question.subjectId = undefined;
    this.question.topicId = undefined;
    this.question.subTopicId = undefined;
    this.subjects = [];
    this.topics = [];
    this.subtopics = [];
    if (branchIdValue) {
      this.fetchSubjects(branchIdValue);
    }
  }

  onSubjectChange(subjectIdValue: string) {
    this.question.subjectId = subjectIdValue;
    this.question.topicId = undefined;
    this.question.subTopicId = undefined;
    this.topics = [];
    this.subtopics = [];
    if (subjectIdValue) {
      this.fetchTopics(subjectIdValue);
    }
  }

  onTopicChange(topicIdValue: string) {
    this.question.topicId = topicIdValue;
    this.question.subTopicId = undefined;
    this.subtopics = [];
    if (topicIdValue) {
      this.fetchSubtopics(topicIdValue);
    }
  }

  onSubtopicChange(subtopicIdValue: string) { // Name from original file was onSubtopicChange
    this.question.subTopicId = subtopicIdValue;
  }

  // ADDED: Basic language switching logic
  switchLanguage(lang: string): void {
    const newIndex = this.question.translations?.findIndex(t => t.lang === lang);
    if (newIndex !== undefined && newIndex !== -1) {
      // Save current flat data to the old language's translation object
      const oldTranslation = this.question.translations![this.currentTranslationIndex];
      oldTranslation.questionText = this.question.questionText || '';
      oldTranslation.options = this.question.options || [];
      if (this.question.explanation) {
        oldTranslation.explanations = [{ text: this.question.explanation }]; // Basic handling
      } else {
        oldTranslation.explanations = [];
      }

      this.currentLang = lang;
      this.currentTranslationIndex = newIndex;
      
      // Load flat data from the new language's translation object
      const newTranslation = this.question.translations![this.currentTranslationIndex];
      this.question.questionText = newTranslation.questionText;
      this.question.options = newTranslation.options;
      this.question.explanation = (newTranslation.explanations && newTranslation.explanations.length > 0 && newTranslation.explanations[0].text) ? newTranslation.explanations[0].text : '';

    } else {
      // If language doesn't exist, add it
      this.addTranslation(lang);
    }
  }

  addTranslation(lang: string): void {
    if (!this.question.translations) this.question.translations = [];
    if (!this.question.translations.find(t => t.lang === lang)) {
      // Save current state before switching
       if (this.question.translations[this.currentTranslationIndex]) {
        const oldTranslation = this.question.translations[this.currentTranslationIndex];
        oldTranslation.questionText = this.question.questionText || '';
        oldTranslation.options = this.question.options || [];
        if (this.question.explanation) {
            oldTranslation.explanations = [{ text: this.question.explanation }];
        } else {
            oldTranslation.explanations = [];
        }
      }
      
      this.question.translations.push({
        lang: lang,
        questionText: '', // New translation starts blank
        options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
        explanations: []
      });
      this.currentLang = lang;
      this.currentTranslationIndex = this.question.translations.length - 1;
      // Clear flat fields for the new language
      this.question.questionText = '';
      this.question.options = [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
      this.question.explanation = '';
    }
  }


  save(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    // Ensure the current translation in this.question.translations is updated
    // from the flat form-bound properties (questionText, options, explanation)
    if (this.question.translations && this.question.translations[this.currentTranslationIndex]) {
      const translationToUpdate = this.question.translations[this.currentTranslationIndex];
      translationToUpdate.questionText = this.question.questionText || '';
      translationToUpdate.options = this.question.options || [];
      // CORRECTED: Handle explanations array
      if (this.question.explanation) {
        // Assuming explanation is a single text, store it in the first explanation object
        if (!translationToUpdate.explanations || translationToUpdate.explanations.length === 0) {
            translationToUpdate.explanations = [{ text: this.question.explanation }]; // Create new if none
        } else {
            translationToUpdate.explanations[0].text = this.question.explanation; // Update existing
        }
      } else {
        translationToUpdate.explanations = []; // Clear if form explanation is empty
      }
    }

    const payload: Partial<Question> = {
      // _id should be handled by the service (present for update, absent for create)
      // If this.id is set, it's an update. The service method takes id as a separate param.
      translations: this.question.translations,
      difficulty: this.question.difficulty,
      branch: this.question.branchId,
      subject: this.question.subjectId,
      topic: this.question.topicId,
      subTopic: this.question.subTopicId, // CORRECTED: subTopic
      type: this.question.type, // Ensure type and status are part of the form and this.question
      status: this.question.status,
      version: this.question.version, // Include version if it's managed
      // Top-level explanations if your backend also uses them separately from translations
      // explanations: this.question.explanation ? [{ text: this.question.explanation }] : [], 
    };
    
    if (this.id) { // If updating, include _id in payload if backend expects it, otherwise service handles it via URL
        payload._id = this.id; 
    }


    this.isLoading = true;
    const saveObservable = this.id 
      ? this.questionService.updateQuestion(this.id, payload as Question)
      : this.questionService.addQuestion(payload as Question); // Assuming addQuestion service method

    saveObservable
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response: any) => { // response might be Question or simple message
          alert(`Question ${this.id ? 'updated' : 'added'} successfully!`);
          this.router.navigate(['/questions']);
        },
        error: (err) => {
            console.error(`Failed to ${this.id ? 'update' : 'add'} question:`, err);
            alert(`Failed to ${this.id ? 'update' : 'add'} question.`);
        }
      });
  }

  cancel() {
    this.router.navigate(['/questions']);
  }

  /** Add a new blank option to the current language's options */
  addOption() {
    // Ensure this.question.options is always an array before pushing
    if (!this.question.options) {
      this.question.options = [];
    }
    this.question.options.push({ text: '', isCorrect: false });
  }

  /** Remove an option, leave at least two */
  removeOption(index: number) {
    // Ensure this.question.options is defined and is an array
    if (this.question.options && this.question.options.length > 2) {
      this.question.options.splice(index, 1);
    }
  }
}
