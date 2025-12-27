import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../shared/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('ErrorInterceptor: Caught error', error.status, error.url);

        // EXCLUDE LOGIN REQUEST from global error handling
        // Let LoginComponent handle its own errors with Swal
        if (request.url.includes('/auth/login') || request.url.includes('/auth/register')) {
          return throwError(() => error);
        }

        // Handle 401 - Auto logout (except login page)
        if (error.status === 401) {
          // Only auto-logout if not already on login page
          if (!this.router.url.includes('/login')) {
            this.authService.logout();
          }
          return throwError(() => error);
        }

        // Parse the standardized API error response
        // Format: { success: false, error: { code, message, detail, field, traceId } }
        const apiError = error.error?.error;
        const title = this.getErrorTitle(error.status, apiError?.code);
        const message = apiError?.message || this.getDefaultMessage(error.status);

        // Show error using SweetAlert2
        Swal.fire({
          icon: 'error',
          title: title,
          text: message,
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#ffcc00'
        });

        return throwError(() => error);
      })
    );
  }

  private getErrorTitle(status: number, code?: string): string {
    // Use error code prefix for title if available
    if (code) {
      if (code.startsWith('AUTH_')) return 'การยืนยันตัวตนล้มเหลว';
      if (code.startsWith('REG_')) return 'การลงทะเบียนล้มเหลว';
      if (code.startsWith('DATA_')) return 'ข้อมูลไม่ถูกต้อง';
      if (code.startsWith('VAL_')) return 'ข้อมูลไม่ครบถ้วน';
      if (code.startsWith('SYS_')) return 'เกิดข้อผิดพลาดในระบบ';
    }

    // Fallback to status-based titles
    switch (status) {
      case 0: return 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
      case 400: return 'ข้อมูลไม่ถูกต้อง';
      case 403: return 'ไม่มีสิทธิ์เข้าถึง';
      case 404: return 'ไม่พบข้อมูล';
      case 409: return 'ข้อมูลซ้ำ';
      case 422: return 'ไม่สามารถประมวลผลได้';
      case 423: return 'บัญชีถูกล็อก';
      case 500: return 'เซิร์ฟเวอร์ขัดข้อง';
      case 502: return 'Bad Gateway';
      case 503: return 'ระบบไม่พร้อมใช้งาน';
      case 504: return 'หมดเวลาเชื่อมต่อ';
      default: return 'เกิดข้อผิดพลาด';
    }
  }

  private getDefaultMessage(status: number): string {
    switch (status) {
      case 0: return 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      case 400: return 'กรุณาตรวจสอบข้อมูลที่กรอก';
      case 403: return 'คุณไม่มีสิทธิ์ในการดำเนินการนี้';
      case 404: return 'ไม่พบข้อมูลที่ต้องการ';
      case 409: return 'ข้อมูลนี้มีอยู่ในระบบแล้ว';
      case 422: return 'ข้อมูลไม่ถูกต้อง';
      case 423: return 'บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ภายหลัง';
      case 500: return 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่ภายหลัง';
      case 502: return 'เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองใหม่ภายหลัง';
      case 503: return 'ระบบกำลังปิดปรับปรุง กรุณาลองใหม่ภายหลัง';
      case 504: return 'เซิร์ฟเวอร์ใช้เวลานานเกินไป กรุณาลองใหม่';
      default: return 'กรุณาลองใหม่อีกครั้ง';
    }
  }
}
