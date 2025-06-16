/**
 * @fileoverview Edit Question Component for NexPrep Admin Panel
 * @description Comprehensive multilingual question editing interface supporting dynamic content
 * modification, hierarchical categorization updates, and advanced metadata management with
 * real-time preview and validation capabilities.
 * 
 * @module EditQuestionComponent
 * @requires @angular/core
 * @requires @angular/common
 * @requires @angular/forms
 * @requires @angular/router
 * @requires rxjs
 * @requires QuestionService
 * @author NexPrep Development Team
 * @since 1.0.0
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { Question, PopulatedHierarchyField, Translation, Option as QuestionOption, Explanation, NumericalAnswer } from '../../models/question.model'; // Import NumericalAnswer

/**
 * @interface QuestionEditForm
 * @description Extended question interface for edit form operations
 * @property {string} [branchId] - Educational branch identifier
 * @property {string} [subjectId] - Subject identifier within branch
 * @property {string} [topicId] - Topic identifier within subject
 * @property {string} [subTopicId] - Subtopic identifier within topic
 * @property {string} [questionText] - Current language question text
 * @property {QuestionOption[]} options - Answer options for the question
 * @property {NumericalAnswer} [numericalAnswer] - Numerical answer for NAT questions
 * @property {any[]} [appearanceHistory] - History of question appearances
 */
interface QuestionEditForm extends Partial<Question> {
  branchId?: string;
  subjectId?: string;
  topicId?: string;
  subTopicId?: string;
  questionText?: string;
  options: QuestionOption[];
  numericalAnswer?: NumericalAnswer;
  appearanceHistory?: any[];
}

/**
 * @class EditQuestionComponent
 * @description Angular component for editing existing questions with multilingual support.
 * Provides comprehensive editing capabilities including content modification, hierarchy
 * management, translation handling, and metadata updates.
 * 
 * Key Features:
 * - Multilingual content editing (English/Hindi)
 * - Dynamic option management with validation
 * - Hierarchical categorization updates
 * - Image and explanation management
 * - Real-time form validation
 * - Translation switching and management
 * - Question metadata editing
 * 
 * @implements {OnInit}
 * 
 * @example
 * ```typescript
 * // Component handles complete question editing workflow:
 * // 1. Load existing question data by ID
 * // 2. Initialize multilingual translations
 * // 3. Provide dynamic content editing interface
 * // 4. Handle hierarchy cascade updates
 * // 5. Validate and save modifications
 * ```
 */
@Component({
  selector: 'app-edit-question',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-question.component.html',
  styleUrls: ['./edit-question.component.scss'],
})
export class EditQuestionComponent implements OnInit {  /** @private {QuestionService} Service for question CRUD operations */
  private questionService = inject(QuestionService);
  /** @private {ActivatedRoute} Angular router service for accessing route parameters */
  private route = inject(ActivatedRoute);
  /** @private {Router} Angular navigation service for programmatic routing */
  private router = inject(Router);

  /** @property {string} Question ID extracted from route parameters */
  id!: string;
  
  /**
   * @property {QuestionEditForm} Main question object for editing
   * @description Extended question interface with additional UI-specific properties
   * for form binding and hierarchy management
   */  question: QuestionEditForm = {
    translations: [],
    difficulty: '',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
    type: 'single', // Default type
    status: 'Draft', // Default status
    tags: [], // Initialize new field
    recommendedTimeAllotment: undefined, // Initialize new field
    internalNotes: '', // Initialize new field
    numericalAnswer: { minValue: undefined, maxValue: undefined }, // Initialize NAT support
    appearanceHistory: [] // Initialize appearance history
  };
  /** @property {string} String representation of tags for form input binding */
  tagsInputString: string = '';
  /** @property {Object} histEntry - Template for new question history entry */
  histEntry = { title: '', year: new Date().getFullYear() };
  
  /** @property {number} currentYear - Current year for validation */
  currentYear = new Date().getFullYear();

