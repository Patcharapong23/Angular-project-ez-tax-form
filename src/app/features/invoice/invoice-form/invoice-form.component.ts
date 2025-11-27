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
import { AuthService, AuthUser } from '../../../shared/auth.service';
import { DocumentDto } from '../../../shared/models/document.models';
import { environment } from '../../../../environments/environment'; // Import environment
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { thaiTaxIdValidator } from '../../../shared/validators/thai-tax-id-angular.validator'; // <--- Add this import

interface MeResponse {
  user: {
    userId: string;
    username: string;
    fullName?: string;
    email?: string;
  };
  seller?: {
    sellerId: string;
    sellerTaxId: string;
    sellerNameTh?: string;
    sellerNameEn?: string;
    sellerPhoneNumber?: string;
    logoUrl?: string;
    sellerTypeTax?: string | null;
  };
  defaultBranch?: {
    branchId: string;
    branchCode: string;
    branchNameTh?: string;
    branchNameEn?: string;
    buildingNo?: string;
    addressDetailTh?: string;
    addressDetailEn?: string;
    subdistrictId?: string;
    districtId?: string;
    provinceId?: string;
    zipCode?: string;
  };
}

@Component({
  selector: 'app-invoice-form',
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.css'],
})
export class InvoiceFormComponent implements OnInit {
  // ===== state =====
  createdDocument: DocumentDto | null = null; // New property to store the created document
  creationSuccess = false;
  isSaving = false;
  documentUuid: string | null = null;

  // ===== forms =====
  form!: FormGroup;
  fgHeader!: FormGroup;
  fgCustomer!: FormGroup;

  // ===== heading (บนบัตร/หัวเอกสาร) =====
  docTypeTh = '';
  docTypeEn = '';
  docTypeCode = '';

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

  totals = {
    subtotal: 0,
    discount: 0,
    netAfterDiscount: 0,
    vat: 0,
    grand: 0,
  };

  partyTypes = [
    { value: 'PERSON', label: 'บุคคลธรรมดา' },
    { value: 'JURISTIC', label: 'นิติบุคคล' },
    { value: 'FOREIGNER', label: 'ชาวต่างชาติ' },
  ];

  user: AuthUser | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private docs: DocumentService,
    private org: OrgService,
    private auth: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // ----- build forms -----
    this.fgHeader = this.fb.group({
      companyName: [{ value: '', disabled: true }],
      taxId: [{ value: '', disabled: true }],
      branchCode: ['00000', Validators.required],
      tel: [{ value: '', disabled: true }],
      address: [{ value: '', disabled: true }],

      // ✅ ต้องมีคอนโทรลนี้ให้ตรงกับ HTML
      seller: ['', Validators.required],

      // ถ้ามี field อื่นอยู่แล้ว ให้คงไว้เหมือนเดิม
      docNo: [''],
      issueDate: [this.todayIsoString(), Validators.required],
      taxRate: [7],
    });

    this.fgCustomer = this.fb.group({
      partyType: ['PERSON', Validators.required],
      code: [''],
      name: ['', Validators.required],
      taxId: ['', [thaiTaxIdValidator]],
      branchCode: [''],
      passportNo: [''],
      address: [''],
      email: [''],
      tel: [''],
      zip: [''],
      saveToMaster: [false],
    });

    // Conditional validation for taxId
    this.fgCustomer.get('partyType')?.valueChanges.subscribe(partyType => {
      const taxIdControl = this.fgCustomer.get('taxId');
      if (!taxIdControl) return;

      if (partyType === 'JURISTIC') {
        taxIdControl.setValidators([Validators.required, Validators.minLength(13), Validators.maxLength(13), Validators.pattern(/^\d+$/), thaiTaxIdValidator]);
      } else {
        taxIdControl.setValidators([thaiTaxIdValidator]); // Only taxId format validation
      }
      taxIdControl.updateValueAndValidity();
    });

    // Initial check for partyType on load
    const initialPartyType = this.fgCustomer.get('partyType')?.value;
    const taxIdControl = this.fgCustomer.get('taxId');
    if (taxIdControl) {
      if (initialPartyType === 'JURISTIC') {
        taxIdControl.setValidators([Validators.required, Validators.minLength(13), Validators.maxLength(13), Validators.pattern(/^\d+$/), thaiTaxIdValidator]);
      } else {
        taxIdControl.setValidators([thaiTaxIdValidator]);
      }
      taxIdControl.updateValueAndValidity();
    }


