import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService } from '../../documents/document.service';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../shared/auth.service';
import { UpdateDocumentRequest } from '../../../shared/models/document.models';

@Component({
  selector: 'app-edit-document',
  templateUrl: './edit-document.component.html',
  styleUrls: ['./edit-document.component.css']
})
export class EditDocumentComponent implements OnInit {
  form!: FormGroup;
  fgHeader!: FormGroup;
  fgCustomer!: FormGroup;
  documentId: string | null = null;
  docTypeTh = '';
  docTypeEn = '';
  docTypeCode = '';
  logoUrl = '';
  branches: { code: string; name: string }[] = [];
  partyTypes = [
    { value: 'PERSON', label: 'บุคคลธรรมดา' },
    { value: 'JURISTIC', label: 'นิติบุคคล' },
    { value: 'FOREIGNER', label: 'ชาวต่างชาติ' },
  ];
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
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private docs: DocumentService,
    private http: HttpClient,
    private auth: AuthService
  ) { }

  ngOnInit(): void {
    this.documentId = this.route.snapshot.paramMap.get('id');
    this.fgHeader = this.fb.group({
      companyName: [{ value: '', disabled: true }],
      taxId: [{ value: '', disabled: true }],
      branchCode: ['00000', Validators.required],
      tel: [{ value: '', disabled: true }],
      address: [{ value: '', disabled: true }],
      seller: ['', Validators.required],
      docNo: [''],
      issueDate: [this.todayIsoString(), Validators.required],
      taxRate: [7],
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
      saveToMaster: [false],
    });

    this.form = this.fb.group({
      remark: [''],
      items: this.fb.array([]),
      taxRate: [7],
      vatType: ['exclude'],
    });

    this.form.get('items')?.valueChanges.subscribe(() => {
      this.calculateTotals();
    });

    this.form.get('vatType')?.valueChanges.subscribe(() => {
      this.calculateTotals();
    });

    this.auth.user$.subscribe((user) => {
      if (user) {
        this.logoUrl = user.logoUrl ?? '';
        this.branches = user.branchCode ? [{ code: user.branchCode, name: user.branchNameTh || user.branchNameEn || 'สำนักงานใหญ่' }] : [];
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

    if (this.documentId) {
      this.docs.getDocumentByUuid(this.documentId).subscribe((doc: any) => {
        this.patchForm(doc);
      });
    }
  }

  patchForm(doc: any) {
    console.log('patchForm', doc);
    this.docTypeCode = doc.docType.code || '';
    this.docTypeTh = doc.docType.thName || '';
    this.docTypeEn = doc.docType.enName || '';

    this.fgHeader.patchValue({
      docNo: doc.docId,
      issueDate: new Date(doc.docIssueDate).toISOString().split('T')[0],
      seller: doc.seller.sellerNameTh,
    });

    this.fgCustomer.patchValue({
      partyType: doc.buyer.type || 'PERSON',
      code: doc.buyer.buyerCode,
      name: doc.buyer.buyerNameTh,
      taxId: doc.buyer.buyerTaxId,
      branchCode: doc.buyer.buyerBranchCode,
      address: doc.buyer.buyerAddressTh,
      email: doc.buyer.buyerEmail,
      tel: doc.buyer.buyerPhoneNumber,
      zip: doc.buyer.buyerZipCode,
      passportNo: doc.buyer.buyerPassportNo,
    });

    const itemsFormArray = this.form.get('items') as FormArray;
    itemsFormArray.clear();
    console.log('doc.items', doc.items);
    doc.items.forEach((item: any) => {
      const itemFormGroup = this.createItem(item);
      console.log('itemFormGroup', itemFormGroup.value);
      itemsFormArray.push(itemFormGroup);
    });
    console.log('itemsFormArray', itemsFormArray.value);

    this.form.patchValue({
      remark: doc.remarkOther,
    });

    this.serviceFee = doc.charges.find((c: any) => c.name === 'service')?.amount || 0;
    this.shippingFee = doc.charges.find((c: any) => c.name === 'shipping')?.amount || 0;

    this.calculateTotals();
  }

  createItem(item: any): FormGroup {
    const fg = this.fb.group({
      sku: [item.sku || ''],
      name: [item.name || ''],
      qty: [item.qty ?? 1],
      price: [item.unitPrice ?? 0],
      discount: [item.discount ?? 0],
      taxRate: [item.vatRate ?? 7],
      amount: [{ value: 0, disabled: true }],
    });

    fg.valueChanges.subscribe((v) => {
      const amount =
        (Number(v.qty) || 0) * (Number(v.price) || 0) -
        (Number(v.discount) || 0);
      fg.get('amount')?.setValue(this.round(amount), { emitEvent: false });
      this.calculateTotals();
    });

    return fg;
  }

  addItem(init?: any) {
    const items = this.form.get('items') as FormArray;
    items.push(this.createItem(init || {}));
  }

  removeItem(i: number) {
    const items = this.form.get('items') as FormArray;
    items.removeAt(i);
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

  fmt(v: number) {
    return this.use4Decimals ? this.fix(v, 4) : this.fix(v, 2);
  }

  private round(v: number) {
    return this.use4Decimals ? Number(v.toFixed(4)) : Number(v.toFixed(2));
  }

  private fix(v: number, d: number): string {
    const num = Number.isFinite(v) ? v : 0;
    return num.toLocaleString('th-TH', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }

  private todayIsoString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }
  trackByIdx(i: number) {
    return i;
  }

  toggleDecimals(_: any = null) {
    this.use4Decimals = !this.use4Decimals;
    this.calculateTotals(); // Recalculate totals when decimal setting changes
  }
  startEditServiceFee() {
    this.editingServiceFee = true;
  }
  stopEditServiceFee() {
    this.editingServiceFee = false;
    this.calculateTotals(); // Recalculate totals when editing stops
  }
  onServiceFeeInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value.replace(/,/g, '')) || 0;
    this.serviceFee = this.round(value);
    this.calculateTotals();
  }
  startEditShippingFee() {
    this.editingShippingFee = true;
  }
  stopEditShippingFee() {
    this.editingShippingFee = false;
    this.calculateTotals(); // Recalculate totals when editing stops
  }
  onShippingFeeInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value.replace(/,/g, '')) || 0;
    this.shippingFee = this.round(value);
    this.calculateTotals();
  }
  cancelServiceFee() {
    this.serviceFee = 0;
    this.editingServiceFee = false;
    this.calculateTotals();
  }
  cancelShippingFee() {
    this.shippingFee = 0;
    this.editingShippingFee = false;
    this.calculateTotals();
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

    const issueDate = new Date(header.issueDate).toISOString();

    const payload: UpdateDocumentRequest = {
      header: {
        docTypeCode: this.docTypeCode,
        docNo: header.docNo,
        issueDate: issueDate,
        sellerTaxId: header.taxId,
        branchCode: header.branchCode,
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
            customer.partyType === 'JURISTIC'
              ? customer.taxId || null
              : null,
          buyerPassportNo:
            customer.partyType === 'PERSON'
              ? customer.passportNo || null
              : null,
        },
        saveToMaster: customer.saveToMaster,
      },
      items: items,
      moneyTaxbasisTotalamt: totals.subtotal,
      moneyTaxTotalamt: totals.vat,
      moneyGrandTotalamt: totals.grand,
      remarkOther: this.form.value.remark,
    };

    if (this.documentId) {
      this.docs.updateDocument(this.documentId, payload).subscribe({
        next: (res) => {
          console.log('Updated document', res);
          this.isSaving = false;
          this.router.navigate(['/documentsall']);
        },
        error: (err) => {
          console.error('Error updating document', err);
          this.isSaving = false;
        },
      });
    }
  }
}