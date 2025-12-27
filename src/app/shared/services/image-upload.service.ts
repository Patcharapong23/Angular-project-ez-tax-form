// src/app/shared/services/image-upload.service.ts
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpEventType,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth.service'; // Import AuthService

export interface UploadProgress {
  progress: number; // 0-100
  state: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'ERROR' | 'CANCELLED';
  url?: string;
  public_id?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  constructor(private http: HttpClient, private auth: AuthService) {} // Inject AuthService

  // Method to process image (resize, compress, convert)
  async processImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let width = img.width;
          let height = img.height;
          const maxWidth = 1600; // Max width from requirements

          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          // TODO: Implement EXIF orientation correction here if needed.
          // This often requires a library or manual parsing of EXIF data.
          // For now, drawing directly without rotation.
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to WebP if supported, otherwise JPEG
          const mimeType = canvas
            .toDataURL('image/webp')
            .startsWith('data:image/webp')
            ? 'image/webp'
            : 'image/jpeg';
          const quality = 0.8; // 0.8-0.85 from requirements

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to convert image to Blob.'));
              }
            },
            mimeType,
            quality
          );
        };
        img.onerror = (error) =>
          reject(new Error('Failed to load image for processing.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = (error) => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  // Method to upload the processed image
  uploadLogo(file: Blob): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file, 'logo.webp'); // Changed 'logo' to 'file'

    const uploadSubject = new Subject<UploadProgress>();
    const url = `${environment.apiBase}/uploads/logo`; // Consistent URL

    let headers = new HttpHeaders();
    const token = this.auth.token;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http
      .post(`${url}`, formData, {
        reportProgress: true,
        observe: 'events',
        headers: headers, // Added Authorization header
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'อัปโหลดล้มเหลว โปรดลองใหม่';
          if (error.status === 400) {
            errorMessage = 'รูปแบบการอัปโหลดไม่ถูกต้อง';
          } else if (error.status === 401 || error.status === 403) {
            errorMessage = 'ไม่ได้รับอนุญาตให้อัปโหลดโลโก้';
          } else if (error.status === 404) {
            errorMessage = 'ไม่พบผู้ขาย';
          } else if (error.status === 413) {
            errorMessage = 'ขนาดไฟล์เกิน 6MB';
          } else if (error.status === 415) {
            errorMessage = 'ประเภทไฟล์ไม่รองรับ';
          } else if (error.status === 422) {
            errorMessage = 'ข้อมูลที่ส่งไม่ถูกต้อง';
          } else if (error.status === 502) {
            errorMessage = 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง';
          }
          uploadSubject.next({
            state: 'ERROR',
            progress: 0,
            error: errorMessage,
          });
          uploadSubject.complete();
          return throwError(() => new Error(errorMessage));
        })
      )
      .subscribe((event: any) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = Math.round((100 * event.loaded) / event.total);
            uploadSubject.next({ state: 'IN_PROGRESS', progress });
            break;
          case HttpEventType.Response:
            uploadSubject.next({
              state: 'DONE',
              progress: 100,
              url: event.body.url,
              public_id: event.body.public_id,
            });
            uploadSubject.complete();
            break;
        }
      });

    return uploadSubject.asObservable();
  }

  // Method to upload the processed branch logo
  uploadBranchLogo(branchId: string, file: Blob): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file, 'logo.webp');
    formData.append('branchId', branchId);

    const uploadSubject = new Subject<UploadProgress>();
    const url = `${environment.apiBase}/uploads/branch-logo`;

    let headers = new HttpHeaders();
    const token = this.auth.token;
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http
      .post(`${url}`, formData, {
        reportProgress: true,
        observe: 'events',
        headers: headers,
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          let errorMessage = 'อัปโหลดล้มเหลว โปรดลองใหม่';
          if (error.status === 400) {
            errorMessage = 'รูปแบบการอัปโหลดไม่ถูกต้อง';
          } else if (error.status === 401 || error.status === 403) {
            errorMessage = 'ไม่ได้รับอนุญาตให้อัปโหลดโลโก้';
          } else if (error.status === 404) {
            errorMessage = 'ไม่พบสาขา';
          } else if (error.status === 413) {
            errorMessage = 'ขนาดไฟล์เกิน 6MB';
          } else if (error.status === 415) {
            errorMessage = 'ประเภทไฟล์ไม่รองรับ';
          } else if (error.status === 422) {
            errorMessage = 'ข้อมูลที่ส่งไม่ถูกต้อง';
          } else if (error.status === 502) {
            errorMessage = 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง';
          }
          uploadSubject.next({
            state: 'ERROR',
            progress: 0,
            error: errorMessage,
          });
          uploadSubject.complete();
          return throwError(() => new Error(errorMessage));
        })
      )
      .subscribe((event: any) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            const progress = Math.round((100 * event.loaded) / event.total);
            uploadSubject.next({ state: 'IN_PROGRESS', progress });
            break;
          case HttpEventType.Response:
            uploadSubject.next({
              state: 'DONE',
              progress: 100,
              url: event.body.url,
              public_id: event.body.public_id,
            });
            uploadSubject.complete();
            break;
        }
      });

    return uploadSubject.asObservable();
  }
}