    this.form = this.fb.group({
      remark: [''],
      items: this.fb.array([]),
      taxRate: [7],
      vatType: ['exclude'],
    });

    this.form.get('vatType')?.valueChanges.subscribe(() => {
      this.calculateTotals();
    });

    // ----- preload seller/org (ชื่อบริษัท / ภาษี / สาขา / โลโก้ / ที่อยู่) -----
    this.auth.user$.subscribe((user) => {
      if (user) {
        this.user = user;
        this.logoUrl = user.logoUrl ?? '';
        this.branches = user.branchCode
          ? [
              {
                code: user.branchCode,
                name: user.branchNameTh || user.branchNameEn || 'สำนักงานใหญ่',
              },
            ]
          : [];
        const address = [
          user.sellerAddress?.buildingNo,
          user.sellerAddress?.addressDetailTh,
          user.sellerAddress?.postalCode,
        ]
          .filter(Boolean)
          .join(' ');

        this.fgHeader.patchValue({
          companyName: user.sellerNameTh || user.sellerNameEn || '',
          taxId: user.sellerTaxId || '',
          branchCode: user.branchCode || '',
          tel: user.sellerPhoneNumber || '',
          address: address,
          seller: user.fullName || user.userName || '',
        });
      }
    });

    // ----- route: สร้างใหม่หรือแก้ไข -----
    const docNo = this.route.snapshot.paramMap.get('docNo');
    if (docNo) {
      // โหมดดู/แก้ไข: โหลดรายละเอียดด้วยเลขเอกสาร
      this.docs.getByDocNoDetail(docNo).subscribe((d: any) => {
        this.docTypeCode = d.docTypeCode || '';
        this.docTypeTh = d.docType || '';
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
            partyType: d.buyerType || 'PERSON',
            code: d.buyerCode || '',
            name: d.buyerName || '',
            taxId: d.buyerTaxId || '',
            branchCode: d.buyerBranchCode || '',
            address: d.buyerAddress || '',
            email: d.buyerEmail || '',
            tel: d.buyerTel || '',
            zip: d.buyerZip || '',
            passportNo: d.buyerPassportNo || '',
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
      this.route.queryParams.subscribe((params) => {
        const docTypeMap: { [key: string]: string } = {
          T01: 'ใบเสร็จรับเงิน (T01)',
          T02: 'ใบแจ้งหนี้/ใบกำกับภาษี (T02)',
          T03: 'ใบเสร็จรับเงิน/ใบกำกับภาษี (T03)',
          T04: 'ใบส่งของ/ใบกำกับภาษี (T04)',
          '380': 'ใบแจ้งหนี้ (380)',
          '388': 'ใบกำกับภาษี (388)',
          '80': 'ใบเพิ่มหนี้ (80)',
          '81': 'ใบลดหนี้ (81)',
        };
        const docTypeEnMap: { [key: string]: string } = {
          T01: 'Receipt (T01)',
          T02: 'Invoice/Tax Invoice (T02)',
          T03: 'Receipt/Tax Invoice (T03)',
          T04: 'Delivery Order/Tax Invoice (T04)',
          '380': 'Invoice (380)',
          '388': 'Tax Invoice (388)',
          '80': 'Debit Note (80)',
          '81': 'Credit Note (81)',
        };
        const typeCode = params['type'];
        this.docTypeCode = typeCode;
        this.docTypeTh = docTypeMap[typeCode] || typeCode; // Fallback to code if not found
        this.docTypeEn = docTypeEnMap[typeCode] || '';
      });
      this.addItem();
    }
  }

  // ===== utilities =====
  private todayIsoString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }

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

