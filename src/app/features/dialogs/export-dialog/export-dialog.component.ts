import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DocumentService } from '../../documents/document.service';
import { SwalService } from '../../../shared/services/swal.service';

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
    @Inject(MAT_DIALOG_DATA) public data: { docUuid: string; docNo?: string },
    private ref: MatDialogRef<ExportDialogComponent>,
    private api: DocumentService,
    private swalService: SwalService
  ) {}

  close(): void {
    this.ref.close();
  }

  toggleFormat(type: 'pdf' | 'xml' | 'csv'): void {
    if (type === 'pdf') this.wantPdf = !this.wantPdf;
    if (type === 'xml') this.wantXml = !this.wantXml;
    if (type === 'csv') this.wantCsv = !this.wantCsv;
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
    const docUuid = this.data?.docUuid;
    if (!docUuid) return;

    const formats: ExportFormat[] = [];
    if (this.wantPdf) formats.push('PDF');
    if (this.wantXml) formats.push('XML');
    if (this.wantCsv) formats.push('CSV');

    if (!formats.length) {
      this.swalService.warning('กรุณาเลือกไฟล์', 'โปรดเลือกไฟล์อย่างน้อย 1 ชนิด');
      return;
    }

    this.isLoading = true;
    try {
      for (const fmt of formats) {
        const fileType = fmt.toLowerCase() as 'pdf' | 'xml' | 'csv';
        const blob = await new Promise<Blob>((resolve, reject) => {
          this.api.exportDocument(docUuid, fileType).subscribe({
            next: (blob: Blob) => resolve(blob),
            error: (err: unknown) => reject(err),
          });
        });
        const base = this.data?.docNo || `DOCUMENT-${docUuid}`;
        this.saveBlob(blob, `${base}.${fileType}`);
      }
      this.ref.close(true);
    } catch (e) {
      console.error('[ExportDialog] download failed', e);
      this.swalService.error('ดาวน์โหลดล้มเหลว', 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      this.isLoading = false;
    }
  }
}

