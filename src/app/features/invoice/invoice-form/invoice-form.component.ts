import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InvoiceService, Invoice } from '../invoice.service';
import { AuthService, AuthUser } from '../../../shared/auth.service';

@Component({
  selector: 'app-invoice-form',
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.css'],
})
export class InvoiceFormComponent implements OnInit {
  invoiceForm!: FormGroup;
  currentUser: AuthUser | null = null;
  isEditMode = false;
  private invoiceId: string | null = null;

  documentTypes = [
    { value: 'T01', viewValue: 'T01 ใบรับ (ใบเสร็จรับเงิน)' },
    { value: 'T02', viewValue: 'T02 ใบแจ้งหนี้ / ใบกำกับภาษี' },
    { value: 'T03', viewValue: 'T03 ใบเสร็จรับเงิน / ใบกำกับภาษี' },
    { value: 'T04', viewValue: 'T04 ใบส่งของ / ใบกำกับภาษี' },
    { value: '380', viewValue: '380 ใบแจ้งหนี้' },
    { value: '388', viewValue: '388 ใบกำกับภาษี' },
    { value: '80', viewValue: '80 ใบเพิ่มหนี้' },
    { value: '81', viewValue: '81 ใบลดหนี้' },
  ];
  documentTemplates = [
    { value: 'default-a', viewValue: 'แม่แบบ A (ค่าเริ่มต้น)' },
    { value: 'template-b', viewValue: 'แม่แบบ B (สำหรับส่งออก)' },
  ];

  constructor(
    private fb: FormBuilder,
    private invoiceService: InvoiceService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUser();
    this.initForm();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.invoiceId = id;
        this.loadInvoiceData(id);
      }
    });
    if (!this.isEditMode) {
      this.route.queryParams.subscribe((params) => {
        const type = params['type'];
        const template = params['template'];
        if (type && template) {
          this.invoiceForm.patchValue({
            documentType: type,
            documentTemplate: template,
          });
        }
      });
    }
  }

  initForm(): void {
    this.invoiceForm = this.fb.group({
      documentType: ['', Validators.required],
      documentTemplate: ['default-a', Validators.required],
      issueDate: [
        new Date().toISOString().substring(0, 10),
        Validators.required,
      ],
      seller: this.fb.group({
        name: [this.currentUser?.companyName || '', Validators.required],
        taxId: [this.currentUser?.taxId || '', Validators.required],
        address: [
          this.currentUser
            ? this.formatAddress(this.currentUser.addressTh)
            : '',
        ],
        phone: [this.currentUser?.businessPhone || ''],
      }),
      customer: this.fb.group({
        name: ['', Validators.required],
        branchCode: [
          '00000',
          [Validators.required, Validators.pattern(/^\d{5}$/)],
        ],
        address: [''],
        taxId: ['', Validators.required],
      }),
      items: this.fb.array([], Validators.required),
      subtotal: [0],
      taxRate: [7],
      taxAmount: [0],
      grandTotal: [0],
    });

    if (!this.isEditMode) {
      this.addItem();
    }

    this.invoiceForm.get('items')!.valueChanges.subscribe(() => {
      this.calculateTotals();
    });
  }

  loadInvoiceData(id: string): void {
    this.invoiceService.getInvoice(id).subscribe((invoice: Invoice) => {
      this.items.clear();
      invoice.items.forEach(() => this.addItem());

      this.invoiceForm.patchValue({
        ...invoice,
        issueDate: new Date(invoice.issueDate).toISOString().substring(0, 10),
      });
    });
  }

  // ✅✅✅ === เพิ่มเมธอดที่ขาดหายไปทั้งหมดที่นี่ === ✅✅✅

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  createItem(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit: [''],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      amount: [{ value: 0, disabled: true }],
    });
  }

  addItem(): void {
    this.items.push(this.createItem());
  }

  removeItem(index: number): void {
    this.items.removeAt(index);
  }

  calculateItemAmount(index: number): void {
    const item = this.items.at(index);
    const quantity = item.get('quantity')!.value || 0;
    const unitPrice = item.get('unitPrice')!.value || 0;
    const amount = quantity * unitPrice;
    item.get('amount')!.patchValue(amount, { emitEvent: false });
    this.calculateTotals();
  }

  calculateTotals(): void {
    const items = this.items.getRawValue();
    const subtotal = items.reduce(
      (acc: number, item: any) => acc + item.quantity * item.unitPrice,
      0
    );
    const taxRate = this.invoiceForm.get('taxRate')!.value / 100;
    const taxAmount = subtotal * taxRate;
    const grandTotal = subtotal + taxAmount;

    this.invoiceForm.patchValue(
      {
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
      },
      { emitEvent: false }
    );
  }

  private formatAddress(address: AuthUser['addressTh']): string {
    if (!address) return '';
    const parts = [
      address.buildingNo,
      address.street,
      address.subdistrict,
      address.district,
      address.province,
      address.postalCode,
    ];
    return parts.filter(Boolean).join(' ');
  }

  // =======================================================

  onSubmit(): void {
    if (this.invoiceForm.invalid) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      this.invoiceForm.markAllAsTouched(); // แสดงข้อความ error ใต้ field ที่ไม่ถูกต้อง
      return;
    }

    const formData = this.invoiceForm.getRawValue() as Invoice;

    if (this.isEditMode && this.invoiceId) {
      this.invoiceService
        .updateInvoice(this.invoiceId, formData)
        .subscribe(() => {
          alert('อัปเดตเอกสารสำเร็จ!');
          this.router.navigate(['/documentsall']);
        });
    } else {
      this.invoiceService.createInvoice(formData).subscribe(() => {
        alert('บันทึกเอกสารสำเร็จ!');
        // TODO: Open download modal
        this.router.navigate(['/documentsall']);
      });
    }
  }
}
