import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthUser, AuthService } from '../../../shared/auth.service';
import { CompanyService } from '../../../shared/company.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { thaiTaxIdValidator } from '../../../shared/validators/thai-taxid.validator';
import { noEnglishValidator, noThaiValidator } from '../../../shared/validators/language.validator';
import { SwalService } from '../../../shared/services/swal.service';

@Component({
  selector: 'app-edit-general-info-dialog',
  templateUrl: './edit-general-info-dialog.component.html',
  styleUrls: ['./edit-general-info-dialog.component.css']
})
export class EditGeneralInfoDialogComponent implements OnInit {
  form: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isSaving = false;

  // Logo file size limit (2MB)
  readonly MAX_LOGO_SIZE = 2 * 1024 * 1024;
  logoError: string = '';

  constructor(
    private fb: FormBuilder,
    private companyService: CompanyService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private swalService: SwalService,
    public dialogRef: MatDialogRef<EditGeneralInfoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AuthUser
  ) {
    this.form = this.fb.group({
      sellerNameTh: [data.sellerNameTh, [Validators.required, noEnglishValidator()]],
      sellerNameEn: [data.sellerNameEn, [Validators.required, noThaiValidator()]],
      sellerTaxId: [data.sellerTaxId, [
        Validators.required,
        Validators.minLength(13),
        Validators.maxLength(13),
        Validators.pattern(/^\d+$/),
        thaiTaxIdValidator,
        this.juristicTaxIdValidator
      ]],
      sellerPhoneNumber: [this.formatPhoneNumber(data.sellerPhoneNumber), [Validators.pattern(/^[\d-]*$/)]]
    });

    if (data.logoUrl) {
      this.imagePreview = data.logoUrl;
    }
  }

  ngOnInit(): void {
    // Subscribe to phone number changes to format with dashes
    this.form.get('sellerPhoneNumber')?.valueChanges.subscribe(value => {
      const formatted = this.formatPhoneNumber(value);
      if (formatted !== value) {
        this.form.get('sellerPhoneNumber')?.setValue(formatted, { emitEvent: false });
      }
    });
  }

  // Validator สำหรับเช็คว่าเป็นนิติบุคคล (ขึ้นต้นด้วย 0)
  juristicTaxIdValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = (control.value || '').toString();
    if (value.length !== 13) {
      return null;
    }
    if (!value.startsWith('0')) {
      return { notJuristic: true };
    }
    return null;
  }

  // Block English characters in Thai name field (realtime)
  blockEnglish(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[a-zA-Z]/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      this.form.get('sellerNameTh')?.setValue(cleaned);
    }
  }

  // Block Thai characters in English name field (realtime)
  blockThai(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/[\u0E00-\u0E7F]/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      this.form.get('sellerNameEn')?.setValue(cleaned);
    }
  }

  // Only allow digits in Tax ID field
  sanitizeDigits(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      this.form.get('sellerTaxId')?.setValue(cleaned);
    }
  }

  // Only allow digits in phone field and format with dashes
  sanitizePhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Remove all non-digits
    const digits = input.value.replace(/\D/g, '');
    const formatted = this.formatPhoneNumber(digits);
    if (formatted !== input.value) {
      input.value = formatted;
      this.form.get('sellerPhoneNumber')?.setValue(formatted, { emitEvent: false });
    }
  }

  // Format phone number with dashes (e.g., 02-787-6567 or 091-234-5678)
  formatPhoneNumber(value: string | null | undefined): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    
    if (digits.length === 0) return '';
    
    // Format based on length
    if (digits.startsWith('02')) {
      // Bangkok landline: 02-XXX-XXXX
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`;
    } else if (digits.startsWith('0')) {
      // Mobile or other: 0XX-XXX-XXXX
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    
    // Default formatting
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // Get Tax ID error message
  getTaxIdError(): string {
    const c = this.form.get('sellerTaxId');
    if (!c || !c.touched) return '';
    
    const errors = c.errors;
    if (!errors) return '';

    if (errors['required']) return 'กรุณากรอกเลขประจำตัวผู้เสียภาษีอากร';
    if (errors['minlength'] || errors['maxlength']) return 'เลขประจำตัวผู้เสียภาษีต้องมีความยาว 13 หลัก';
    if (errors['pattern']) return 'กรอกได้เฉพาะตัวเลข 0–9 เท่านั้น';
    if (errors['thaiTaxId']) return 'เลขประจำตัวผู้เสียภาษีไม่ถูกต้องตามรูปแบบที่กำหนด';
    if (errors['notJuristic']) return 'ต้องเป็นเลขประจำตัวผู้เสียภาษีนิติบุคคล (ขึ้นต้นด้วย 0) เท่านั้น';

    return 'ข้อมูลไม่ถูกต้อง';
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > this.MAX_LOGO_SIZE) {
      this.logoError = `ขนาดไฟล์เกิน 2MB (ไฟล์ที่เลือก: ${(file.size / 1024 / 1024).toFixed(2)} MB)`;
      this.snackBar.open(this.logoError, 'ปิด', { duration: 4000 });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      this.logoError = 'กรุณาเลือกไฟล์รูปภาพเท่านั้น';
      this.snackBar.open(this.logoError, 'ปิด', { duration: 3000 });
      return;
    }

    this.logoError = '';
    this.selectedFile = file;
    
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const taxId = this.data.sellerTaxId;

    if (!taxId) {
      this.snackBar.open('ไม่พบเลขผู้เสียภาษี', 'ปิด', { duration: 3000 });
      this.isSaving = false;
      return;
    }

    // Prepare Update Data
    const fv = this.form.value;
    const updateData = {
      sellerTaxId: fv.sellerTaxId,
      sellerNameTh: fv.sellerNameTh,
      sellerNameEn: fv.sellerNameEn,
      sellerPhoneNumber: fv.sellerPhoneNumber?.replace(/-/g, '') || ''
    };

    this.companyService.updateSeller(taxId, updateData).subscribe({
      next: (res) => {
        // Build updated user object for immediate state update
        const updatedData = {
          sellerNameTh: fv.sellerNameTh,
          sellerNameEn: fv.sellerNameEn,
          sellerPhoneNumber: fv.sellerPhoneNumber?.replace(/-/g, '') || ''
        };
        
        // Upload Logo if selected
        if (this.selectedFile) {
          this.companyService.uploadLogo(taxId, this.selectedFile!).subscribe({
            next: (logoRes) => {
              // Include logo URL in updated data
              this.swalService.success('บันทึกสำเร็จ', 'ระบบได้บันทึกข้อมูลบริษัทเรียบร้อยแล้ว').then(() => {
                this.dialogRef.close({ ...updatedData, logoUrl: logoRes.url || this.imagePreview });
              });
            },
            error: (err) => {
              console.error(err);
              this.swalService.success('บันทึกสำเร็จ', 'บันทึกข้อมูลเรียบร้อย แต่อัพโหลดรูปภาพไม่สำเร็จ').then(() => {
                this.dialogRef.close(updatedData);
              });
            }
          });
        } else {
          this.swalService.success('บันทึกสำเร็จ', 'ระบบได้บันทึกข้อมูลบริษัทเรียบร้อยแล้ว').then(() => {
            this.dialogRef.close(updatedData);
          });
        }
      },
      error: (err) => {
        console.error(err);
        this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        this.isSaving = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
