/**
 * @fileoverview Add Question Component for NexPrepAI Admin Panel
 * @description Comprehensive multilingual question creation interface supporting English and Hindi
 * translations with advanced features including multiple choice options, explanations, images,
 * hierarchical categorization, and metadata management.
 * 
 * @module AddQuestionComponent
 * @requires @angular/core
 * @requires @angular/common
 * @requires @angular/forms
 * @requires @angular/router
 * @requires BranchService
 * @requires SubjectService
 * @requires TopicService
 * @requires SubtopicService
 * @requires QuestionService
 * @author NexPrepAI Development Team
 * @since 1.0.0
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule }              from '@angular/common';
import { FormsModule, NgForm }       from '@angular/forms';
import { RouterModule }              from '@angular/router';
import { Router, ActivatedRoute }    from '@angular/router';

import { BranchService }   from '../../services/branch.service';
import { SubjectService }  from '../../services/subject.service';
import { TopicService }    from '../../services/topic.service';
import { SubtopicService } from '../../services/subtopic.service';
import { QuestionService } from '../../services/question.service';
import { ImageUploadService, ImageUploadRequest } from '../../services/image-upload.service';
import { MathDisplayComponent } from '../math-display/math-display.component';
import { AuthService }     from '../../services/auth.service'; // Added AuthService

/**
 * @typedef {('en'|'hi')} LangCode
 * @description Supported language codes for question translations
 */
type LangCode = 'en' | 'hi';

/**
 * @interface Option
 * @description Structure for multiple choice question options
 * @property {string} text - The option text content
 * @property {string} img - Optional image URL for the option
 * @property {boolean} isCorrect - Whether this option is the correct answer
 */
interface Option   { text: string; img: string; isCorrect: boolean; }

/**
 * @interface Explain
 * @description Structure for question explanations
 * @property {string} type - Type of explanation (text, image, video, etc.)
 * @property {string} label - Label or title for the explanation
 * @property {string} content - The explanation content
 */
interface Explain  { type: string; label: string; content: string; }

/**
 * @interface LangPack
 * @description Language-specific content package for multilingual questions
 * @property {string} questionText - The question text in specific language
 * @property {Option[]} options - Array of answer options for the question
 * @property {Explain[]} explanations - Array of explanations for the question
 * @property {string[]} [images] - Optional array of image URLs related to the question
 */
interface LangPack { questionText: string; options: Option[]; explanations: Explain[]; images?: string[]; }

/**
 * @class AddQuestionComponent
 * @description Comprehensive component for creating new questions with multilingual support.
 * Provides an interface for content creators and educators to add detailed questions with
 * multiple choice options, explanations, images, and hierarchical categorization across
 * educational branches, subjects, topics, and subtopics.
 * 
 * @implements {OnInit}
 * 
 * Key Features:
 * - Multilingual question creation (English/Hindi)
 * - Multiple choice options with image support
 * - Rich explanations with various content types
 * - Hierarchical categorization (Branch → Subject → Topic → Subtopic)
 * - Question metadata (difficulty, type, tags, time allocation)
 * - Question history tracking
 * - Form validation and data consistency
 * 
 * @example
 * ```typescript
 * // Component handles complete question creation workflow:
 * // 1. Select educational hierarchy (branch, subject, topic, subtopic)
 * // 2. Set question metadata (difficulty, type, tags)
 * // 3. Create multilingual content (English/Hindi)
 * // 4. Add options with correct answer marking
 * // 5. Provide explanations and additional resources
 * // 6. Submit for review and publishing
 * ```
 */
