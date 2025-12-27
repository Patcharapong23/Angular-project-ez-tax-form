import { Component, OnInit } from '@angular/core';
import {
  Product,
  ProductService,
} from '../../../../shared/services/product.service';
import { ProductStoreService } from '../../../../shared/services/product-store.service';
import { MatDialog } from '@angular/material/dialog';
import { ProductDialogComponent } from '../../dialogs/product-dialog/product-dialog.component';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SwalService } from '../../../../shared/services/swal.service';

@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css'],
})
export class ProductsListComponent implements OnInit {
  products: Product[] = [];
  allProducts: Product[] = [];
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

  constructor(
    private productService: ProductService,
    private productStoreService: ProductStoreService, // Injected Store Service
    public dialog: MatDialog,
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private swalService: SwalService
  ) {
    this.searchForm = this.fb.group({
      sku: [''],
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
    this.loadProducts();
  }

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  paginatedProducts: Product[] = [];
  pages: number[] = [];

  ngOnInit(): void {
    this.loadProducts();
    const rangeGroup = this.searchForm.get('dateRange');
    rangeGroup?.valueChanges.subscribe((v) => {
      this.updateDateRangeText(v?.start, v?.end);
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

  loadProducts(): void {
    // Use Store Service (get cached data, sort client-side)
    this.productStoreService.getProducts$().subscribe((products) => {
      if (!products) return; 

      this.allProducts = products.map(p => {
        const anyP = p as any;
        return {
          ...p,
          id: p.id || anyP.productId || anyP.product_id || anyP._id || ''
        };
      });
      this.products = this.sortProducts(this.allProducts);
      this.updatePagination();
    });
  }

  private sortProducts(data: Product[]): Product[] {
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

  search(): void {
    const { sku, dateRange, status } = this.searchForm.value;
    const { start, end } = dateRange;

    // Client-side filtering on cached data
    this.products = this.allProducts.filter((product) => {
      const skuMatch = sku
        ? product.productCode.toLowerCase().includes(sku.toLowerCase())
        : true;
      const statusMatch = status ? product.status === status : true;

      // Assuming product has a 'createDate' property. Adjust if needed.
      const createDate = product.createDate
        ? new Date(product.createDate)
        : new Date();
      const dateMatch =
        (!start || createDate >= start) && (!end || createDate <= end);

      return skuMatch && statusMatch && dateMatch;
    });
    this.currentPage = 1; // Reset to first page on search
    this.updatePagination();
  }

  clear(): void {
    this.searchForm.reset({
      sku: '',
      dateRange: { start: null, end: null },
      status: '',
    });
    this.products = this.allProducts;
    this.currentPage = 1;
    this.updatePagination();
  }

  // Pagination methods
  updatePagination(): void {
    this.totalPages = Math.ceil(this.products.length / this.itemsPerPage);
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProducts = this.products.slice(startIndex, endIndex);
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
    if (this.products.length === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItemIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.products.length);
  }

  createNewProduct(): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '900px',
      maxWidth: '900px',
      data: {},
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Invalidate cache to force reload
        this.productStoreService.invalidate();
        this.loadProducts();
        this.swalService.success('เพิ่มข้อมูลสินค้าสำเร็จ', 'ระบบได้เพิ่มข้อมูลสินค้าเรียบร้อย');
      }
    });
  }

  editProduct(product: Product): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '900px',
      maxWidth: '900px',
      data: { ...product },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Invalidate cache
        this.productStoreService.invalidate();
        this.loadProducts();
        this.swalService.success('แก้ไขข้อมูลสินค้าสำเร็จ', 'ระบบได้แก้ไขข้อมูลสินค้าเรียบร้อย');
      }
    });
  }

  viewProduct(product: Product): void {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '900px',
      maxWidth: '900px',
      data: { ...product, mode: 'view' },
    });
  }

  deleteProduct(product: Product): void {
    this.swalService.confirmDelete(
      'คุณต้องการลบข้อมูลสินค้านี้ใช่หรือไม่?',
      `หากลบข้อมูลสินค้า ${product.name} นี้จะไม่สามารถใช้ข้อมูลสาขานี้ได้`
    ).then((result) => {
      if (result.isConfirmed) {
        this.productService.deleteProduct(product.id).subscribe(() => {
          // Invalidate cache
          this.productStoreService.invalidate();
          this.loadProducts();
          this.swalService.success('ลบข้อมูลสินค้าสำเร็จ', 'ระบบได้ลบข้อมูลสินค้าเรียบร้อย');
        });
      }
    });
  }
}

