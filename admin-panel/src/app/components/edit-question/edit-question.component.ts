import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { Question, PopulatedHierarchyField, Translation, Option as QuestionOption, Explanation } from '../../models/question.model'; // IMPORT Question model AND Explanation model

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
  question: Partial<Question> & {
    branchId?: string;
    subjectId?: string;
    topicId?: string;
    subTopicId?: string;
    questionText?: string;
    options: QuestionOption[];
    // type and status are already part of Question model
  } = {
    translations: [],
    difficulty: '',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
    type: 'MCQ', // Default type
    status: 'Draft' // Default status
  };

  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  subtopics: any[] = [];

  isLoading = false;

  currentLang: string = 'en';
  currentTranslationIndex: number = 0;
  availableLangs: string[] = ['en', 'hi'];
  currentTranslationExplanations: Explanation[] = []; // UPDATED type

  // ADDED: Ensure question.translations[currentTranslationIndex] is defined before accessing images
  get currentQuestionImages(): string[] {
    if (this.question && this.question.translations && this.question.translations[this.currentTranslationIndex]) {
      if (!this.question.translations[this.currentTranslationIndex].images) {
        this.question.translations[this.currentTranslationIndex].images = []; // Initialize if undefined
      }
      return this.question.translations[this.currentTranslationIndex].images!;
    }
    return [];
  }

  // ADDED: questionTypes and questionStatuses (extended with values from sample data)
  questionTypes: string[] = ['MCQ', 'SA', 'LA', 'FITB', 'Matrix', 'single', 'multiple']; // Added 'single', 'multiple'
  questionStatuses: string[] = ['Draft', 'Published', 'Archived', 'Pending Review', 'active', 'inactive']; // Added 'active', 'inactive'


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
    console.log('[EditQuestionComponent] ngOnInit: Component initializing.');
    console.log('[EditQuestionComponent] ngOnInit: Route snapshot:', this.route.snapshot);
    this.id = this.route.snapshot.paramMap.get('id')!;
    console.log('[EditQuestionComponent] ngOnInit: Extracted question ID:', this.id);

    this.fetchBranches();
    if (this.id) { // Editing an existing question
      console.log('[EditQuestionComponent] ngOnInit: Attempting to load question with ID:', this.id);
      this.questionService.getQuestionById(this.id).subscribe({
        next: (data: Question) => {
          console.log('[EditQuestionComponent] ngOnInit: Successfully loaded question data:', data);

          // Ensure all translations in data have an initialized images array.
          // This modifies 'data' in place before spreading.
          if (data.translations) {
            data.translations.forEach(t => {
              if (t.images === undefined) {
                t.images = [];
              }
            });
          } else {
            // If data.translations is null or undefined, make it an empty array before spreading.
            data.translations = [];
          }

          this.question = {
            ...data, 
            branchId: this.getHierarchicalId(data.branch),
            subjectId: this.getHierarchicalId(data.subject),
            topicId: this.getHierarchicalId(data.topic),
            subTopicId: this.getHierarchicalId(data.subTopic),
            options: [], 
            questionText: '',
          };

          if (data.type) this.question.type = data.type;
          if (data.status) this.question.status = data.status;

          if (this.question.translations!.length === 0) { 
            this.question.translations = [{
              lang: 'en', 
              questionText: '', 
              options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }], 
              explanations: [{ type: 'text', content: '' }], // Initialize with default explanation structure
              images: [] 
            }];
          }
          // Ensure all translations have explanations initialized if they are undefined
          this.question.translations?.forEach(t => {
            if (t.explanations === undefined) {
              t.explanations = [{ type: 'text', content: '' }];
            } else if (t.explanations.length === 0) {
              t.explanations.push({ type: 'text', content: '' });
            }
            // Ensure each explanation has all required fields
            t.explanations.forEach(ex => {
              if (!ex.type) ex.type = 'text';
              if (ex.content === undefined) ex.content = '';
            });
          });

          this.currentLang = this.question.translations![0]!.lang || 'en';
          this.currentTranslationIndex = this.question.translations!.findIndex(t => t.lang === this.currentLang);
          
          if (this.currentTranslationIndex === -1) {
            this.currentTranslationIndex = 0;
            // Default to index 0; translation at this index is guaranteed to exist 
            // and have .images initialized from the logic above.
          }
          // No need to re-initialize images for translations[currentTranslationIndex] here.

          const currentTranslationData = this.question.translations![this.currentTranslationIndex]!;
          this.question.questionText = currentTranslationData.questionText || '';
          this.question.options = currentTranslationData?.options && currentTranslationData.options.length > 0 ? currentTranslationData.options : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
          
          // UPDATED: Initialize currentTranslationExplanations with full structure
          this.currentTranslationExplanations = currentTranslationData?.explanations?.map(ex => ({
            type: ex.type || 'text',
            label: ex.label || '',
            content: ex.content || ''
          })) || [{ type: 'text', content: '' }];

          if (this.question.branchId) this.fetchSubjects(this.question.branchId);
          if (this.question.subjectId) this.fetchTopics(this.question.subjectId);
          if (this.question.topicId) this.fetchSubtopics(this.question.topicId);
        },
        error: err => {
          console.error('[EditQuestionComponent] ngOnInit: Error loading question:', err);
          // Potentially redirect or show error message if question load fails
          // For now, just logging. If this error occurs, it might be related to the redirect.
        }
      });
    } else { // Creating a new question
      console.log('[EditQuestionComponent] ngOnInit: No ID found, initializing for new question.');
      this.question = {
        translations: [{ lang: 'en', questionText: '', options: [{text:'', isCorrect:false},{text:'', isCorrect:false}], explanations: [{ type: 'text', content: '' }], images: [] /* images initialized */ }],
        difficulty: '',
        questionText: '', 
        options: [{text:'', isCorrect:false},{text:'', isCorrect:false}], 
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
      oldTranslation.explanations = this.currentTranslationExplanations.map(ex => ({ // Map to full Explanation structure
        type: ex.type || 'text',
        label: ex.label,
        content: ex.content
      }));
      // oldTranslation.images is already managed as part of this.question.translations

      this.currentLang = lang;
      this.currentTranslationIndex = newIndex;
      
      const newTranslation = this.question.translations![this.currentTranslationIndex];
      // Ensure .images is an array for the new translation (should be by now if loaded/added correctly)
      if (newTranslation.images === undefined) { 
        newTranslation.images = [];
      }
      // Ensure .explanations is an array and items have correct structure
      if (newTranslation.explanations === undefined || newTranslation.explanations.length === 0) { 
        newTranslation.explanations = [{ type: 'text', content: '' }];
      }
      newTranslation.explanations.forEach(ex => {
        if(!ex.type) ex.type = 'text';
        if(ex.content === undefined) ex.content = '';
      });

      this.question.questionText = newTranslation.questionText;
      this.question.options = newTranslation.options;
      // UPDATED: Load full explanation structure
      this.currentTranslationExplanations = newTranslation.explanations.map(ex => ({
        type: ex.type || 'text',
        label: ex.label || '',
        content: ex.content || ''
      }));

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
        oldTranslation.explanations = this.currentTranslationExplanations.map(ex => ({ // Map to full Explanation structure
          type: ex.type || 'text',
          label: ex.label,
          content: ex.content
        }));
        // oldTranslation.images are part of the translation object itself
      }
      
      this.question.translations.push({
        lang: lang,
        questionText: '', 
        options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
        explanations: [{ type: 'text', content: '' }], // Initialize with default explanation structure
        images: [] 
      });
      this.currentLang = lang;
      this.currentTranslationIndex = this.question.translations.length - 1;
      // Clear flat fields for the new language
      this.question.questionText = '';
      this.question.options = [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
      this.currentTranslationExplanations = [{ type: 'text', content: '' }]; // Initialize with default explanation structure
    }
  }

  // UPDATED: Methods to manage explanations for the current translation
  addExplanation(): void {
    this.currentTranslationExplanations.push({ type: 'text', content: '' }); // Add new Explanation object
  }

  removeExplanation(index: number): void {
    if (this.currentTranslationExplanations.length > 0) {
      this.currentTranslationExplanations.splice(index, 1);
    }
  }

  // ADDED: Methods to manage question images for the current translation
  addQuestionImage(): void {
    if (this.question && this.question.translations && this.question.translations[this.currentTranslationIndex]) {
      if (!this.question.translations[this.currentTranslationIndex].images) {
        this.question.translations[this.currentTranslationIndex].images = [];
      }
      this.question.translations[this.currentTranslationIndex].images!.push('');
    }
  }

  removeQuestionImage(imgIndex: number): void {
    if (this.question && this.question.translations && this.question.translations[this.currentTranslationIndex] && this.question.translations[this.currentTranslationIndex].images) {
      this.question.translations[this.currentTranslationIndex].images!.splice(imgIndex, 1);
    }
  }

  // ADDED: Method to manage option image (sets to empty string for now)
  removeOptionImage(optionIndex: number): void {
    if (this.question && this.question.options && this.question.options[optionIndex]) {
      this.question.options[optionIndex].img = '';
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
      // UPDATED: Handle explanations array with full structure
      translationToUpdate.explanations = this.currentTranslationExplanations.map(ex => ({
        type: ex.type || 'text',
        label: ex.label,
        content: ex.content
      }));
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
