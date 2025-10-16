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
    this.currentUser = this.authService.getUser(); // ควรได้โปรไฟล์ล่าสุดหลัง register/login
    this.initForm();

    // edit mode
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.invoiceId = id;
        this.loadInvoiceData(id);
      }
    });

    // new doc w/ query defaults
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
    // เตรียมค่าเริ่มต้นของ seller จาก currentUser (รองรับทั้งสคีมาใหม่/เก่า)
    const sellerDefaults = this.buildDefaultSellerFromUser(this.currentUser);

    this.invoiceForm = this.fb.group({
      documentType: ['', Validators.required],
      documentTemplate: ['default-a', Validators.required],
      issueDate: [
        new Date().toISOString().substring(0, 10),
        Validators.required,
      ],

      seller: this.fb.group({
        name: [sellerDefaults.name, Validators.required],
        taxId: [sellerDefaults.taxId, Validators.required],
        address: [sellerDefaults.address],
        phone: [sellerDefaults.phone],
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

    // คำนวณยอดรวมเมื่อรายการเปลี่ยน
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

  // ===================== Helper: map โปรไฟล์ผู้ใช้เป็น seller =====================

  /**
   * รองรับสองสคีมา:
   * - ใหม่ (จากสเปค register): tenantNameTh, tenantTaxId, tenantTel, buildingNo,
   *   addressDetailTh, province, district, subdistrict, zipCode
   * - เก่า: companyName, taxId, businessPhone, addressTh{buildingNo, street, subdistrict, district, province, postalCode}
   */
  private buildDefaultSellerFromUser(u: AuthUser | null) {
    const name =
      (u as any)?.tenantNameTh ||
      (u as any)?.companyName ||
      (u as any)?.tenantNameEn ||
      '';

    const taxId = (u as any)?.tenantTaxId || (u as any)?.taxId || '';

    const phone = (u as any)?.tenantTel || (u as any)?.businessPhone || '';

    // address (ใหม่)
    const addrNew = this.formatAddressNew(
      (u as any)?.buildingNo,
      (u as any)?.addressDetailTh,
      (u as any)?.subdistrict,
      (u as any)?.district,
      (u as any)?.province,
      (u as any)?.zipCode
    );

    // address (เก่า)
    const addrLegacy = this.formatAddressLegacy((u as any)?.addressTh);

    const address = addrNew || addrLegacy || '';

    return { name, taxId, phone, address };
  }

  private formatAddressNew(
    buildingNo?: string,
    addressDetailTh?: string,
    subdistrict?: string,
    district?: string,
    province?: string,
    zipCode?: string
  ): string {
    const parts = [
      buildingNo,
      addressDetailTh,
      subdistrict,
      district,
      province,
      zipCode,
    ];
    return parts.filter(Boolean).join(' ').trim();
  }

  private formatAddressLegacy(address: AuthUser['addressTh']): string {
    if (!address) return '';
    const parts = [
      address.buildingNo,
      address.street,
      address.subdistrict,
      address.district,
      address.province,
      address.postalCode,
    ];
    return parts.filter(Boolean).join(' ').trim();
  }

  // ===================== Items =====================

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
    this.calculateTotals();
  }

  calculateItemAmount(index: number): void {
    const item = this.items.at(index);
    const quantity = Number(item.get('quantity')!.value) || 0;
    const unitPrice = Number(item.get('unitPrice')!.value) || 0;
    const amount = quantity * unitPrice;
    item.get('amount')!.patchValue(amount, { emitEvent: false });
    this.calculateTotals();
  }

  // ===================== Totals =====================

  calculateTotals(): void {
    const items = this.items.getRawValue();
    const subtotal = items.reduce(
      (acc: number, it: any) =>
        acc + Number(it.quantity || 0) * Number(it.unitPrice || 0),
      0
    );
    const taxRate = Number(this.invoiceForm.get('taxRate')!.value) / 100;
    const taxAmount = subtotal * taxRate;
    const grandTotal = subtotal + taxAmount;

    this.invoiceForm.patchValue(
      {
        subtotal: Number(subtotal.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
      },
      { emitEvent: false }
    );
  }

  // ===================== Submit =====================

  onSubmit(): void {
    if (this.invoiceForm.invalid) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      this.invoiceForm.markAllAsTouched();
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
        // TODO: เปิด modal ดาวน์โหลด/พิมพ์
        this.router.navigate(['/documentsall']);
      });
    }
  }
}
