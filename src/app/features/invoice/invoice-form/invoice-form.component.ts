import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DocumentService } from '../../documents/document.service';
import { OrgService } from '../../../shared/services/org.service';
import { DocumentTypeService, DocumentTypeOption } from '../../../shared/document-type.service';

@Component({
  selector: 'app-invoice-form',
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.css'],
})
export class InvoiceFormComponent implements OnInit {
  // ===== forms =====
  form!: FormGroup;
  fgHeader!: FormGroup;
  fgCustomer!: FormGroup;

  // ===== heading (บนบัตร/หัวเอกสาร) =====
  docTypeTh = '';
  docTypeEn = '';
  docTypeCode = '';
  docTypeOptions: DocumentTypeOption[] = []; // Added to store document type options

  // ===== seller / header view state =====
  branches: { code: string; name: string }[] = [
    { code: '00000', name: 'สำนักงานใหญ่' },
  ];
  logoUrl = '';

  // ===== items / totals state =====
  use4Decimals = false;
  editingServiceFee = false;
  editingShippingFee = false;
  serviceFee = 0;
  shippingFee = 0;

  partyTypes = [
    { value: 'PERSON', label: 'บุคคลธรรมดา' },
    { value: 'JURISTIC', label: 'นิติบุคคล' },
    { value: 'FOREIGNER', label: 'ชาวต่างชาติ' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private docs: DocumentService,
    private org: OrgService,
    private documentTypeService: DocumentTypeService // Injected DocumentTypeService
  ) {}

  ngOnInit(): void {
    // ----- build forms -----
    this.fgHeader = this.fb.group({
      companyName: [''],
      taxId: [''],
      branchCode: ['00000', Validators.required],
      seller: [''],
      docNo: [''],
      issueDate: [this.today(), Validators.required],
      address: [''],
      tel: [''],
    });

    this.fgCustomer = this.fb.group({
      partyType: ['PERSON', Validators.required],
      code: [''],
      name: ['', Validators.required],
      taxId: [''],
      branchCode: [''],
      passportNo: [''],
      address: [''],
      email: [''],
      tel: [''],
      zip: [''],
    });

    this.form = this.fb.group({
      remark: [''],
      items: this.fb.array([]),
      docType: ['', Validators.required], // Added docType to the main form
    });

    // Fetch document types
    this.documentTypeService.list().subscribe((options) => {
      this.docTypeOptions = options;
    });

    // ----- preload seller/org (ชื่อบริษัท / ภาษี / สาขา / โลโก้ / ที่อยู่) -----
    this.org.loadSellerProfile().subscribe((p) => {
      this.logoUrl = p.logoUrl || '';
      this.branches = p.branches?.length ? p.branches : this.branches;
      this.fgHeader.patchValue(
        {
          companyName: p.companyName,
          taxId: p.taxId,
          branchCode: p.branchCode,
          address: p.address,
          tel: p.tel,
        },
        { emitEvent: false }
      );
    });

    // ----- route: สร้างใหม่หรือแก้ไข -----
    const docNo = this.route.snapshot.paramMap.get('docNo');
    if (docNo) {
      // โหมดดู/แก้ไข: โหลดรายละเอียดด้วยเลขเอกสาร
      this.docs.getByDocNoDetail(docNo).subscribe((d: any) => {
        this.docTypeCode = d.docTypeCode || '';
        this.docTypeTh = d.docType || '';
        this.form.get('docType')?.setValue(this.docTypeCode); // Set selected docType for existing document
        this.fgHeader.patchValue(
          {
            docNo: d.docNo,
            issueDate: d.issueDate,
            seller: d.sellerName || '',
          },
          { emitEvent: false }
        );

        this.fgCustomer.patchValue(
          {
            partyType: d.customerType || 'PERSON',
            code: d.customerCode || '',
            name: d.customerName || '',
            taxId: d.customerTaxId || '',
            branchCode: d.customerBranchCode || '',
            address: d.customerAddress || '',
            email: d.customerEmail || '',
            tel: d.customerTel || '',
            zip: d.customerZip || '',
            passportNo: d.customerPassportNo || '',
          },
          { emitEvent: false }
        );

        this.itemsFA().clear();
        (d.items || []).forEach((it: any) => this.addItem(it));
        this.serviceFee = Number(d.serviceFee || 0);
        this.shippingFee = Number(d.shippingFee || 0);
      });
    } else {
      // โหมดสร้าง: ให้มีอย่างน้อย 1 แถว
      this.addItem();
    }

    // Subscribe to docType changes to update heading
    this.form.get('docType')?.valueChanges.subscribe((selectedCode) => {
      const selectedDocType = this.docTypeOptions.find(
        (option) => option.code === selectedCode
      );
      if (selectedDocType) {
        this.docTypeCode = selectedDocType.code;
        this.docTypeTh = selectedDocType.thName;
        this.docTypeEn = selectedDocType.enName;
      } else {
        this.docTypeCode = '';
        this.docTypeTh = '';
        this.docTypeEn = '';
      }
    });
  }

  // ===== utilities =====
  private today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

  itemsFA(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get itemForms(): FormGroup[] {
    return this.itemsFA().controls as FormGroup[];
  }

  addItem(init?: any) {
    const fg = this.fb.group({
      sku: [init?.sku || ''],
      name: [init?.name || ''],
      qty: [init?.qty ?? 1],
      price: [init?.price ?? 0],
      discount: [init?.discount ?? 0],
      vatRate: [init?.vatRate ?? 7],
      amount: [{ value: 0, disabled: true }],
    });

    // autocalc amount
    fg.valueChanges.subscribe((v) => {
      const amount =
        (Number(v.qty) || 0) * (Number(v.price) || 0) -
        (Number(v.discount) || 0);
      fg.get('amount')?.setValue(this.round(amount), { emitEvent: false });
    });

    this.itemsFA().push(fg);
  }

  removeItem(i: number) {
    this.itemsFA().removeAt(i);
  }

  trackByIdx(i: number) {
    return i;
  }

  // ===== totals (getter ให้เทมเพลตเรียกใช้) =====
  get totals() {
    const rows = this.itemForms.map((f) => f.getRawValue());
    const subtotal = rows.reduce(
      (s, r) => s + Number(r.qty || 0) * Number(r.price || 0),
      0
    );
    const discount = rows.reduce((s, r) => s + Number(r.discount || 0), 0);
    const netAfterDiscount = subtotal - discount;
    const vat = rows.reduce((s, r) => {
      const base =
        Number(r.qty || 0) * Number(r.price || 0) - Number(r.discount || 0);
      return s + base * (Number(r.vatRate || 0) / 100);
    }, 0);
    const grand = netAfterDiscount + this.serviceFee + this.shippingFee + vat;

    return {
      subtotal: this.round(subtotal),
      discount: this.round(discount),
      netAfterDiscount: this.round(netAfterDiscount),
      vat: this.round(vat),
      grand: this.round(grand),
    };
  }

  fmt(v: number) {
    return this.use4Decimals ? this.fix(v, 4) : this.fix(v, 2);
  }
  private round(v: number) {
    return this.use4Decimals ? Number(v.toFixed(4)) : Number(v.toFixed(2));
  }
  private fix(v: number, d: number) {
    return (Number.isFinite(v) ? v : 0).toFixed(d);
  }

  // ===== events (ให้ซิกเนเจอร์รับ $event ได้ เพื่อไม่ต้องแก้ HTML) =====
  toggleDecimals(_: any = null) {
    this.use4Decimals = !this.use4Decimals;
  }
  startEditServiceFee() {
    this.editingServiceFee = true;
  }
  stopEditServiceFee() {
    this.editingServiceFee = false;
  }
  onServiceFeeInput(e: Event) {
    this.serviceFee = Number((e.target as HTMLInputElement).value || 0);
  }
  startEditShippingFee() {
    this.editingShippingFee = true;
  }
  stopEditShippingFee() {
    this.editingShippingFee = false;
  }
  onShippingFeeInput(e: Event) {
    this.shippingFee = Number((e.target as HTMLInputElement).value || 0);
  }

  onSubmit() {
    // TODO: post ข้อมูลไปยัง API ถ้าพร้อมใช้งาน
    console.log('submit', {
      header: this.fgHeader.value,
      customer: this.fgCustomer.value,
      items: this.itemForms.map((f) => f.getRawValue()),
      remark: this.form.value.remark,
      docType: this.form.value.docType, // Include selected docType in submission
      totals: this.totals,
      serviceFee: this.serviceFee,
      shippingFee: this.shippingFee,
    });
  }
}