  calculateTotals() {
    const rows = this.itemForms.map((f) => f.getRawValue());
    const vatType = this.form.get('vatType')?.value || 'exclude';
    const serviceAndShipping = this.serviceFee + this.shippingFee;

    let subtotal = 0; // จำนวนเงินรวมก่อนส่วนลด (qty * price)
    let discountTotal = 0; // ส่วนลดรวมทั้งบิล
    let netAfterDiscount = 0; // หลังหักส่วนลด (รวมทุกบรรทัด)
    let baseTotal = 0; // ฐานภาษี (ยอดก่อน VAT)
    let vatTotal = 0; // VAT รวมทั้งบิล

    for (const r of rows) {
      const qty = Number(r.qty) || 0;
      const price = Number(r.price) || 0;
      const discount = Number(r.discount) || 0;
      const taxRate = Number(r.taxRate) || 0; // ← ใช้ % ของแต่ละแถว

      const lineAmount = qty * price; // จำนวนเงินรวมของแถว (ก่อนลด)
      const lineNet = lineAmount - discount; // หลังหักส่วนลด แต่อาจยังรวมภาษีอยู่

      subtotal += lineAmount;
      discountTotal += discount;
      netAfterDiscount += lineNet;

      if (vatType === 'include') {
        // ราคาในช่องคือ "รวม VAT แล้ว"
        if (taxRate > 0) {
          const base = lineNet / (1 + taxRate / 100);
          const vat = lineNet - base;
          baseTotal += base;
          vatTotal += vat;
        } else {
          // อัตรา 0% ก็ถือเป็นฐานภาษีเต็ม ไม่มี VAT
          baseTotal += lineNet;
        }
      } else {
        // ราคาในช่องคือ "ยังไม่รวม VAT"
        baseTotal += lineNet;
        if (taxRate > 0) {
          const vat = lineNet * (taxRate / 100);
          vatTotal += vat;
        }
      }
    }

    // ----- ค่าบริการ + ค่าขนส่ง -----
    // ตอนนี้สมมติใช้ VAT มาตรฐาน 7% ให้ทั้งสองอย่าง (ปรับได้ถ้าอยากซับซ้อนขึ้น)
    const serviceRate = 7;
    if (serviceAndShipping > 0) {
      if (vatType === 'include') {
        const base = serviceAndShipping / (1 + serviceRate / 100);
        const vat = serviceAndShipping - base;
        baseTotal += base;
        vatTotal += vat;
        netAfterDiscount += serviceAndShipping; // เพราะค่าบริการ/ขนส่งรวมอยู่ในราคารวมภาษี
      } else {
        baseTotal += serviceAndShipping;
        const vat = serviceAndShipping * (serviceRate / 100);
        vatTotal += vat;
      }
    }

    // ----- ยอดรวมสุทธิ -----
    const grand =
      vatType === 'include'
        ? netAfterDiscount // รวม VAT อยู่แล้ว
        : baseTotal + vatTotal;

    this.totals = {
      subtotal: this.round(subtotal),
      discount: this.round(discountTotal),
      netAfterDiscount: this.round(netAfterDiscount),
      vat: this.round(vatTotal),
      grand: this.round(grand),
    };
  }

  private round(v: number) {
    return this.use4Decimals ? Number(v.toFixed(4)) : Number(v.toFixed(2));
  }

