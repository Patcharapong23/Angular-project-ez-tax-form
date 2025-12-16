import { Injectable, NgZone } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import Swal, { SweetAlertResult, SweetAlertOptions } from 'sweetalert2';
import { SuccessDialogComponent, SuccessDialogData } from '../dialogs/success-dialog/success-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../dialogs/confirm-dialog/confirm-dialog.component';
import { ErrorDialogComponent, ErrorDialogData } from '../dialogs/error-dialog/error-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class SwalService {

  constructor(
    private ngZone: NgZone,
    private dialog: MatDialog
  ) {}

  /**
   * แสดง Success Dialog (ใช้ Angular Material Dialog)
   */
  success(title: string, text?: string, timer: number = 2000): Promise<any> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(SuccessDialogComponent, {
        data: {
          title: title,
          message: text,
          icon: 'success',
          timer: timer
        } as SuccessDialogData,
        panelClass: 'success-dialog-panel',
        disableClose: false,
        autoFocus: false
      });

      dialogRef.afterClosed().subscribe(() => {
        resolve({ isConfirmed: true });
      });
    });
  }

  /**
   * แสดง Error Dialog (ใช้ Angular Material Dialog)
   */
  error(title: string, text?: string): Promise<any> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(ErrorDialogComponent, {
        data: {
          title: title,
          message: text,
          buttonText: 'ตกลง'
        } as ErrorDialogData,
        panelClass: 'error-dialog-panel',
        disableClose: false,
        autoFocus: false
      });

      dialogRef.afterClosed().subscribe(() => {
        resolve({ isConfirmed: true });
      });
    });
  }

  /**
   * แสดง Warning Dialog
   */
  warning(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#f8bb86',
      heightAuto: false,
      returnFocus: false,
      focusConfirm: false,
      customClass: {
        popup: 'swal2-popup-custom',
        title: 'swal2-title-custom',
      }
    });
  }

  /**
   * แสดง Info Dialog
   */
  info(title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#3085d6',
      heightAuto: false,
      returnFocus: false,
      focusConfirm: false,
      customClass: {
        popup: 'swal2-popup-custom',
        title: 'swal2-title-custom',
      }
    });
  }

  /**
   * แสดง Confirm Dialog สำหรับการลบ (ใช้ Angular Material Dialog)
   */
  confirmDelete(
    title: string, 
    text: string, 
    confirmButtonText: string = 'ลบ',
    cancelButtonText: string = 'ยกเลิก'
  ): Promise<{ isConfirmed: boolean }> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: title,
          message: text,
          confirmButtonText: confirmButtonText,
          cancelButtonText: cancelButtonText,
          icon: 'warning'
        } as ConfirmDialogData,
        panelClass: 'confirm-dialog-panel',
        disableClose: false,
        autoFocus: false
      });

      dialogRef.afterClosed().subscribe((result) => {
        resolve({ isConfirmed: result === true });
      });
    });
  }

  /**
   * แสดง Confirm Dialog ทั่วไป
   */
  confirm(
    title: string,
    text: string,
    confirmButtonText: string = 'ยืนยัน',
    cancelButtonText: string = 'ยกเลิก'
  ): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'question',
      title,
      text,
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true,
      heightAuto: false,
      returnFocus: false,
      focusConfirm: false,
      customClass: {
        popup: 'swal2-popup-custom',
        title: 'swal2-title-custom',
      }
    });
  }

  /**
   * แสดง Loading
   */
  showLoading(title: string = 'กำลังโหลด...'): void {
    Swal.fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      heightAuto: false,
      returnFocus: false,
      didOpen: () => {
        Swal.showLoading();
      },
      customClass: {
        popup: 'swal2-popup-custom',
      }
    });
  }

  /**
   * ปิด Loading
   */
  closeLoading(): void {
    Swal.close();
  }

  /**
   * แสดง Toast notification
   */
  toast(title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    this.ngZone.runOutsideAngular(() => {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      });

      Toast.fire({
        icon,
        title
      });
    });
  }
}
