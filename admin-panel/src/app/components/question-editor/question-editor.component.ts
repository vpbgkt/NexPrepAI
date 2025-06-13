import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImageUploadService, ImageUploadRequest } from '../../services/image-upload.service';

interface MathSymbol {
  symbol: string;
  latex: string;
  name: string;
}

interface QuestionOption {
  text: string;
  imageFile?: File | null;
  imagePreviewUrl?: string | null;
  imageUrl?: string | null; // S3 URL after upload
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';
}

interface Branch {
  _id: string;
  name: string;
}

interface Subject {
  _id: string;
  name: string;
  branchId: string;
}

interface Topic {
  _id: string;
  name: string;
  subjectId: string;
}

@Component({
  selector: 'app-question-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './question-editor.component.html',
  styleUrls: ['./question-editor.component.scss']
})
export class QuestionEditorComponent implements OnInit {
  
  // Question data
  questionText: string = '';
  options: QuestionOption[] = [
    { text: '', uploadStatus: 'idle' },
    { text: '', uploadStatus: 'idle' },
    { text: '', uploadStatus: 'idle' },
    { text: '', uploadStatus: 'idle' }
  ];
  correctAnswerIndex: number = 0;
  difficulty: string = 'medium';
  points: number = 1;

  // Subject Hierarchy
  selectedBranchId: string = '';
  selectedSubjectId: string = '';
  selectedTopicId: string = '';
  
  // Hierarchy Data
  branches: Branch[] = [];
  subjects: Subject[] = [];
  topics: Topic[] = [];
  filteredSubjects: Subject[] = [];
  filteredTopics: Topic[] = [];

  // Question Image
  questionImageFile: File | null = null;
  questionImagePreviewUrl: string | null = null;
  questionImageUrl: string | null = null; // S3 URL after upload
  questionImageUploadStatus: 'idle' | 'uploading' | 'success' | 'error' = 'idle';

  // UI state
  showPreview: boolean = false;

  // Mathematical symbols for toolbar
  greekSymbols: MathSymbol[] = [
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

  operators: MathSymbol[] = [
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

  relations: MathSymbol[] = [
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
    { display: 'x₁', latex: 'x_1', description: 'X subscript 1' },
    { display: '½', latex: '\\frac{1}{2}', description: 'One half' },
    { display: 'aⁿ', latex: 'a^n', description: 'A to the power n' },
    { display: '∛x', latex: '\\sqrt[3]{x}', description: 'Cube root of x' },
    { display: 'log₂', latex: '\\log_2', description: 'Log base 2' }
  ];
  // Sample data (would come from API in real app)
  // These will be replaced with actual API data
  
  constructor(private imageUploadService: ImageUploadService) {}

  ngOnInit(): void {
    this.loadHierarchyData();
  }

  loadHierarchyData(): void {
    // TODO: Replace with actual API calls
    this.branches = [
      { _id: '1', name: 'Engineering' },
      { _id: '2', name: 'Medical' },
      { _id: '3', name: 'Arts & Science' }
    ];

    this.subjects = [
      { _id: '1', name: 'Mathematics', branchId: '1' },
      { _id: '2', name: 'Physics', branchId: '1' },
      { _id: '3', name: 'Chemistry', branchId: '1' },
      { _id: '4', name: 'Biology', branchId: '2' },
      { _id: '5', name: 'Anatomy', branchId: '2' },
      { _id: '6', name: 'English', branchId: '3' },
      { _id: '7', name: 'History', branchId: '3' }
    ];

    this.topics = [
      { _id: '1', name: 'Algebra', subjectId: '1' },
      { _id: '2', name: 'Calculus', subjectId: '1' },
      { _id: '3', name: 'Geometry', subjectId: '1' },
      { _id: '4', name: 'Mechanics', subjectId: '2' },
      { _id: '5', name: 'Thermodynamics', subjectId: '2' },
      { _id: '6', name: 'Organic Chemistry', subjectId: '3' },
      { _id: '7', name: 'Inorganic Chemistry', subjectId: '3' }
    ];
  }

  // Hierarchy Change Methods
  onBranchChange(): void {
    this.selectedSubjectId = '';
    this.selectedTopicId = '';
    this.filteredSubjects = this.subjects.filter(s => s.branchId === this.selectedBranchId);
    this.filteredTopics = [];
  }

  onSubjectChange(): void {
    this.selectedTopicId = '';
    this.filteredTopics = this.topics.filter(t => t.subjectId === this.selectedSubjectId);
  }

  onTopicChange(): void {
    // Topic changed - hierarchy is now complete
  }

  isHierarchyComplete(): boolean {
    return !!(this.selectedBranchId && this.selectedSubjectId && this.selectedTopicId);
  }
  // Image Upload Methods
  onQuestionImageSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    
    if (fileList && fileList[0]) {
      const file = fileList[0];
      
      // Validate file
      const validation = this.imageUploadService.validateImageFile(file);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }
      
      this.questionImageFile = file;
      
      // Generate preview
      this.imageUploadService.generatePreviewUrl(file)
        .then(previewUrl => {
          this.questionImagePreviewUrl = previewUrl;
        })
        .catch(error => {
          console.error('Failed to generate preview:', error);
        });
      
      // Start upload immediately
      this.uploadQuestionImage();
    }
  }

