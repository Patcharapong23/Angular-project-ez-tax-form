import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NewDocumentDialogComponent } from '../dialogs/new-document-dialog/new-document-dialog.component';
import { DocumentService } from '../documents/document.service';
import { DocumentListItem, DocumentSearchParams, Page } from '../../shared/models/document.models';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ExportDialogComponent } from '../dialogs/export-dialog/export-dialog.component';
import { CancelDialogComponent } from '../dialogs/cancel-dialog/cancel-dialog.component';
import { SwalService } from '../../shared/services/swal.service';

@Component({
  selector: 'app-documentsall',
  templateUrl: './documentsall.component.html',
  styleUrls: ['./documentsall.component.css'],
})
export class DocumentsallComponent implements OnInit {
  searchForm: FormGroup;
  issueDateRangeText = '';
  createdDateRangeText = '';

  docTypes = [
    { value: '', name: 'ทั้งหมด' },
    { value: 'T01', name: 'ใบเสร็จรับเงิน (T01)' },
    { value: 'T02', name: 'ใบแจ้งหนี้ / ใบกำกับภาษี (T02)' },
    { value: 'T03', name: 'ใบเสร็จรับเงิน / ใบกำกับภาษี (T03)' },
    { value: 'T04', name: 'ใบส่งของ / ใบกำกับภาษี (T04)' },
    { value: '380', name: 'ใบแจ้งหนี้ (380)' },
    { value: '388', name: 'ใบกำกับภาษี (388)' },
    { value: '80', name: 'ใบเพิ่มหนี้ (80)' },
    { value: '81', name: 'ใบลดหนี้ (81)' },
  ];

  statusOptions = [
    { value: '', name: 'ทั้งหมด' },
    { value: 'NEW', name: 'เอกสารใหม่' },
    { value: 'UPDATED', name: 'อัพเดตล่าสุด' },
    { value: 'CANCELLED', name: 'ยกเลิกเอกสาร' },
  ];

  opened: { [key: string]: boolean } = {
    docType: false,
    status: false
  };

  // Download modal properties
  // Download modal properties removed
  // showDownloadModal = false;
  // selectedDownloadType: string | null = null;
  // currentDocUuid: string | null = null;

  private allDocuments: DocumentListItem[] = [];
  rows: DocumentListItem[] = [];

  constructor(
    private documentService: DocumentService,
    private router: Router,
    public dialog: MatDialog, // Inject MatDialog ที่นี่
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private eRef: ElementRef,
    private swalService: SwalService
  ) {
    this.searchForm = this.fb.group({
      docNo: [''],
      buyerTaxId: [''],
      docType: [''],
      issueDateRange: this.fb.group({
        start: [null],
        end: [null],
      }),
      createdDateRange: this.fb.group({
        start: [null],
        end: [null],
      }),
      status: [''],
    });
  }