@Component({
  selector   : 'app-add-question',
  standalone : true,
  imports    : [CommonModule, FormsModule, RouterModule, MathDisplayComponent],
  templateUrl: './add-question.component.html',
  styleUrls  : ['./add-question.component.scss']
})
export class AddQuestionComponent implements OnInit {
  /* ───────── injected services ───────── */
  /** @private {BranchService} Service for educational branch management */
  private branchSrv   = inject(BranchService);
  /** @private {SubjectService} Service for subject management within branches */
  private subjectSrv  = inject(SubjectService);
  /** @private {TopicService} Service for topic management within subjects */
  private topicSrv    = inject(TopicService);
  /** @private {SubtopicService} Service for subtopic management within topics */
  private subtopicSrv = inject(SubtopicService);
  /** @private {QuestionService} Service for question CRUD operations and validation */
  private questionSrv = inject(QuestionService);     // 👈 use this alias everywhere
  /** @private {ImageUploadService} Service for image upload functionality */
  private imageUploadSrv = inject(ImageUploadService);
  /** @private {Router} Angular router for navigation between components */
  private router      = inject(Router);
  /** @private {ActivatedRoute} Service for accessing route parameters and query params */
  private route       = inject(ActivatedRoute);
  /** @private {AuthService} Service for authentication and user role management */ // Added
  private authService = inject(AuthService); // Added

  /* ───────── component state ───────── */
  /** @property {LangCode} currentLang - Currently active language for question editing */
  currentLang: LangCode = 'en';
  /** @property {string} tagsInputString - String representation of question tags for ngModel binding */
  tagsInputString: string = ''; // ADDED for ngModel binding
  /**
   * @property {Object} question - Main question object containing all question data
   * @property {Record<LangCode, LangPack>} question.translations - Multilingual content storage
   * @property {string} question.difficulty - Question difficulty level
   * @property {string} question.type - Question type (single, multiple, etc.)
   * @property {string} question.status - Question status (Draft, Published, etc.)
   * @property {string} question.branchId - Selected educational branch ID
   * @property {string} question.subjectId - Selected subject ID within branch
   * @property {string} question.topicId - Selected topic ID within subject
   * @property {string} question.subtopicId - Selected subtopic ID within topic
   * @property {string[]} question.tags - Array of question tags for categorization
   * @property {number|undefined} question.recommendedTimeAllotment - Suggested time in minutes
   * @property {string} question.internalNotes - Internal notes for question management
   */
  question = {
    translations: <Record<LangCode, LangPack>>{
      en : { questionText: '', options: [ {text:'',img:'',isCorrect:false},
                                          {text:'',img:'',isCorrect:false} ],
             explanations: [], images: [] }, // Initialize images
      hi : { questionText: '', options: [ {text:'',img:'',isCorrect:false},
                                          {text:'',img:'',isCorrect:false} ],
             explanations: [], images: [] }  // Initialize images
    },
    difficulty : '',
    type       : 'single',
    status     : 'Draft', // Default status
    branchId   : '',
    subjectId  : '',
    topicId    : '',
    subtopicId : '',
    tags: [] as string[], // Initialize new field
    recommendedTimeAllotment: undefined as number | undefined, // Initialize new field
    internalNotes: '' // Initialize new field
  };

  /** @property {any[]} branches - Available educational branches for selection */
  branches:any[]=[]; 
  /** @property {any[]} subjects - Available subjects for the selected branch */
  subjects:any[]=[]; 
  /** @property {any[]} topics - Available topics for the selected subject */
  topics:any[]=[]; 
  /** @property {any[]} subtopics - Available subtopics for the selected topic */
  subtopics:any[]=[];
  
  /** @property {number} currentYear - Current year for question history tracking */
  currentYear = new Date().getFullYear();

  /** @property {Object} histEntry - Template for new question history entry */
  histEntry = { examName: '', year: this.currentYear };
  /** @property {Array} histList - List of historical exam associations */
  histList: { examName: string; year: number }[] = [];

  /* ───────── Image Upload Properties ───────── */
  /** @property {Map<string, File>} selectedFiles - Map of selected files for upload */
  selectedFiles = new Map<string, File>();
  /** @property {Map<string, string>} uploadStatuses - Upload status for each image */
  uploadStatuses = new Map<string, string>();
  /** @property {Map<string, string>} uploadProgress - Upload progress for each image */
  uploadProgress = new Map<string, string>();  /** @property {Map<string, string>} previewUrls - Preview URLs for selected files */
  previewUrls = new Map<string, string>();
  // Mathematical symbols for toolbar
  greekSymbols = [
    { symbol: 'α', latex: '\\alpha', name: 'Alpha' },
    { symbol: 'β', latex: '\\beta', name: 'Beta' },
    { symbol: 'γ', latex: '\\gamma', name: 'Gamma' },
    { symbol: 'δ', latex: '\\delta', name: 'Delta' },
    { symbol: 'ε', latex: '\\epsilon', name: 'Epsilon' },
    { symbol: 'θ', latex: '\\theta', name: 'Theta' },
    { symbol: 'λ', latex: '\\lambda', name: 'Lambda' },
    { symbol: 'μ', latex: '\\mu', name: 'Mu' },
    { symbol: 'π', latex: '\\pi', name: 'Pi' },
    { symbol: 'σ', latex: '\\sigma', name: 'Sigma' },
    { symbol: 'φ', latex: '\\phi', name: 'Phi' },
    { symbol: 'ω', latex: '\\omega', name: 'Omega' }
  ];

