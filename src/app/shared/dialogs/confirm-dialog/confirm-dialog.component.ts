import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: 'warning' | 'danger' | 'question';
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="confirm-dialog">
      <div class="confirm-icon danger">
        <svg viewBox="0 0 24 24" class="x-icon">
          <path d="M18 6L6 18" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M6 6L18 18" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 class="confirm-title">{{ data.title }}</h2>
      <p class="confirm-message" *ngIf="data.message">{{ data.message }}</p>
      <div class="confirm-actions">
        <button class="btn-cancel" (click)="cancel()">
          {{ data.cancelButtonText || 'ยกเลิก' }}
        </button>
        <button class="btn-confirm" (click)="confirm()">
          {{ data.confirmButtonText || 'ลบ' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      text-align: center;
      padding: 24px;
      min-width: 350px;
    }

    .confirm-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }

    .confirm-icon.danger {
      background-color: #ef4444;
    }

    .x-icon {
      width: 40px;
      height: 40px;
    }

    .confirm-title {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: #2b2f33;
      margin: 0 0 8px 0;
    }

    .confirm-message {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }

    .confirm-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }

    .btn-cancel {
      font-family: 'Noto Sans Thai', sans-serif;
      background-color: #fff;
      color: #374151;
      border: 1px solid #e5e7eb;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
    }

    .btn-cancel:hover {
      background-color: #f3f4f6;
    }

    .btn-confirm {
      font-family: 'Noto Sans Thai', sans-serif;
      background-color: #ef4444;
      color: #fff;
      border: none;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
    }

    .btn-confirm:hover {
      background-color: #dc2626;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
