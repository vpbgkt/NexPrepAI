/**
 * @fileoverview Smart Question Upload Component for NexPrepAI Admin Panel
 * @description Advanced question upload interface that processes JSON format questions
 * with automatic hierarchy resolution, image handling, and preview functionality.
 * 
 * @module SmartUploadComponent
 * @requires @angular/core
 * @requires @angular/common
 * @requires @angular/forms
 * @requires QuestionService
 * @author NexPrepAI Development Team
 * @since 2.0.0
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { QuestionService } from '../../services/question.service';
import { ImageUploadService, ImageUploadRequest } from '../../services/image-upload.service';
import { NotificationService } from '../../services/notification.service';

/**
 * @interface SmartQuestionData
 * @description Structure for smart upload question data
 */
interface SmartQuestionData {
  difficulty: string;
  type: string;
  status: string;
  branchId: string;
  subjectId: string;
  topicId: string;
  subtopicId: string;
  tags: string[];
  recommendedTimeAllotment: number;
  internalNotes: string;
  questionHistory: Array<{examName: string; year: number}>;
  translations: Array<{
    lang: string;
    questionText: string;
    options: Array<{text: string; img: string; isCorrect: boolean}>;
    explanations: Array<{type: string; label: string; content: string}>;
    images: string[];
  }>;
}

/**
 * @interface ProcessedResponse
 * @description Response from smart upload process endpoint
 */
interface ProcessedResponse {
  processedQuestion: SmartQuestionData;
  hierarchyResolution: any;
  imageInfo: {
    hasImages: boolean;
    imageRequirements: Array<{
      type: string;
      path: string;
      language: string;
      description: string;
    }>;
    nextStep: string;
  };
}

// Image assignment interface for structured image handling
interface ImageAssignment {
  url: string;
  type: 'question' | 'option' | 'explanation';
  language: 'en' | 'hi' | 'both';
  optionIndex?: number; // For option images (0=A, 1=B, 2=C, 3=D)
  description: string;
  uploadMethod: 'url' | 'file'; // New field to track upload method
  file?: File; // For file uploads
  isUploading?: boolean; // Upload status
  uploadError?: string; // Upload error message
}