  operators = [
    { symbol: '±', latex: '\\pm', name: 'Plus-minus' },
    { symbol: '×', latex: '\\times', name: 'Times' },
    { symbol: '÷', latex: '\\div', name: 'Division' },
    { symbol: '≠', latex: '\\neq', name: 'Not equal' },
    { symbol: '≤', latex: '\\leq', name: 'Less than or equal' },
    { symbol: '≥', latex: '\\geq', name: 'Greater than or equal' },
    { symbol: '∞', latex: '\\infty', name: 'Infinity' },
    { symbol: '√', latex: '\\sqrt{}', name: 'Square root' },
    { symbol: '∑', latex: '\\sum', name: 'Sum' },
    { symbol: '∫', latex: '\\int', name: 'Integral' }
  ];

  relations = [
    { symbol: '≈', latex: '\\approx', name: 'Approximately' },
    { symbol: '≡', latex: '\\equiv', name: 'Equivalent' },
    { symbol: '∈', latex: '\\in', name: 'Element of' },
    { symbol: '∉', latex: '\\notin', name: 'Not element of' },
    { symbol: '⊂', latex: '\\subset', name: 'Subset' },
    { symbol: '⊃', latex: '\\supset', name: 'Superset' },
    { symbol: '∪', latex: '\\cup', name: 'Union' },
    { symbol: '∩', latex: '\\cap', name: 'Intersection' }
  ];

  commonExpressions = [
    { display: 'x²', latex: 'x^2', description: 'X squared' },
    { display: 'x³', latex: 'x^3', description: 'X cubed' },
    { display: '2ⁿ', latex: '2^n', description: '2 to the power n' },
    { display: 'aⁿ', latex: 'a^n', description: 'A to the power n' },
    { display: 'x₁', latex: 'x_1', description: 'X subscript 1' },
    { display: '½', latex: '\\frac{1}{2}', description: 'One half' },
    { display: '¼', latex: '\\frac{1}{4}', description: 'One quarter' },
    { display: '¾', latex: '\\frac{3}{4}', description: 'Three quarters' },
    { display: 'a/b', latex: '\\frac{a}{b}', description: 'General fraction' },
    { display: '∛x', latex: '\\sqrt[3]{x}', description: 'Cube root of x' },
    { display: 'log₂', latex: '\\log_2', description: 'Log base 2' },
    { display: 'eˣ', latex: 'e^x', description: 'E to the power x' }
  ];

  /* ───────────────────────────────────── */
  /**
   * @method ngOnInit
   * @description Angular lifecycle hook for component initialization.
   * Loads the initial data including available educational branches.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Automatically called by Angular framework
   * // Fetches branches data for hierarchy dropdown population
   * ngOnInit() {
   *   this.branchSrv.getBranches().subscribe(data => {
   *     this.branches = Array.isArray(data) ? data : data.branches || [];
   *   });
   * }
   * ```   */
  ngOnInit() {
    this.loadBranches();
    this.handleQueryParameters();
  }

