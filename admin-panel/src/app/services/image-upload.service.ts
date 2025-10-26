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

  /**
   * Convert proxy URL to direct S3 URL (since bucket is public)
   * @param proxyUrl - The proxy URL (e.g., http://localhost:5000/api/images/s3-proxy?key=...)
   * @returns Direct S3 URL or original URL if conversion fails
   */
  convertToDirectS3Url(proxyUrl: string): string {
    try {
      // Extract S3 key from proxy URL
      const urlParams = new URLSearchParams(proxyUrl.split('?')[1]);
      const s3Key = urlParams.get('key');
      
      if (!s3Key) {
        return proxyUrl; // Return original if can't extract key
      }

      // Construct direct S3 URL (assuming standard S3 URL format)
      // Note: You might need to adjust this based on your actual S3 configuration
      const bucketName = 'nexprepai-storage'; // Your bucket name
      const region = 'ap-south-1'; // Your AWS region
      return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
      
    } catch (error) {
      console.error('Failed to convert proxy URL to S3 URL:', error);
      return proxyUrl; // Return original URL if conversion fails
    }
  }

  /**
   * Get signed URL for image (kept for backward compatibility, but not needed for public bucket)
   * @param proxyUrl - The proxy URL
   * @returns Observable of signed URL response
   */
  getSignedUrl(proxyUrl: string): Observable<{ signedUrl: string }> {
    // For public bucket, convert to direct S3 URL instead
    const directUrl = this.convertToDirectS3Url(proxyUrl);
    return new Observable(observer => {
      observer.next({ signedUrl: directUrl });
      observer.complete();
    });
  }

  /**
   * Check if URL is a proxy URL and needs conversion
   * @param url - Image URL to check
   * @returns boolean indicating if URL is a proxy URL
   */
  isProxyUrl(url: string): boolean {
    return url.includes('/api/images/s3-proxy');
  }
}
