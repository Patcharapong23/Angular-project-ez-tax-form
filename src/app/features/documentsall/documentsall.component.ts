import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NewDocumentDialogComponent } from '../dialogs/new-document-dialog/new-document-dialog.component';
import { DocumentService } from '../documents/document.service';
import { DocumentListItem, DocumentSearchParams, Page } from '../../shared/models/document.models';

@Component({
  selector: 'app-documentsall',
  templateUrl: './documentsall.component.html',
  styleUrls: ['./documentsall.component.css'],
})
export class DocumentsallComponent implements OnInit {
  f: DocumentSearchParams = {};
  private allDocuments: DocumentListItem[] = [];
  rows: DocumentListItem[] = [];

  constructor(
    private documentService: DocumentService,
    private router: Router,
    public dialog: MatDialog // Inject MatDialog ที่นี่
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(params?: DocumentSearchParams): void {
    this.documentService.list(params).subscribe((page: Page<DocumentListItem>) => {
      this.allDocuments = page.content; // Store all documents from the current page
      this.rows = page.content; // Display documents from the current page
      // If pagination is implemented, you would also update totalPages, currentPage, etc. here
    });
  }

  search(): void {
    const searchParams: DocumentSearchParams = {
      docNo: this.f.docNo,
      buyerTaxId: this.f.buyerTaxId,
      docType: this.f.docType,
      issueDateFrom: this.f.issueDateFrom,
      issueDateTo: this.f.issueDateTo,
      createdFrom: this.f.createdFrom,
      createdTo: this.f.createdTo,
      status: this.f.status,
    };
    this.loadDocuments(searchParams);
  }

  clear(): void {
    this.f = {};
    this.loadDocuments(); // Load all documents (first page)
  }

  getStatusClass(status: string | undefined): string {
    if (status === 'CONFIRMED') return 'badge-green';
    if (status === 'CANCELLED') return 'badge-red';
    return 'badge-gray';
  }

  getStatusText(status: string | undefined): string {
    if (status === 'CONFIRMED') return 'ใช้งาน';
    if (status === 'CANCELLED') return 'ยกเลิก';
    if (status === 'DRAFT') return 'แบบร่าง';
    return status ?? '';
  }

  createNewDocument(): void {
    const dialogRef = this.dialog.open(NewDocumentDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'newdoc-dialog', // <-- คลาสหลักของ dialog
      backdropClass: 'newdoc-backdrop',
      autoFocus: false,
      // panelClass: 'custom-dialog-container',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.documentType) {
        this.router.navigate(['/invoice/new'], {
          queryParams: {
            type: result.documentType,
            template: result.documentTemplate,
          },
        });
      }
    });
  }

  viewDocument(id: number): void {
    this.router.navigate(['/documents', id.toString()]);
  }

  editDocument(id: number): void {
    this.router.navigate(['/documents/edit', id.toString()]);
  }

  downloadDocument(id: number): void {
    const docItem = this.rows.find(r => r.id === id);
    if (docItem && docItem.docUuid) {
      // For now, let's assume PDF download. We can add a dialog later for format selection.
      this.documentService.exportDocument(docItem.docUuid, 'pdf').subscribe(blob => {
        const a = document.createElement('a'); // Correctly refers to the global document object
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = `${docItem.docNo || 'document'}.pdf`; // Use docNo as filename, fallback to 'document'
        a.click();
        URL.revokeObjectURL(objectUrl);
      }, error => {
        console.error('Error downloading document:', error);
        alert('ไม่สามารถดาวน์โหลดเอกสารได้');
      });
    } else {
      alert('ไม่พบเอกสารหรือรหัสเอกสารไม่ถูกต้อง');
    }
  }

  cancelInvoice(docUuid: string): void { // Change parameter to docUuid
    if (confirm('คุณต้องการยกเลิกเอกสารนี้ใช่หรือไม่?')) {
      this.documentService.cancel(docUuid).subscribe(() => { // Use docUuid
        alert('ยกเลิกเอกสารสำเร็จ');
        this.loadDocuments();
      });
    }
  }
}