  /**
   * @method loadBranches
   * @description Loads available educational branches from the server
   * @returns {void}
   */
  private loadBranches() {
    this.branchSrv.getBranches().subscribe({
      next: (data: any) => {
        // Assuming data might be an array directly or an object like { branches: [] }
        this.branches = Array.isArray(data) ? data : (data && data.branches ? data.branches : []);
        console.log('Branches loaded:', this.branches); // Debug log
      },
      error: (err: any) => {
        console.error('Error loading branches:', err);
        this.branches = []; // Ensure branches is empty on error
      }
    });
  }
  /**
   * @method handleQueryParameters
   * @description Handles pre-selection of hierarchy values from query parameters
   * @returns {void}
   */
  private handleQueryParameters() {
    this.route.queryParams.subscribe(params => {
      if (params['branchId']) {
        this.question.branchId = params['branchId'];
        // Wait for branches to load then load subjects
        setTimeout(() => this.onBranchChange(params['branchId']), 100);
      }
      if (params['subjectId']) {
        this.question.subjectId = params['subjectId'];
        setTimeout(() => this.onSubjectChange(params['subjectId']), 200);
      }
      if (params['topicId']) {
        this.question.topicId = params['topicId'];
        setTimeout(() => this.onTopicChange(params['topicId']), 300);
      }
      if (params['subtopicId']) {
        this.question.subtopicId = params['subtopicId'];
      }
      
      // Log for debugging
      console.log('Query params received:', params);
    });
  }
  /* --- helpers --- */
  /**
   * @method switchLanguage
   * @description Switches the active language for question editing interface.
   * 
   * @param {LangCode} lang - The language code to switch to ('en' or 'hi')
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Switch to Hindi language editing
   * this.switchLanguage('hi');
   * 
   * // Switch to English language editing
   * this.switchLanguage('en');
   * ```
   */
  switchLanguage(lang:LangCode){ this.currentLang=lang; }
  
  /**
   * @getter langPack
   * @description Gets the current language pack for editing, ensuring proper initialization.
   * Provides access to the translation data for the currently selected language.
   * 
   * @returns {LangPack} Language-specific content package for current language
   * 
   * @example
   * ```typescript
   * // Access current language question text
   * const questionText = this.langPack.questionText;
   * 
   * // Add new option to current language
   * this.langPack.options.push({text: 'New option', img: '', isCorrect: false});
   * ```
   */
  get langPack():LangPack{ // REMOVED private keyword
    // Ensure the langPack for the current language exists and has images initialized
    if (!this.question.translations[this.currentLang]) {
      this.question.translations[this.currentLang] = {
        questionText: '',
        options: [{text:'',img:'',isCorrect:false}, {text:'',img:'',isCorrect:false}],
        explanations: [],
        images: []
      };
    } else if (!this.question.translations[this.currentLang].images) {
      this.question.translations[this.currentLang].images = [];
    }
    return this.question.translations[this.currentLang];
  }
  /**
   * @method addOption
   * @description Adds a new empty option to the current language's question options.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Add a new option to current language
   * this.addOption();
   * // Result: langPack.options gets new {text:'', img:'', isCorrect:false}
   * ```
   */
  addOption() { this.langPack.options.push({text:'',img:'',isCorrect:false}); }
  
  /**
   * @method removeOption
   * @description Removes an option from the current language's question options.
   * Maintains minimum of 2 options for question validity.
   * 
   * @param {number} i - Index of the option to remove
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Remove the third option (index 2)
   * this.removeOption(2);
   * // Note: Will not remove if only 2 options remain
   * ```
   */
  removeOption(i:number){ if(this.langPack.options.length>2) this.langPack.options.splice(i,1); }

  /**
   * @method addExplanation
   * @description Adds a new empty explanation to the current language's question explanations.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Add a new explanation
   * this.addExplanation();
   * // Result: langPack.explanations gets new {type:'text', label:'', content:''}
   * ```
   */
  addExplanation(){ this.langPack.explanations.push({type:'text',label:'',content:''}); }
  
  /**
   * @method removeExplanation
   * @description Removes an explanation from the current language's question explanations.
   * 
   * @param {number} i - Index of the explanation to remove
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Remove the first explanation
   * this.removeExplanation(0);
   * ```
   */
  removeExplanation(i:number){ this.langPack.explanations.splice(i,1); }
  // ADDED: Methods to manage question images for the current translation
  /**
   * @method addQuestionImage
   * @description Adds a new empty image URL to the current language's question images.
   * Ensures the images array is properly initialized before adding.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Add an image slot for current language
   * this.addQuestionImage();
   * // User can then enter image URL in the form
   * ```
   */
  addQuestionImage(): void {
    if (!this.langPack.images) { // Defensive check
        this.langPack.images = [];
    }
    this.langPack.images!.push('');
  }

