/**
 * @fileoverview Question Detail Component
 * 
 * This component provides a comprehensive view for displaying detailed information
 * about a single question in the NexPrepAI admin panel. It handles the visualization
 * of question data including multilingual translations, hierarchical categorization,
 * options, explanations, metadata, and administrative information.
 * 
 * @component QuestionDetailComponent
 * @selector app-question-detail
 * 
 * @description Key Features:
 * - Detailed question information display
 * - Multilingual translation support
 * - Hierarchical categorization visualization (Branch/Subject/Topic/Subtopic)
 * - Question options and correct answer indicators
 * - Question explanations rendering
 * - Metadata display (difficulty, type, status, timing)
 * - Administrative information (creation dates, version tracking)
 * - Error handling and loading states
 * - Responsive data formatting and display utilities
 * 
 * @used_in
 * - Admin panel question management workflows
 * - Question review and verification processes
 * - Content auditing and quality assurance
 * - Question analysis and reporting
 * 
 * @dependencies
 * - QuestionService: For fetching question data
 * - ActivatedRoute: For retrieving question ID from route parameters
 * - Question model: Type definitions for question structure
 * 
 * @author NexPrepAI Development Team
 * @version 1.0.0
 */

// filepath: c:\Users\vpbgk\OneDrive\Desktop\project\NexPrepAI\admin-panel\src\app\components\question-detail\question-detail.component.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { Question, PopulatedHierarchyField } from '../../models/question.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * @class QuestionDetailComponent
 * @implements {OnInit}
 * 
 * @description
 * Angular component responsible for displaying comprehensive details of a single question
 * in the admin panel. This component provides a read-only view of question information,
 * including all translations, hierarchical categorization, options, explanations, and
 * administrative metadata. It serves as a detailed inspection tool for administrators
 * to review question content and verify data integrity.
 * 
 * @component_features
 * - Question data loading with route parameter extraction
 * - Multilingual translation display and switching
 * - Hierarchical categorization visualization
 * - Question options with correct answer highlighting
 * - Explanation content rendering
 * - Metadata and administrative information display
 * - Error handling and loading state management
 * - Data formatting utilities for various field types
 * 
 * @ui_capabilities
 * - Responsive question detail layout
 * - Translation language selector
 * - Formatted display of all question properties
 * - Error message presentation
 * - Loading indicator during data fetch
 */
@Component({
  selector: 'app-question-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './question-detail.component.html',
  styleUrls: ['./question-detail.component.scss']
})
export class QuestionDetailComponent implements OnInit {
  /**
   * @property {Question | undefined} question
   * @description The complete question object containing all data including translations,
   * options, explanations, hierarchical categorization, and metadata
   */
  question: Question | undefined;

  /**
   * @property {boolean} isLoading
   * @description Loading state indicator for data fetching operations
   * @default true
   */
  isLoading = true;

  /**
   * @property {string} errorMessage
   * @description Error message to display when question loading fails
   * @default ''
   */
  errorMessage = '';

  /**
   * @property {string | null} zoomedImage
   * @description URL of the currently zoomed image, null when no image is zoomed
   * @default null
   */
  zoomedImage: string | null = null;

  /**
   * @property {boolean} showImageModal
   * @description Flag to control the visibility of the image zoom modal
   * @default false
   */
  showImageModal = false;

  /**
   * @constructor
   * @description Initializes the QuestionDetailComponent with required services
   * 
   * @param {ActivatedRoute} route - Angular router service for accessing route parameters
   * @param {QuestionService} questionService - Service for question data operations
   */
  constructor(
    private route: ActivatedRoute,
    private questionService: QuestionService
  ) {}

