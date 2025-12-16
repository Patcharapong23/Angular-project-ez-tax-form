import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Buyer, BuyerService } from '../../../../shared/services/buyer.service';

@Component({
  selector: 'app-buyer-dialog',
  templateUrl: './buyer-dialog.component.html',
  styleUrls: ['./buyer-dialog.component.css']
})
export class BuyerDialogComponent implements OnInit {
  form: FormGroup;
  
  taxpayerTypes = [
    { value: 'JURISTIC', name: 'นิติบุคคล' }
  ];

  opened: { [key: string]: boolean } = {
    taxpayerType: false
  };

  constructor(
    private fb: FormBuilder,
    private buyerService: BuyerService,
    public dialogRef: MatDialogRef<BuyerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any // Use 'any' to allow extra fields for now
  ) {
    this.form = this.fb.group({
      taxpayerType: [data?.taxpayerType || 'JURISTIC', Validators.required],
      code: [data?.code || '', Validators.required],
      name: [data?.name || '', [Validators.required, Validators.pattern(/^[ก-๙\s]+$/)]],
      nameEn: [data?.nameEn || ''],
      taxId: new FormControl(data?.taxId || '', { validators: [Validators.required], updateOn: 'blur' }),
      branch: [data?.branch || '', [Validators.required, Validators.pattern(/^[0-9]{5}$/)]],
      branchName: [data?.branchName || '', Validators.required],
      branchNameEn: [data?.branchNameEn || ''],
      address: [data?.address || '', Validators.required],
      addressEn: [data?.addressEn || ''],
      zipCode: [data?.zipCode || '', Validators.required],
      email: [data?.email || '', [Validators.required, Validators.email]],
      telephone: [data?.telephone || '', Validators.required],
      status: [data?.status || 'ACTIVE']
    });
  }

  ngOnInit(): void {
    console.log('Dialog Data:', this.data);
    if (this.data.mode === 'view') {
      this.form.disable();
    }
    // Initialize validators based on current value
    this.updateTaxIdValidators(this.form.get('taxpayerType')?.value);
  }

  get isViewMode(): boolean {
    return this.data.mode === 'view';
  }

  toggleDropdown(type: string) {
    this.opened[type] = !this.opened[type];
  }

  selectTaxpayerType(type: any) {
    const val = type.value;
    this.form.patchValue({ taxpayerType: val });
    this.updateTaxIdValidators(val);
    this.opened['taxpayerType'] = false;
  }

  updateTaxIdValidators(type: string) {
    const taxIdControl = this.form.get('taxId');
    if (!taxIdControl) return;

    taxIdControl.clearValidators();
    taxIdControl.addValidators(Validators.required);

    if (type === 'JURISTIC') {
      // 13 digits, must start with 0
      taxIdControl.addValidators(Validators.pattern(/^\d{13}$/));
      taxIdControl.addValidators(this.juristicTaxIdValidator);
    } else if (type === 'PERSON') {
      // 13 digits, must start with 1
      taxIdControl.addValidators(Validators.pattern(/^1[0-9]{12}$/));
    } else if (type === 'FOREIGN') {
      // Allow Passport Number as Tax ID (Alphanumeric, varying length)
      // Removed strict 13-digit 99-prefix requirement per user request
      taxIdControl.addValidators(Validators.required);
    } else {
        // Fallback or default
       taxIdControl.addValidators(Validators.pattern(/^[0-9]{13}$/));
    }
    taxIdControl.updateValueAndValidity();
  }

  // Validator สำหรับเช็คว่าเป็นนิติบุคคล (ขึ้นต้นด้วย 0)
  juristicTaxIdValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = (control.value || '').toString();
    // ถ้ายังไม่ครบ 13 หลัก ให้ validator อื่นจัดการ
    if (value.length !== 13) {
      return null;
    }
    // เช็คตัวแรก
    if (!value.startsWith('0')) {
      return { notJuristic: true };
    }
    return null;
  }

  get selectedTaxpayerType() {
    const val = this.form.get('taxpayerType')?.value;
    return this.taxpayerTypes.find(t => t.value === val);
  }

  onSave(): void {
    if (this.form.valid) {
      const buyerData = this.form.value;
      // Map new fields to existing Buyer interface if needed, or send as is if backend supports extra fields
      // For now, we send everything. Backend might ignore unknown fields.
      
      if (this.data.id) {
        this.buyerService.updateBuyer(this.data.id, buyerData).subscribe(() => {
          this.dialogRef.close(true);
        });
      } else {
        this.buyerService.createBuyer(buyerData).subscribe(() => {
          this.dialogRef.close(true);
        });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Prevent typing of invalid characters


  validateNumericInput(event: any, maxLength: number) {
    const input = event.target;
    // Remove non-numeric characters
    let value = input.value.replace(/[^0-9]/g, '');
    // Limit to maxLength
    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
    }
    input.value = value;
    
    // Determine which control to update based on maxLength or field name
    // Since we reuse this, we need to know which field. 
    // Easier approach: Pass field name or just rely on formControlName binding if using (input) without manually setting value (Angular handles it, but for strict masking we usually set it).
    // Let's rely on event binding updating the DOM value, and trigger FormControl update.
    const controlName = input.getAttribute('formControlName');
    if (controlName) {
        const control = this.form.get(controlName);
        // Only set value explicitly if not using blur strategy
        // If blur, we rely on the native input value being picked up on blur event
        if (control && control.updateOn !== 'blur') {
             control.setValue(value);
        }
    }
  }

  validateThaiInput(event: any) {
    const input = event.target;
    input.value = input.value.replace(/[^ก-๙\s]/g, '');
    this.form.get('name')?.setValue(input.value);
  }

  validateNoThaiInput(event: any) {
    const input = event.target;
    input.value = input.value.replace(/[\u0E00-\u0E7F]/g, '');
    const controlName = input.getAttribute('formControlName');
    if (controlName) {
        this.form.get(controlName)?.setValue(input.value);
    }
  }

  validateNoEnglishInput(event: any) {
    const input = event.target;
    input.value = input.value.replace(/[a-zA-Z]/g, '');
    const controlName = input.getAttribute('formControlName');
    if (controlName) {
        this.form.get(controlName)?.setValue(input.value);
    }
  }
}
