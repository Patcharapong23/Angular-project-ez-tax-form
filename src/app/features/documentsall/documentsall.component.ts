import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NewDocumentDialogComponent } from '../dialogs/new-document-dialog/new-document-dialog.component';
import { DocumentService } from '../documents/document.service';
import { DocumentStoreService } from '../../shared/services/document-store.service';
import { DocumentListItem, DocumentSearchParams, Page } from '../../shared/models/document.models';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ExportDialogComponent } from '../dialogs/export-dialog/export-dialog.component';
import { CancelDialogComponent } from '../dialogs/cancel-dialog/cancel-dialog.component';
import { SwalService } from '../../shared/services/swal.service';
import { AuthService } from '../../shared/auth.service';

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
    { value: 'UPDATED', name: 'อัปเดตล่าสุด' },
    { value: 'CANCELLED', name: 'ยกเลิกเอกสาร' },
  ];

  opened: { [key: string]: boolean } = {
    docType: false,
    status: false
  };

  // Sort properties
  sortBy = 'createdAt';
  sortDir = 'desc';

  private allDocuments: DocumentListItem[] = [];
  rows: DocumentListItem[] = [];
  selectAll: boolean = false;

  constructor(
    private documentService: DocumentService,
    private documentStoreService: DocumentStoreService, // Injected Store
    private router: Router,
    public dialog: MatDialog, 
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private eRef: ElementRef,
    private swalService: SwalService,
    private authService: AuthService
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
    const savedSort = localStorage.getItem('invoice_sort');
    if (savedSort) {
      try {
        const { sortBy, sortDir } = JSON.parse(savedSort);
        this.sortBy = sortBy;
        this.sortDir = sortDir;
      } catch (e) {
      }
    }

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
     // Check for search filters (not just sort)
     const hasSearchFilter = params?.docNo || params?.buyerTaxId || params?.docType || params?.status || params?.issueDateFrom || params?.createdFrom;

     if (hasSearchFilter) {
        // Use Service for filtered search (server-side)
        const effectiveParams: DocumentSearchParams = {
          ...(params || {}),
          sortBy: this.sortBy,
          sortDir: this.sortDir
        };

        this.documentService.list(effectiveParams).subscribe((response: any) => {
          const documents = Array.isArray(response) ? response : (response.content || []);
          this.allDocuments = documents;
          this.rows = this.sortDocuments(documents);
          this.updatePagination();
        });
     } else {
        // Use Store for default view (with caching)
        this.documentStoreService.getDocuments$().subscribe((docs) => {
           if (docs) {
             this.allDocuments = docs;
             this.rows = this.sortDocuments(docs);
             this.updatePagination();
           }
        });
     }
  }

  private sortDocuments(docs: DocumentListItem[]): DocumentListItem[] {
    if (!docs || docs.length === 0) return docs;

    return [...docs].sort((a: any, b: any) => {
      let valA = a[this.sortBy];
      let valB = b[this.sortBy];

      // Handle date fields
      if (this.sortBy === 'createdAt' || this.sortBy === 'issueDate') {
        valA = valA ? new Date(valA).getTime() : 0;
        valB = valB ? new Date(valB).getTime() : 0;
      }

      // Handle string fields
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  onSort(column: string) {
    if (this.sortBy === column) {
      if (this.sortDir === 'desc') {
        this.sortDir = 'asc';
      } else if (this.sortDir === 'asc') {
        this.sortBy = 'createdAt';
        this.sortDir = 'desc';
      }
    } else {
      this.sortBy = column;
      this.sortDir = 'desc';
    }

    localStorage.setItem('invoice_sort', JSON.stringify({
      sortBy: this.sortBy,
      sortDir: this.sortDir
    }));

    this.currentPage = 1;
    this.search();
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) return ''; 
    return this.sortDir === 'asc' ? 'ti ti-arrow-up' : 'ti ti-arrow-down';
  }

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

  toggleAll(): void {
    this.selectAll = !this.selectAll;
    this.rows.forEach((row) => {
      row.selected = this.selectAll;
    });
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
    
    // Reset sort to default
    this.sortBy = 'createdAt';
    this.sortDir = 'desc';
    
    this.loadDocuments(); 
  }

  getStatusClass(status: string | undefined): string {
    if (status === 'NEW') return 'status-new';
    if (status === 'UPDATED') return 'status-updated';
    if (status === 'CANCELLED') return 'status-cancelled';
    return 'status-unknown';
  }

  getStatusText(status: string | undefined): string {
    if (status === 'NEW') return 'เอกสารใหม่';
    if (status === 'UPDATED') return 'อัปเดตล่าสุด';
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
      panelClass: 'newdoc-dialog', 
      backdropClass: 'newdoc-backdrop',
      autoFocus: false,
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
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        let cancelledBy = 'unknown';
        this.authService.user$.subscribe(user => {
            if (user) {
                cancelledBy = user.fullName || user.userName || 'unknown';
            }
        }).unsubscribe(); 

        this.documentService.cancel(docUuid, result.reason || '', cancelledBy).subscribe({
          next: () => {
            this.swalService.success('ยกเลิกเอกสารสำเร็จ', 'เอกสารของคุณถูกยกเลิกแล้ว');
            // Invalidate Cache
            this.documentStoreService.invalidate();
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
            // Invalidate Cache
            this.documentStoreService.invalidate();
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

