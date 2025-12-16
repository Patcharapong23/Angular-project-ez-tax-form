import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BuyerService, Buyer } from '../../../../shared/services/buyer.service';



import { MatDialog } from '@angular/material/dialog';
import { BuyerDialogComponent } from '../../dialogs/buyer-dialog/buyer-dialog.component';
import { SwalService } from '../../../../shared/services/swal.service';

@Component({
  selector: 'app-buyers-list',
  templateUrl: './buyers-list.component.html',
  styleUrls: ['./buyers-list.component.css'],
})
export class BuyersListComponent implements OnInit {
  searchForm: FormGroup;
  dateRangeText = '';

  statusOptions = [
    { value: '', name: 'ทั้งหมด' },
    { value: 'ACTIVE', name: 'เปิดใช้งาน' },
    { value: 'INACTIVE', name: 'ปิดใช้งาน' },
  ];

  opened: { [key: string]: boolean } = {
    status: false
  };

  buyers: Buyer[] = [];
  allBuyers: Buyer[] = [];

  constructor(
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private buyerService: BuyerService,
    private dialog: MatDialog,
    private swalService: SwalService
  ) {
    this.searchForm = this.fb.group({
      customerCode: [''],
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

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  paginatedBuyers: Buyer[] = [];
  pages: number[] = [];

  ngOnInit(): void {
    const rangeGroup = this.searchForm.get('dateRange');

    rangeGroup?.valueChanges.subscribe((v) => {
      this.updateDateRangeText(v?.start, v?.end);
    });

    this.loadBuyers();
  }

  loadBuyers(): void {
    this.buyerService.getBuyers().subscribe((buyers) => {
      console.log('API Response Buyers:', buyers);
      this.allBuyers = buyers;
      this.buyers = buyers;
      this.updatePagination();
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
    const { customerCode, dateRange, status } = this.searchForm.value;
    const { start, end } = dateRange;

    this.buyers = this.allBuyers.filter((buyer) => {
      const codeMatch = customerCode
        ? (buyer.code || '').toLowerCase().includes(customerCode.toLowerCase())
        : true;
      const statusMatch = status ? buyer.status === status : true;

      const createdAt = buyer.createDate ? new Date(buyer.createDate) : new Date();
      const dateMatch =
        (!start || createdAt >= start) && (!end || createdAt <= end);

      return codeMatch && statusMatch && dateMatch;
    });
    this.currentPage = 1;
    this.updatePagination();
  }

  onClear(): void {
    this.searchForm.reset({
      customerCode: '',
      dateRange: { start: null, end: null },
      status: '',
    });
    this.dateRangeText = '';
    this.buyers = this.allBuyers;
    this.currentPage = 1;
    this.updatePagination();
  }

  // Pagination methods
  updatePagination(): void {
    this.totalPages = Math.ceil(this.buyers.length / this.itemsPerPage);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedBuyers = this.buyers.slice(startIndex, endIndex);
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
    if (this.buyers.length === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItemIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.buyers.length);
  }

  onAddBuyer(): void {
    const dialogRef = this.dialog.open(BuyerDialogComponent, {
      width: '900px',
      maxWidth: '900px',
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBuyers();
        this.swalService.success('เพิ่มข้อมูลลูกค้าสำเร็จ', 'ระบบได้เพิ่มข้อมูลลูกค้าเรียบร้อย');
      }
    });
  }

  onView(buyer: Buyer): void {
    this.dialog.open(BuyerDialogComponent, {
      width: '900px',
      maxWidth: '900px',
      data: { ...buyer, mode: 'view' }
    });
  }

  onEdit(buyer: Buyer): void {
    const dialogRef = this.dialog.open(BuyerDialogComponent, {
      width: '900px',
      maxWidth: '900px',
      data: { ...buyer, mode: 'edit' },
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadBuyers();
        this.swalService.success('แก้ไขข้อมูลลูกค้าสำเร็จ', 'ระบบได้แก้ไขข้อมูลลูกค้าเรียบร้อย');
      }
    });
  }

  onDelete(buyer: Buyer): void {
    this.swalService.confirmDelete(
      'คุณต้องการลบข้อมูลลูกค้านี้ใช่หรือไม่?',
      `หากลบข้อมูลลูกค้า ${buyer.name} นี้จะไม่สามารถใช้ข้อมูลนี้ได้`
    ).then((result) => {
      if (result.isConfirmed) {
        this.buyerService.deleteBuyer(buyer.id).subscribe(() => {
          this.loadBuyers();
          this.swalService.success('ลบข้อมูลสำเร็จ', 'ระบบได้ลบข้อมูลลูกค้าเรียบร้อย');
        });
      }
    });
  }
}