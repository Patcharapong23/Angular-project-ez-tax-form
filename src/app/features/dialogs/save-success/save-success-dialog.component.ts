import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialog,
} from '@angular/material/dialog';
import { ExportDialogComponent } from '../export-dialog/export-dialog.component';

export interface SaveSuccessData {
  id: number;
  docNo: string;
}

@Component({
  selector: 'app-save-success-dialog',
  templateUrl: './save-success-dialog.component.html',
  styleUrls: ['./save-success-dialog.component.css'],
})
export class SaveSuccessDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SaveSuccessData,
    private dialogRef: MatDialogRef<SaveSuccessDialogComponent>,
    private matDialog: MatDialog
  ) {}

  closeOnly() {
    this.dialogRef.close();
  }

  goDownload() {
    this.dialogRef.close();
    this.matDialog.open(ExportDialogComponent, {
      width: '480px',
      maxWidth: '90vw',
      data: { id: this.data.id, docNo: this.data.docNo },
      panelClass: 'export-dialog-panel',
      disableClose: true,
    });
  }
}