  /**
   * @method removeQuestionImage
   * @description Removes an image URL from the current language's question images.
   * 
   * @param {number} imgIndex - Index of the image to remove
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Remove the second image (index 1)
   * this.removeQuestionImage(1);
   * ```
   */
  removeQuestionImage(imgIndex: number): void {
    if (this.langPack.images) {
        this.langPack.images!.splice(imgIndex, 1);
    }
  }
  // ADDED: Method to manage option image (sets to empty string for now)
  /**
   * @method removeOptionImage
   * @description Removes an image from a specific option by setting it to empty string.
   * 
   * @param {number} optionIndex - Index of the option whose image should be removed
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Remove image from the first option
   * this.removeOptionImage(0);
   * ```
   */
  removeOptionImage(optionIndex: number): void {
    if (this.langPack.options && this.langPack.options[optionIndex]) {
      this.langPack.options[optionIndex].img = '';
    }
  }
  
  // ADDED: Method to handle changes to the tags input string
  /**
   * @method onTagsInputChange
   * @description Handles changes to the tags input string, converting comma-separated
   * values to an array of trimmed tags.
   * 
   * @param {string} value - Comma-separated string of tags
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Input: "math, algebra, equations"
   * this.onTagsInputChange("math, algebra, equations");
   * // Result: question.tags = ["math", "algebra", "equations"]
   * ```
   */
  onTagsInputChange(value: string): void {
    this.tagsInputString = value; // Keep the input field's value as is
    if (value && value.trim() !== '') {
      this.question.tags = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    } else {
      this.question.tags = [];
    }
  }
  /**
   * @method addHistory
   * @description Adds a new question history entry with exam name and year.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Add history entry for JEE Main 2024
   * this.histEntry = { examName: 'JEE Main', year: 2024 };
   * this.addHistory();
   * ```
   */
  addHistory() {
    if (this.histEntry.examName.trim()) {
      this.histList.push({ ...this.histEntry });
      this.histEntry = { examName: '', year: this.currentYear };
    }
  }

  /**
   * @method insertSymbol
   * @description Inserts a mathematical symbol or LaTeX expression into the question text
   * 
   * @param {string} latex - LaTeX expression to insert
   * @returns {void}
   */
  insertSymbol(latex: string): void {
    const currentText = this.langPack.questionText || '';
    this.langPack.questionText = currentText + latex;
  }
  /* --- cascades --- */
  /**
   * @method onBranchChange
   * @description Handles educational branch selection change, triggering cascade updates
   * for dependent dropdown lists and resetting child selections.
   * 
   * @param {string} id - Selected branch ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Select Engineering branch
   * this.onBranchChange('branch_engineering_id');
   * // Loads subjects for engineering, clears subject/topic/subtopic selections
   * ```
   */  onBranchChange(id:string){
    this.question.branchId=id; this.subjects=this.topics=this.subtopics=[];
    this.question.subjectId=this.question.topicId=this.question.subtopicId='';
    // Only fetch subjects if a valid branch ID is selected (not "Not-mentioned" or empty)
    if(id && id !== 'Not-mentioned') {      this.subjectSrv.getSubjects(id).subscribe({
        next: (s) => this.subjects = s,
        error: (err) => {
          this.subjects = [];
        }
      });
    }
  }
  
  /**
   * @method onSubjectChange
   * @description Handles subject selection change, loading topics for the selected subject
   * and resetting dependent selections.
   * 
   * @param {string} id - Selected subject ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Select Mathematics subject
   * this.onSubjectChange('subject_math_id');
   * // Loads topics for mathematics, clears topic/subtopic selections
   * ```
   */  onSubjectChange(id:string){
    this.question.subjectId=id; this.topics=this.subtopics=[];
    this.question.topicId=this.question.subtopicId='';
    // Only fetch topics if a valid subject ID is selected (not "Not-mentioned" or empty)
    if(id && id !== 'Not-mentioned') {
      this.topicSrv.getTopics(id).subscribe({
        next: (t) => this.topics = t,        error: (err) => {
          this.topics = [];
        }
      });
    }
  }
  