  toggleDropdown(type: string) {
    // Close other dropdowns
    Object.keys(this.opened).forEach(key => {
      if (key !== type) this.opened[key] = false;
    });
    this.opened[type] = !this.opened[type];
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.opened['docType'] = false;
      this.opened['status'] = false;
    } else {
      // If click is inside, we need to check if it's NOT on a dropdown trigger or panel
      // But since we use stopPropagation on triggers, this listener might not catch clicks on triggers if they bubble up to document?
      // Actually, stopPropagation stops it from reaching document. So this listener only fires for clicks that DID propagate.
      // If we click inside the component but NOT on a button that stops propagation, we might want to close?
      // No, usually we only close if clicking OUTSIDE the component OR outside the dropdown.
      
      // Simplified: If we click anywhere on document that is NOT the dropdown, close it.
      // But we have multiple dropdowns.
      // Let's rely on the fact that triggers have stopPropagation.
      // So if this event fires, it means we clicked somewhere else.
      // BUT, if we click inside the component (e.g. on a label), we might want to close dropdowns too?
      // Standard behavior: click outside the dropdown closes it.
      
      // Let's check if the click target is inside a .custom-dropdown
      const target = event.target as HTMLElement;
      if (!target.closest('.custom-dropdown')) {
         this.opened['docType'] = false;
         this.opened['status'] = false;
      }
    }
  }

  selectDocType(doc: any) {
    this.searchForm.patchValue({ docType: doc.value });
    this.opened['docType'] = false;
  }

  selectStatus(status: any) {
    this.searchForm.patchValue({ status: status.value });
    this.opened['status'] = false;
  }

  get selectedDocType() {
    const val = this.searchForm.get('docType')?.value;
    return this.docTypes.find(d => d.value === val);
  }

  get selectedStatus() {
    const val = this.searchForm.get('status')?.value;
    return this.statusOptions.find(s => s.value === val);
  }

  ngOnInit(): void {
    this.loadDocuments();

    this.searchForm.get('issueDateRange')?.valueChanges.subscribe(val => {
      this.issueDateRangeText = this.formatDateRange(val.start, val.end);
    });

    this.searchForm.get('createdDateRange')?.valueChanges.subscribe(val => {
      this.createdDateRangeText = this.formatDateRange(val.start, val.end);
    });
  }

  private formatDateRange(start: any, end: any): string {
    if (!start && !end) {
      return '';
    }
    const startDate = start ? this.datePipe.transform(start, 'dd/MM/yyyy') : '';
    const endDate = end ? this.datePipe.transform(end, 'dd/MM/yyyy') : '';
    if (startDate && endDate) {
      return `${startDate} - ${endDate}`;
    }
    return startDate || endDate || '';
  }

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  paginatedRows: DocumentListItem[] = [];
  pages: number[] = [];

  loadDocuments(params?: DocumentSearchParams): void {
    this.documentService.list(params).subscribe((response: any) => {
      // Handle both array and Page object responses
      const documents = Array.isArray(response) ? response : (response.content || []);
      this.allDocuments = documents;
      this.rows = documents;
      this.updatePagination();
    });
  }

  // Pagination methods
  updatePagination(): void {
    this.totalPages = Math.ceil(this.rows.length / this.itemsPerPage);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedRows = this.rows.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onItemsPerPageChange(event: any): void {
    this.itemsPerPage = Number(event.target.value);
    this.currentPage = 1;
    this.updatePagination();
  }

  get startItemIndex(): number {
    if (this.rows.length === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItemIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.rows.length);
  }

  search(): void {
    const formValue = this.searchForm.value;
    const searchParams: DocumentSearchParams = {
      docNo: formValue.docNo,
      buyerTaxId: formValue.buyerTaxId,
      docType: formValue.docType,
      issueDateFrom: formValue.issueDateRange.start,
      issueDateTo: formValue.issueDateRange.end,
      createdFrom: formValue.createdDateRange.start,
      createdTo: formValue.createdDateRange.end,
      status: formValue.status,
    };
    this.loadDocuments(searchParams);
  }

  clear(): void {
    this.searchForm.reset({
      docNo: '',
      buyerTaxId: '',
      docType: '',
      issueDateRange: { start: null, end: null },
      createdDateRange: { start: null, end: null },
      status: '',
    });
    this.issueDateRangeText = '';
    this.createdDateRangeText = '';
    this.loadDocuments(); // Load all documents (first page)
  }

  getStatusClass(status: string | undefined): string {
    if (status === 'NEW') return 'badge-blue';
    if (status === 'UPDATED') return 'badge-yellow';
    if (status === 'CANCELLED') return 'badge-red';
    return 'badge-gray';
  }

  getStatusText(status: string | undefined): string {
    if (status === 'NEW') return 'เอกสารใหม่';
    if (status === 'UPDATED') return 'อัพเดตล่าสุด';
    if (status === 'CANCELLED') return 'ยกเลิกเอกสาร';
    return status ?? '-';
  }

  getDocTypeName(code: string | undefined): string {
    if (!code) return '-';
    const found = this.docTypes.find((d) => d.value === code);
    return found ? found.name : code;
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

  viewDocument(docUuid: string): void {
    this.router.navigate(['/documents', docUuid]);
  }

  editDocument(docUuid: string): void {
    this.router.navigate(['/documents/edit', docUuid]);
  }

  // Download Modal Methods
  // Download Modal Methods
  openDownloadModal(docUuid: string, docNo: string): void {
    const dialogRef = this.dialog.open(ExportDialogComponent, {
      data: { docUuid, docNo },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.swalService.success('ดาวน์โหลดเอกสารสำเร็จ');
      }
    });
  }

  cancelInvoice(docUuid: string): void {
    const dialogRef = this.dialog.open(CancelDialogComponent, {
      width: 'auto',
      // panelClass: 'custom-dialog' // If needed
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // result.reason is available but currently unused by backend
        this.documentService.cancel(docUuid).subscribe({
          next: () => {
            this.swalService.success('ยกเลิกเอกสารสำเร็จ', 'เอกสารของคุณถูกยกเลิกแล้ว');
            this.loadDocuments();
          },
          error: (err) => {
            console.error('Error cancelling document:', err);
            this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถยกเลิกเอกสารได้');
          }
        });
      }
    });
  }

  deleteDocument(docUuid: string): void {
    this.swalService.confirmDelete(
      'คุณต้องการลบเอกสารนี้ใช่หรือไม่?',
      'ข้อมูลจะถูกลบถาวร'
    ).then((result) => {
      if (result.isConfirmed) {
        this.documentService.delete(docUuid).subscribe({
          next: () => {
            this.swalService.success('ลบเอกสารสำเร็จ');
            this.loadDocuments();
          },
          error: (err) => {
            console.error('Error deleting document:', err);
            this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถลบเอกสารได้');
          }
        });
      }
    });
  }
}