  /** @property {any[]} Available educational branches for selection */
  branches: any[] = [];
  /** @property {any[]} Available subjects filtered by selected branch */
  subjects: any[] = [];
  /** @property {any[]} Available topics filtered by selected subject */
  topics: any[] = [];
  /** @property {any[]} Available subtopics filtered by selected topic */
  subtopics: any[] = [];

  /** @property {boolean} Loading state indicator for async operations */
  isLoading = false;

  /** @property {string} Current active language for translation editing */
  currentLang: string = 'en';
  /** @property {number} Index of current translation being edited */
  currentTranslationIndex: number = 0;
  /** @property {string[]} Available language codes for translation support */
  availableLangs: string[] = ['en', 'hi'];
  /** @property {Explanation[]} Explanations for the current translation */
  currentTranslationExplanations: Explanation[] = [];
  /**
   * @getter currentQuestionImages
   * @description Retrieves images array for the current translation, initializing if undefined
   * @returns {string[]} Array of image URLs for the current translation
   * 
   * @example
   * ```typescript
   * const images = this.currentQuestionImages;
   * // Returns: ['image1.jpg', 'image2.png'] or []
   * ```
   */
  get currentQuestionImages(): string[] {
    if (this.question && this.question.translations && this.question.translations[this.currentTranslationIndex]) {
      if (!this.question.translations[this.currentTranslationIndex].images) {
        this.question.translations[this.currentTranslationIndex].images = []; // Initialize if undefined
      }
      return this.question.translations[this.currentTranslationIndex].images!;
    }
    return [];
  }
  /** @property {string[]} Available question types for selection */
  questionTypes: string[] = ['single', 'multiple', 'integer', 'matrix'];
  /** @property {string[]} Available question status options for workflow management */
  questionStatuses: string[] = ['Draft', 'Published', 'Archived', 'Pending Review', 'active', 'inactive'];

  /**
   * @private
   * @method getHierarchicalId
   * @description Extracts string ID from various hierarchical field formats (string, ObjectId, populated object)
   * @param {string | { $oid: string } | PopulatedHierarchyField | undefined} field - Hierarchical field value
   * @returns {string | undefined} Extracted string ID or undefined if not found
   * 
   * @example
   * ```typescript
   * const id1 = this.getHierarchicalId('507f1f77bcf86cd799439011'); // Returns: '507f1f77bcf86cd799439011'
   * const id2 = this.getHierarchicalId({ $oid: '507f1f77bcf86cd799439011' }); // Returns: '507f1f77bcf86cd799439011'
   * const id3 = this.getHierarchicalId({ _id: '507f1f77bcf86cd799439011', name: 'Branch Name' }); // Returns: '507f1f77bcf86cd799439011'
   * ```
   */
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

