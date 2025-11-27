import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DocumentService } from '../../documents/document.service';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../shared/auth.service';

@Component({
  selector: 'app-view-document',
  templateUrl: './view-document.component.html',
  styleUrls: ['./view-document.component.css']
})
export class ViewDocumentComponent implements OnInit {
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
  creationSuccess = false;
  isSaving = false;
  createdDocument: any = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private docs: DocumentService,
    private http: HttpClient,
    private auth: AuthService
  ) { }

  ngOnInit(): void {
    this.documentId = this.route.snapshot.paramMap.get('id');
    this.fgHeader = this.fb.group({
      companyName: [{ value: '', disabled: true }],
      taxId: [{ value: '', disabled: true }],
      branchCode: [{ value: '00000', disabled: true }],
      tel: [{ value: '', disabled: true }],
      address: [{ value: '', disabled: true }],
      seller: [{ value: '', disabled: true }],
      docNo: [{ value: '', disabled: true }],
      issueDate: [{ value: this.todayIsoString(), disabled: true }],
      taxRate: [{ value: 7, disabled: true }],
    });

    this.fgCustomer = this.fb.group({
      partyType: [{ value: 'PERSON', disabled: true }],
      code: [{ value: '', disabled: true }],
      name: [{ value: '', disabled: true }],
      taxId: [{ value: '', disabled: true }],
      branchCode: [{ value: '', disabled: true }],
      passportNo: [{ value: '', disabled: true }],
      address: [{ value: '', disabled: true }],
      email: [{ value: '', disabled: true }],
      tel: [{ value: '', disabled: true }],
      zip: [{ value: '', disabled: true }],
      saveToMaster: [{ value: false, disabled: true }],
    });

    this.form = this.fb.group({
      remark: [{ value: '', disabled: true }],
      items: this.fb.array([]),
      taxRate: [{ value: 7, disabled: true }],
      vatType: [{ value: 'exclude', disabled: true }],
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
    doc.items.forEach((item: any) => {
      itemsFormArray.push(this.createItem(item));
    });

    this.form.patchValue({
      remark: doc.remarkOther,
    });

    this.serviceFee = doc.charges.find((c: any) => c.name === 'service')?.amount || 0;
    this.shippingFee = doc.charges.find((c: any) => c.name === 'shipping')?.amount || 0;

    this.calculateTotals();
    this.form.disable();
  }

  createItem(item: any): FormGroup {
    const fg = this.fb.group({
      sku: [{ value: item.sku, disabled: true }],
      name: [{ value: item.name, disabled: true }],
      qty: [{ value: item.qty, disabled: true }],
      price: [{ value: item.unitPrice, disabled: true }],
      discount: [{ value: item.discount, disabled: true }],
      taxRate: [{ value: item.vatRate, disabled: true }],
      amount: [{ value: item.amount, disabled: true }],
    });
    return fg;
  }

  itemsFA(): FormArray {
    return this.form.get('items') as FormArray;
  }

  get itemForms(): FormGroup[] {
    return this.itemsFA().controls as FormGroup[];
  }

  calculateTotals() {
    const rows = this.itemForms.map((f) => f.getRawValue());
    const subtotal = rows.reduce(
      (s, r) => s + Number(r.qty || 0) * Number(r.price || 0),
      0
    );
    const discount = rows.reduce((s, r) => s + Number(r.discount || 0), 0);
    const netAfterDiscount = subtotal - discount;
    const serviceAndShipping = this.serviceFee + this.shippingFee;
    const taxRate = this.form.get('taxRate')?.value || 0;
    const vatType = this.form.get('vatType')?.value || 'exclude';

    let beforeTax: number;
    let vat: number;
    let grand: number;

    if (vatType === 'include') {
      grand = netAfterDiscount + serviceAndShipping;
      beforeTax = grand / (1 + taxRate / 100);
      vat = grand - beforeTax;
    } else {
      // exclude
      beforeTax = netAfterDiscount + serviceAndShipping;
      vat = beforeTax * (taxRate / 100);
      grand = beforeTax + vat;
    }

    this.totals = {
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
}