  /**
   * @method onTopicChange
   * @description Handles topic selection change, loading subtopics for the selected topic
   * and resetting subtopic selection.
   * 
   * @param {string} id - Selected topic ID
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Select Algebra topic
   * this.onTopicChange('topic_algebra_id');
   * // Loads subtopics for algebra, clears subtopic selection
   * ```
   */  onTopicChange(id:string){
    this.question.topicId=id; this.subtopics=[]; this.question.subtopicId='';
    // Only fetch subtopics if a valid topic ID is selected (not "Not-mentioned" or empty)
    if(id && id !== 'Not-mentioned') {
      this.subtopicSrv.getSubtopics(id).subscribe({        next: (st) => this.subtopics = st,
        error: (err) => {
          this.subtopics = [];
        }
      });
    }
  }
  /* ───────── submit ───────── */
  /**
   * @method addQuestion
   * @description Alias method for submit() to maintain backward compatibility.
   * 
   * @param {NgForm} form - Angular reactive form containing question data
   * @returns {void}
   */
  addQuestion(form: NgForm) { this.submit(form); }

  /**
   * @method submit
   * @description Processes and submits the question data to the backend.
   * Validates form data, processes multilingual translations, and creates
   * the final payload for question creation.
   * 
   * @param {NgForm} form - Angular reactive form containing question data
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Called when form is submitted
   * onSubmit(form: NgForm) {
   *   this.submit(form);
   * }
   * 
   * // Process flow:
   * // 1. Validate form data
   * // 2. Create deep copy of question object
   * // 3. Process translations for each language
   * // 4. Filter out empty content
   * // 5. Submit to backend via QuestionService
   * ```
   */
  submit(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    // ----- build payload -------------------------------------------------
    const baseLang = 'en';              // or pick from a settings service
    
    // Create a deep copy of the question object to avoid modifying the original state directly
    const questionCopy = JSON.parse(JSON.stringify(this.question));

    // Determine status based on user role
    const currentUserRole = this.authService.getUserRole();
    if (currentUserRole === 'admin') {
      questionCopy.status = 'Pending Review';
    } else if (currentUserRole === 'superadmin') {
      // Superadmins can keep it as 'Draft' or whatever was set in the form.
      // For now, we'll let the form's initial 'Draft' value persist for superadmin's own creations.
      // If they want to publish directly, they could change it in the form if we add that UI feature,
      // or use a separate review panel to change status of any question.
    }
    // If role is neither, it will use the initialized 'Draft' or what's in questionCopy.status

    const payload: any = {
      difficulty: questionCopy.difficulty,
      type: questionCopy.type,
      status: questionCopy.status, // Status is now dynamically set or from form
      branchId: questionCopy.branchId, // Use branchId for branch
      subjectId: questionCopy.subjectId, // Use subjectId for subject
      topicId: questionCopy.topicId, // Use topicId for topic
      subtopicId: questionCopy.subtopicId, // Use subtopicId for subTopic
      tags: questionCopy.tags, // Add tags
      recommendedTimeAllotment: questionCopy.recommendedTimeAllotment, // Add time
      internalNotes: questionCopy.internalNotes, // Add notes
      questionHistory: this.histList, // Add history
      translations: []
    };

    // 1️⃣ copy default-language strings to root (what the API expects for non-multilingual fields if any)
    // For this model, questionText and options are part of translations.
    // If your backend expects a root-level questionText or options for the base language,
    // you would set them here. e.g.:
    // payload.questionText  = questionCopy.translations[baseLang]?.questionText || '';
    // payload.options       = questionCopy.translations[baseLang]?.options || [];

    // 2️⃣ Process translations
    const filledTranslations = Object.entries(questionCopy.translations)
      .map(([lang, packUntyped]) => {
        const pack = packUntyped as LangPack; // Assert type here
        // Ensure options, explanations, and images are arrays
        pack.options = Array.isArray(pack.options) ? pack.options : [];
        pack.explanations = Array.isArray(pack.explanations) ? pack.explanations : [];
        pack.images = Array.isArray(pack.images) ? pack.images : [];        return {
          lang: lang as LangCode,
          questionText: pack.questionText,
          options: pack.options.filter(o => (o.text && o.text.trim()) || (o.img && o.img.trim())), // Allow options with text OR image
          explanations: pack.explanations,
          images: pack.images.filter(img => img && img.trim() !== '') // Filter out empty image URLs
        };
      })
      .filter(p => p.questionText && p.questionText.trim() && p.options.length >= 2); // Ensure question text and at least 2 options

    payload.translations = filledTranslations;
    
    // 3️⃣ clean up empty arrays (optional hygiene)
    // if (!payload.options?.length)       delete payload.options; // If options were at root

    // ----- POST ----------------------------------------------------------
    this.questionSrv.addQuestion(payload)
        .subscribe({
          next: () => alert('Saved!'),
          error: (err: any) => alert('Save failed: ' + err.message)
        });
  }
  /* quick-nav */
  /**
   * @method goToAddBranch
   * @description Navigates to the add branch component for creating new educational branches.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Navigate to create new branch
   * this.goToAddBranch();
   * ```
   */
  goToAddBranch()   { this.router.navigate(['/branches/new']); }
  