@Component({
  selector: 'app-smart-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './smart-upload.component.html',
  styleUrls: ['./smart-upload.component.scss']
})
export class SmartUploadComponent implements OnInit {
  // Services
  private questionService = inject(QuestionService);
  private imageUploadService = inject(ImageUploadService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Component state
  currentStep: 'input' | 'processing' | 'ask-images' | 'images' | 'preview' | 'complete' = 'input';
  isLoading = false;
  
  // Expose Object and String to template
  Object = Object;
  String = String;
  
  // Step 1: JSON Input
  jsonInput = '';
  jsonError = '';
  sampleJson = {
    "difficulty": "Medium",
    "type": "single",
    "status": "Published",
    "branch": "Mathematics", // Can also use "branchId"
    "subject": "Quantitative Aptitude", // Can also use "subjectId"
    "topic": "Data Interpretation", // Can also use "topicId"
    "subTopic": "Tabular DI (Percentages)", // Can also use "subtopicId"
    "tags": ["ssc cgl", "quantitative aptitude", "mathematics"],
    "recommendedTimeAllotment": 60,
    "internalNotes": "",
    "questionHistory": [
      {
        "examName": "SSC CGL 2024 (Tier-I) Previous Year Paper",
        "year": 2024
      }
    ],
    "translations": [
      {
        "lang": "en",
        "questionText": "Sample question text here...",
        "options": [
          {"text": "Option A", "img": "", "isCorrect": false},
          {"text": "Option B", "img": "", "isCorrect": true}
        ],
        "explanations": [
          {"type": "text", "label": "", "content": "Explanation here..."}
        ],
        "images": []
      }
    ]
  };

  // Step 2: Processing Results
  processedQuestion: SmartQuestionData | null = null;
  hierarchyResolution: {[key: string]: {name: string; created: boolean; id: string}} | null = null;
  imageInfo: any = null;

  // Step 2.5: Image Question
  hasImagesAnswer: boolean | null = null;

  // Step 3: Image Upload/Assignment
  imageRequirements: any[] = [];
  uploadedImages: { [key: string]: string } = {};
  currentImageUpload: any = null;
  manualImageUrls: string[] = [];
  imageAssignments: ImageAssignment[] = [];

  // Step 4: Preview
  previewData: any = null;
  validationErrors: string[] = [];

  ngOnInit(): void {
    // Start with empty input - user needs to provide their own JSON
  }

  /**
   * Step 1: Process JSON input and resolve hierarchy
   */
  async processJson(): Promise<void> {
    if (!this.jsonInput.trim()) {
      this.jsonError = 'Please enter question JSON data';
      return;
    }

    try {
      // Validate JSON format
      const questionData = JSON.parse(this.jsonInput);
      this.jsonError = '';
      
      this.isLoading = true;
      this.currentStep = 'processing';

      // Call smart upload process endpoint
      const response = await this.questionService.smartUploadProcess(questionData).toPromise();
      
      if (!response) {
        throw new Error('No response from smart upload process service');
      }
      
      this.processedQuestion = response.processedQuestion;
      this.hierarchyResolution = response.hierarchyResolution;
      this.imageInfo = response.imageInfo;

      this.notificationService.showSuccess('Question processed successfully! Hierarchy resolved.');
      
      // Always ask user about images instead of auto-detecting
      this.currentStep = 'ask-images';

    } catch (error: any) {
      this.jsonError = error.error?.message || 'Invalid JSON format or processing error';
      this.currentStep = 'input';
      this.notificationService.showError('Failed to process question: ' + this.jsonError);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Step 2.5: Handle user's answer about images
   */
  answerHasImages(hasImages: boolean): void {
    this.hasImagesAnswer = hasImages;
    
    if (hasImages) {
      this.currentStep = 'images';
    } else {
      // Skip to preview
      this.generatePreview();
    }
  }

  /**
   * Manual Image Assignment Methods
   */
  addImageAssignment(): void {
    this.imageAssignments.push({
      url: '',
      type: 'question',
      language: 'both',
      uploadMethod: 'url',
      description: `Image ${this.imageAssignments.length + 1} - Question body`
    });
  }

  removeImageAssignment(index: number): void {
    this.imageAssignments.splice(index, 1);
    this.updateImageDescriptions();
  }

  updateImageType(index: number): void {
    const assignment = this.imageAssignments[index];
    if (assignment.type === 'option') {
      assignment.optionIndex = 0; // Default to option A
    } else {
      delete assignment.optionIndex;
    }
    this.updateImageDescription(index);
  }

  updateImageDescription(index: number): void {
    const assignment = this.imageAssignments[index];
    let baseDescription = '';
    
    switch (assignment.type) {
      case 'question':
        baseDescription = `Image ${index + 1} - Question body (${assignment.language === 'both' ? 'English & Hindi' : assignment.language.toUpperCase()})`;
        break;
      case 'option':
        const optionLetter = String.fromCharCode(65 + (assignment.optionIndex || 0)); // A, B, C, D
        baseDescription = `Image ${index + 1} - Option ${optionLetter} (${assignment.language === 'both' ? 'English & Hindi' : assignment.language.toUpperCase()})`;
        break;
      case 'explanation':
        baseDescription = `Image ${index + 1} - Explanation (${assignment.language === 'both' ? 'English & Hindi' : assignment.language.toUpperCase()})`;
        break;
    }
    
    // Add file info if file is selected
    if (assignment.file) {
      baseDescription += ` - ${assignment.file.name}`;
    }
    
    assignment.description = baseDescription;
  }

  updateImageDescriptions(): void {
    this.imageAssignments.forEach((_, index) => {
      this.updateImageDescription(index);
    });
  }

  // File upload methods
  onFileSelected(index: number, event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file
      const validation = this.imageUploadService.validateImageFile(file);
      if (!validation.isValid) {
        this.imageAssignments[index].uploadError = validation.error;
        return;
      }

      // Clear previous errors and URL
      this.imageAssignments[index].uploadError = undefined;
      this.imageAssignments[index].file = file;
      this.imageAssignments[index].url = '';
      
      // Update description to show file is selected
      this.updateImageDescription(index);
    }
  }

  async uploadImage(index: number): Promise<void> {
    const assignment = this.imageAssignments[index];
    if (!assignment.file || !this.processedQuestion) return;

    try {
      assignment.isUploading = true;
      
      // Get hierarchy IDs for upload context
      const hierarchyIds = this.getHierarchyIds();
      
      const uploadRequest = {
        file: assignment.file,
        branchId: hierarchyIds.branchId,
        subjectId: hierarchyIds.subjectId,
        topicId: hierarchyIds.topicId,
        imageFor: (assignment.type === 'question' ? 'body' : 'option') as 'body' | 'option',
        optionIndex: assignment.optionIndex
      };

      const response = await this.imageUploadService.uploadQuestionImage(uploadRequest).toPromise();
      
      if (response) {
        assignment.url = response.imageUrl;
        assignment.isUploading = false;
        assignment.uploadError = undefined;
        this.updateImageDescription(index);
        this.notificationService.showSuccess(`Image uploaded successfully for ${assignment.description}`);
      }

    } catch (error: any) {
      assignment.isUploading = false;
      assignment.uploadError = error.error?.message || 'Upload failed';
      this.notificationService.showError('Failed to upload image: ' + assignment.uploadError);
    }
  }

  private getHierarchyIds(): { branchId: string; subjectId: string; topicId: string } {
    if (!this.hierarchyResolution) {
      throw new Error('Hierarchy not resolved');
    }
    
    return {
      branchId: this.hierarchyResolution['branch']?.id || '',
      subjectId: this.hierarchyResolution['subject']?.id || '',
      topicId: this.hierarchyResolution['topic']?.id || ''
    };
  }

  removeUploadedImage(index: number): void {
    const assignment = this.imageAssignments[index];
    if (assignment.url && assignment.uploadMethod === 'file') {
      // Delete from server if it was uploaded
      this.imageUploadService.deleteImage(assignment.url).subscribe({
        next: () => {
          assignment.url = '';
          assignment.file = undefined;
          assignment.uploadError = undefined;
          this.notificationService.showSuccess('Image deleted successfully');
        },
        error: (error) => {
          this.notificationService.showError('Failed to delete image: ' + (error.error?.message || error.message));
        }
      });
    } else {
      // Just clear the URL
      assignment.url = '';
      assignment.file = undefined;
      assignment.uploadError = undefined;
    }
  }

  getOptionLabel(index: number): string {
    return String.fromCharCode(65 + index); // A, B, C, D
  }

  getAvailableOptions(): number[] {
    if (!this.processedQuestion?.translations?.[0]?.options) return [];
    return Array.from({length: this.processedQuestion.translations[0].options.length}, (_, i) => i);
  }

  continueWithImages(): void {
    // Apply image assignments to the processed question
    if (this.processedQuestion && this.imageAssignments.length > 0) {
      this.applyImageAssignments();
    }
    
    this.currentStep = 'preview';
    this.generatePreview();
  }

  private applyImageAssignments(): void {
    if (!this.processedQuestion?.translations) return;

    // Process each assignment
    this.imageAssignments.forEach(assignment => {
      if (!assignment.url.trim()) return;

      const languages = assignment.language === 'both' ? ['en', 'hi'] : [assignment.language];
      
      languages.forEach(lang => {
        const translation = this.processedQuestion!.translations.find((t: any) => t.lang === lang);
        if (!translation) return;

        switch (assignment.type) {
          case 'question':
            if (!translation.images) translation.images = [];
            translation.images.push(assignment.url);
            break;
          
          case 'option':
            if (translation.options && assignment.optionIndex !== undefined) {
              const option = translation.options[assignment.optionIndex];
              if (option) option.img = assignment.url;
            }
            break;
          
          case 'explanation':
            if (!translation.explanations) translation.explanations = [];
            translation.explanations.push({
              type: 'image',
              label: '',
              content: assignment.url
            });
            break;
        }
      });
    });
  }

  // Legacy methods (keeping for backward compatibility)
  addImageUrl(): void {
    this.manualImageUrls.push('');
  }

  removeImageUrl(index: number): void {
    this.manualImageUrls.splice(index, 1);
  }
  async uploadImageFromRequirement(requirement: any, fileInput: HTMLInputElement): Promise<void> {
    const file = fileInput.files?.[0];
    if (!file) return;

    try {
      this.isLoading = true;
      this.currentImageUpload = requirement;

      // Upload image using existing service
      const uploadRequest: ImageUploadRequest = {
        file,
        branchId: this.processedQuestion!.branchId,
        subjectId: this.processedQuestion!.subjectId,
        topicId: this.processedQuestion!.topicId,
        imageFor: requirement.type === 'option_image' ? 'option' : 'body',
        optionIndex: requirement.path.includes('options[') ? this.extractOptionIndex(requirement.path) : undefined
      };

      const response = await this.imageUploadService.uploadQuestionImage(uploadRequest).toPromise();
      
      if (!response) {
        throw new Error('No response from image upload service');
      }
      
      // Store uploaded image URL
      this.uploadedImages[requirement.path] = response.imageUrl;
      
      this.notificationService.showSuccess(`Image uploaded successfully for ${requirement.description}`);
      
      // Check if all images are uploaded
      if (Object.keys(this.uploadedImages).length === this.imageRequirements.length) {
        await this.updateQuestionWithImages();
      }

    } catch (error: any) {
      this.notificationService.showError('Failed to upload image: ' + (error.error?.message || error.message));
    } finally {
      this.isLoading = false;
      this.currentImageUpload = null;
    }
  }

  /**
   * Update question with uploaded image URLs
   */
  private async updateQuestionWithImages(): Promise<void> {
    try {
      const imageUpdates = Object.entries(this.uploadedImages).map(([path, imageUrl]) => ({
        path,
        imageUrl
      }));

      const response = await this.questionService.smartUploadUpdateImages(
        this.processedQuestion!,
        imageUpdates
      ).toPromise();

      if (!response) {
        throw new Error('No response from update images service');
      }

      this.processedQuestion = response.updatedQuestion;
      this.notificationService.showSuccess('All images uploaded and question updated!');
      
      // Move to preview
      await this.generatePreview();

    } catch (error: any) {
      this.notificationService.showError('Failed to update question with images: ' + (error.error?.message || error.message));
    }
  }

  /**
   * Step 3: Generate preview
   */
  async generatePreview(): Promise<void> {
    try {
      this.isLoading = true;
      this.currentStep = 'preview';

      const response = await this.questionService.smartUploadPreview(
        this.processedQuestion!,
        false // Just preview, don't save yet
      ).toPromise();

      if (!response) {
        throw new Error('No response from preview service');
      }

      this.previewData = response.preview;
      this.validationErrors = response.validation?.errors || [];

      if (this.validationErrors.length > 0) {
        this.notificationService.showWarning('Question has validation errors. Please review before saving.');
      }

    } catch (error: any) {
      this.notificationService.showError('Failed to generate preview: ' + (error.error?.message || error.message));
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Step 4: Final save to database
   */
  async saveQuestion(): Promise<void> {
    if (this.validationErrors.length > 0) {
      this.notificationService.showError('Please fix validation errors before saving');
      return;
    }

    try {
      this.isLoading = true;

      const response = await this.questionService.smartUploadPreview(
        this.processedQuestion!,
        true // Confirm save
      ).toPromise();

      if (!response) {
        throw new Error('No response from save service');
      }

      this.notificationService.showSuccess('Question uploaded successfully!');
      this.currentStep = 'complete';

      // Note: Auto-redirect removed - user can manually navigate back if needed

    } catch (error: any) {
      this.notificationService.showError('Failed to save question: ' + (error.error?.message || error.message));
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Utility methods
   */
  loadSampleJson(): void {
    this.jsonInput = JSON.stringify(this.sampleJson, null, 2);
    this.jsonError = '';
  }

  resetForm(): void {
    this.currentStep = 'input';
    this.processedQuestion = null;
    this.hierarchyResolution = null;
    this.imageInfo = null;
    this.hasImagesAnswer = null;
    this.imageRequirements = [];
    this.uploadedImages = {};
    this.manualImageUrls = [];
    this.imageAssignments = [];
    this.previewData = null;
    this.validationErrors = [];
    this.jsonInput = '';
    this.jsonError = '';
  }

  goBack(): void {
    switch (this.currentStep) {
      case 'processing':
      case 'ask-images':
        this.currentStep = 'input';
        break;
      case 'images':
        this.currentStep = 'ask-images';
        break;
      case 'preview':
        this.currentStep = this.hasImagesAnswer ? 'images' : 'ask-images';
        break;
    }
  }

  private extractOptionIndex(path: string): number {
    const match = path.match(/options\[(\d+)\]/);
    return match ? parseInt(match[1]) : 0;
  }

  isImageUploaded(requirement: any): boolean {
    return !!this.uploadedImages[requirement.path];
  }

  getUploadedImageUrl(requirement: any): string {
    return this.uploadedImages[requirement.path] || '';
  }
}