  /**
   * @method ngOnInit
   * @description Angular lifecycle hook that initializes the component and loads question data
   * @returns {void}
   * 
   * @description
   * This method executes during component initialization and handles:
   * - Extracting question ID from route parameters
   * - Fetching question data from the backend service
   * - Managing loading states and error handling
   * - Setting up the component for data display
   * 
   * @workflow
   * 1. Extract question ID from route snapshot parameters
   * 2. Validate question ID existence
   * 3. Call QuestionService to fetch question data
   * 4. Handle successful data loading
   * 5. Handle errors with appropriate error messages
   * 6. Update loading state accordingly
   * 
   * @example
   * ```typescript
   * // Component initialization automatically calls ngOnInit
   * // Route: /questions/64f8a1b2c3d4e5f6a7b8c9d1
   * this.ngOnInit();
   * // Loads question with ID from route parameter
   * ```
   */
  ngOnInit(): void {
    const questionId = this.route.snapshot.paramMap.get('id');
    if (questionId) {
      this.questionService.getQuestionById(questionId).subscribe({
        next: (data) => {
          this.question = data;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load question details.';
          console.error(err);
          this.isLoading = false;
        }
      });
    } else {
      this.errorMessage = 'Question ID not found.';
      this.isLoading = false;
    }
  }
  /**
   * @method getTranslation
   * @description Retrieves a specific translation from the question's translations array
   * @param {string} langCode - Language code to search for (e.g., 'en', 'hi', 'te')
   * @returns {object | undefined} Translation object if found, undefined otherwise
   * 
   * @description
   * This utility method searches through the question's translations array to find
   * a translation matching the specified language code. Used for displaying
   * question content in different languages within the detail view.
   * 
   * @example
   * ```typescript
   * const englishTranslation = this.getTranslation('en');
   * const hindiTranslation = this.getTranslation('hi');
   * // Returns translation object or undefined if not found
   * ```
   */
  // Helper to get a specific translation
  getTranslation(langCode: string) {
    return this.question?.translations?.find(t => t.lang === langCode);
  }
  /**
   * @method getOptionText
   * @description Safely extracts text content from a question option object
   * @param {any} option - Option object containing text property
   * @returns {string} Option text or 'N/A' if not available
   * 
   * @description
   * This utility method provides safe access to option text with fallback handling.
   * Prevents errors when displaying options that may have missing or undefined text.
   * 
   * @example
   * ```typescript
   * const optionText = this.getOptionText(question.options[0]);
   * // Returns "Option A text" or "N/A" if text is missing
   * ```
   */
  // Helper to get option text
  getOptionText(option: any): string {
    return option?.text || 'N/A';
  }

  /**
   * @method getHierarchyName
   * @description Safely extracts the name from a hierarchical field object or returns the ID.
   * @param {any} field - Hierarchical field data, which can be a string (ID),
   *                      an object with an $oid property (ID), or a PopulatedHierarchyField object.
   * @returns {string} The name of the hierarchical entity or its ID if the name is not available.
   * 
   * @description
   * This utility method handles the display of hierarchical fields like Branch, Subject, Topic, and Subtopic.
   * It checks if the field is populated (i.e., an object with a 'name' property) and returns the name.
   * If the field is not populated, it returns the ID string.
   * 
   * @example
   * ```typescript
   * const branchName = this.getHierarchyName(this.question.branch);
   * // Returns "Science" if question.branch is { _id: '...', name: 'Science' }
   * // Returns "60d5f1b2c3d4e5f6a7b8c9d0" if question.branch is '60d5f1b2c3d4e5f6a7b8c9d0'
   * // or { $oid: '60d5f1b2c3d4e5f6a7b8c9d0' }
   * ```
   */
  getHierarchyName(field: any): string {
    if (field && typeof field === 'object' && field.name) {
      return field.name; // Covers PopulatedHierarchyField
    }
    if (field && typeof field === 'object' && field.$oid) {
      return field.$oid; // Covers { $oid: string }
    }
    if (typeof field === 'string') {
      return field; // Covers string ID
    }
    return 'N/A'; // Fallback for undefined or unexpected structure
  }