  onOptionImageSelected(event: Event, optionIndex: number): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    
    if (fileList && fileList[0]) {
      const file = fileList[0];
      
      // Validate file
      const validation = this.imageUploadService.validateImageFile(file);
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }
      
      this.options[optionIndex].imageFile = file;
      
      // Generate preview
      this.imageUploadService.generatePreviewUrl(file)
        .then(previewUrl => {
          this.options[optionIndex].imagePreviewUrl = previewUrl;
        })
        .catch(error => {
          console.error('Failed to generate preview:', error);
        });
      
      // Start upload immediately
      this.uploadOptionImage(optionIndex);
    }
  }

  uploadQuestionImage(): void {
    if (!this.questionImageFile || !this.isHierarchyComplete()) return;
    
    this.questionImageUploadStatus = 'uploading';
    
    const uploadRequest: ImageUploadRequest = {
      file: this.questionImageFile,
      branchId: this.selectedBranchId,
      subjectId: this.selectedSubjectId,
      topicId: this.selectedTopicId,
      imageFor: 'body'
    };
    
    this.imageUploadService.uploadQuestionImage(uploadRequest).subscribe({
      next: (response) => {
        this.questionImageUploadStatus = 'success';
        this.questionImageUrl = response.imageUrl;
        console.log('Question image uploaded successfully:', response.imageUrl);
      },
      error: (error) => {
        this.questionImageUploadStatus = 'error';
        console.error('Question image upload failed:', error);
      }
    });
  }

  uploadOptionImage(optionIndex: number): void {
    const option = this.options[optionIndex];
    if (!option.imageFile || !this.isHierarchyComplete()) return;
    
    option.uploadStatus = 'uploading';
    
    const uploadRequest: ImageUploadRequest = {
      file: option.imageFile,
      branchId: this.selectedBranchId,
      subjectId: this.selectedSubjectId,
      topicId: this.selectedTopicId,
      imageFor: 'option',
      optionIndex: optionIndex
    };
    
    this.imageUploadService.uploadQuestionImage(uploadRequest).subscribe({
      next: (response) => {
        option.uploadStatus = 'success';
        option.imageUrl = response.imageUrl;
        console.log(`Option ${optionIndex} image uploaded successfully:`, response.imageUrl);
      },
      error: (error) => {
        option.uploadStatus = 'error';
        console.error(`Option ${optionIndex} image upload failed:`, error);
      }
    });
  }

  retryQuestionImageUpload(): void {
    this.uploadQuestionImage();
  }

  retryOptionImageUpload(optionIndex: number): void {
    this.uploadOptionImage(optionIndex);
  }

  removeQuestionImage(): void {
    this.questionImageFile = null;
    this.questionImagePreviewUrl = null;
    this.questionImageUrl = null;
    this.questionImageUploadStatus = 'idle';
  }

  removeOptionImage(optionIndex: number): void {
    const option = this.options[optionIndex];
    option.imageFile = null;
    option.imagePreviewUrl = null;
    option.imageUrl = null;
    option.uploadStatus = 'idle';
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }

  insertSymbol(latex: string): void {
    this.questionText += ` \\(${latex}\\) `;
  }

  applyFormatting(type: 'bold' | 'italic' | 'bullet'): void {
    const formats = {
      bold: '**text**',
      italic: '*text*',
      bullet: '- item'
    };
    this.questionText += ` ${formats[type]} `;
  }
  addOption(): void {
    if (this.options.length < 6) {
      this.options.push({ 
        text: '', 
        uploadStatus: 'idle' 
      });
    }
  }

  removeOption(index: number): void {
    if (this.options.length > 2) {
      this.options.splice(index, 1);
      if (this.correctAnswerIndex >= this.options.length) {
        this.correctAnswerIndex = this.options.length - 1;
      }
    }
  }
  saveQuestion(): void {
    const questionData = {
      text: this.questionText,
      imageUrl: this.questionImageUrl,
      options: this.options.map(opt => ({
        text: opt.text,
        imageUrl: opt.imageUrl
      })),
      correctAnswer: this.correctAnswerIndex,
      difficulty: this.difficulty,
      branchId: this.selectedBranchId,
      subjectId: this.selectedSubjectId,
      topicId: this.selectedTopicId,
      points: this.points
    };
    
    console.log('Saving question:', questionData);
    // Here you would call your API to save the question
  }

  isValid(): boolean {
    return this.questionText.trim() !== '' && 
           this.options.every(opt => opt.text.trim() !== '') &&
           this.isHierarchyComplete();
  }

  // Helper to convert index to letter
  String = String;
}