  private fix(v: number, d: number): string {
    const num = Number.isFinite(v) ? v : 0;
    // Use 'th-TH' locale for comma separation and specified decimal places
    return num.toLocaleString('th-TH', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  addItem(init?: any) {
    const fg = this.fb.group({
      sku: [init?.sku || ''],
      name: [init?.name || ''],
      qty: [init?.qty ?? 1],
      price: [init?.price ?? 0],
      discount: [init?.discount ?? 0],

      // ถ้ามาจากเอกสารเดิมให้ลองอ่าน init.vatRate ก่อน
      taxRate: [init?.taxRate ?? init?.vatRate ?? 7],

      amount: [{ value: 0, disabled: true }],
    });

    // autocalc amount + sync taxRate
    fg.valueChanges.subscribe((v) => {
      const amount =
        (Number(v.qty) || 0) * (Number(v.price) || 0) -
        (Number(v.discount) || 0);

      const amountControl = fg.get('amount');
      if (amountControl && this.round(amount) !== amountControl.value) {
        amountControl.setValue(this.round(amount));
      }

      // ✅ sync taxRate ของแถวนี้ไปที่หัวเอกสาร
      const headerTax = Number(v.taxRate ?? 0);
      this.fgHeader.patchValue({ taxRate: headerTax }, { emitEvent: false });

      this.calculateTotals();
    });

    this.itemsFA().push(fg);

    // ให้คำนวณครั้งแรกหลังเพิ่มแถว
    this.fgHeader.patchValue(
      { taxRate: fg.get('taxRate')?.value ?? 0 },
      { emitEvent: false }
    );
    this.calculateTotals();
  }

  removeItem(i: number) {
    this.itemsFA().removeAt(i);
  }

  trackByIdx(i: number) {
    return i;
  }

  // ===== totals (getter ให้เทมเพลตเรียกใช้) =====

  fmt(v: number) {
    return this.use4Decimals ? this.fix(v, 4) : this.fix(v, 2);
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
  cancelServiceFee() {
    this.serviceFee = 0;
    this.editingServiceFee = false;
  }
  cancelShippingFee() {
    this.shippingFee = 0;
    this.editingShippingFee = false;
  }

  onSubmit() {
    if (this.form.invalid || this.fgHeader.invalid || this.fgCustomer.invalid) {
      return;
    }
    this.isSaving = true;

    const header = this.fgHeader.getRawValue();
    const customer = this.fgCustomer.getRawValue();
    const totals = this.totals;
    const items = this.itemForms.map((f, i) => {
      const item = f.getRawValue();
      return {
        lineNo: i + 1,
        name: item.name,
        qty: item.qty,
        unitPrice: item.price,
        discount: item.discount,
        vatRate: item.taxRate,
        sku: item.sku,
      };
    });

    // Convert issueDate to full ISO 8601 format
    const issueDate = new Date(header.issueDate).toISOString();

    const payload = {
      header: {
        docTypeCode: this.docTypeCode,
        docNo: header.docNo,
        issueDate: issueDate,
        sellerTaxId: header.taxId,
        branchCode: header.branchCode, // Added branchCode
        currency: 'THB',
        vatRateStandard: header.taxRate,
      },
      party: {
        buyerDetails: {
          type: customer.partyType,
          buyerNameTh: customer.name,
          buyerAddressTh: customer.address,
          buyerEmail: customer.email,
          buyerPhoneNumber: customer.tel,
          buyerZipCode: customer.zip,
          buyerCode: customer.code,
          buyerBranchCode: customer.branchCode,
          buyerTaxId:
            customer.partyType === 'JURISTIC' ? customer.taxId || null : null,
          buyerPassportNo:
            customer.partyType === 'PERSON'
              ? customer.passportNo || null
              : null,
        },
        saveToMaster: customer.saveToMaster, // Added saveToMaster
      },
      items: items,
      moneyTaxbasisTotalamt: totals.subtotal, // Flattened total
      moneyTaxTotalamt: totals.vat, // Flattened total
      moneyGrandTotalamt: totals.grand, // Flattened total
      remarkOther: this.form.value.remark, // Renamed remark
    };

    this.docs.createDocument(payload).subscribe({
      // Use createDocument
      next: (res) => {
        console.log('Created document', res);
        const docUuid = res.document.docUuid;
        const pdfAvailable = res.exportInfo.pdfAvailable;

        this.createdDocument = res.document; // Store the created document
        this.documentUuid = docUuid; // Store the UUID
        this.creationSuccess = true;
        this.isSaving = false;

        if (pdfAvailable) {
          this.docs.exportDocument(docUuid, 'pdf').subscribe((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `document-${docUuid}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          });
        }
      },
      error: (err) => {
        console.error('Error creating document', err);
        this.isSaving = false;
        // You can add user-facing error handling here
      },
    });
  }

  exportPdf(docUuid: string | null) {
    // Change parameter type
    if (docUuid === null) {
      console.error('Document UUID is not available');
      return;
    }
    this.docs.exportDocument(docUuid, 'pdf').subscribe((blob) => {
      // Use new exportDocument
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `document-${docUuid}.pdf`; // Use docUuid for filename
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  }

  resetForm() {
    this.creationSuccess = false;
    this.createdDocument = null; // Reset the new property
    this.documentUuid = null; // Reset the document UUID
    this.form.reset();
    this.fgHeader.reset();
    this.fgCustomer.reset();
    this.itemsFA().clear();
    this.addItem();
    this.fgHeader.patchValue({
      issueDate: this.todayIsoString(),
    });
  }
}
