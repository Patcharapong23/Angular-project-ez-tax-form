import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ErrorDialogData {
  title: string;
  message?: string;
  statusCode?: number;
  buttonText?: string;
}

@Component({
  selector: 'app-error-dialog',
  template: `
    <div class="error-dialog">
      <div class="error-icon">
        <svg viewBox="0 0 24 24" class="x-icon">
          <circle cx="12" cy="12" r="11" fill="#ef4444"/>
          <path d="M8 8L16 16" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <path d="M16 8L8 16" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="error-code" *ngIf="data.statusCode">Error {{ data.statusCode }}</div>
      <h2 class="error-title">{{ data.title }}</h2>
      <p class="error-message" *ngIf="data.message">{{ data.message }}</p>
      <button class="error-button" (click)="close()">
        {{ data.buttonText || 'ตกลง' }}
      </button>
    </div>
  `,
  styles: [`
    .error-dialog {
      text-align: center;
      padding: 32px 40px;
      min-width: 350px;
    }

    .error-icon {
      margin-bottom: 16px;
    }

    .x-icon {
      width: 80px;
      height: 80px;
      filter: drop-shadow(0 4px 12px rgba(239, 68, 68, 0.3));
    }

    .error-code {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: #ef4444;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }

    .error-title {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: #2b2f33;
      margin: 0 0 8px 0;
    }

    .error-message {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }

    .error-button {
      font-family: 'Noto Sans Thai', sans-serif;
      background-color: #ef4444;
      color: #fff;
      border: none;
      padding: 10px 32px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .error-button:hover {
      background-color: #dc2626;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
  `]
})
export class ErrorDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ErrorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ErrorDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
