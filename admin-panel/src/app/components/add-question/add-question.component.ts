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

import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
import { NotificationService } from '../../services/notification.service'; // Added NotificationService

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
 * @interface NumericalAnswer
 * @description Structure for numerical answer type questions
 * @property {number} minValue - Minimum acceptable value for range answers
 * @property {number} maxValue - Maximum acceptable value for range answers
 * @property {number} exactValue - Exact value for single-value answers
 * @property {number} tolerance - Tolerance percentage for exact answers
 * @property {string} unit - Optional unit for the answer
 */
interface NumericalAnswer { 
  minValue?: number; 
  maxValue?: number; 
  exactValue?: number; 
  tolerance?: number; 
  unit?: string; 
}

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
 * @property {NumericalAnswer} [numericalAnswer] - Numerical answer configuration for integer/numerical type questions
 */
interface LangPack { questionText: string; options: Option[]; explanations: Explain[]; images?: string[]; numericalAnswer?: NumericalAnswer; }

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
export class AddQuestionComponent implements OnInit, OnDestroy {
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
  /** @private {NotificationService} Service for displaying user notifications */
  private notificationService = inject(NotificationService);

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
   */  question = {
    translations: <Record<LangCode, LangPack>>{
      en : { questionText: '', options: [ {text:'',img:'',isCorrect:false},
                                          {text:'',img:'',isCorrect:false} ],
             explanations: [], images: [], 
             numericalAnswer: { minValue: undefined, maxValue: undefined, exactValue: undefined, tolerance: undefined, unit: '' } }, // Initialize numerical answer
      hi : { questionText: '', options: [ {text:'',img:'',isCorrect:false},
                                          {text:'',img:'',isCorrect:false} ],
             explanations: [], images: [],
             numericalAnswer: { minValue: undefined, maxValue: undefined, exactValue: undefined, tolerance: undefined, unit: '' } }  // Initialize numerical answer
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

  // New properties for inline hierarchy creation
  /** @property {string} branchSearchText - Search text for branch autocomplete */
  branchSearchText: string = '';
  /** @property {string} subjectSearchText - Search text for subject autocomplete */
  subjectSearchText: string = '';
  /** @property {string} topicSearchText - Search text for topic autocomplete */
  topicSearchText: string = '';
  /** @property {string} subtopicSearchText - Search text for subtopic autocomplete */
  subtopicSearchText: string = '';

  /** @property {any[]} filteredBranches - Filtered branches based on search */
  filteredBranches: any[] = [];
  /** @property {any[]} filteredSubjects - Filtered subjects based on search */
  filteredSubjects: any[] = [];
  /** @property {any[]} filteredTopics - Filtered topics based on search */
  filteredTopics: any[] = [];
  /** @property {any[]} filteredSubtopics - Filtered subtopics based on search */
  filteredSubtopics: any[] = [];

  /** @property {boolean} showBranchDropdown - Show/hide branch dropdown */
  showBranchDropdown: boolean = false;
  /** @property {boolean} showSubjectDropdown - Show/hide subject dropdown */
  showSubjectDropdown: boolean = false;
  /** @property {boolean} showTopicDropdown - Show/hide topic dropdown */
  showTopicDropdown: boolean = false;
  /** @property {boolean} showSubtopicDropdown - Show/hide subtopic dropdown */
  showSubtopicDropdown: boolean = false;

  /** @property {boolean} exactBranchMatch - Whether search text exactly matches existing branch */
  exactBranchMatch: boolean = false;
  /** @property {boolean} exactSubjectMatch - Whether search text exactly matches existing subject */
  exactSubjectMatch: boolean = false;
  /** @property {boolean} exactTopicMatch - Whether search text exactly matches existing topic */
  exactTopicMatch: boolean = false;
  /** @property {boolean} exactSubtopicMatch - Whether search text exactly matches existing subtopic */
  exactSubtopicMatch: boolean = false;

  /** @property {any} selectedBranch - Currently selected branch object */
  selectedBranch: any = null;
  /** @property {any} selectedSubject - Currently selected subject object */
  selectedSubject: any = null;
  /** @property {any} selectedTopic - Currently selected topic object */
  selectedTopic: any = null;
  /** @property {any} selectedSubtopic - Currently selected subtopic object */
  selectedSubtopic: any = null;

  /** @property {boolean} showCreateBranchForm - Show/hide create branch form */
  showCreateBranchForm: boolean = false;
  /** @property {boolean} showCreateSubjectForm - Show/hide create subject form */
  showCreateSubjectForm: boolean = false;
  /** @property {boolean} showCreateTopicForm - Show/hide create topic form */
  showCreateTopicForm: boolean = false;
  /** @property {boolean} showCreateSubtopicForm - Show/hide create subtopic form */
  showCreateSubtopicForm: boolean = false;

  /** @property {string} newBranchName - Name for new branch being created */
  newBranchName: string = '';
  /** @property {string} newSubjectName - Name for new subject being created */
  newSubjectName: string = '';
  /** @property {string} newTopicName - Name for new topic being created */
  newTopicName: string = '';
  /** @property {string} newSubtopicName - Name for new subtopic being created */
  newSubtopicName: string = '';

  /** @property {boolean} creatingBranch - Whether branch creation is in progress */
  creatingBranch: boolean = false;
  /** @property {boolean} creatingSubject - Whether subject creation is in progress */
  creatingSubject: boolean = false;
  /** @property {boolean} creatingTopic - Whether topic creation is in progress */
  creatingTopic: boolean = false;
  /** @property {boolean} creatingSubtopic - Whether subtopic creation is in progress */
  creatingSubtopic: boolean = false;
  
  /** @property {boolean} showMathSymbols - Whether to show mathematical symbols section */
  showMathSymbols: boolean = false;
  
  /** @property {boolean[]} showOptionImageUpload - Array to track which option image uploads are visible */
  showOptionImageUpload: boolean[] = [false, false, false, false, false]; // Support for 5 options
  
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
   * ```   */  ngOnInit() {
    // Load branches on component initialization
    this.branchSrv.getBranches().subscribe({
      next: (data: any) => {
        this.branches = Array.isArray(data) ? data : data.branches || [];
        console.log('Branches loaded:', this.branches);
      },
      error: (err) => {
        console.error('Error loading branches:', err);
        this.notificationService.showError('Failed to load branches');
      }
    });
    
    // Handle query parameters if any
    console.log('Component initialized');
    
    this.addDocumentClickListener();
  }

  ngOnDestroy() {
    this.removeDocumentClickListener();
  }

  /**
   * @method addDocumentClickListener
   * @description Adds click listener to close dropdowns when clicking outside
   */
  private addDocumentClickListener(): void {
    this.documentClickListener = (event: Event) => {
      const target = event.target as HTMLElement;
      
      // Check if click is outside any dropdown
      if (!target.closest('.hierarchy-dropdown')) {
        this.showBranchDropdown = false;
        this.showSubjectDropdown = false;
        this.showTopicDropdown = false;
        this.showSubtopicDropdown = false;
      }
    };
    
    document.addEventListener('click', this.documentClickListener);
  }

  /**
   * @method removeDocumentClickListener
   * @description Removes document click listener
   */
  private removeDocumentClickListener(): void {
    if (this.documentClickListener) {
      document.removeEventListener('click', this.documentClickListener);
    }
  }

  private documentClickListener: ((event: Event) => void) | null = null;

  /**
   * @method toggleMathSymbols
   * @description Toggles the visibility of the mathematical symbols section
   */
  toggleMathSymbols(): void {
    this.showMathSymbols = !this.showMathSymbols;
  }

  /**
   * @method toggleOptionImageUpload
   * @description Toggles the visibility of option image upload for a specific option
   * @param {number} index - Index of the option to toggle image upload for
   */
  toggleOptionImageUpload(index: number): void {
    if (index >= 0 && index < this.showOptionImageUpload.length) {
      this.showOptionImageUpload[index] = !this.showOptionImageUpload[index];
    }
  }

  /**
   * @method resetForm
   * @description Resets the entire form and scrolls to top
   */
  resetForm(): void {
    // Reset the question object to initial state
    this.question = {
      difficulty: 'Not-mentioned',
      type: '',
      status: 'draft',
      branchId: '',
      subjectId: '',
      topicId: '',
      subtopicId: '',
      tags: [],
      recommendedTimeAllotment: undefined,
      internalNotes: '',
      translations: {
        en: { questionText: '', options: [], explanations: [], images: [], numericalAnswer: { minValue: 0, maxValue: 0, unit: '' } },
        hi: { questionText: '', options: [], explanations: [], images: [], numericalAnswer: { minValue: 0, maxValue: 0, unit: '' } }
      }
    };

    // Reset selections
    this.selectedBranch = null;
    this.selectedSubject = null;
    this.selectedTopic = null;
    this.selectedSubtopic = null;

    // Reset search texts
    this.branchSearchText = '';
    this.subjectSearchText = '';
    this.topicSearchText = '';
    this.subtopicSearchText = '';

    // Reset visibility states
    this.showMathSymbols = false;
    this.showOptionImageUpload = [false, false, false, false, false];

    // Reset appearance history
    this.histList = [];
    this.histEntry = { examName: '', year: this.currentYear };

    // Reset tags
    this.tagsInputString = '';

    // Reset file uploads
    this.selectedFiles.clear();
    this.uploadStatuses.clear();
    this.uploadProgress.clear();
    this.previewUrls.clear();

    // Switch to English
    this.currentLang = 'en';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ───────── lang switch ───────── */
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
   */  get langPack():LangPack{ // REMOVED private keyword
    // Ensure the langPack for the current language exists and has images initialized
    if (!this.question.translations[this.currentLang]) {
      this.question.translations[this.currentLang] = {
        questionText: '',
        options: [{text:'',img:'',isCorrect:false}, {text:'',img:'',isCorrect:false}],
        explanations: [],
        images: [],
        numericalAnswer: { minValue: undefined, maxValue: undefined, exactValue: undefined, tolerance: undefined, unit: '' }      };
    } else {
      // Ensure existing langPacks have required properties
      if (!this.question.translations[this.currentLang].images) {
        this.question.translations[this.currentLang].images = [];
      }
      if (!this.question.translations[this.currentLang].numericalAnswer) {
        this.question.translations[this.currentLang].numericalAnswer = { 
          minValue: undefined, maxValue: undefined, exactValue: undefined, tolerance: undefined, unit: '' 
        };
      }
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
  /* --- cascades --- */  /**
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
   */  
  onBranchChange(id:string){
    this.question.branchId=id; this.subjects=this.topics=this.subtopics=[];
    this.question.subjectId=this.question.topicId=this.question.subtopicId='';
    this.filteredSubjects = this.filteredTopics = this.filteredSubtopics = [];
    
    // Only fetch subjects if a valid branch ID is selected (not "Not-mentioned" or empty)
    if(id && id !== 'Not-mentioned') {      
      this.subjectSrv.getSubjects(id).subscribe({
        next: (s) => {
          this.subjects = s;
          this.filteredSubjects = s.slice(0, 10); // Initialize with first 10
        },
        error: (err) => {
          this.subjects = [];
          this.filteredSubjects = [];
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
    this.filteredTopics = this.filteredSubtopics = [];
    
    // Only fetch topics if a valid subject ID is selected (not "Not-mentioned" or empty)
    if(id && id !== 'Not-mentioned') {
      this.topicSrv.getTopics(id).subscribe({
        next: (t) => {
          this.topics = t;
          this.filteredTopics = t.slice(0, 10); // Initialize with first 10
        },
        error: (err) => {
          this.topics = [];
          this.filteredTopics = [];
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
    this.filteredSubtopics = [];
    
    // Only fetch subtopics if a valid topic ID is selected (not "Not-mentioned" or empty)
    if(id && id !== 'Not-mentioned') {
      this.subtopicSrv.getSubtopics(id).subscribe({
        next: (st) => {
          this.subtopics = st;
          this.filteredSubtopics = st.slice(0, 10); // Initialize with first 10
        },
        error: (err) => {
          this.subtopics = [];
          this.filteredSubtopics = [];
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
   */  submit(form: NgForm) {
    console.log('Form submitted. Form valid:', form.valid);
    console.log('Form errors:', form.form.errors);
    console.log('Form controls:', Object.keys(form.form.controls).map(key => ({
      name: key,
      valid: form.form.controls[key].valid,
      errors: form.form.controls[key].errors
    })));
    
    if (form.invalid) {
      console.log('Form is invalid, not submitting');
      form.control.markAllAsTouched();
      return;
    }

    // ----- build payload -------------------------------------------------
    const baseLang = 'en';              // or pick from a settings service
      // Create a deep copy of the question object to avoid modifying the original state directly
    const questionCopy = JSON.parse(JSON.stringify(this.question));    console.log('Question type:', questionCopy.type);
    console.log('Question translations before processing:', questionCopy.translations);
    
    // Debug current language pack specifically
    const currentLangPack = questionCopy.translations[this.currentLang];
    console.log('Current language pack:', currentLangPack);
    console.log('Current numerical answer:', currentLangPack?.numericalAnswer);

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
    // payload.options       = questionCopy.translations[baseLang]?.options || [];    // 2️⃣ Process translations
    const filledTranslations = Object.entries(questionCopy.translations)
      .map(([lang, packUntyped]) => {
        const pack = packUntyped as LangPack; // Assert type here
        // Ensure options, explanations, and images are arrays
        pack.options = Array.isArray(pack.options) ? pack.options : [];
        pack.explanations = Array.isArray(pack.explanations) ? pack.explanations : [];
        pack.images = Array.isArray(pack.images) ? pack.images : [];
        
        const translation: any = {
          lang: lang as LangCode,
          questionText: pack.questionText,
          explanations: pack.explanations,
          images: pack.images.filter(img => img && img.trim() !== '') // Filter out empty image URLs
        };        // Handle different question types
        if (questionCopy.type === 'integer') {
          // For integer questions, include numerical answer instead of options
          if (pack.numericalAnswer) {
            translation.numericalAnswer = {
              minValue: Number(pack.numericalAnswer.minValue),
              maxValue: Number(pack.numericalAnswer.maxValue),
              unit: pack.numericalAnswer.unit?.trim() || undefined
            };
          }
          // Don't include options for integer questions
          translation.options = [];
        } else {
          // For multiple choice questions, include options
          translation.options = pack.options.filter(o => (o.text && o.text.trim()) || (o.img && o.img.trim())); // Allow options with text OR image
        }

        return translation;      })
      .filter(p => {
        console.log('Processing translation:', p.lang, p);
        
        // Basic validation: must have question text
        if (!p.questionText || !p.questionText.trim()) {
          console.log('Translation filtered out: missing question text', p);
          return false;
        }
        
        // Type-specific validation
        if (questionCopy.type === 'integer') {
          // For integer questions, require valid numerical answer
          const numericalAnswer = p.numericalAnswer;
          console.log('Checking numerical answer for', p.lang, ':', numericalAnswer);
          
          if (!numericalAnswer) {
            console.log('No numerical answer object found');
            return false;
          }
          
          const minVal = numericalAnswer.minValue;
          const maxVal = numericalAnswer.maxValue;
          console.log('Min/Max values:', minVal, maxVal, 'Types:', typeof minVal, typeof maxVal);
          
          // More lenient validation - just check if we have valid numbers
          const minValid = minVal !== undefined && minVal !== null && minVal !== '' && !isNaN(Number(minVal));
          const maxValid = maxVal !== undefined && maxVal !== null && maxVal !== '' && !isNaN(Number(maxVal));
          
          console.log('Validation results:', { minValid, maxValid });
          
          if (!minValid || !maxValid) {
            console.log('Translation filtered out: invalid numerical answer', {
              lang: p.lang,
              numericalAnswer,
              minValue: minVal,
              maxValue: maxVal,
              minValid,
              maxValid
            });
            return false;
          }
          
          return true;
        } else {
          // For multiple choice questions, require at least 2 options
          if (p.options.length < 2) {
            console.log('Translation filtered out: insufficient options', p);
            return false;
          }
          return true;
        }
      });

    console.log('Final translations being sent:', filledTranslations);
    payload.translations = filledTranslations;
    
    // 3️⃣ clean up empty arrays (optional hygiene)
    // if (!payload.options?.length)       delete payload.options; // If options were at root    // ----- POST ----------------------------------------------------------
    if (filledTranslations.length === 0) {
      this.notificationService.showError('Validation Error', 'No valid translations found. Please check that all required fields are filled correctly.');
      console.error('No translations passed validation');
      return;
    }

    console.log('Sending payload:', payload);    this.questionSrv.addQuestion(payload)
        .subscribe({
          next: () => {
            this.notificationService.showSuccess('Question successfully saved to database!');
            // Auto-reset form after 2 seconds
            setTimeout(() => {
              this.resetForm();
            }, 2000);
          },
          error: (err: any) => {
            console.error('Error details:', err);
            this.notificationService.showError('Save failed: ' + err.message);
          }
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
      this.notificationService.showError(validation.error || 'Invalid file');
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
      this.notificationService.showError(validation.error || 'Invalid file');
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
      this.notificationService.showError('Please select hierarchy (Branch, Subject, Topic) before uploading images.');
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
        this.notificationService.showError('Image upload failed. Please try again.');
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
      this.notificationService.showError('Please select hierarchy (Branch, Subject, Topic) before uploading images.');
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
        this.notificationService.showError('Option image upload failed. Please try again.');
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
        this.notificationService.showError('Failed to delete image. Please try again.');
      }
    });
  }

  /* ───────── inline hierarchy creation methods ───────── */
  
  /**
   * @method onBranchSearch
   * @description Handles branch search input, filtering available branches and checking for exact matches
   * @param {any} event - Input event containing search text
   */
  onBranchSearch(event: any): void {
    const searchText = event.target.value.toLowerCase().trim();
    this.branchSearchText = event.target.value;
    
    if (!searchText) {
      this.filteredBranches = this.branches.slice(0, 10); // Show first 10
      this.exactBranchMatch = false;
      return;
    }
    
    // Filter branches based on search text
    this.filteredBranches = this.branches.filter(branch => 
      branch.name.toLowerCase().includes(searchText)
    ).slice(0, 10); // Limit to 10 results
    
    // Check for exact match
    this.exactBranchMatch = this.branches.some(branch => 
      branch.name.toLowerCase() === searchText
    );
  }

  /**
   * @method selectBranch
   * @description Selects a branch and updates the UI accordingly
   * @param {any} branch - Selected branch object
   */
  selectBranch(branch: any): void {
    this.selectedBranch = branch;
    this.branchSearchText = branch.name;
    this.question.branchId = branch._id;
    this.showBranchDropdown = false;
    
    // Load subjects for selected branch
    this.onBranchChange(branch._id);
    
    // Clear dependent selections
    this.clearSubjectSelection();
  }

  /**
   * @method clearBranchSelection
   * @description Clears branch selection and resets dependent data
   */
  clearBranchSelection(): void {
    this.selectedBranch = null;
    this.branchSearchText = '';
    this.question.branchId = '';
    this.subjects = [];
    this.topics = [];
    this.subtopics = [];
    this.clearSubjectSelection();
  }  /**
   * @method createNewBranch
   * @description Creates a new branch via the API
   */
  createNewBranch(): void {
    if (!this.newBranchName.trim()) return;
    
    // Check if branch already exists (case-insensitive)
    const branchExists = this.branches.some(branch => 
      branch.name.toLowerCase() === this.newBranchName.trim().toLowerCase()
    );
    
    if (branchExists) {
      this.notificationService.showError(`Branch "${this.newBranchName.trim()}" already exists!`);
      return;
    }
    
    this.creatingBranch = true;
    
    this.branchSrv.createBranch(this.newBranchName.trim()).subscribe({
      next: (newBranch: any) => {
        // Add to branches list
        this.branches.push(newBranch);
        
        // Auto-select the new branch
        this.selectBranch(newBranch);
        
        // Reset form
        this.cancelCreateBranch();
        
        // Show success message
        this.notificationService.showSuccess(`Branch "${newBranch.name}" created successfully!`);
        
        console.log('Branch created successfully:', newBranch);
      },
      error: (error: any) => {
        console.error('Error creating branch:', error);
        this.creatingBranch = false;
        
        // Extract error message from response
        let errorMessage = 'Failed to create branch';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.notificationService.showError(errorMessage);
      }
    });
  }

  /**
   * @method cancelCreateBranch
   * @description Cancels branch creation and resets form
   */
  cancelCreateBranch(): void {
    this.showCreateBranchForm = false;
    this.newBranchName = '';
    this.creatingBranch = false;
  }

  /**
   * @method onSubjectSearch
   * @description Handles subject search input
   * @param {any} event - Input event containing search text
   */
  onSubjectSearch(event: any): void {
    if (!this.selectedBranch) return;
    
    const searchText = event.target.value.toLowerCase().trim();
    this.subjectSearchText = event.target.value;
    
    if (!searchText) {
      this.filteredSubjects = this.subjects.slice(0, 10);
      this.exactSubjectMatch = false;
      return;
    }
    
    this.filteredSubjects = this.subjects.filter(subject => 
      subject.name.toLowerCase().includes(searchText)
    ).slice(0, 10);
    
    this.exactSubjectMatch = this.subjects.some(subject => 
      subject.name.toLowerCase() === searchText
    );
  }

  /**
   * @method selectSubject
   * @description Selects a subject and updates the UI accordingly
   * @param {any} subject - Selected subject object
   */
  selectSubject(subject: any): void {
    this.selectedSubject = subject;
    this.subjectSearchText = subject.name;
    this.question.subjectId = subject._id;
    this.showSubjectDropdown = false;
    
    // Load topics for selected subject
    this.onSubjectChange(subject._id);
    
    // Clear dependent selections
    this.clearTopicSelection();
  }

  /**
   * @method clearSubjectSelection
   * @description Clears subject selection and resets dependent data
   */
  clearSubjectSelection(): void {
    this.selectedSubject = null;
    this.subjectSearchText = '';
    this.question.subjectId = '';
    this.topics = [];
    this.subtopics = [];
    this.clearTopicSelection();
  }
  /**
   * @method createNewSubject
   * @description Creates a new subject via the API
   */  createNewSubject(): void {
    if (!this.newSubjectName.trim() || !this.selectedBranch) return;
    
    // Check if subject already exists (case-insensitive)
    const subjectExists = this.subjects.some(subject => 
      subject.name.toLowerCase() === this.newSubjectName.trim().toLowerCase()
    );
    
    if (subjectExists) {
      this.notificationService.showError(`Subject "${this.newSubjectName.trim()}" already exists in this branch!`);
      return;
    }
    
    this.creatingSubject = true;
    
    this.subjectSrv.createSubject(this.newSubjectName.trim(), this.selectedBranch._id).subscribe({
      next: (newSubject: any) => {
        // Add to subjects list
        this.subjects.push(newSubject);
        
        // Auto-select the new subject
        this.selectSubject(newSubject);
        
        // Reset form
        this.cancelCreateSubject();
        
        // Show success message
        this.notificationService.showSuccess(`Subject "${newSubject.name}" created successfully!`);
        
        console.log('Subject created successfully:', newSubject);
      },
      error: (error: any) => {
        console.error('Error creating subject:', error);
        this.creatingSubject = false;
        
        // Extract error message from response
        let errorMessage = 'Failed to create subject';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.notificationService.showError(errorMessage);
      }
    });
  }

  /**
   * @method cancelCreateSubject
   * @description Cancels subject creation and resets form
   */
  cancelCreateSubject(): void {
    this.showCreateSubjectForm = false;
    this.newSubjectName = '';
    this.creatingSubject = false;
  }

  /**
   * @method onTopicSearch
   * @description Handles topic search input
   * @param {any} event - Input event containing search text
   */
  onTopicSearch(event: any): void {
    if (!this.selectedSubject) return;
    
    const searchText = event.target.value.toLowerCase().trim();
    this.topicSearchText = event.target.value;
    
    if (!searchText) {
      this.filteredTopics = this.topics.slice(0, 10);
      this.exactTopicMatch = false;
      return;
    }
    
    this.filteredTopics = this.topics.filter(topic => 
      topic.name.toLowerCase().includes(searchText)
    ).slice(0, 10);
    
    this.exactTopicMatch = this.topics.some(topic => 
      topic.name.toLowerCase() === searchText
    );
  }

  /**
   * @method selectTopic
   * @description Selects a topic and updates the UI accordingly
   * @param {any} topic - Selected topic object
   */
  selectTopic(topic: any): void {
    this.selectedTopic = topic;
    this.topicSearchText = topic.name;
    this.question.topicId = topic._id;
    this.showTopicDropdown = false;
    
    // Load subtopics for selected topic
    this.onTopicChange(topic._id);
    
    // Clear dependent selections
    this.clearSubtopicSelection();
  }

  /**
   * @method clearTopicSelection
   * @description Clears topic selection and resets dependent data
   */
  clearTopicSelection(): void {
    this.selectedTopic = null;
    this.topicSearchText = '';
    this.question.topicId = '';
    this.subtopics = [];
    this.clearSubtopicSelection();
  }
  /**
   * @method createNewTopic
   * @description Creates a new topic via the API
   */  createNewTopic(): void {
    if (!this.newTopicName.trim() || !this.selectedSubject) return;
    
    // Check if topic already exists (case-insensitive)
    const topicExists = this.topics.some(topic => 
      topic.name.toLowerCase() === this.newTopicName.trim().toLowerCase()
    );
    
    if (topicExists) {
      this.notificationService.showError(`Topic "${this.newTopicName.trim()}" already exists in this subject!`);
      return;
    }
    
    this.creatingTopic = true;
    
    this.topicSrv.createTopic(this.newTopicName.trim(), this.selectedSubject._id).subscribe({
      next: (newTopic: any) => {
        // Add to topics list
        this.topics.push(newTopic);
        
        // Auto-select the new topic
        this.selectTopic(newTopic);
        
        // Reset form
        this.cancelCreateTopic();
        
        // Show success message
        this.notificationService.showSuccess(`Topic "${newTopic.name}" created successfully!`);
        
        console.log('Topic created successfully:', newTopic);
      },
      error: (error: any) => {
        console.error('Error creating topic:', error);
        this.creatingTopic = false;
        
        // Extract error message from response
        let errorMessage = 'Failed to create topic';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.notificationService.showError(errorMessage);
      }
    });
  }

  /**
   * @method cancelCreateTopic
   * @description Cancels topic creation and resets form
   */
  cancelCreateTopic(): void {
    this.showCreateTopicForm = false;
    this.newTopicName = '';
    this.creatingTopic = false;
  }

  /**
   * @method onSubtopicSearch
   * @description Handles subtopic search input
   * @param {any} event - Input event containing search text
   */
  onSubtopicSearch(event: any): void {
    if (!this.selectedTopic) return;
    
    const searchText = event.target.value.toLowerCase().trim();
    this.subtopicSearchText = event.target.value;
    
    if (!searchText) {
      this.filteredSubtopics = this.subtopics.slice(0, 10);
      this.exactSubtopicMatch = false;
      return;
    }
    
    this.filteredSubtopics = this.subtopics.filter(subtopic => 
      subtopic.name.toLowerCase().includes(searchText)
    ).slice(0, 10);
    
    this.exactSubtopicMatch = this.subtopics.some(subtopic => 
      subtopic.name.toLowerCase() === searchText
    );
  }

  /**
   * @method selectSubtopic
   * @description Selects a subtopic and updates the UI accordingly
   * @param {any} subtopic - Selected subtopic object
   */
  selectSubtopic(subtopic: any): void {
    this.selectedSubtopic = subtopic;
    this.subtopicSearchText = subtopic.name;
    this.question.subtopicId = subtopic._id;
    this.showSubtopicDropdown = false;
  }

  /**
   * @method clearSubtopicSelection
   * @description Clears subtopic selection
   */
  clearSubtopicSelection(): void {
    this.selectedSubtopic = null;
    this.subtopicSearchText = '';
    this.question.subtopicId = '';
  }
  /**
   * @method createNewSubtopic
   * @description Creates a new subtopic via the API
   */  createNewSubtopic(): void {
    if (!this.newSubtopicName.trim() || !this.selectedTopic) return;
    
    // Check if subtopic already exists (case-insensitive)
    const subtopicExists = this.subtopics.some(subtopic => 
      subtopic.name.toLowerCase() === this.newSubtopicName.trim().toLowerCase()
    );
    
    if (subtopicExists) {
      this.notificationService.showError(`Subtopic "${this.newSubtopicName.trim()}" already exists in this topic!`);
      return;
    }
    
    this.creatingSubtopic = true;
    
    this.subtopicSrv.createSubtopic(this.newSubtopicName.trim(), this.selectedTopic._id).subscribe({
      next: (newSubtopic: any) => {
        // Add to subtopics list
        this.subtopics.push(newSubtopic);
        
        // Auto-select the new subtopic
        this.selectSubtopic(newSubtopic);
        
        // Reset form
        this.cancelCreateSubtopic();
        
        // Show success message
        this.notificationService.showSuccess(`Subtopic "${newSubtopic.name}" created successfully!`);
        
        console.log('Subtopic created successfully:', newSubtopic);
      },
      error: (error: any) => {
        console.error('Error creating subtopic:', error);
        this.creatingSubtopic = false;
        
        // Extract error message from response
        let errorMessage = 'Failed to create subtopic';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        this.notificationService.showError(errorMessage);
      }
    });
  }

  /**
   * @method cancelCreateSubtopic
   * @description Cancels subtopic creation and resets form
   */
  cancelCreateSubtopic(): void {
    this.showCreateSubtopicForm = false;
    this.newSubtopicName = '';
    this.creatingSubtopic = false;
  }

  /**
   * @method debugNumericalAnswer
   * @description Debug method to check current numerical answer state
   */
  debugNumericalAnswer() {
    console.log('Current question type:', this.question.type);
    console.log('Current language:', this.currentLang);
    console.log('Current numerical answer:', this.question.translations[this.currentLang].numericalAnswer);
    console.log('Min value type:', typeof this.question.translations[this.currentLang].numericalAnswer?.minValue);
    console.log('Max value type:', typeof this.question.translations[this.currentLang].numericalAnswer?.maxValue);
  }

  /**
   * @method onQuestionTypeChange
   * @description Handle question type change and initialize numerical answer for integer questions
   */
  onQuestionTypeChange() {
    if (this.question.type === 'integer') {
      // Initialize numerical answer for all languages when type changes to integer
      Object.keys(this.question.translations).forEach(lang => {
        if (!this.question.translations[lang as LangCode].numericalAnswer) {
          this.question.translations[lang as LangCode].numericalAnswer = {
            minValue: undefined,
            maxValue: undefined,
            exactValue: undefined,
            tolerance: undefined,
            unit: ''
          };
        }
      });
    }
    console.log('Question type changed to:', this.question.type);
    console.log('Numerical answer initialized:', this.question.translations[this.currentLang].numericalAnswer);
  }
}