  /**
   * @method goToAddSubject
   * @description Navigates to the add subject component for creating new subjects.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Navigate to create new subject
   * this.goToAddSubject();
   * ```
   */
  goToAddSubject()  { this.router.navigate(['/subjects/new']); }
  
  /**
   * @method goToAddTopic
   * @description Navigates to the add topic component for creating new topics.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Navigate to create new topic
   * this.goToAddTopic();
   * ```
   */
  goToAddTopic()    { this.router.navigate(['/topics/new']);   }
  
  /**
   * @method goToAddSubtopic
   * @description Navigates to the add subtopic component for creating new subtopics.
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Navigate to create new subtopic
   * this.goToAddSubtopic();
   * ```
   */
  goToAddSubtopic() { this.router.navigate(['/subtopics/new']); }

  /* ───────── Image Upload Methods ───────── */
  
  /**
   * @method onQuestionImageFileSelected
   * @description Handles file selection for question images and generates preview
   * 
   * @param {Event} event - File input change event
   * @param {number} imgIndex - Index of the image being uploaded
   * @returns {void}
   */
  onQuestionImageFileSelected(event: Event, imgIndex: number): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    // Validate file
    const validation = this.imageUploadSrv.validateImageFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }
    
    const fileKey = `question_${this.currentLang}_${imgIndex}`;
    this.selectedFiles.set(fileKey, file);
    this.uploadStatuses.set(fileKey, 'selected');
    
    // Generate preview
    this.imageUploadSrv.generatePreviewUrl(file).then(previewUrl => {
      this.previewUrls.set(fileKey, previewUrl);
    });
  }

  /**
   * @method onOptionImageFileSelected
   * @description Handles file selection for option images and generates preview
   * 
   * @param {Event} event - File input change event
   * @param {number} optionIndex - Index of the option
   * @returns {void}
   */
  onOptionImageFileSelected(event: Event, optionIndex: number): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    // Validate file
    const validation = this.imageUploadSrv.validateImageFile(file);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }
    
    const fileKey = `option_${this.currentLang}_${optionIndex}`;
    this.selectedFiles.set(fileKey, file);
    this.uploadStatuses.set(fileKey, 'selected');
    
    // Generate preview
    this.imageUploadSrv.generatePreviewUrl(file).then(previewUrl => {
      this.previewUrls.set(fileKey, previewUrl);
    });
  }

  /**
   * @method uploadQuestionImage
   * @description Uploads a selected question image to the server
   * 
   * @param {number} imgIndex - Index of the image being uploaded
   * @returns {void}
   */
  uploadQuestionImage(imgIndex: number): void {
    const fileKey = `question_${this.currentLang}_${imgIndex}`;
    const file = this.selectedFiles.get(fileKey);
    
    if (!file || !this.question.branchId || !this.question.subjectId || !this.question.topicId) {
      alert('Please select hierarchy (Branch, Subject, Topic) before uploading images.');
      return;
    }
    
    this.uploadStatuses.set(fileKey, 'uploading');
    this.uploadProgress.set(fileKey, '0%');
    
    const uploadRequest: ImageUploadRequest = {
      file,
      branchId: this.question.branchId,
      subjectId: this.question.subjectId,
      topicId: this.question.topicId,
      imageFor: 'body'
    };    this.imageUploadSrv.uploadQuestionImage(uploadRequest).subscribe({
      next: (response) => {
        this.langPack.images![imgIndex] = response.imageUrl;
        this.uploadStatuses.set(fileKey, 'completed');
        this.uploadProgress.set(fileKey, '100%');
        
        // Clear file selection but keep the uploaded image URL for display
        this.selectedFiles.delete(fileKey);
        this.previewUrls.delete(fileKey);
      },
      error: (error) => {
        console.error('Image upload failed:', error);
        this.uploadStatuses.set(fileKey, 'failed');
        alert('Image upload failed. Please try again.');
      }
    });
  }

  /**
   * @method uploadOptionImage
   * @description Uploads a selected option image to the server
   * 
   * @param {number} optionIndex - Index of the option
   * @returns {void}
   */
  uploadOptionImage(optionIndex: number): void {
    const fileKey = `option_${this.currentLang}_${optionIndex}`;
    const file = this.selectedFiles.get(fileKey);
    
    if (!file || !this.question.branchId || !this.question.subjectId || !this.question.topicId) {
      alert('Please select hierarchy (Branch, Subject, Topic) before uploading images.');
      return;
    }
    
    this.uploadStatuses.set(fileKey, 'uploading');
    this.uploadProgress.set(fileKey, '0%');
    
    const uploadRequest: ImageUploadRequest = {
      file,
      branchId: this.question.branchId,
      subjectId: this.question.subjectId,
      topicId: this.question.topicId,
      imageFor: 'option',
      optionIndex
    };
      this.imageUploadSrv.uploadQuestionImage(uploadRequest).subscribe({      next: (response) => {
        this.langPack.options[optionIndex].img = response.imageUrl;
        this.uploadStatuses.set(fileKey, 'completed');
        this.uploadProgress.set(fileKey, '100%');
        
        // Clear file selection but keep the uploaded image URL for display
        this.selectedFiles.delete(fileKey);
        this.previewUrls.delete(fileKey);
      },
      error: (error) => {
        this.uploadStatuses.set(fileKey, 'failed');
        alert('Option image upload failed. Please try again.');
      }
    });
  }

  /**
   * @method getFileKey
   * @description Generates a unique key for file tracking
   * 
   * @param {string} type - Type of image ('question' or 'option')
   * @param {number} index - Index of the image/option
   * @returns {string} Unique file key
   */
  getFileKey(type: string, index: number): string {
    return `${type}_${this.currentLang}_${index}`;
  }

  /**
   * @method getUploadStatus
   * @description Gets the upload status for a specific image
   * 
   * @param {string} type - Type of image ('question' or 'option')
   * @param {number} index - Index of the image/option
   * @returns {string} Upload status
   */
  getUploadStatus(type: string, index: number): string {
    const fileKey = this.getFileKey(type, index);
    return this.uploadStatuses.get(fileKey) || 'none';
  }

  /**
   * @method getPreviewUrl
   * @description Gets the preview URL for a selected file
   * 
   * @param {string} type - Type of image ('question' or 'option')
   * @param {number} index - Index of the image/option
   * @returns {string|null} Preview URL or null
   */
  getPreviewUrl(type: string, index: number): string | null {
    const fileKey = this.getFileKey(type, index);
    return this.previewUrls.get(fileKey) || null;
  }

  /**
   * @method deleteImage
   * @description Deletes an uploaded image from the server
   * 
   * @param {string} imageUrl - URL of the image to delete
   * @param {string} type - Type of image ('question' or 'option')
   * @param {number} index - Index of the image/option
   * @returns {void}
   */
  deleteImage(imageUrl: string, type: string, index: number): void {
    if (!imageUrl) return;
    
    this.imageUploadSrv.deleteImage(imageUrl).subscribe({
      next: () => {
        if (type === 'question') {
          this.langPack.images![index] = '';
        } else if (type === 'option') {
          this.langPack.options[index].img = '';
        }
        
        // Clear any related file data
        const fileKey = this.getFileKey(type, index);
        this.selectedFiles.delete(fileKey);
        this.uploadStatuses.delete(fileKey);
        this.previewUrls.delete(fileKey);
        this.uploadProgress.delete(fileKey);
      },      error: (error) => {
        alert('Failed to delete image. Please try again.');
      }
    });
  }
}
