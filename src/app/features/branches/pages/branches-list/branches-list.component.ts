import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SwalService } from '../../../../shared/services/swal.service';

import { BranchService, BranchListItem } from '../../../../shared/services/branch.service';
import { MatDialog } from '@angular/material/dialog';
import { BranchDialogComponent } from '../../dialogs/branch-dialog/branch-dialog.component';

@Component({
  selector: 'app-branches-list',
  standalone: false,
  templateUrl: './branches-list.component.html',
  styleUrls: ['./branches-list.component.css'],
})
export class BranchesListComponent implements OnInit {
  searchForm: FormGroup;
  dateRangeText = '';

  statusOptions = [
    { value: '', name: 'ทั้งหมด' },
    { value: 'true', name: 'เปิดใช้งาน' },
    { value: 'false', name: 'ปิดใช้งาน' },
  ];

  opened: { [key: string]: boolean } = {
    status: false
  };

  branches: BranchListItem[] = [];
  allBranches: BranchListItem[] = [];

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private swalService: SwalService,
    private branchService: BranchService,
    private dialog: MatDialog
  ) {
    this.searchForm = this.fb.group({
      branchCode: [''],
      dateRange: this.fb.group({
        start: [null],
        end: [null],
      }),
      status: [''],
    });
  }

  toggleDropdown(type: string) {
    this.opened[type] = !this.opened[type];
  }

  selectStatus(status: any) {
    this.searchForm.patchValue({ status: status.value });
    this.opened['status'] = false;
  }

  get selectedStatus() {
    const val = this.searchForm.get('status')?.value;
    return this.statusOptions.find(s => s.value === val);
  }

  sortBy: string = 'updateDate';
  sortDir: string = 'desc';

  onSort(column: string): void {
    if (this.sortBy === column) {
      if (this.sortDir === 'desc') {
        this.sortDir = 'asc';
      } else {
        // Reset to default
        this.sortBy = 'updateDate';
        this.sortDir = 'desc';
      }
    } else {
      this.sortBy = column;
      this.sortDir = 'desc';
    }
    this.currentPage = 1;
    this.applySort();
  }

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  paginatedBranches: BranchListItem[] = [];
  pages: number[] = [];

  ngOnInit(): void {
    const rangeGroup = this.searchForm.get('dateRange');

    rangeGroup?.valueChanges.subscribe((v) => {
      this.updateDateRangeText(v?.start, v?.end);
    });

    this.loadBranches();
  }

  loadBranches(): void {
    this.branchService.getBranches().subscribe({
      next: (data) => {
        this.allBranches = data;
        this.branches = this.sortBranches(data);
        this.updatePagination();
      },
      error: (err) => {
        console.error('Error loading branches:', err);
        this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลสาขาได้');
      }
    });
  }

  private applySort(): void {
    this.branches = this.sortBranches(this.branches);
    this.updatePagination();
  }

  private sortBranches(data: BranchListItem[]): BranchListItem[] {
    if (!data || data.length === 0) return data;

    return [...data].sort((a: any, b: any) => {
      let valA = a[this.sortBy];
      let valB = b[this.sortBy];

      // Handle date fields
      if (this.sortBy === 'updateDate' || this.sortBy === 'createDate') {
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

  private updateDateRangeText(start: any, end: any): void {
    const s = start ? this.datePipe.transform(start, 'mediumDate') : '';
    const e = end ? this.datePipe.transform(end, 'mediumDate') : '';

    if (s && e) {
      this.dateRangeText = `${s} - ${e}`;
    } else if (s) {
      this.dateRangeText = s;
    } else if (e) {
      this.dateRangeText = e;
    } else {
      this.dateRangeText = '';
    }
  }

  onSearch(): void {
    const { branchCode, dateRange, status } = this.searchForm.value;
    const { start, end } = dateRange;

    this.branches = this.allBranches.filter((branch) => {
      const codeMatch = branchCode
        ? (branch.branchCode || '').toLowerCase().includes(branchCode.toLowerCase()) ||
          (branch.branchNameTh || '').toLowerCase().includes(branchCode.toLowerCase())
        : true;
      
      const statusMatch = status !== '' ? String(branch.enableFlag) === status : true;

      const createdAt = branch.createDate ? new Date(branch.createDate) : new Date();
      const dateMatch =
        (!start || createdAt >= start) && (!end || createdAt <= end);

      return codeMatch && statusMatch && dateMatch;
    });
    this.currentPage = 1;
    this.updatePagination();
  }

  onClear(): void {
    this.searchForm.reset({
      branchCode: '',
      dateRange: { start: null, end: null },
      status: '',
    });
    this.dateRangeText = '';
    this.branches = this.allBranches;
    this.currentPage = 1;
    this.updatePagination();
  }

  // Pagination methods
  updatePagination(): void {
    this.totalPages = Math.ceil(this.branches.length / this.itemsPerPage);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedBranches = this.branches.slice(startIndex, endIndex);
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
    if (this.branches.length === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItemIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.branches.length);
  }

  onAddBranch(): void {
    const dialogRef = this.dialog.open(BranchDialogComponent, {
      width: '900px',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBranches();
      }
    });
  }

  onView(branch: BranchListItem): void {
    this.dialog.open(BranchDialogComponent, {
      width: '900px',
      data: { mode: 'view', ...branch }
    });
  }

  onEdit(branch: BranchListItem): void {
    const dialogRef = this.dialog.open(BranchDialogComponent, {
      width: '900px',
      data: { mode: 'edit', ...branch }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBranches();
      }
    });
  }

  onDelete(branch: BranchListItem): void {
    this.swalService.confirmDelete(
      'คุณต้องการลบข้อมูลสาขานี้ใช่หรือไม่?',
      `หากลบข้อมูลสาขา ${branch.branchNameTh} นี้จะไม่สามารถใช้ข้อมูลนี้ได้`
    ).then((result) => {
      if (result.isConfirmed) {
        // TODO: Call API to delete
        this.swalService.success('ลบข้อมูลสำเร็จ', 'ระบบได้ลบข้อมูลสาขาเรียบร้อย');
      }
    });
  }
}