  /**
   * @method getIdString
   * @description Converts various ID formats to display-ready string representation
   * @param {any} idValue - ID value in various formats (string, ObjectId, $oid object)
   * @returns {string} String representation of the ID or empty string if invalid
   * 
   * @description
   * This utility method handles the complexity of MongoDB ObjectId formats that may
   * appear in different representations (plain string, $oid object, ObjectId instance).
   * Provides consistent string output for display purposes.
   * 
   * @example
   * ```typescript
   * const id1 = this.getIdString("64f8a1b2c3d4e5f6a7b8c9d1"); // Direct string
   * const id2 = this.getIdString({ $oid: "64f8a1b2c3d4e5f6a7b8c9d1" }); // MongoDB format
   * // Both return: "64f8a1b2c3d4e5f6a7b8c9d1"
   * ```
   */
  // Helper to get string ID for display
  getIdString(idValue: any): string {
    if (!idValue) return '';
    if (typeof idValue === 'string') return idValue;
    if (idValue.$oid) return idValue.$oid;
    return String(idValue); // Fallback
  }
  /**
   * @method formatDate
   * @description Converts various date formats to JavaScript Date objects for display
   * @param {any} dateValue - Date value in various formats (Date, string, MongoDB $date, timestamp)
   * @returns {Date | null} JavaScript Date object or null if invalid
   * 
   * @description
   * This comprehensive date formatting utility handles multiple date representations
   * commonly encountered when working with MongoDB data and JSON serialization.
   * Supports standard JavaScript dates, ISO strings, MongoDB $date formats, and timestamps.
   * 
   * @supported_formats
   * - JavaScript Date objects
   * - ISO date strings
   * - MongoDB $date format with $numberLong
   * - MongoDB $date format (standard)
   * - Unix timestamps (numbers)
   * 
   * @example
   * ```typescript
   * const date1 = this.formatDate("2024-01-01T00:00:00.000Z"); // ISO string
   * const date2 = this.formatDate({ $date: { $numberLong: "1704067200000" } }); // MongoDB format
   * const date3 = this.formatDate(1704067200000); // Timestamp
   * // All return valid Date objects for Angular date pipe
   * ```
   */
  // Helper to format date for the date pipe
  formatDate(dateValue: any): Date | null {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'string') return new Date(dateValue);
    // Handle MongoDB $date format if present
    if (dateValue.$date && dateValue.$date.$numberLong) {
      return new Date(parseInt(dateValue.$date.$numberLong, 10));
    }
    if (dateValue.$date) { // Fallback for other $date structures
        return new Date(dateValue.$date);
    }
    // Try to parse if it's a number (timestamp)
    if (typeof dateValue === 'number') return new Date(dateValue);
    return null; // Or throw an error, or handle as invalid date
  }
  /**
   * @method getDisplayVersion
   * @description Converts version numbers from various formats to display-ready strings
   * @param {any} version - Version value in various formats (number, $numberInt object, undefined)
   * @returns {string} String representation of version number or 'N/A' if invalid
   * 
   * @description
   * This utility method handles MongoDB's numeric representation formats, particularly
   * the $numberInt wrapper that may appear in serialized data. Provides consistent
   * version number display for question versioning information.
   * 
   * @supported_formats
   * - $numberInt object: MongoDB integer format
   * - Number: Direct numeric value
   * - undefined/null: Missing version data
   * - Other types: Converted to string representation
   * 
   * @example
   * ```typescript
   * const version1 = this.getDisplayVersion({ $numberInt: "2" }); // Returns "2"
   * const version2 = this.getDisplayVersion(3); // Returns "3"
   * const version3 = this.getDisplayVersion(undefined); // Returns "N/A"
   * ```
   */
  // ADDED: Helper method to get display version
  getDisplayVersion(version: any): string {
    if (typeof version === 'object' && version !== null && version.hasOwnProperty('$numberInt')) {
      return version.$numberInt;
    }
    if (version === undefined || version === null) {
      return 'N/A';
    }
    return String(version);
  }

  /**
   * @method onImageError
   * @description Handles image loading errors by setting a placeholder or hiding broken images
   * @param {Event} event - Image error event
   * @returns {void}
   * 
   * @description
   * This method is called when an image fails to load (e.g., broken URL, network issue).
   * It replaces the broken image with a placeholder or error message to improve user experience.
   * 
   * @example
   * ```html
   * <img [src]="imageUrl" (error)="onImageError($event)">
   * ```
   */
  onImageError(event: any): void {
    const img = event.target;
    img.style.display = 'none'; // Hide broken image
    
    // Optionally, you could set a placeholder image instead:
    // img.src = 'assets/images/image-placeholder.png';
    
    console.warn('Failed to load image:', img.src);
  }

  /**
   * @method openImageModal
   * @description Opens the image zoom modal with the specified image
   * @param {string} imageUrl - URL of the image to display in zoom mode
   * @returns {void}
   * 
   * @description
   * This method sets the image to be displayed in the zoom modal and shows the modal.
   * Used when users click on images to view them in larger size.
   * 
   * @example
   * ```html
   * <img [src]="imageUrl" (click)="openImageModal(imageUrl)">
   * ```
   */
  openImageModal(imageUrl: string): void {
    this.zoomedImage = imageUrl;
    this.showImageModal = true;
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  }

  /**
   * @method closeImageModal
   * @description Closes the image zoom modal
   * @returns {void}
   * 
   * @description
   * This method hides the image zoom modal and restores normal page scrolling.
   * Can be triggered by clicking the close button, clicking outside the image, or pressing escape.
   */
  closeImageModal(): void {
    this.showImageModal = false;
    this.zoomedImage = null;
    // Restore body scrolling
    document.body.style.overflow = 'auto';
  }

  /**
   * @method onModalBackdropClick
   * @description Handles clicks on the modal backdrop to close the modal
   * @param {Event} event - Click event
   * @returns {void}
   * 
   * @description
   * This method closes the modal when users click on the backdrop (outside the image).
   * It checks if the click target is the backdrop element to prevent closing when clicking the image itself.
   */
  onModalBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeImageModal();
    }
  }

  /**
   * @method onKeyDown
   * @description Handles keyboard events for the component
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {void}
   * 
   * @description
   * This method listens for keyboard events and handles:
   * - Escape key: Closes the image zoom modal if it's open
   */
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.showImageModal) {
      this.closeImageModal();
    }
  }
}
