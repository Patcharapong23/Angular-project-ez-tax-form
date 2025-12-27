import { Component, Inject, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  Product,
  ProductService,
} from '../../../../shared/services/product.service';
import { ActivityService } from '../../../../shared/services/activity.service';

import { Observable, of } from 'rxjs';
import { startWith, map, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-product-dialog',
  templateUrl: './product-dialog.component.html',
  styleUrls: ['./product-dialog.component.css'],
})
export class ProductDialogComponent implements OnInit {
  form: FormGroup;
  taxRateOptions: { label: string; value: number }[];
  
  // Units from backend
  units: string[] = [];
  filteredUnits!: Observable<string[]>;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    public dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private activityService: ActivityService
  ) {
    console.log('ProductDialog Data:', this.data);
    this.taxRateOptions = [
      { label: '0%', value: 0 },
      { label: '7%', value: 7 },
      { label: '14%', value: 14 },
    ];
    this.form = this.fb.group({
      productCode: [data?.productCode || '', Validators.required],
      name: [data?.name || '', Validators.required],
      unit: [data?.unit || ''],
      description: [data?.description || ''],
      defaultPrice: [
        data?.defaultPrice ?? null,
        [Validators.required, Validators.min(0)],
      ],
      taxRate: [
        data?.taxRate ?? null,
        [Validators.required, Validators.min(0)],
      ],

      status: [data?.status || 'ACTIVE', Validators.required],
    });

    if (this.data.mode === 'view') {
      this.form.disable();
    } else if (this.data.id || this.data.productCode) {
      this.form.get('productCode')?.disable();
    }
  }

  ngOnInit(): void {
    // Fetch units from backend and set up filter
    this.productService.getUnits().subscribe(units => {
      this.units = units;
      console.log('Loaded units:', this.units);
      
      // Setup filter after units are loaded
      this.filteredUnits = this.form.get('unit')!.valueChanges.pipe(
        startWith(this.form.get('unit')?.value || ''),
        map(value => this._filterUnits(value || ''))
      );
    });

    // Initialize with empty array until units load
    this.filteredUnits = of([]);
  }

  private _filterUnits(value: string): string[] {
    if (!this.units || this.units.length === 0) {
      return [];
    }
    const filterValue = value.toLowerCase();
    // Return all units when empty, filter when typing
    if (!filterValue) {
      return this.units;
    }
    return this.units.filter(unit => 
      unit.toLowerCase().includes(filterValue)
    );
  }

  onSave(): void {
    if (this.form.valid) {
      const formValue = this.form.getRawValue();
      const productData = {
        ...formValue,
        id: this.data.id,
        productId: this.data.id // Send both to be safe
      };
      console.log('Saving Product Data:', productData);
      if (this.data.id != null) {
        this.productService
          .updateProduct(this.data.id, productData)
          .subscribe(() => {
            // Log activity
            this.activityService.logProductUpdate(formValue.name || formValue.productCode, this.data.id);
            this.dialogRef.close(true);
          });
      } else {
        this.productService.createProduct(productData).subscribe((res: any) => {
          // Log activity
          this.activityService.logProductCreate(formValue.name || formValue.productCode, res?.id || '');
          this.dialogRef.close(true);
        });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // ===== Custom Dropdown Logic =====
  opened: { [key: string]: boolean } = {};

  toggleDropdown(key: string): void {
    this.opened[key] = !this.opened[key];
  }

  selectTaxRate(value: number): void {
    console.log('Selected Tax Rate:', value);
    this.form.patchValue({ taxRate: value });
    this.opened['taxRate'] = false;
  }

  getTaxRateLabel(value: number): string {
    // console.log('Getting Label for:', value);
    const option = this.taxRateOptions.find((o) => o.value === value);
    return option ? option.label : 'เลือกอัตราภาษี';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.opened = {};
    }
  }

  validateNoThaiInput(event: any) {
    const input = event.target;
    // Remove Thai characters
    input.value = input.value.replace(/[\u0E00-\u0E7F]/g, '');
    const controlName = input.getAttribute('formControlName');
    if (controlName) {
      this.form.get(controlName)?.setValue(input.value);
    }
  }

  // validateUnitSelection removed - allow free text input for unit
}
