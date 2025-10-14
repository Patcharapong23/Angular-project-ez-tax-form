import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-new-document-dialog',
  templateUrl: './new-document-dialog.component.html',
  styleUrls: ['./new-document-dialog.component.css'],
})
export class NewDocumentDialogComponent implements OnInit {
  form: FormGroup;

  // สำหรับหมุน caret ตอนเปิด/ปิด
  opened = { type: false, template: false };

  documentTypes = [
    { value: 'T01', viewValue: 'ใบเสร็จรับเงิน (T01)' },
    { value: 'T02', viewValue: 'ใบแจ้งหนี้/ใบกำกับภาษี (T02)' },
    { value: 'T03', viewValue: 'ใบเสร็จรับเงิน/ใบกำกับภาษี (T03)' },
    { value: 'T04', viewValue: 'ใบส่งของ/ใบกำกับภาษี (T04)' },
    { value: '380', viewValue: 'ใบแจ้งหนี้ (380)' },
    { value: '388', viewValue: 'ใบกำกับภาษี (388)' },
    { value: '80', viewValue: 'ใบเพิ่มหนี้ (80)' },
    { value: '81', viewValue: 'ใบลดหนี้ (81)' },
  ];

  private allTemplates = [
    { value: 'T01-default', viewValue: 'T01 - General Receipt', type: 'T01' },
    { value: 'T01-simple', viewValue: 'T01 - Simple Form', type: 'T01' },
    { value: 'T02-standard', viewValue: 'T02 - Standard Invoice', type: 'T02' },
    {
      value: '388-official',
      viewValue: '388 - Official Tax Invoice',
      type: '388',
    },
    {
      value: 'template-C',
      viewValue: 'Template C (For T02, 388)',
      type: ['T02', '388'],
    },
  ];
  filteredTemplates: any[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<NewDocumentDialogComponent>
  ) {
    this.form = this.fb.group(
      {
        documentType: ['', Validators.required],
        documentTemplate: [{ value: '', disabled: true }],
      },
      { updateOn: 'blur' } // ไม่แดงก่อนผู้ใช้แตะ
    );
  }

  ngOnInit(): void {
    this.form.get('documentType')?.valueChanges.subscribe((t) => {
      const ctl = this.form.get('documentTemplate');
      ctl?.reset();
      ctl?.enable();
      this.filteredTemplates = this.allTemplates.filter((x) =>
        Array.isArray(x.type) ? x.type.includes(t) : x.type === t
      );
      if (this.filteredTemplates.length === 1) {
        ctl?.setValue(this.filteredTemplates[0].value);
      }
    });
  }

  submit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.value);
  }
  close(): void {
    this.dialogRef.close();
  }
}
