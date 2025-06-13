import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadService } from '../../services/file-upload.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="image-upload-container">
      <!-- Upload Area -->
      <div class="upload-area" 
           (click)="fileInput.click()"
           (dragover)="onDragOver($event)"
           (dragleave)="onDragLeave($event)"
           (drop)="onDrop($event)"
           [class.drag-over]="isDragOver"
           [class.uploading]="isUploading">
        
        <input #fileInput 
               type="file" 
               accept="image/*" 
               (change)="onFileSelected($event)"
               style="display: none;">
        
        <div *ngIf="!imageUrl && !isUploading" class="upload-prompt">
          <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
          <p class="text-gray-600">Click to upload or drag and drop</p>
          <p class="text-sm text-gray-500">PNG, JPG, GIF, WebP up to 10MB</p>
        </div>
        
        <div *ngIf="isUploading" class="upload-loading">
          <i class="fas fa-spinner fa-spin text-2xl text-blue-500 mb-2"></i>
          <p class="text-blue-600">Uploading...</p>
        </div>
        
        <div *ngIf="imageUrl && !isUploading" class="uploaded-image">
          <img [src]="imageUrl" [alt]="'Uploaded image'" class="max-w-full max-h-48 rounded">
          <button type="button" 
                  (click)="deleteImage($event)"
                  class="delete-btn">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      
      <!-- Error Message -->
      <div *ngIf="errorMessage" class="error-message mt-2">
        <p class="text-red-600 text-sm">{{ errorMessage }}</p>
      </div>
    </div>
  `,
  styles: [`
    .upload-area {
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    
    .upload-area:hover {
      border-color: #3b82f6;
      background-color: #f8fafc;
    }
    
    .upload-area.drag-over {
      border-color: #3b82f6;
      background-color: #eff6ff;
    }
    
    .upload-area.uploading {
      border-color: #3b82f6;
      background-color: #f0f9ff;
    }
    
    .uploaded-image {
      position: relative;
      display: inline-block;
    }
    
    .delete-btn {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 12px;
    }
    
    .delete-btn:hover {
      background: #dc2626;
    }
    
    .error-message {
      padding: 0.5rem;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 4px;
    }
  `]
})
export class ImageUploadComponent {
  @Input() imageUrl: string | null = null;
  @Input() uploadMetadata: any = {};
  @Output() imageUploaded = new EventEmitter<string>();
  @Output() imageDeleted = new EventEmitter<void>();
  @Output() uploadError = new EventEmitter<string>();

  isUploading = false;
  isDragOver = false;
  errorMessage = '';

  constructor(private fileUploadService: FileUploadService) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadFile(files[0]);
    }
  }

  private uploadFile(file: File): void {
    // Validate file
    const validation = this.fileUploadService.validateImageFile(file);
    if (!validation.isValid) {
      this.errorMessage = validation.error || 'Invalid file';
      this.uploadError.emit(this.errorMessage);
      return;
    }

    // Clear previous errors
    this.errorMessage = '';
    this.isUploading = true;

    // Upload file
    this.fileUploadService.uploadQuestionImage(file, this.uploadMetadata)
      .subscribe({
        next: (response) => {
          this.isUploading = false;
          this.imageUrl = response.imageUrl;
          this.imageUploaded.emit(response.imageUrl);
        },
        error: (error) => {
          this.isUploading = false;
          this.errorMessage = error.error?.message || 'Upload failed';
          this.uploadError.emit(this.errorMessage);
        }
      });
  }

  deleteImage(event: Event): void {
    event.stopPropagation();
    
    if (!this.imageUrl) return;

    this.fileUploadService.deleteQuestionImage(this.imageUrl)
      .subscribe({
        next: () => {
          this.imageUrl = null;
          this.imageDeleted.emit();
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Delete failed';
          this.uploadError.emit(this.errorMessage);
        }
      });
  }
}
