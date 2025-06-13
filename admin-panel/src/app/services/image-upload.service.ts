import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ImageUploadRequest {
  file: File;
  branchId: string;
  subjectId: string;
  topicId: string;
  imageFor: 'body' | 'option';
  optionIndex?: number;
  questionId?: string; // For editing existing questions
}

export interface ImageUploadResponse {
  imageUrl: string;
  message: string;
  s3Key?: string; // S3 key for the uploaded file
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private apiUrl = `${environment.apiUrl}/questions`; // Use environment config

  constructor(private http: HttpClient) {}

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Upload image for question (body or option)
   * Implements "Upload As You Go" approach
   */
  uploadQuestionImage(request: ImageUploadRequest): Observable<ImageUploadResponse> {
    const formData = new FormData();
    
    // Add the image file
    formData.append('questionImageFile', request.file, request.file.name);
    
    // Add context information for S3 categorization
    formData.append('branchId', request.branchId);
    formData.append('subjectId', request.subjectId);
    formData.append('topicId', request.topicId);
    formData.append('imageFor', request.imageFor);
    
    if (request.optionIndex !== undefined) {
      formData.append('optionIndex', request.optionIndex.toString());
    }
    
    if (request.questionId) {
      formData.append('questionId', request.questionId);
    }

    return this.http.post<ImageUploadResponse>(`${this.apiUrl}/upload-image`, formData, {
      headers: this.getAuthHeaders()
    });
  }
  /**
   * Delete uploaded image from S3
   */
  deleteImage(imageUrl: string): Observable<{ message: string }> {
    const headers = this.getAuthHeaders().set('Content-Type', 'application/json');
    return this.http.delete<{ message: string }>(`${this.apiUrl}/delete-image`, {
      headers,
      body: { imageUrl }
    });
  }
  /**
   * Validate image file before upload
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size too large. Maximum size allowed is 10MB.'
      };
    }

    return { isValid: true };
  }

  /**
   * Generate preview URL for local file
   */
  generatePreviewUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
