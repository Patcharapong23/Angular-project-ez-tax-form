import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DocumentService } from '../../documents/document.service';

type ExportFormat = 'PDF' | 'XML' | 'CSV';

@Component({
  selector: 'app-export-dialog',
  templateUrl: './export-dialog.component.html',
  styleUrls: ['./export-dialog.component.css'],
})
export class ExportDialogComponent {
  wantPdf = true;
  wantXml = false;
  wantCsv = false;
  isLoading = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number; docNo?: string },
    private ref: MatDialogRef<ExportDialogComponent>,
    private api: DocumentService
  ) {}

  close(): void {
    this.ref.close();
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async downloadAll(): Promise<void> {
    const id = Number(this.data?.id);
    if (!id) return;

    const formats: ExportFormat[] = [];
    if (this.wantPdf) formats.push('PDF');
    if (this.wantXml) formats.push('XML');
    if (this.wantCsv) formats.push('CSV');

    if (!formats.length) {
      alert('โปรดเลือกไฟล์อย่างน้อย 1 ชนิด');
      return;
    }

    this.isLoading = true;
    try {
      for (const fmt of formats) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          this.api.downloadDocumentFile(id, fmt).subscribe({
            next: (blob: Blob) => resolve(blob),
            error: (err: unknown) => reject(err),
          });
        });
        const base = this.data?.docNo || `DOCUMENT-${id}`;
        this.saveBlob(blob, `${base}.${fmt.toLowerCase()}`);
      }
      this.ref.close(true);
    } catch (e) {
      console.error('[ExportDialog] download failed', e);
      alert('ดาวน์โหลดล้มเหลว กรุณาลองใหม่');
    } finally {
      this.isLoading = false;
    }
  }
}
