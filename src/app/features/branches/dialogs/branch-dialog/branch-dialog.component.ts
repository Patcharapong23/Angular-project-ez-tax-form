import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BranchDto, BranchService } from '../../../../shared/services/branch.service';
import { SwalService } from '../../../../shared/services/swal.service';
import { ThaiAddressService, Province, District, Subdistrict } from '../../../../shared/thai-address.service';
import { ImageUploadService } from '../../../../shared/services/image-upload.service';

@Component({
  selector: 'app-branch-dialog',
  templateUrl: './branch-dialog.component.html',
  styleUrls: ['./branch-dialog.component.css']
})
export class BranchDialogComponent implements OnInit {
  form: FormGroup;
  isViewMode = false;
  
  // Address Data
  provinces: Province[] = [];
  districts: District[] = [];
  subdistricts: Subdistrict[] = [];

  // Logo (Mock for UI)
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private branchService: BranchService,
    private swalService: SwalService,
    private thaiAddressService: ThaiAddressService,
    private imageUploadService: ImageUploadService,
    public dialogRef: MatDialogRef<BranchDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      branchCode: [{ value: data?.branchCode || '', disabled: data?.mode === 'edit' }, [Validators.required, Validators.pattern(/^[0-9]{5}$/)]],
      branchNameTh: [data?.branchNameTh || '', Validators.required],
      branchNameEn: [data?.branchNameEn || ''],
      
      // Address Fields
      buildingNo: [data?.buildingNo || '', Validators.required],
      addressDetailTh: [data?.addressDetailTh || ''], // Use for Moo/Village etc as per design "รายละเอียดที่อยู่"
      provinceId: [data?.provinceId || '', Validators.required],
      districtId: [data?.districtId || '', Validators.required],
      subdistrictId: [data?.subdistrictId || '', Validators.required],
      zipCode: [data?.zipCode || '', Validators.required],
      addressDetailEn: [data?.addressDetailEn || ''],
      
      enableFlag: [data?.enableFlag !== undefined ? data.enableFlag : true]
    });

    if (data?.mode === 'view') {
      this.isViewMode = true;
      this.form.disable();
    }
  }

  ngOnInit(): void {
    this.loadProvinces();

    if (this.data?.branchId) {
      this.branchService.getBranchById(this.data.branchId).subscribe((branch: any) => {
        // Patch form
        this.form.patchValue({
          branchCode: branch.branchCode,
          branchNameTh: branch.branchNameTh,
          branchNameEn: branch.branchNameEn,
          buildingNo: branch.buildingNo,
          addressDetailTh: branch.addressDetailTh,
          provinceId: branch.provinceId,
          districtId: branch.districtId,
          subdistrictId: branch.subdistrictId,
          zipCode: branch.zipCode,
          addressDetailEn: branch.addressDetailEn,
          enableFlag: branch.enableFlag === 'Y' || branch.enableFlag === true
        });

        // Handle Logo
        if (branch.logoUrl) {
           this.imagePreview = branch.logoUrl;
        }

        // Load dependent dropdowns
        if (branch.provinceId) {
          this.loadDistricts(branch.provinceId);
        }
        if (branch.districtId) {
          this.loadSubdistricts(branch.districtId);
        }
      });
    }
  }

  loadProvinces() {
    this.thaiAddressService.getProvinces().subscribe(data => {
      this.provinces = data;
    });
  }

  onProvinceChange(provinceCode: string) {
    this.districts = [];
    this.subdistricts = [];
    this.form.patchValue({ districtId: '', subdistrictId: '', zipCode: '' });
    if (provinceCode) {
      this.loadDistricts(provinceCode);
    }
  }

  loadDistricts(provinceCode: string) {
    this.thaiAddressService.getDistricts(provinceCode).subscribe(data => {
      this.districts = data;
    });
  }

  onDistrictChange(districtCode: string) {
    this.subdistricts = [];
    this.form.patchValue({ subdistrictId: '', zipCode: '' });
    if (districtCode) {
      this.loadSubdistricts(districtCode);
    }
  }

  loadSubdistricts(districtCode: string) {
    this.thaiAddressService.getSubdistricts(districtCode).subscribe(data => {
      this.subdistricts = data;
    });
  }

  onSubdistrictChange(subdistrictCode: string) {
    const subdistrict = this.subdistricts.find(s => s.code === subdistrictCode);
    if (subdistrict && subdistrict.zip) {
      this.form.patchValue({ zipCode: subdistrict.zip });
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    
    // Mock preview only
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    this.selectedFile = file;
  }

  onSave(): void {
    if (this.form.valid) {
        
      const branchData: BranchDto = {
        ...this.form.getRawValue(),
        branchId: this.data?.branchId,
        enableFlag: this.form.value.enableFlag ? 'Y' : 'N'
      };

      if (this.data.mode === 'edit' && this.data.branchId) {
        this.branchService.updateBranch(this.data.branchId, branchData).subscribe({
          next: (savedBranch) => {
             if (this.selectedFile) {
                 this.uploadLogo(this.data.branchId);
             } else {
                 this.swalService.success('บันทึกสำเร็จ', 'แก้ไขข้อมูลสาขาเรียบร้อยแล้ว');
                 this.dialogRef.close(true);
             }
          },
          error: (err) => {
            console.error(err);
            this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
          }
        });
      } else {
        this.branchService.createBranch(branchData).subscribe({
          next: (savedBranch) => {
             if (this.selectedFile && savedBranch.branchId) {
                 this.uploadLogo(savedBranch.branchId);
             } else {
                 this.swalService.success('บันทึกสำเร็จ', 'สร้างสาขาใหม่เรียบร้อยแล้ว');
                 this.dialogRef.close(true);
             }
          },
          error: (err) => {
            console.error(err);
            this.swalService.error('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างสาขาได้');
          }
        });
      }
    } else {
      this.form.markAllAsTouched();
    }
  }

  uploadLogo(branchId: string) {
      if (!this.selectedFile) return;
      this.imageUploadService.processImage(this.selectedFile).then(blob => {
           this.imageUploadService.uploadBranchLogo(branchId, blob).subscribe({
               next: (event) => {
                   if (event.state === 'DONE') {
                       this.swalService.success('บันทึกสำเร็จ', 'บันทึกข้อมูลและอัปโหลดโลโก้เรียบร้อยแล้ว');
                       this.dialogRef.close(true);
                   }
               },
               error: (err) => {
                    console.error('Logo upload error', err);
                    this.swalService.warning('บันทึกข้อมูลสำเร็จ', 'แต่ไม่สามารถอัปโหลดโลโก้ได้: ' + (err.message || 'Unknown error'));
                    this.dialogRef.close(true); 
               }
           })
      }).catch(err => {
          console.error('Image processing error', err);
          this.swalService.warning('บันทึกข้อมูลสำเร็จ', 'แต่ไม่สามารถประมวลผลรูปภาพได้');
          this.dialogRef.close(true);
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  validateNumericInput(event: any, maxLength: number) {
    const input = event.target;
    let value = input.value.replace(/[^0-9]/g, '');
    if (value.length > maxLength) {
      value = value.substring(0, maxLength);
    }
    input.value = value;
    this.form.get('branchCode')?.setValue(value);
  }
}