  /**
   * @method ngOnInit
   * @description Angular lifecycle hook for component initialization.
   * Extracts question ID from route parameters, loads question data, initializes
   * form state, and sets up hierarchical dropdown dependencies.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Component initialization flow:
   * // 1. Extract question ID from route parameters
   * // 2. Load educational hierarchy (branches)
   * // 3. Load existing question data if editing
   * // 4. Initialize translation management
   * // 5. Set up form validation and dependencies
   * ```
   */

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
          }          this.question = {
            ...data,
            branchId: this.getHierarchicalId(data.branch),
            subjectId: this.getHierarchicalId(data.subject),
            topicId: this.getHierarchicalId(data.topic),
            subTopicId: this.getHierarchicalId(data.subTopic),
            options: [],
            questionText: '',
            tags: data.tags || [], // Load tags
            recommendedTimeAllotment: data.recommendedTimeAllotment, // Load time
            internalNotes: data.internalNotes || '', // Load notes
            numericalAnswer: data.translations?.[0]?.numericalAnswer || { minValue: undefined, maxValue: undefined }, // Load NAT data
            appearanceHistory: data.questionHistory || [] // Load appearance history
          };

          // Debug: Log appearance history data
          console.log('[EditQuestionComponent] Loaded question data:', data);
          console.log('[EditQuestionComponent] Question history from data:', data.questionHistory);
          console.log('[EditQuestionComponent] Final appearanceHistory:', this.question.appearanceHistory);

          if (data.type) this.question.type = data.type;
          if (data.status) this.question.status = data.status;

          // Initialize tagsInputString
          this.tagsInputString = this.question.tags ? this.question.tags.join(', ') : '';

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
      console.log('[EditQuestionComponent] ngOnInit: No ID found, initializing for new question.');      this.question = {
        translations: [{ lang: 'en', questionText: '', options: [{text:'', isCorrect:false},{text:'', isCorrect:false}], explanations: [{ type: 'text', content: '' }], images: [] /* images initialized */ }],
        difficulty: '',
        questionText: '',
        options: [{text:'', isCorrect:false},{text:'', isCorrect:false}],
        type: 'single',
        status: 'Draft',
        tags: [], // Initialize for new question
        recommendedTimeAllotment: undefined, // Initialize for new question
        internalNotes: '', // Initialize for new question
        numericalAnswer: { minValue: undefined, maxValue: undefined }, // Initialize NAT support
        appearanceHistory: [], // Initialize appearance history
        // Initialize other necessary fields from Question model if not covered by Partial<Question>
        branch: undefined, // Or appropriate default
        subject: undefined,
        topic: undefined,
        subTopic: undefined,
        // etc.
      };
      this.tagsInputString = ''; // Initialize for new question
      this.currentLang = 'en';
      this.currentTranslationIndex = 0;
    }
  }
  // ... fetchBranches, fetchSubjects, fetchTopics, fetchSubtopics methods remain similar ...
  // Ensure they are correctly implemented

  /**
   * @method fetchBranches
   * @description Loads available educational branches from the backend service
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.fetchBranches();
   * // Populates this.branches with available educational branches
   * ```
   */
  fetchBranches() {
    this.questionService.getBranches().subscribe({
      next: data => this.branches = Array.isArray(data) ? data : data.branches || [],
      error: err => console.error('Error fetching branches:', err)
    });
  }

  /**
   * @method fetchSubjects
   * @description Loads subjects for a specific branch from the backend service
   * @param {string} branchId - The branch ID to fetch subjects for
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.fetchSubjects('507f1f77bcf86cd799439011');
   * // Populates this.subjects with subjects for the specified branch
   * ```
   */
  fetchSubjects(branchId: string) {
    if (!branchId) return;
    this.questionService.getSubjects(branchId).subscribe({
      next: data => this.subjects = data.subjects || data || [],
      error: err => console.error('Error fetching subjects:', err)
    });
  }

  /**
   * @method fetchTopics
   * @description Loads topics for a specific subject from the backend service
   * @param {string} subjectId - The subject ID to fetch topics for
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.fetchTopics('507f1f77bcf86cd799439012');
   * // Populates this.topics with topics for the specified subject
   * ```
   */
  fetchTopics(subjectId: string) {
    if (!subjectId) return;
    this.questionService.getTopics(subjectId).subscribe({
      next: data => this.topics = data.topics || data || [],
      error: err => console.error('Error fetching topics:', err)
    });
  }
  /**
   * @method fetchSubtopics
   * @description Loads subtopics for a specific topic from the backend service
   * @param {string} topicId - The topic ID to fetch subtopics for
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.fetchSubtopics('507f1f77bcf86cd799439013');
   * // Populates this.subtopics with subtopics for the specified topic
   * ```
   */
  fetchSubtopics(topicId: string) {
    if(!topicId) return;
    this.questionService.getSubtopics(topicId).subscribe({
      next: data => this.subtopics = data.subtopics || data || [],
      error: err => console.error('Error fetching subtopics:', err)
    });
  }
  
  /**
   * @method onBranchChange
   * @description Handles educational branch selection change, resets dependent dropdowns and loads subjects
   * @param {string} branchIdValue - Selected branch ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.onBranchChange('507f1f77bcf86cd799439011');
   * // Clears subjects, topics, subtopics and loads new subjects for branch
   * ```
   */
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

  /**
   * @method onSubjectChange
   * @description Handles subject selection change, resets dependent dropdowns and loads topics
   * @param {string} subjectIdValue - Selected subject ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.onSubjectChange('507f1f77bcf86cd799439012');
   * // Clears topics, subtopics and loads new topics for subject
   * ```
   */
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

  /**
   * @method onTopicChange
   * @description Handles topic selection change, resets subtopic dropdown and loads subtopics
   * @param {string} topicIdValue - Selected topic ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.onTopicChange('507f1f77bcf86cd799439013');
   * // Clears subtopics and loads new subtopics for topic
   * ```
   */
  onTopicChange(topicIdValue: string) {
    this.question.topicId = topicIdValue;
    this.question.subTopicId = undefined;
    this.subtopics = [];
    if (topicIdValue) {
      this.fetchSubtopics(topicIdValue);
    }
  }
  /**
   * @method onSubtopicChange
   * @description Handles subtopic selection change, updates question's subtopic ID
   * @param {string} subtopicIdValue - Selected subtopic ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.onSubtopicChange('507f1f77bcf86cd799439014');
   * // Sets question's subtopic ID to selected value
   * ```
   */
  onSubtopicChange(subtopicIdValue: string) { // Name from original file was onSubtopicChange
    this.question.subTopicId = subtopicIdValue;
  }

  /**
   * @method onTagsInputChange
   * @description Handles changes to the tags input string, parsing comma-separated values into tags array
   * @param {string} value - Comma-separated tags string from input field
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.onTagsInputChange('physics, mechanics, kinematics');
   * // Updates question.tags to ['physics', 'mechanics', 'kinematics']
   * ```
   */
  onTagsInputChange(value: string): void {
    this.tagsInputString = value; // Keep the input field's value as is
    if (value && value.trim() !== '') {
      this.question.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    } else {
      this.question.tags = [];
    }  }

  /**
   * @method switchLanguage
   * @description Switches the editing interface to a different language translation,
   * saving current translation state and loading the target language content
   * @param {string} lang - Language code to switch to (e.g., 'en', 'hi')
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.switchLanguage('hi');
   * // Saves current English content and loads Hindi translation for editing
   * ```
   */
  switchLanguage(lang: string): void {
    const newIndex = this.question.translations?.findIndex(t => t.lang === lang);
    if (newIndex !== undefined && newIndex !== -1) {      // Save current flat data to the old language's translation object
      const oldTranslation = this.question.translations![this.currentTranslationIndex];
      oldTranslation.questionText = this.question.questionText || '';
      
      // Handle options vs numerical answers based on question type
      if (this.isNumericalQuestionType()) {
        oldTranslation.options = []; // Clear options for NAT questions
        oldTranslation.numericalAnswer = this.question.numericalAnswer; // Set numerical answer
      } else {
        oldTranslation.options = this.question.options || [];
        oldTranslation.numericalAnswer = undefined; // Clear numerical answer for non-NAT questions
      }
      
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
      });      this.question.questionText = newTranslation.questionText;
      
      // Load options or numerical answer based on question type and translation data
      if (this.isNumericalQuestionType()) {
        this.question.numericalAnswer = newTranslation.numericalAnswer || { minValue: undefined, maxValue: undefined };
        this.question.options = []; // Clear options for NAT questions
      } else {
        this.question.options = newTranslation.options || [{ text: '', isCorrect: false }, { text: '', isCorrect: false }];
        this.question.numericalAnswer = { minValue: undefined, maxValue: undefined }; // Clear numerical answer for non-NAT questions
      }
      
      // UPDATED: Load full explanation structure
      this.currentTranslationExplanations = newTranslation.explanations.map(ex => ({
        type: ex.type || 'text',
        label: ex.label || '',
        content: ex.content || ''
      }));

    } else {
      // If language doesn't exist, add it
      this.addTranslation(lang);
    }  }

  /**
   * @method addTranslation
   * @description Adds a new language translation to the question, saving current state
   * and initializing empty content for the new language
   * @param {string} lang - Language code for the new translation (e.g., 'hi', 'es')
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.addTranslation('hi');
   * // Adds Hindi translation with empty content and switches to it
   * ```
   */
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
    }  }

  /**
   * @method addExplanation
   * @description Adds a new explanation entry to the current translation
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.addExplanation();
   * // Adds a new explanation with default 'text' type and empty content
   * ```
   */
  addExplanation(): void {
    this.currentTranslationExplanations.push({ type: 'text', content: '' }); // Add new Explanation object
  }

  /**
   * @method removeExplanation
   * @description Removes an explanation entry from the current translation
   * @param {number} index - Index of the explanation to remove
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.removeExplanation(1);
   * // Removes the explanation at index 1
   * ```
   */
  removeExplanation(index: number): void {
    if (this.currentTranslationExplanations.length > 0) {
      this.currentTranslationExplanations.splice(index, 1);
    }
  }

  /**
   * @method addQuestionImage
   * @description Adds a new image URL placeholder to the current translation
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.addQuestionImage();
   * // Adds an empty image URL to the current translation's images array
   * ```
   */
  addQuestionImage(): void {
    if (this.question && this.question.translations && this.question.translations[this.currentTranslationIndex]) {
      if (!this.question.translations[this.currentTranslationIndex].images) {
        this.question.translations[this.currentTranslationIndex].images = [];
      }
      this.question.translations[this.currentTranslationIndex].images!.push('');
    }
  }
  /**
   * @method removeQuestionImage
   * @description Removes an image URL from the current translation's images array
   * @param {number} imgIndex - Index of the image to remove from the array
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.removeQuestionImage(0);
   * // Removes the first image from the current translation
   * ```
   */
  removeQuestionImage(imgIndex: number): void {
    if (this.question && this.question.translations && this.question.translations[this.currentTranslationIndex] && this.question.translations[this.currentTranslationIndex].images) {
      this.question.translations[this.currentTranslationIndex].images!.splice(imgIndex, 1);
    }
  }
  /**
   * @method removeOptionImage
   * @description Removes/clears the image from a specific option by setting it to empty string
   * @param {number} optionIndex - Index of the option to remove the image from
   * @returns {void}
   * 
   * @example
   * ```typescript
   * this.removeOptionImage(1);
   * // Clears the image from the second option (index 1)
   * ```
   */
  // ADDED: Method to manage option image (sets to empty string for now)
  removeOptionImage(optionIndex: number): void {
    if (this.question && this.question.options && this.question.options[optionIndex]) {
      this.question.options[optionIndex].img = '';
    }  }

  /**
   * @method isNumericalQuestionType
   * @description Checks if the current question type requires numerical answers
   * @returns {boolean} True if the question type is integer/NAT
   */
  isNumericalQuestionType(): boolean {
    return this.question.type === 'integer';
  }  /**
   * @method addAppearanceHistory
   * @description Adds a new appearance history entry from histEntry to question.appearanceHistory
   * @returns {void}
   */
  addAppearanceHistory(): void {
    console.log('[EditQuestionComponent] Adding appearance history:', this.histEntry);
    
    if (!this.question.appearanceHistory) {
      this.question.appearanceHistory = [];
    }
    
    if (this.histEntry.title.trim()) {
      // Convert to database format: title and askedAt (date from year)
      const newEntry = {
        title: this.histEntry.title,
        askedAt: new Date(this.histEntry.year, 0, 1).toISOString() // January 1st of the year
      };
      this.question.appearanceHistory.push(newEntry);
      console.log('[EditQuestionComponent] Updated appearanceHistory:', this.question.appearanceHistory);
      this.histEntry = { title: '', year: this.currentYear };
    } else {
      console.log('[EditQuestionComponent] Cannot add empty exam title');
    }
  }

  /**
   * @method removeAppearanceHistory
   * @description Removes an appearance history entry
   * @param {number} index - Index of the history entry to remove
   * @returns {void}
   */
  removeAppearanceHistory(index: number): void {
    if (this.question.appearanceHistory && this.question.appearanceHistory.length > 0) {
      this.question.appearanceHistory.splice(index, 1);
    }
  }

  /**
   * @method save
   * @description Saves the question by validating form data and sending to backend service
   * @param {NgForm} form - Angular form reference for validation
   * @returns {void}
   * 
   * @description
   * This method handles both creating new questions and updating existing ones:
   * - Validates form data and marks all fields as touched if invalid
   * - Updates the current translation with form-bound properties
   * - Prepares payload with all question data including hierarchy, translations, and metadata
   * - Calls appropriate service method based on whether editing (this.id exists) or creating
   * - Handles success/error responses and navigates back to questions list
   * 
   * @example
   * ```typescript
   * // Called from template on form submission
   * this.save(questionForm);
   * // Validates and saves the question, then navigates to questions list
   * ```
   */
  save(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }    // Ensure the current translation in this.question.translations is updated
    // from the flat form-bound properties (questionText, options, explanation)
    if (this.question.translations && this.question.translations[this.currentTranslationIndex]) {
      const translationToUpdate = this.question.translations[this.currentTranslationIndex];
      translationToUpdate.questionText = this.question.questionText || '';
      
      // Handle options vs numerical answers based on question type
      if (this.isNumericalQuestionType()) {
        translationToUpdate.options = []; // Clear options for NAT questions
        translationToUpdate.numericalAnswer = this.question.numericalAnswer; // Set numerical answer
      } else {
        translationToUpdate.options = this.question.options || [];
        translationToUpdate.numericalAnswer = undefined; // Clear numerical answer for non-NAT questions
      }
      
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
      // REMOVED: version: this.question.version, // Let backend handle version increment      // ADDED: New fields to payload
      tags: this.question.tags,
      recommendedTimeAllotment: this.question.recommendedTimeAllotment,
      internalNotes: this.question.internalNotes,
      questionHistory: this.question.appearanceHistory // Add appearance history to payload
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
  /**
   * @method cancel
   * @description Cancels the current edit operation and navigates back to questions list
   * @returns {void}
   * 
   * @description
   * This method provides a way to exit the edit form without saving changes.
   * All unsaved changes will be lost when navigating away.
   * 
   * @example
   * ```typescript
   * this.cancel();
   * // Navigates back to /questions route, discarding any unsaved changes
   * ```
   */
  cancel() {
    this.router.navigate(['/questions']);
  }
  /**
   * @method addOption
   * @description Adds a new blank option to the current language's options array
   * @returns {void}
   * 
   * @description
   * Creates a new option with empty text and isCorrect set to false.
   * Ensures the options array exists before adding the new option.
   * 
   * @example
   * ```typescript
   * this.addOption();
   * // Adds a new option: { text: '', isCorrect: false }
   * ```
   */
  /** Add a new blank option to the current language's options */
  addOption() {
    // Ensure this.question.options is always an array before pushing
    if (!this.question.options) {
      this.question.options = [];
    }
    this.question.options.push({ text: '', isCorrect: false });
  }
  /**
   * @method removeOption
   * @description Removes an option from the current language's options array
   * @param {number} index - Index of the option to remove
   * @returns {void}
   * 
   * @description
   * Removes an option at the specified index while maintaining a minimum of 2 options.
   * This ensures that multiple choice questions always have at least 2 answer choices.
   * 
   * @example
   * ```typescript
   * this.removeOption(2);
   * // Removes the option at index 2, if more than 2 options exist
   * ```
   */
  /** Remove an option, leave at least two */
  removeOption(index: number) {
    // Ensure this.question.options is defined and is an array
    if (this.question.options && this.question.options.length > 2) {
      this.question.options.splice(index, 1);
    }
  }
}
