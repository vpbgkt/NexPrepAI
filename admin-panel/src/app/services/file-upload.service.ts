import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  imageUrl: string;
  message: string;
  s3Key: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = `${environment.apiUrl}/questions`;

  constructor(private http: HttpClient) {}

  /**
   * Upload image for question
   * @param file - Image file to upload
   * @param metadata - Upload metadata
   * @returns Observable<UploadResponse>
   */
  uploadQuestionImage(
    file: File, 
    metadata: {
      branchId: string;
      subjectId: string;
      topicId: string;
      imageFor: 'body' | 'option';
      optionIndex?: number;
      questionId?: string;
    }
  ): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('questionImageFile', file);
    formData.append('branchId', metadata.branchId);
    formData.append('subjectId', metadata.subjectId);
    formData.append('topicId', metadata.topicId);
    formData.append('imageFor', metadata.imageFor);
    
    if (metadata.optionIndex !== undefined) {
      formData.append('optionIndex', metadata.optionIndex.toString());
    }
    
    if (metadata.questionId) {
      formData.append('questionId', metadata.questionId);
    }

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<UploadResponse>(`${this.apiUrl}/upload-image`, formData, { headers });
  }

  /**
   * Delete image from S3
   * @param imageUrl - S3 URL of image to delete
   * @returns Observable<any>
   */
  deleteQuestionImage(imageUrl: string): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.delete(`${this.apiUrl}/delete-image`, {
      headers,
      body: { imageUrl }
    });
  }

  /**
   * Validate file before upload
   * @param file - File to validate
   * @returns object with isValid and error message
   */
  validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Only JPEG, PNG, GIF, and WebP image files are allowed.'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size must be less than 10MB.'
      };
    }

    return { isValid: true };
  }

  /**
   * Get S3 URL for displaying images
   * @param s3Key - S3 key
   * @returns Full S3 URL
   */
  getS3Url(s3Key: string): string {
    return `https://nexprepai-storage.s3.ap-south-1.amazonaws.com/${s3Key}`;
  }
}
