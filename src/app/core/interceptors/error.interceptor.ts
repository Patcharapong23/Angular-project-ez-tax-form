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
import { MatDialog } from '@angular/material/dialog';
import { ErrorDialogComponent, ErrorDialogData } from '../../shared/dialogs/error-dialog/error-dialog.component';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private isDialogOpen = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private dialog: MatDialog
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 - Auto logout
        if (error.status === 401) {
          this.authService.logout();
          return throwError(() => error);
        }

        // Don't show dialog if one is already open
        if (this.isDialogOpen) {
          return throwError(() => error);
        }

        // Get error message and title based on status code
        const { title, message } = this.getErrorMessage(error);

        // Show error dialog
        this.isDialogOpen = true;
        const dialogRef = this.dialog.open(ErrorDialogComponent, {
          data: {
            title: title,
            message: message,
            statusCode: error.status || undefined,
            buttonText: 'ตกลง'
          } as ErrorDialogData,
          panelClass: 'error-dialog-panel',
          disableClose: false,
          autoFocus: false
        });

        dialogRef.afterClosed().subscribe(() => {
          this.isDialogOpen = false;
        });

        return throwError(() => error);
      })
    );
  }

  private getErrorMessage(error: HttpErrorResponse): { title: string; message: string } {
    let title = 'เกิดข้อผิดพลาด';
    let message = 'กรุณาลองใหม่อีกครั้ง';

    switch (error.status) {
      case 0:
        title = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
        message = 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
        break;
      case 400:
        title = 'ข้อมูลไม่ถูกต้อง';
        message = error.error?.message || 'กรุณาตรวจสอบข้อมูลที่กรอก';
        break;
      case 403:
        title = 'ไม่มีสิทธิ์เข้าถึง';
        message = 'คุณไม่มีสิทธิ์ในการดำเนินการนี้';
        break;
      case 404:
        title = 'ไม่พบข้อมูล';
        message = error.error?.message || 'ไม่พบข้อมูลที่ต้องการ';
        break;
      case 409:
        title = 'ข้อมูลซ้ำ';
        message = error.error?.message || 'ข้อมูลนี้มีอยู่ในระบบแล้ว';
        break;
      case 422:
        title = 'ไม่สามารถประมวลผลได้';
        message = error.error?.message || 'ข้อมูลไม่ถูกต้อง';
        break;
      case 500:
        title = 'เซิร์ฟเวอร์ขัดข้อง';
        message = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่ภายหลัง';
        break;
      case 502:
        title = 'Bad Gateway';
        message = 'เซิร์ฟเวอร์ไม่ตอบสนอง กรุณาลองใหม่ภายหลัง';
        break;
      case 503:
        title = 'ระบบไม่พร้อมใช้งาน';
        message = 'ระบบกำลังปิดปรับปรุง กรุณาลองใหม่ภายหลัง';
        break;
      case 504:
        title = 'หมดเวลาเชื่อมต่อ';
        message = 'เซิร์ฟเวอร์ใช้เวลานานเกินไป กรุณาลองใหม่';
        break;
      default:
        title = 'เกิดข้อผิดพลาด';
        message = error.error?.message || 'กรุณาลองใหม่อีกครั้ง';
    }

    return { title, message };
  }
}
