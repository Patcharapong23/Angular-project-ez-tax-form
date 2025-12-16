import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface SuccessDialogData {
  title: string;
  message?: string;
  timer?: number;
}

@Component({
  selector: 'app-success-dialog',
  template: `
    <div class="success-dialog">
      <div class="success-icon">
        <svg viewBox="0 0 52 52" class="checkmark">
          <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
      </div>
      <h2 class="success-title">{{ data.title }}</h2>
      <p class="success-message" *ngIf="data.message">{{ data.message }}</p>
      
      <!-- Progress bar -->
      <div class="progress-container">
        <div class="progress-bar" [style.animation-duration]="timerDuration"></div>
      </div>
    </div>
  `,
  styles: [`
    .success-dialog {
      text-align: center;
      padding: 32px 40px 0 40px;
      min-width: 350px;
      overflow: hidden;
    }

    .success-icon {
      margin-bottom: 20px;
    }

    .checkmark {
      width: 80px;
      height: 80px;
    }

    .checkmark-circle {
      stroke: #10b981;
      stroke-width: 2;
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    }

    .checkmark-check {
      stroke: #10b981;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.5s forwards;
    }

    @keyframes stroke {
      100% {
        stroke-dashoffset: 0;
      }
    }

    .success-title {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: #2b2f33;
      margin: 0 0 8px 0;
    }

    .success-message {
      font-family: 'Noto Sans Thai', sans-serif;
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }

    .progress-container {
      width: calc(100% + 80px);
      height: 5px;
      background-color: #e5e7eb;
      margin: 24px -40px 0 -40px;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
      animation: shrink linear forwards;
      transform-origin: left;
    }

    @keyframes shrink {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
  `]
})
export class SuccessDialogComponent implements OnInit, OnDestroy {
  private timerId: any;
  timerDuration: string = '2000ms';

  constructor(
    public dialogRef: MatDialogRef<SuccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SuccessDialogData
  ) {
    const timer = this.data.timer || 2000;
    this.timerDuration = `${timer}ms`;
  }

  ngOnInit(): void {
    const timer = this.data.timer || 2000;
    this.timerId = setTimeout(() => {
      this.close();
    }, timer);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
