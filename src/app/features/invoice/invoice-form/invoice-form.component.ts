import { Component, OnInit, ViewChild, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  ReactiveFormsModule,
  FormControl,
  AbstractControl,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DocumentService } from '../../documents/document.service';
import { OrgService } from '../../../shared/services/org.service';
import { AuthService, AuthUser } from '../../../shared/auth.service';
import { DocumentDto, DocumentListItem } from '../../../shared/models/document.models';
import { environment } from '../../../../environments/environment'; // Import environment
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { MatDatepicker } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { ExportDialogComponent } from '../../dialogs/export-dialog/export-dialog.component';
import { SwalService } from '../../../shared/services/swal.service';
import { thaiTaxIdValidator } from '../../../shared/validators/thai-tax-id-angular.validator'; // <--- Add this import
import { Buyer, BuyerService } from '../../../shared/services/buyer.service';
import { Observable, asyncScheduler, merge, of } from 'rxjs';
import { startWith, debounceTime, switchMap, map, observeOn } from 'rxjs/operators';

import { BankService } from '../../../core/services/bank.service';
import { MasterDataService } from '../../../core/services/master-data.service';
import { DocumentStoreService } from '../../../shared/services/document-store.service';
import { BranchService, BranchDto } from '../../../shared/services/branch.service';

import { Product, ProductService } from '../../../shared/services/product.service';
import { CalculationService, CalculationTotals } from '../../../shared/services/calculation.service';
import { ActivityService } from '../../../shared/services/activity.service';
import Swal, { SweetAlertResult } from 'sweetalert2';

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
  // ===== mode (create/view/edit) =====
  mode: 'create' | 'view' | 'edit' = 'create';

  // ===== state =====
  createdDocument: DocumentDto | null = null; // New property to store the created document
  creationSuccess = false;
  isSaving = false;
  documentUuid: string | null = null;
  isFormDirty = false; // Track if form has changes (for edit mode)
  
  // ===== Cancellation State =====
  isCancelled = false;
  cancelledBy = '';
  cancelledAt = '';
  cancelReason = '';
  autoDeleteAt = '';

  // ===== View mode customer data (for reliable display) =====
  viewCustomerData: {
    partyType: string;
    code: string;
    name: string;
    taxId: string;
    branchCode: string;
    address: string;
    email: string;
    tel: string;
    zip: string;
    passportNo: string;
    country: string;
  } | null = null;

  // ===== forms =====
  form!: FormGroup;
  fgHeader!: FormGroup;
  fgCustomer!: FormGroup;
  fgPayment!: FormGroup; // Payment form group
  @ViewChild('checkPicker') checkPicker!: MatDatepicker<any>;



  // ===== heading (บนบัตร/หัวเอกสาร) =====
  docTypeTh = '';
  docTypeEn = '';
  docTypeCode = '';

  // ===== seller / header view state =====
  seller: any = null; // Add seller property
  branches: { code: string; name: string; id?: string }[] = [];
  logoUrl = '';

  // ===== items / totals state =====

  showPaymentMethod = false; // Toggle for payment section
  filteredProducts: Observable<Product[]>[] = [];
  filteredRefDocs: Observable<DocumentListItem[]> = of([]); // Add this line
  banks: any[] = []; // Store fetched banks
  bankBranches: any[] = []; // Store fetched branches
  filteredBankBranches: any[] = []; // Store filtered branches for search


  serviceFeeRate: number = 0;
  serviceFee: number = 0;
  editingServiceFee: boolean = false;
  totals: CalculationTotals = {
    subtotal: 0,
    discount: 0,
    netAfterDiscount: 0,
    vat: 0,
    grand: 0,
  };
  debugData: any;

  partyTypes = [
    { value: 'PERSON', label: 'บุคคลธรรมดา' },
    { value: 'JURISTIC', label: 'นิติบุคคล' },
    { value: 'FOREIGNER', label: 'ชาวต่างชาติ' },
    { value: 'OTHER', label: 'อื่นๆ' },
  ];

  docTypes = [
    { code: 'T01', name: 'ใบเสร็จรับเงิน (Receipt)' },
    { code: 'T02', name: 'ใบแจ้งหนี้/ใบกำกับภาษี (Invoice/Tax Invoice)' },
    { code: 'T03', name: 'ใบเสร็จรับเงิน/ใบกำกับภาษี (Receipt/Tax Invoice)' },
    { code: 'T04', name: 'ใบส่งของ/ใบกำกับภาษี (Delivery Order/Tax Invoice)' },
    { code: '80', name: 'ใบเพิ่มหนี้ (Debit Note)' },
    { code: '81', name: 'ใบลดหนี้ (Credit Note)' },
    { code: '380', name: 'ใบแจ้งหนี้ (Invoice)' },
    { code: '388', name: 'ใบกำกับภาษี (Tax Invoice)' }
  ];

  replacementReasons = [
    { code: 'TIVC01', name: 'ชื่อผิด' },
    { code: 'TIVC02', name: 'ที่อยู่ผิด' },
    { code: 'TIVC99', name: 'เหตุอื่น (ระบุสาเหตุ)' }
  ];

  get canIssueReplacement(): boolean {
    return ['T01', 'T02', 'T03', 'T04', '388'].includes(this.docTypeCode);
  }

  // Document Type Groups
  get isGroup1(): boolean {
    return ['T01', 'T03'].includes(this.docTypeCode);
  }

  get isGroup2(): boolean {
    return ['T02', 'T04', '380', '388'].includes(this.docTypeCode);
  }

  get isGroup3(): boolean {
    return ['80', '81'].includes(this.docTypeCode);
  }

  get showBankSelection(): boolean {
    return this.isGroup1;
  }

  user: AuthUser | null = null;
  filteredBuyers!: Observable<Buyer[]>;
  buyers: Buyer[] = []; // Store buyers locally
  selectedJuristicBuyer: any = null; // Store selected Juristic buyer
  products: Product[] = []; // Store products locally

  filteredCountries!: Observable<string[]>;

  // Thai Address Data
  provinces: any[] = [];
  districts: any[] = [];
  subdistricts: any[] = [];
  allBankBranches: any[] = [];

  countries: string[] = [
    'Afghanistan (อัฟกานิสถาน)', 'Albania (แอลเบเนีย)', 'Algeria (แอลจีเรีย)', 'Andorra (อันดอร์รา)', 'Angola (แองโกลา)', 'Antigua and Barbuda (แอนติกาและบาร์บูดา)', 'Argentina (อาร์เจนตินา)', 'Armenia (อาร์เมเนีย)', 'Australia (ออสเตรเลีย)', 'Austria (ออสเตรีย)',
    'Azerbaijan (อาเซอร์ไบจาน)', 'Bahamas (บาฮามาส)', 'Bahrain (บาห์เรน)', 'Bangladesh (บังกลาเทศ)', 'Barbados (บาร์เบโดส)', 'Belarus (เบลารุส)', 'Belgium (เบลเยียม)', 'Belize (เบลีซ)', 'Benin (เบนิน)', 'Bhutan (ภูฏาน)',
    'Bolivia (โบลิเวีย)', 'Bosnia and Herzegovina (บอสเนียและเฮอร์เซโกวีนา)', 'Botswana (บอตสวานา)', 'Brazil (บราซิล)', 'Brunei (บรูไน)', 'Bulgaria (บัลแกเรีย)', 'Burkina Faso (บูร์กินาฟาโซ)', 'Burundi (บุรุนดี)', 'Cabo Verde (กาบูเวร์ดี)', 'Cambodia (กัมพูชา)',
    'Cameroon (แคเมอรูน)', 'Canada (แคนาดา)', 'Central African Republic (สาธารณรัฐแอฟริกากลาง)', 'Chad (ชาด)', 'Chile (ชิลี)', 'China (จีน)', 'Colombia (โคลอมเบีย)', 'Comoros (คอโมโรส)', 'Congo (Congo-Brazzaville) (คองโก)', 'Costa Rica (คอสตาริกา)',
    'Croatia (โครเอเชีย)', 'Cuba (คิวบา)', 'Cyprus (ไซปรัส)', 'Czechia (Czech Republic) (เช็ก)', 'Democratic Republic of the Congo (สาธารณรัฐประชาธิปไตยคองโก)', 'Denmark (เดนมาร์ก)', 'Djibouti (จิบูตี)', 'Dominica (ดอมินีกา)', 'Dominican Republic (สาธารณรัฐโดมินิกัน)', 'East Timor (Timor-Leste) (ติมอร์-เลสเต)',
    'Ecuador (เอกวาดอร์)', 'Egypt (อียิปต์)', 'El Salvador (เอลซัลวาดอร์)', 'Equatorial Guinea (อิเควทอเรียลกินี)', 'Eritrea (เอริเทรีย)', 'Estonia (เอสโตเนีย)', 'Eswatini (fmr. "Swaziland") (เอสวาตีนี)', 'Ethiopia (เอธิโอเปีย)', 'Fiji (ฟิจิ)', 'Finland (ฟินแลนด์)',
    'France (ฝรั่งเศส)', 'Gabon (กาบอง)', 'Gambia (แกมเบีย)', 'Georgia (จอร์เจีย)', 'Germany (เยอรมนี)', 'Ghana (กานา)', 'Greece (กรีซ)', 'Grenada (เกรเนดา)', 'Guatemala (กัวเตมาลา)', 'Guinea (กินี)',
    'Guinea-Bissau (กินี-บิสเซา)', 'Guyana (กายอานา)', 'Haiti (เฮติ)', 'Holy See (นครรัฐวาติกัน)', 'Honduras (ฮอนดูรัส)', 'Hungary (ฮังการี)', 'Iceland (ไอซ์แลนด์)', 'India (อินเดีย)', 'Indonesia (อินโดนีเซีย)', 'Iran (อิหร่าน)',
    'Iraq (อิรัก)', 'Ireland (ไอร์แลนด์)', 'Israel (อิสราเอล)', 'Italy (อิตาลี)', 'Jamaica (จาเมกา)', 'Japan (ญี่ปุ่น)', 'Jordan (จอร์แดน)', 'Kazakhstan (คาซัคสถาน)', 'Kenya (เคนยา)', 'Kiribati (คิริบาส)',
    'Kuwait (คูเวต)', 'Kyrgyzstan (คีร์กีซสถาน)', 'Laos (ลาว)', 'Latvia (ลัตเวีย)', 'Lebanon (เลบานอน)', 'Lesotho (เลโซโท)', 'Liberia (ไลบีเรีย)', 'Libya (ลิเบีย)', 'Liechtenstein (ลิกเตนสไตน์)', 'Lithuania (ลิทัวเนีย)',
    'Luxembourg (ลักเซมเบิร์ก)', 'Madagascar (มาดากัสการ์)', 'Malawi (มาลาวี)', 'Malaysia (มาเลเซีย)', 'Maldives (มัลดีฟส์)', 'Mali (มาลี)', 'Malta (มอลตา)', 'Marshall Islands (หมู่เกาะมาร์แชลล์)', 'Mauritania (มอริเตเนีย)', 'Mauritius (มอริเชียส)',
    'Mexico (เม็กซิโก)', 'Micronesia (ไมโครนีเซีย)', 'Moldova (มอลโดวา)', 'Monaco (โมนาโก)', 'Mongolia (มองโกเลีย)', 'Montenegro (มอนเตเนโกร)', 'Morocco (โมร็อกโก)', 'Mozambique (โมซัมบิก)', 'Myanmar (formerly Burma) (พม่า)', 'Namibia (นามิเบีย)',
    'Nauru (นาอูรู)', 'Nepal (เนปาล)', 'Netherlands (เนเธอร์แลนด์)', 'New Zealand (นิวซีแลนด์)', 'Nicaragua (นิการากัว)', 'Niger (ไนเจอร์)', 'Nigeria (ไนจีเรีย)', 'North Korea (เกาหลีเหนือ)', 'North Macedonia (มาซิโดเนียเหนือ)', 'Norway (นอร์เวย์)',
    'Oman (โอมาน)', 'Pakistan (ปากีสถาน)', 'Palau (ปาเลา)', 'Palestine State (ปาเลสไตน์)', 'Panama (ปานามา)', 'Papua New Guinea (ปาปัวนิวกินี)', 'Paraguay (ปารากวัย)', 'Peru (เปรู)', 'Philippines (ฟิลิปปินส์)', 'Poland (โปแลนด์)',
    'Portugal (โปรตุเกส)', 'Qatar (กาตาร์)', 'Romania (โรมาเนีย)', 'Russia (รัสเซีย)', 'Rwanda (รวันดา)', 'Saint Kitts and Nevis (เซนต์คิตส์และเนวิส)', 'Saint Lucia (เซนต์ลูเชีย)', 'Saint Vincent and the Grenadines (เซนต์วินเซนต์และเกรนาดีนส์)', 'Samoa (ซามัว)', 'San Marino (ซานมารีโน)',
    'Sao Tome and Principe (เซาตูเมและปรินซิปี)', 'Saudi Arabia (ซาอุดีอาระเบีย)', 'Senegal (เซเนกัล)', 'Serbia (เซอร์เบีย)', 'Seychelles (เซเชลส์)', 'Sierra Leone (เซียร์ราลีโอน)', 'Singapore (สิงคโปร์)', 'Slovakia (สโลวาเกีย)', 'Slovenia (สโลวีเนีย)',
    'Solomon Islands (หมู่เกาะโซโลมอน)', 'Somalia (โซมาเลีย)', 'South Africa (แอฟริกาใต้)', 'South Korea (เกาหลีใต้)', 'South Sudan (ซูดานใต้)', 'Spain (สเปน)', 'Sri Lanka (ศรีลังกา)', 'Sudan (ซูดาน)', 'Suriname (ซูรินาม)', 'Sweden (สวีเดน)',
    'Switzerland (สวิตเซอร์แลนด์)', 'Syria (ซีเรีย)', 'Tajikistan (ทาจิกิสถาน)', 'Tanzania (แทนซาเนีย)', 'Thailand (ไทย)', 'Togo (โตโก)', 'Tonga (ตองกา)', 'Trinidad and Tobago (ตรินิแดดและโตเบโก)', 'Tunisia (ตูนิเซีย)', 'Turkey (ตุรกี)',
    'Turkmenistan (เติร์กเมนิสถาน)', 'Tuvalu (ตูวาลู)', 'Uganda (ยูกานดา)', 'Ukraine (ยูเครน)', 'United Arab Emirates (สหรัฐอาหรับเอมิเรตส์)', 'United Kingdom (สหราชอาณาจักร)', 'United States of America (สหรัฐอเมริกา)', 'Uruguay (อุรุกวัย)', 'Uzbekistan (อุซเบกิสถาน)',
    'Vanuatu (วานูอาตู)', 'Venezuela (เวเนซุเอลา)', 'Vietnam (เวียดนาม)', 'Yemen (เยเมน)', 'Zambia (แซมเบีย)', 'Zimbabwe (ซิมบับเว)'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private docs: DocumentService,
    private documentStoreService: DocumentStoreService,
    private org: OrgService,
    private auth: AuthService,
    private http: HttpClient,
    private buyerService: BuyerService,
    private productService: ProductService,
    private calculationService: CalculationService,
    private bankService: BankService,
    private masterDataService: MasterDataService,
    private dialog: MatDialog,
    private swalService: SwalService,
    private activityService: ActivityService,
    private branchService: BranchService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Get mode from route data
    this.mode = this.route.snapshot.data['mode'] || 'create';
    
    // Get document ID from route params (for view/edit)
    const docId = this.route.snapshot.paramMap.get('id');
    if (docId && (this.mode === 'view' || this.mode === 'edit')) {
      this.documentUuid = docId;
    }

    // Bundle Master Data Loading
    this.auth.user$.subscribe((user) => {
      console.log('InvoiceFormComponent: Current User:', user);
      const sellerIdToUse = user?.sellerTaxId || user?.userName;
      console.log('InvoiceFormComponent: sellerIdToUse for MasterData:', sellerIdToUse);
      
      if (sellerIdToUse) {
         this.masterDataService.getMasterData(sellerIdToUse.toString()).subscribe({
            next: (data) => {
               console.log('InvoiceFormComponent: MasterData Loaded:', data);
               // Map API response to match Buyer interface (API uses buyerNameTh, buyerCode etc.)
               this.buyers = (data.buyers || [])
                 .filter((b: any) => b.enableFlag === 'ACTIVE')
                 .map((b: any) => ({
                   id: b.buyerId,
                   code: b.buyerCode,
                   name: b.buyerNameTh || b.buyerNameEn || '',
                   taxId: b.buyerTaxId,
                   branch: b.buyerBranchCode,
                   address: b.buyerAddressTh || b.buyerAddressEn || '',
                   zipCode: b.buyerZipCode,
                   email: b.buyerEmail,
                   telephone: b.buyerPhoneNumber,
                   status: b.enableFlag,
                   taxpayerType: b.type
                 }));
               console.log('InvoiceFormComponent: Mapped Buyers:', this.buyers.length, this.buyers);
               
               // Initialize filteredBuyers with valueChanges from BOTH code and name fields
               const nameControl = this.fgCustomer.get('name');
               const codeControl = this.fgCustomer.get('code');
               
               if (nameControl && codeControl) {
                  this.filteredBuyers = merge(
                    nameControl.valueChanges,
                    codeControl.valueChanges
                  ).pipe(
                    startWith(''),
                    map(value => {
                      const searchTerm = typeof value === 'string' ? value : (value?.name || value?.code || '');
                      return this._filterBuyers(searchTerm);
                    })
                  );
                  // Trigger initial emission to show loaded list immediately
                  nameControl.setValue(nameControl.value || '', { emitEvent: true });
               } else {
                  this.filteredBuyers = of([...this.buyers]);
               }

               // Map API response to match Product interface (API uses productNameTh, productCode etc.)
               this.products = (data.products || [])
                 .filter((p: any) => p.enableFlag === 'Y')
                 .map((p: any) => ({
                   id: p.productId,
                   productCode: p.productCode,
                   name: p.productNameTh || p.productNameEn || '',
                   description: p.description,
                   price: p.productPrice,
                   unit: p.productUnit,
                   taxRate: p.taxRate,
                   status: p.enableFlag === 'Y' ? 'active' : 'inactive'
                 }));
               console.log('InvoiceFormComponent: Mapped Products:', this.products.length, this.products);
               // filteredProducts are initialized per-row in addItem(), no need to set here.

               // Trigger refresh for Customer Name autocomplete (Juristic/Ordinary)
               this.fgCustomer.get('name')?.updateValueAndValidity({ emitEvent: true });
               this.fgCustomer.get('code')?.updateValueAndValidity({ emitEvent: true });

               // Trigger refresh for all existing Product items
               const items = this.itemsFA();
               for (let i = 0; i < items.length; i++) {
                   items.at(i).get('sku')?.updateValueAndValidity({ emitEvent: true });
                   items.at(i).get('name')?.updateValueAndValidity({ emitEvent: true });
               }

               if (data.banks) {
                   this.banks = data.banks;
               }
               if (data.bankBranches) {
                   this.allBankBranches = data.bankBranches;
               }
               
               // Re-trigger validity checks if needed
               this.fgHeader.get('seller')?.updateValueAndValidity({ emitEvent: false });
            },
            error: (err) => console.error('Failed to load master data', err)
         });
      } else {
         console.warn('InvoiceFormComponent: No sellerIdToUse found, skipping MasterData load.');
      }
    });

    // Address data remains separate for now as static assets (or could be improved later)

    // Load Thai Address Data
    this.http.get<any[]>('assets/thai/provinces.json').subscribe(p => {
      this.provinces = p;
      this.refreshFormattedAddress();
    });
    this.http.get<any[]>('assets/thai/districts.json').subscribe(d => {
      this.districts = d;
      this.refreshFormattedAddress();
    });
    this.http.get<any[]>('assets/thai/subdistricts.json').subscribe(s => {
      this.subdistricts = s;
      this.refreshFormattedAddress();
    });

    // ----- build forms -----
    this.fgHeader = this.fb.group({
      companyName: [{ value: '', disabled: true }],
      taxId: [{ value: '', disabled: true }],
      branchCode: ['00000', Validators.required],
      tel: [{ value: '', disabled: true }],
      address: [{ value: '', disabled: true }],
      seller: ['', Validators.required],
      docNo: [''],
      issueDate: [new Date(), Validators.required],
      taxRate: [7],
      isReplacement: [false],
      refDocType: [''],
      refDocNo: [''],
      refDocDate: [null],
      replacementReason: [''],
      replacementRemark: [''],
      // Group 3 specific fields (80, 81)
      refNo: [''],
      refDate: [null],
      issueReason: [''],
      salesperson: ['']
    });
    
    // Reset replacement fields when unchecked, set refDocType when checked
    this.fgHeader.get('isReplacement')?.valueChanges.subscribe(checked => {
      if (!checked) {
        this.fgHeader.patchValue({
          refDocType: '',
          refDocNo: '',
          refDocDate: null,
          replacementReason: '',
          replacementRemark: ''
        }, { emitEvent: false });
      } else {
        // Lock refDocType to current document type
        this.fgHeader.patchValue({
          refDocType: this.docTypeCode
        }, { emitEvent: false });
      }
    });

    this.fgCustomer = this.fb.group({
      partyType: ['PERSON', Validators.required],
      hasThaiTIN: [false], // For FOREIGNER: true = มี TIN ไทย, false = ไม่มี TIN ไทย (Default false for easier Passport flow)
      code: [''],
      name: ['', Validators.required],
      taxId: ['', [thaiTaxIdValidator]],
      branchCode: [''],
      passportNo: [''],
      address: [''],
      email: [''],
      tel: [''],
      zip: [''],
      country: [''],
      saveToMaster: [false],
    });

    this.filteredCountries = this.fgCustomer.get('country')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterCountries(value || '')),
    );

    // Initialize Payment Form
    this.fgPayment = this.fb.group({
      paymentType: [''], // Default to empty
      bankName: [''],
      branch: [''],
      checkNo: [''],
      checkDate: [null],
      amount: [''],
    });

    // Reference Document Autocomplete Logic
    const refDocNoControl = this.fgHeader.get('refDocNo');

    if (refDocNoControl) {
      // Create filteredRefDocs observable - always use current docTypeCode
      this.filteredRefDocs = refDocNoControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        switchMap((value) => {
          // Always filter by current docTypeCode
          if (!this.docTypeCode) return of([]);
          
          return this.docs.list({ docType: this.docTypeCode, page: 0, size: 50 }).pipe(
            map(response => {
              // Handle different response structures
              const docs = response?.content || response || [];
              if (!Array.isArray(docs)) return [];
              
              const filterValue = (value || '').toLowerCase();
              return docs.filter(d => d?.docNo?.toLowerCase().includes(filterValue));
            })
          );
        })
      );
    }

    // Listen to paymentType changes to reset fields if needed
    this.fgPayment.get('paymentType')?.valueChanges.subscribe((val) => {
      if (val !== 'CHECK') {
        this.fgPayment.patchValue({
          bankName: '',
          branch: '',
          checkNo: '',
          checkDate: null,
          amount: this.totals.grand,
        });
      }
    });

    // Conditional validation for taxId
    this.fgCustomer.get('partyType')?.valueChanges.subscribe(partyType => {
      const taxIdControl = this.fgCustomer.get('taxId');
      const codeControl = this.fgCustomer.get('code');
      const passportNoControl = this.fgCustomer.get('passportNo');
      const hasThaiTINControl = this.fgCustomer.get('hasThaiTIN');
      if (!taxIdControl || !codeControl || !passportNoControl) return;

      // Logic to clear/restore form data
      if (partyType === 'JURISTIC') {
        // Restore if we have a saved buyer
        if (this.selectedJuristicBuyer) {
          this.fgCustomer.patchValue(this.selectedJuristicBuyer, { emitEvent: false });
        }
        taxIdControl.setValidators([Validators.required, Validators.minLength(13), Validators.maxLength(13), Validators.pattern(/^\d+$/), thaiTaxIdValidator, this.juristicTaxIdValidator]);
        codeControl.setValidators([Validators.required]);
        passportNoControl.clearValidators();
      } else if (partyType === 'FOREIGNER') {
        // Clear fields when switching to FOREIGNER
        this.fgCustomer.patchValue({
          code: '',
          name: '',
          taxId: '',
          branchCode: '',
          address: '',
          email: '',
          tel: '',
          zip: '',
          passportNo: '',
          hasThaiTIN: false // Default to false when manually switching to Foreigner
        }, { emitEvent: false });
        
        // Set validation based on hasThaiTIN
        this.updateForeignerValidation();
        codeControl.clearValidators();
      } else {
        // PERSON - Clear fields
        this.fgCustomer.patchValue({
          code: '',
          name: '',
          taxId: '',
          branchCode: '',
          address: '',
          email: '',
          tel: '',
          zip: '',
          country: '',
          passportNo: ''
        }, { emitEvent: false });

        taxIdControl.setValidators([thaiTaxIdValidator]); // Only format validation
        codeControl.clearValidators();
        passportNoControl.clearValidators();
      }
      taxIdControl.updateValueAndValidity();
      codeControl.updateValueAndValidity();
      passportNoControl.updateValueAndValidity();

      // Validate address, zip, country for FOREIGNER and OTHER
      const addressControl = this.fgCustomer.get('address');
      const zipControl = this.fgCustomer.get('zip');
      const countryControl = this.fgCustomer.get('country');
      
      if (partyType === 'FOREIGNER' || partyType === 'OTHER') {
         addressControl?.setValidators([Validators.required]);
         zipControl?.setValidators([Validators.required]);
         countryControl?.setValidators([Validators.required]);
      } else {
         addressControl?.clearValidators();
         zipControl?.clearValidators();
         countryControl?.clearValidators();
      }
      addressControl?.updateValueAndValidity();
      zipControl?.updateValueAndValidity();
      countryControl?.updateValueAndValidity();
    });

    // hasThaiTIN toggle handler for FOREIGNER
    this.fgCustomer.get('hasThaiTIN')?.valueChanges.subscribe(() => {
      const partyType = this.fgCustomer.get('partyType')?.value;
      if (partyType === 'FOREIGNER') {
        this.updateForeignerValidation();
      }
    });

    // Initial check for partyType on load
    const initialPartyType = this.fgCustomer.get('partyType')?.value;
    const taxIdControl = this.fgCustomer.get('taxId');
    if (taxIdControl) {
      if (initialPartyType === 'JURISTIC') {
        taxIdControl.setValidators([Validators.required, Validators.minLength(13), Validators.maxLength(13), Validators.pattern(/^\d+$/), thaiTaxIdValidator, this.juristicTaxIdValidator]);
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
      this.recalculateAllAmounts();
    });

    // Merge valueChanges from both name and code controls
    const nameControl = this.fgCustomer.get('name')!;
    const codeControl = this.fgCustomer.get('code')!;

    this.filteredBuyers = merge(
      nameControl.valueChanges,
      codeControl.valueChanges
    ).pipe(
      startWith(''),
      map(value => this._filterBuyers(value || ''))
    );

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
        
        // Load all branches for the seller
        this.branchService.getBranches().subscribe(branches => {
           this.branches = branches.map(b => ({
             id: b.branchId,
             code: b.branchCode,
             name: b.branchNameTh || b.branchNameEn || 'สาขา ' + b.branchCode
           }));
           // Ensure current user branch is selected/validated
        });

        this.initUserForm(user);
        
        // Only call getDocNumberPreview if in create mode AND not loading an existing doc
        if (this.mode === 'create' && !this.route.snapshot.paramMap.get('docNo')) {
           this.getDocNumberPreview();
        }
      }
    });
    
        // ----- route: สร้างใหม่หรือแก้ไข -----
        const docNo = this.route.snapshot.paramMap.get('docNo');
        if (docNo) {
          // โหมดดู/แก้ไข: โหลดรายละเอียดด้วยเลขเอกสาร
          this.docs.getByDocNoDetail(docNo).subscribe((d: any) => {
            this.debugData = d;
            console.log('Debug Data:', d);
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
                partyType: this.mapBuyerTypeToPartyType(d.buyerType || d.buyerTypeSnapshot || 'JURISTIC'),
                code: d.buyerCode || '',
                name: d.buyerNameSnapshot || d.buyerName || '',
                taxId: d.buyerTaxIdSnapshot || d.buyerTaxId || '',
                branchCode: d.buyerBranchCodeSnapshot || d.buyerBranchCode || '',
                address: d.buyerAddressSnapshot || d.buyerAddress || '',
                email: d.buyerEmail || '',
                tel: d.buyerTel || '',
                zip: d.buyerZipCodeSnapshot || d.buyerZip || '',
                passportNo: d.buyerPassportNo || '',
              },
              { emitEvent: false }
            );
    
            this.itemsFA().clear();
            (d.items || []).forEach((it: any) => this.addItem(it));
            this.serviceFee = Number(d.serviceFee || 0);
          });
        } else {
          // โหมดสร้าง: ให้มีอย่างน้อย 1 แถว
          // โหมดสร้าง: ให้มีอย่างน้อย 1 แถว
          this.route.queryParams.subscribe((params) => {
            const typeCode = params['type'];
            this.docTypeCode = typeCode;
            this.docTypeTh = this.docTypeMap[typeCode] || typeCode; // Fallback to code if not found
            this.docTypeEn = this.docTypeEnMap[typeCode] || '';
            if (this.mode === 'create') {
              this.getDocNumberPreview();
            }
          });
          
          // For view/edit modes, load existing document data
          if (this.documentUuid && (this.mode === 'view' || this.mode === 'edit')) {
            this.loadDocumentData();
          } else {
            this.addItem();
          }
        }
      }
    
      private initUserForm(user: AuthUser) {
    this.fgHeader.patchValue({
      companyName: user.sellerNameTh || user.sellerNameEn || '',
      taxId: user.sellerTaxId || '',
      branchCode: user.branchCode || '',
      tel: user.sellerPhoneNumber || '',
      seller: user.fullName || user.userName || '',
      // Use getFormattedSellerAddress to ensure all parts are concatenated
      address: this.getFormattedSellerAddress() || user.fullAddressTh || '',
    });
  }

  getDocNumberPreview(): void {
        const isCreateMode = !this.route.snapshot.paramMap.get('docNo');
                                if (isCreateMode && this.docTypeCode && this.user?.branchCode && this.user?.sellerTaxId) {
                                  this.docs
                                    .preview(this.docTypeCode, this.user.branchCode, this.user.sellerTaxId, this.todayIsoString())            .subscribe((res) => {
              this.fgHeader.patchValue({ docNo: res.docNo });
            });
        }
      }

  // Maps for Document Type Display (Thai and English)
  docTypeMap: { [key: string]: string } = {
    T01: 'ใบเสร็จรับเงิน (T01)',
    T02: 'ใบแจ้งหนี้/ใบกำกับภาษี (T02)',
    T03: 'ใบเสร็จรับเงิน/ใบกำกับภาษี (T03)',
    T04: 'ใบส่งของ/ใบกำกับภาษี (T04)',
    '380': 'ใบแจ้งหนี้ (380)',
    '388': 'ใบกำกับภาษี (388)',
    '80': 'ใบเพิ่มหนี้ (80)',
    '81': 'ใบลดหนี้ (81)',
  };

  docTypeEnMap: { [key: string]: string } = {
    T01: 'Receipt (T01)',
    T02: 'Invoice/Tax Invoice (T02)',
    T03: 'Receipt/Tax Invoice (T03)',
    T04: 'Delivery Order/Tax Invoice (T04)',
    '380': 'Invoice (380)',
    '388': 'Tax Invoice (388)',
    '80': 'Debit Note (80)',
    '81': 'Credit Note (81)',
  };

  // ===== Load Document for view/edit modes =====
  loadDocumentData(): void {
    if (!this.documentUuid) return;

    this.docs.getDocumentByUuid(this.documentUuid).subscribe({
      next: (doc: any) => {
        this.debugData = doc;
        console.log('Loaded document data:', doc);
        
        // Set document type info
        this.docTypeCode = doc.docTypeCode || doc.docType?.code || '';
        
        // Use SHARED logic from docTypeMap/docTypeEnMap to ensure consistency with Create mode
        this.docTypeTh = this.docTypeMap[this.docTypeCode] || doc.docType?.thName || this.docTypeCode;
        this.docTypeEn = this.docTypeEnMap[this.docTypeCode] || doc.docType?.enName || '';

        // Check cancellation status
        this.isCancelled = (doc.status === 'CANCELLED');
        if (this.isCancelled) {
            this.cancelledBy = doc.cancelledBy || '';
            this.cancelledAt = doc.cancelledAt || '';
            this.cancelReason = doc.cancelReason || '';
            
            // Calculate auto delete date (30 days from cancelledAt)
            if (this.cancelledAt) {
              const cDate = new Date(this.cancelledAt);
              cDate.setDate(cDate.getDate() + 30);
              this.autoDeleteAt = cDate.toISOString();
            }
        }

        // Patch header form
        this.fgHeader.patchValue({
          docNo: doc.docNo || doc.docNumber || '',
          issueDate: doc.issueDate ? new Date(doc.issueDate) : (doc.docIssueDate ? new Date(doc.docIssueDate) : new Date()),
          branchCode: doc.branchCode || '00000',
          // seller field is for salesperson (salesName), not company name
          seller: doc.salesName || this.user?.fullName || '',
          companyName: doc.sellerName || '',
          taxId: doc.sellerTaxId || '',
          address: doc.sellerAddress || '',
        });

        // Patch customer form - use snapshot fields first, then buyer relation as fallback
        const partyType = this.mapBuyerTypeToPartyType(doc.buyerType || doc.buyer?.type || 'PERSON');
        
        console.log('=== CUSTOMER PATCH DEBUG ===');
        console.log('Raw buyerType:', doc.buyerType);
        console.log('Mapped partyType:', partyType);
        console.log('buyerName:', doc.buyerName);
        console.log('buyerTaxId:', doc.buyerTaxId);
        console.log('buyerAddress:', doc.buyerAddress);
        console.log('buyerZipCode:', doc.buyerZipCode);
        
        // Determine if this is a foreign buyer (passport-based)
        const isForeigner = partyType === 'FOREIGNER' || doc.buyerType === 'FOREIGN';
        
        const customerPatchData = {
          partyType: partyType,
          // Code: check buyerCodeSnapshot first, then buyer relation
          code: doc.buyerCode || doc.buyer?.code || doc.buyer?.buyerCode || '',
          name: doc.buyerName || doc.buyer?.name || doc.buyer?.buyerNameTh || '',
          // For foreigners: taxId field contains passportNo, so we use taxId here for consistency
          taxId: doc.buyerTaxId || doc.buyer?.taxId || doc.buyer?.buyerTaxId || '',
          branchCode: doc.buyerBranchCode || doc.buyer?.branchCode || doc.buyer?.buyerBranchCode || '',
          address: doc.buyerAddress || doc.buyer?.addressDetailTh || doc.buyer?.buyerAddressTh || '',
          // Email and tel - try snapshot then buyer relation
          email: doc.buyerEmail || doc.buyer?.email || doc.buyer?.buyerEmail || '',
          tel: doc.buyerPhone || doc.buyer?.phoneNumber || doc.buyer?.buyerPhoneNumber || '',
          zip: doc.buyerZipCode || doc.buyer?.zipCode || doc.buyer?.buyerZipCode || '',
          // PassportNo: use taxId for foreigners (since passport is mapped to taxId in backend now)
          passportNo: (isForeigner ? (doc.buyerTaxId || doc.buyer?.buyerTaxId) : '') || doc.buyer?.passportNo || '',
          // Country for foreigners
          country: doc.buyerCountry || doc.buyer?.country || '',
        };
        
        console.log('Customer patch data:', customerPatchData);
        
        this.fgCustomer.patchValue(customerPatchData);
        
        console.log('After patch - fgCustomer values:', this.fgCustomer.getRawValue());

        // IMPORTANT: Set vatType BEFORE adding items so the amount calculation is correct
        // vatType must be loaded from document first, otherwise calculation defaults to 'exclude'
        const docVatType = doc.vatType || 'exclude';
        console.log('Loading vatType from document:', docVatType);
        this.form.patchValue({
          vatType: docVatType
        });

        // Populate items - use correct field names from DocumentItem entity
        const itemsFormArray = this.itemsFA();
        itemsFormArray.clear();
        if (doc.items && Array.isArray(doc.items)) {
          doc.items.forEach((item: any) => {
            this.addItem({
              sku: item.productCode || item.product?.productCode || '',
              name: item.itemName || item.legacyName || item.name || '',
              qty: item.qty || 1,
              price: item.unitPrice || 0,
              discount: item.discount || 0,
              taxRate: item.vatRate || 7,
              amount: item.amount || item.lineTotal || 0,
            });
          });
        } else {
          this.addItem(); // Add empty row if no items
        }

        // Populate remark
        this.form.patchValue({
          remark: doc.remark || doc.note || doc.remarkOther || '',
        });

       // Populate fees - use 'description' field to match backend
        const loadedServiceFee = doc.charges?.find((c: any) => c.description === 'service')?.amount || 0;
        
        // Populate Payments
        if (doc.payments && doc.payments.length > 0) {
           const p = doc.payments[0]; // Assume single payment for now
           this.showPaymentMethod = true;
           this.fgPayment.patchValue({
             paymentType: p.type || '',
             bankName: p.bankName || '',
             branch: p.branch || '',
             checkNo: p.chequeNo || p.reference || '',
             checkDate: p.chequeDate ? new Date(p.chequeDate) : null,
             amount: p.amount || 0
           });
        }
        
        // Calculate temp totals to determine base for rate calculation
        const vatType = this.form.get('vatType')?.value || 'exclude';
        const headerTax = Number(this.fgHeader.get('taxRate')?.value ?? 0);
        const tempTotals = this.calculationService.calculateTotals(
            this.itemsFA().controls as FormGroup[],
            vatType,
            0,
            0,
            headerTax,
            false
        );
        
        // Reverse calculate rate
        if (loadedServiceFee > 0 && tempTotals.netAfterDiscount > 0) {
           this.serviceFeeRate = (loadedServiceFee / tempTotals.netAfterDiscount) * 100;
           this.serviceFee = loadedServiceFee;
           this.editingServiceFee = true;
        } else {
           this.serviceFeeRate = 0;
           this.serviceFee = 0;
           this.editingServiceFee = false;
        }

        // Recalculate totals (will use the rate we just set)
        this.calculateTotals();

        // Disable form for view mode - use setTimeout to ensure values are rendered first
        if (this.mode === 'view') {
          // Store customer data in dedicated properties for view mode
          this.viewCustomerData = {
            partyType: partyType,
            code: customerPatchData.code,
            name: customerPatchData.name,
            taxId: customerPatchData.taxId,
            branchCode: customerPatchData.branchCode,
            address: customerPatchData.address,
            email: customerPatchData.email,
            tel: customerPatchData.tel,
            zip: customerPatchData.zip,
            passportNo: customerPatchData.passportNo,
            country: customerPatchData.country,
          };
          console.log('viewCustomerData set:', this.viewCustomerData);
          
          setTimeout(() => {
            this.form.disable();
            this.fgHeader.disable();
            this.fgCustomer.disable();
            this.fgPayment.disable();
          }, 0);
        }

        // Track form changes for edit mode - enable save button only when changes are made
        if (this.mode === 'edit') {
          // Mark form as clean after initial load
          this.isFormDirty = false;
          
          // Subscribe to form changes
          this.form.valueChanges.subscribe(() => {
            this.isFormDirty = true;
          });
          this.fgHeader.valueChanges.subscribe(() => {
            this.isFormDirty = true;
          });
          this.fgCustomer.valueChanges.subscribe(() => {
            this.isFormDirty = true;
          });
          this.fgPayment.valueChanges.subscribe(() => {
            this.isFormDirty = true;
          });
        }
      },
      error: (err) => {
        console.error('Error loading document:', err);
        this.swalService.error('ไม่สามารถโหลดข้อมูลเอกสารได้', 'กรุณาลองใหม่อีกครั้ง').then(() => {
          this.router.navigate(['/documentsall']);
        });
      }
    });
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
    const headerTax = Number(this.fgHeader.get('taxRate')?.value ?? 0);
    const vatType = this.form.get('vatType')?.value || 'exclude';

    // 1. Calculate base amount (Subtotal - Discount) manually to determine Service Fee
    //    We iterate items because totals.subtotal/discount are computed by service, but we need them *before* passing service fee.
    //    Or simpler: Call service with 0 fee first.
    
    const tempTotals = this.calculationService.calculateTotals(
      this.itemForms,
      vatType,
      0, // Temp service fee 0
      0, 
      headerTax,
      false
    );

    // 2. Calculate Service Fee based on Rate
    if (this.serviceFeeRate > 0) {
      // For Exclude VAT: Base = netAfterDiscount (Basis)
      // For Include VAT: Base = grand (Gross Amount) - because netAfterDiscount is now TaxBase (e.g. 100/1.07)
      // We want Fee on the "Amount After Discount" which is the Gross amount in Include mode.
      const base = (vatType === 'include') ? tempTotals.grand : tempTotals.netAfterDiscount;
      this.serviceFee = Math.max(0, base) * (this.serviceFeeRate / 100);
    } else {
       // If rate is 0, we assume fee should be 0 (enforcing strict percentage mode)
       this.serviceFee = 0;
    }

    // 3. Final Calculation
    this.totals = this.calculationService.calculateTotals(
      this.itemForms,
      vatType,
      this.serviceFee,
      0, // shippingFee removed
      headerTax,
      false
    );

    // Sync Payment Amount with Grand Total
    if (this.fgPayment) {
      this.fgPayment.patchValue({ amount: this.totals.grand }, { emitEvent: false });
    }
  }

  // private round(v: number) {
  //   return this.use4Decimals ? Number(v.toFixed(4)) : Number(v.toFixed(2));
  // }

  // private fix(v: number, d: number): string {
  //   const num = Number.isFinite(v) ? v : 0;
  //   // Use 'th-TH' locale for comma separation and specified decimal places
  //   return num.toLocaleString('th-TH', {
  //     minimumFractionDigits: d,
  //     maximumFractionDigits: d,
  //   });
  // }

  addItem(init?: any) {
    // Calculate correct amount from qty, price, discount based on vatType
    const initQty = Number(init?.qty ?? 1);
    const initPrice = Number(init?.price ?? 0);
    const initDiscount = Number(init?.discount ?? 0);
    const initTaxRate = Number(init?.taxRate ?? init?.vatRate ?? 7);
    const vatType = this.form?.get('vatType')?.value || 'exclude';
    
    // User Requirement: Amount always = qty * price - discount
    let calculatedAmount = initQty * initPrice - initDiscount;
    if (calculatedAmount < 0) calculatedAmount = 0;
    
    const fg = this.fb.group({
      sku: [init?.sku || '', [Validators.required, this.productValidator.bind(this)]],
      name: [init?.name || '', [Validators.required, this.productValidator.bind(this)]],
      qty: [initQty],
      price: [initPrice],
      discount: [initDiscount],
      taxRate: [initTaxRate],
      amount: [{ value: this.calculationService.round(calculatedAmount, false), disabled: true }],
    });

    // autocalc amount + sync taxRate
    fg.valueChanges.subscribe((v) => {
      const qty = Number(v.qty) || 0;
      const price = Number(v.price) || 0;
      let discount = Number(v.discount) || 0;
      const taxRate = Number(v.taxRate ?? 0);
      const vatType = this.form.get('vatType')?.value || 'exclude';

      // Cap discount: cannot exceed qty * price
      const maxDiscount = qty * price;
      if (discount > maxDiscount) {
        discount = maxDiscount;
        fg.get('discount')?.setValue(discount, { emitEvent: false });
      }

      // User Requirement: Amount always = qty * price - discount
      let amount = qty * price - discount;

      // Ensure amount is not negative (minimum 0)
      if (amount < 0) {
        amount = 0;
      }

      // Update amount control
      const amountControl = fg.get('amount');
       if (amountControl && this.calculationService.round(amount, false) !== amountControl.value) {
        amountControl.setValue(this.calculationService.round(amount, false), { emitEvent: false });
      }

      // ✅ sync taxRate ของแถวนี้ไปที่หัวเอกสาร
      const headerTax = Number(v.taxRate ?? 0);
      // Only update header tax rate if it's different to avoid loops/excessive updates
      if (this.fgHeader.get('taxRate')?.value !== headerTax) {
         this.fgHeader.patchValue({ taxRate: headerTax }, { emitEvent: false });
      }

      this.calculateTotals();
    });

    const skuCtrl = fg.get('sku') as FormControl;
    const nameCtrl = fg.get('name') as FormControl;

    const currentIndex = this.itemsFA().length; // Get the index for the new row

    const filteredProducts$ = merge(
      skuCtrl.valueChanges,
      nameCtrl.valueChanges
    ).pipe(
      startWith(''),
      observeOn(asyncScheduler),
      debounceTime(300),
      switchMap(value => this._filterProducts(value || '', currentIndex))
    );
    this.filteredProducts.push(filteredProducts$);


    this.itemsFA().push(fg);

    // ให้คำนวณครั้งแรกหลังเพิ่มแถว
    this.fgHeader.patchValue(
      { taxRate: fg.get('taxRate')?.value ?? 0 },
      { emitEvent: false }
    );
    this.calculateTotals();
  }

  recalculateAllAmounts() {
    this.itemForms.forEach(fg => {
      const v = fg.getRawValue();
      const qty = Number(v.qty) || 0;
      const price = Number(v.price) || 0;
      let discount = Number(v.discount) || 0;
      const taxRate = Number(v.taxRate ?? 0);
      const vatType = this.form.get('vatType')?.value || 'exclude';

      // Cap discount: cannot exceed qty * price
      const maxDiscount = qty * price;
      if (discount > maxDiscount) {
        discount = maxDiscount;
        fg.get('discount')?.setValue(discount, { emitEvent: false });
      }

      let amount = qty * price - discount;

      // Ensure amount is not negative (minimum 0)
      if (amount < 0) {
        amount = 0;
      }

      // Remove extra VAT addition block - standard formula (Price * Qty) - Discount


      const amountControl = fg.get('amount');
      if (amountControl) {
        amountControl.setValue(this.calculationService.round(amount, false), { emitEvent: false });
      }
    });
    this.calculateTotals();
  }

  removeItem(i: number) {
    this.itemsFA().removeAt(i);
    this.filteredProducts.splice(i, 1);
    this.calculateTotals(); // Recalculate totals after removing item
  }

  trackByIdx(i: number) {
    return i;
  }

  trackByItem(index: number, item: any): any {
    return item;
  }

  private _filterProducts(value: string | Product, currentIndex: number): Observable<Product[]> {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : value.name.toLowerCase();
    
    // Get all selected SKUs except the one in the current row
    const selectedSkus = this.itemForms
      .map((fg, index) => index !== currentIndex ? fg.get('sku')?.value : null)
      .filter(sku => sku);

    // ใช้ cached products แทนการเรียก API ทุกครั้ง
    const filteredProducts = this.products.filter(product => {
      // Exclude if already selected in another row
      if (selectedSkus.includes(product.productCode)) {
        return false;
      }
      // Filter by name or sku
      return product.name.toLowerCase().includes(filterValue) ||
             product.productCode.toLowerCase().includes(filterValue);
    }).sort((a, b) => {
      const codeA = a.productCode || '';
      const codeB = b.productCode || '';
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });
    return of(filteredProducts);
  }

  productValidator(control: AbstractControl): { [key: string]: any } | null {
    const value = control.value;
    if (!value) return null; 
    
    // If value is an object (selected product), it's valid
    if (typeof value === 'object' && (value.productCode || value.name)) return null;

    // If products are not loaded yet, skip validation
    if (this.products.length === 0) return null;

    // Check if value matches any product SKU or Name exactly
    const isValid = this.products.some(p => p.productCode === value || p.name === value);
    
    return isValid ? null : { invalidProduct: true };
  }

  displayProduct(product: Product | string): string {
    if (typeof product === 'string') return product;
    return product && product.name ? product.name : '';
  }

  displayProductSku(product: Product | string): string {
    if (typeof product === 'string') return product;
    return product && product.productCode ? product.productCode : '';
  }

  // Store last valid product for each row to support reversion on blur
  private lastValidProducts: { [index: number]: Product } = {};

  autoSelect(event: any) {
    event.target.select();
  }

  onProductSelected(event: any, index: number): void {
    const selectedProduct = event.option.value as Product;
    const itemFormGroup = this.itemForms[index];
    
    // Update cache
    this.lastValidProducts[index] = selectedProduct;
    
    // Robustly find price: try defaultPrice, then price, then unitPrice, default to 0
    const price = selectedProduct.defaultPrice !== undefined ? selectedProduct.defaultPrice 
                : (selectedProduct as any).price !== undefined ? (selectedProduct as any).price 
                : (selectedProduct as any).unitPrice !== undefined ? (selectedProduct as any).unitPrice
                : 0;

    itemFormGroup.patchValue({
      sku: selectedProduct.productCode,
      name: selectedProduct.name,
      price: price, 
      taxRate: selectedProduct.taxRate,
    });
  }

  onInputBlur(index: number, field: 'sku' | 'name') {
    const fg = this.itemForms[index];
    const control = fg.get(field);
    const value = control?.value;

    // If value is not an object (i.e. user typed text but didn't select) 
    // AND we have a previous valid product, revert to it.
    if (this.lastValidProducts[index] && (typeof value !== 'object' || !value)) {
      const lastProduct = this.lastValidProducts[index];
      fg.patchValue({
        sku: lastProduct.productCode,
        name: lastProduct.name
      }, { emitEvent: false });
    }
  }
  fmt(v: number) {
    return this.calculationService.formatNumber(v, false);
  }

  // ===== events (ให้ซิกเนเจอร์รับ $event ได้ เพื่อไม่ต้องแก้ HTML) =====

  startEditServiceFee() {
    this.editingServiceFee = true;
  }
  stopEditServiceFee() {
    this.editingServiceFee = false;
  }
  onServiceFeeRateChange() {
    // If input is empty string, ngModel might set it to null or string. Ensure it's number.
    // this.serviceFeeRate is bound.
    this.recalculateAllAmounts(); 
  }

  cancelServiceFee() {
    this.serviceFeeRate = 0;
    this.serviceFee = 0;
    this.editingServiceFee = false;
    this.calculateTotals();
  }

  // ฟังก์ชันบล็อกการพิมพ์ตัวอักษรที่ไม่ใช่ตัวเลข
  onlyAllowNumbers(event: KeyboardEvent): boolean {
    const charCode = event.key;
    // อนุญาตเฉพาะตัวเลข, จุด (.), และ backspace/delete
    if (/^[0-9.]$/.test(charCode) || event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Tab' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      return true;
    }
    event.preventDefault();
    return false;
  }


  // ===== Reference Document Selection =====
  onRefDocSelected(event: any): void {
    const selectedDocNo = event.option.value;
    // Find the document in the current filtered list to get its date
    this.docs.list({ docType: this.docTypeCode, page: 0, size: 100 }).subscribe(response => {
      const docs = response?.content || response || [];
      if (!Array.isArray(docs)) return;
      
      const selectedDoc = docs.find(d => d?.docNo === selectedDocNo);
      if (selectedDoc) {
        this.fgHeader.patchValue({
          refDocDate: selectedDoc.issueDate ? new Date(selectedDoc.issueDate) : null
        });
      }
    });
  }

  getCurrentDocTypeLabel(): string {
    const found = this.docTypes.find(t => t.code === this.docTypeCode);
    return found ? `${found.code} - ${found.name}` : this.docTypeCode || 'เลือกประเภท';
  }


  saveInvoice() {
    if (this.form.invalid || this.fgHeader.invalid || this.fgCustomer.invalid) {
      console.warn('Cannot save: Form validation failed');
      
      if (this.form.invalid) {
        console.warn('Main Form Invalid:', this.findInvalidControls(this.form));
      }
      if (this.fgHeader.invalid) {
        console.warn('Header Form Invalid:', this.findInvalidControls(this.fgHeader));
      }
      if (this.fgCustomer.invalid) {
        console.warn('Customer Form Invalid:', this.findInvalidControls(this.fgCustomer));
      }

      this.form.markAllAsTouched();
      this.fgHeader.markAllAsTouched();
      this.fgCustomer.markAllAsTouched();
      this.scrollToFirstInvalidControl();
      return;
    }
    this.isSaving = true;

    const header = this.fgHeader.getRawValue();
    const customer = this.fgCustomer.getRawValue();
    const totals = this.totals;

    // 1. Find Seller ID
    const sellerId = this.seller?.sellerId || this.user?.sellerId; // fallback
    if (!sellerId) {
      console.error('Seller ID not found!');
      // You might want to show an alert to the user here
      this.swalService.error('ไม่พบข้อมูลผู้ขาย', 'กรุณาตรวจสอบข้อมูลผู้ขาย');
      this.isSaving = false;
      return;
    }

    // 2. Find Buyer ID
    let buyerId = customer.id; // Assuming id might be in form value?
    if (!buyerId) {
       // Lookup by Tax ID or Name in this.buyers
       const foundBuyer = this.buyers.find(b => b.taxId === customer.taxId || b.name === customer.name);
       if (foundBuyer && foundBuyer.id) { 
           buyerId = foundBuyer.id;
       }
    }
    
    // If strict backend, we need buyerId. 
    // If not found, we send null and backend might 500/404.
    // For now, let's proceed.

    // 3. Map Items
    const items = this.itemForms.map((f, i) => {
      const itemVal = f.getRawValue();
      
      // Try finding from cache first (guaranteed object from selection)
      let product = this.lastValidProducts[i];
      
      // If not in cache, try looking up by SKU or Name in the full list (Loose matching)
      if (!product) {
         const skuSearch = (itemVal.sku || '').toString().trim().toLowerCase();
         const nameSearch = (itemVal.name || '').toString().trim().toLowerCase();

         product = this.products.find(p => {
             const pSku = (p.productCode || '').toString().trim().toLowerCase();
             const pName = (p.name || '').toString().trim().toLowerCase();
             return (skuSearch && pSku === skuSearch) || (nameSearch && pName === nameSearch);
         }) as Product;
      }

      if (!product) {
          console.warn(`Product not found for item index ${i}. Name: '${itemVal.name}', SKU: '${itemVal.sku}'. Product ID will be null.`);
      } else {
          console.log(`Mapped Item ${i}: ${itemVal.name} -> Product ID: ${product.id}`);
      }
      
      return {
        productId: product?.id ? String(product.id) : null, // Backend needs UUID
        productCode: product?.productCode || itemVal.sku, // Send productCode
        itemName: itemVal.name,
        qty: itemVal.qty,
        unitPrice: itemVal.price,
        vatRate: itemVal.taxRate,
        discount: itemVal.discount || 0,
        lineNo: i + 1,
      };
    });

    // 4. Map Payments
    const payments = [];
    if (this.showPaymentMethod) {
        const pVal = this.fgPayment.getRawValue();
        // PaymentRequest: type, amount, reference, and details
        payments.push({
            type: pVal.paymentType,
            amount: totals.grand,
            reference: pVal.paymentType === 'CHECK' ? pVal.checkNo : null,
            bankName: pVal.bankName || '',
            branch: pVal.branch || '',
            chequeNo: pVal.checkNo || '',
            chequeDate: pVal.checkDate ? this.formatLocalDate(pVal.checkDate) : null
        });


        // 4.1 Auto-save new branch if not exists
        if (pVal.paymentType === 'CHECK' && pVal.bankName && pVal.branch) {
             // Check if branch exists in currently loaded list
             // Ensure bankBranches is an array before checking
             const currentBranches = Array.isArray(this.bankBranches) ? this.bankBranches : [];
             const branchExists = currentBranches.some((b: any) => 
                (b.branchNameTh || '').trim() === (pVal.branch || '').trim()
             );

             if (!branchExists) {
                 this.bankService.createBranch(pVal.bankName, pVal.branch).subscribe({
                     next: (res) => console.log('Auto-created new branch:', res),
                     error: (err) => console.warn('Failed to auto-create branch:', err)
                 });
             }
        }
    }

    const payload = {
        // Seller/Branch identification
        sellerId: sellerId,
        branchCode: header.branchCode || '00000',
        
        // Document info (use correct field names for DocumentRequest DTO)
        docNo: header.docNo || '',
        docTypeCode: this.docTypeCode,  // String, not object
        // Use local date format to avoid timezone shift (toISOString converts to UTC)
        docIssueDate: this.formatLocalDate(header.issueDate),
        
        // Seller snapshot info
        sellerTaxId: this.user?.sellerTaxId || header.taxId || '',
        sellerName: this.user?.sellerNameTh || header.companyName || '',
        sellerNameEn: this.user?.sellerNameEn || '',  // English name added
        sellerAddress: this.getFormattedSellerAddress() || header.address || '',
        sellerBranchCode: header.branchCode || '00000',
        sellerPhoneNumber: this.user?.sellerPhoneNumber || header.tel || '',
        sellerLogoUrl: this.logoUrl || null,
        
        // Buyer info
        buyerId: buyerId || null,
        buyerCode: customer.code || '',  // Customer code
        buyerName: customer.name || '',
        // TaxId is always from taxId field for all types (รวมถึงชาวต่างชาติ)
        // If Foreigner and no Tax ID, use Passport Number as Tax ID per user request
        buyerTaxId: customer.taxId || (customer.partyType === 'FOREIGNER' ? (customer.passportNo || '') : ''),
        buyerBranchCode: customer.partyType === 'JURISTIC' ? (customer.branchCode || '00000') : null,
        buyerAddress: this.buildBuyerAddress(customer),
        buyerType: this.mapPartyTypeToBuyerType(customer.partyType),
        buyerZipCode: customer.zip || '',
        // Additional snapshot fields for email, phone, country
        buyerEmail: customer.email || '',
        buyerPhone: customer.tel || '',
        buyerCountry: (customer.partyType === 'FOREIGNER' || customer.partyType === 'OTHER') ? (customer.country || '') : null,
        // Passport number for foreigners only (เฉพาะชาวต่างชาติ)
        buyerPassportNo: customer.partyType === 'FOREIGNER' ? (customer.passportNo || '') : null,
        
        // Optional fields
        salesperson: header.seller || '',
        currency: 'THB',
        note: this.form.get('remark')?.value || '',

        // Reference Document Fields
        refDocNo: header.refDocNo || '',
        refDocDate: header.refDocDate ? this.formatLocalDate(header.refDocDate) : null,
        refDocType: header.refDocType || '',

        reference: header.refDocNo || '',
        status: 'NEW',
        
        // Items, Charges, Payments
        items: items,
        charges: [
          { description: 'service', amount: this.serviceFee || 0 }
        ],
        payments: payments,
        // VAT calculation mode (include = price includes VAT, exclude = VAT added on top)
        vatType: this.form.get('vatType')?.value || 'exclude',
        // Send createdBy using fullName if available, otherwise userName
        createdBy: this.user?.fullName || this.user?.userName || null
    };

    console.log('Sending Payload:', payload);
    console.log('Mode:', this.mode, 'Document UUID:', this.documentUuid);

    // Use updateDocument (PUT) for edit mode, createDocument (POST) for create mode
    if (this.mode === 'edit' && this.documentUuid) {
      this.docs.updateDocument(this.documentUuid, payload as any).subscribe({
        next: (res: any) => {
          console.log('Updated document:', res);
          this.isSaving = false;
          this.documentStoreService.invalidate();
          
          // Log activity for session tracking
          const docNo = this.fgHeader.get('docNo')?.value || res.docNo || '';
          this.activityService.logDocumentUpdate(docNo, res.id || this.documentUuid || '');
          
          // Navigate back to documents list and show success dialog
          this.router.navigate(['/documentsall']).then(() => {
            this.swalService.success('บันทึกสำเร็จ', 'บันทึกเอกสารสำเร็จแล้ว');
          });
        },
        error: (err) => {
          console.error('Error updating document', err);
          this.isSaving = false;
          this.swalService.error('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการแก้ไขเอกสาร');
        },
      });
    } else {
      // Create mode - use POST
      this.docs.createDocument(payload as any).subscribe({
        next: (res: any) => {
          console.log('Created document RAW:', res);
          console.log('Created document JSON:', JSON.stringify(res));
          console.log('Created document Keys:', Object.keys(res));

          // The backend returns the Document object directly (with 'id').
          // We try multiple known patterns.
          const docUuid = res.id || res.document?.docUuid || res.docUuid || (res.body ? res.body.id : null);
          
          this.createdDocument = res.document || res; 
          this.documentUuid = docUuid; 
          console.log('Extracted UUID:', this.documentUuid); // DEBUG LOG

          if (!this.documentUuid) {
               console.error('CRITICAL: Could not extract Document UUID! Response structure might be unexpected.', res);
               this.swalService.warning('คำเตือน', 'สร้างเอกสารสำเร็จ แต่ไม่พบ UUID การดาวน์โหลดอาจไม่ทำงาน');
          }

          this.documentStoreService.invalidate();
          this.creationSuccess = true;
          this.isSaving = false;
          
          // Log activity for session tracking
          const docNo = this.fgHeader.get('docNo')?.value || res.docNo || '';
          this.activityService.logDocumentCreate(docNo, this.documentUuid || res.id || '');
          
          this.swalService.success('สร้างเอกสารสำเร็จ', 'ระบบได้สร้างเอกสารเรียบร้อยแล้ว');
        },
        error: (err) => {
          console.error('Error creating document', err);
          this.isSaving = false;
          this.swalService.error('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสร้างเอกสาร');
        },
      });
    }
  }

  openDownloadDialog() {
    if (!this.documentUuid) return;
    this.dialog.open(ExportDialogComponent, {
      data: {
        docUuid: this.documentUuid,
        docNo: this.fgHeader.get('docNo')?.value || ''
      }
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
      issueDate: new Date(),
      taxRate: 7,
      branchCode: '00000'
    });
    
    // Restore user info
    if (this.user) {
      this.initUserForm(this.user);
    }
    
    // Get new doc number
    if (this.mode === 'create') {
        this.getDocNumberPreview();
    }

    this.removePaymentMethod(); // Reset payment method
  }

  // Payment Method Logic
  addPaymentMethod() {
    this.showPaymentMethod = true;
    this.fgPayment.reset({ 
      paymentType: '',
      amount: this.totals.grand 
    });
  }

  removePaymentMethod() {
    this.showPaymentMethod = false;
    this.fgPayment.reset({ paymentType: '' });
  }

  public asFormControl(control: AbstractControl | null): FormControl {
    return control as FormControl;
  }

  private _filterBuyers(value: string | Buyer): Buyer[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : value.name.toLowerCase();
    return this.buyers.filter(buyer => 
      buyer.name.toLowerCase().includes(filterValue) || 
      (buyer.code && buyer.code.toLowerCase().includes(filterValue))
    ).sort((a, b) => {
      const codeA = a.code || '';
      const codeB = b.code || '';
      // Natural sort: AUST-001, CUST-001, CUST-002, CUST-10
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  displayBuyer(buyer: Buyer | string): string {
    if (typeof buyer === 'string') return buyer;
    return buyer && buyer.name ? buyer.name : '';
  }

  displayBuyerCode(buyer: Buyer | string): string {
    if (typeof buyer === 'string') return buyer;
    return buyer && buyer.code ? buyer.code : '';
  }

  onBuyerSelected(event: any): void {
    const selectedBuyer = event.option.value as Buyer;
    // Combine address with zipCode and normalize กรุงเทพ to กรุงเทพฯ
    let fullAddress = selectedBuyer.zipCode 
      ? `${selectedBuyer.address || ''} ${selectedBuyer.zipCode}`.trim()
      : selectedBuyer.address || '';
    // Add ฯ to กรุงเทพ if not followed by มหานคร or ฯ
    fullAddress = fullAddress.replace(/กรุงเทพ(?!มหานคร|ฯ)/g, 'กรุงเทพฯ');
    
    const patchData: any = {
      code: selectedBuyer.code,
      name: selectedBuyer.name,
      taxId: selectedBuyer.taxId,
      address: fullAddress,
      branchCode: selectedBuyer.branch,
      email: selectedBuyer.email,
      tel: selectedBuyer.telephone,
      zip: selectedBuyer.zipCode,
    };

    // If Foreigner, handle Passport logic
    const currentPartyType = this.fgCustomer.get('partyType')?.value;
    const isForeignerBuyer = selectedBuyer.taxpayerType === 'FOREIGN';

    // 1. Ensure partyType is set correctly first (if needed)
    if (isForeignerBuyer && currentPartyType !== 'FOREIGNER') {
         this.fgCustomer.patchValue({ partyType: 'FOREIGNER' }); // This invalidates/clears form, so we patch data after
    }

    // 2. Check for Passport-as-TaxID case
    if (isForeignerBuyer || currentPartyType === 'FOREIGNER') {
        const taxIdVal = selectedBuyer.taxId || '';
        // If taxId is present but NOT 13 digits (Thai Tax ID), treat as Passport
        // User request: "Passport is taxId" -> so we map it to passportNo field for the form
        if (taxIdVal && !/^\d{13}$/.test(taxIdVal)) {
            // Set hasThaiTIN to false to enable Passport validation and disable Tax ID validation
            this.fgCustomer.patchValue({ hasThaiTIN: false }); // emitEvent: true to trigger updateForeignerValidation
            patchData.passportNo = taxIdVal;
            patchData.taxId = ''; // Clear taxId field so it doesn't fail pattern check (if any remains)
        } else {
             // If valid 13 digits, likely has Thai TIN
             this.fgCustomer.patchValue({ hasThaiTIN: true });
        }
    }
    
    // 3. Patch the rest of the data (will overwrite any cleared fields from partyType change)
    this.fgCustomer.patchValue(patchData);

    // 4. Force Foreigner Validation Update if needed
    // This must happen AFTER patching data to ensure hasThaiTIN and passportNo are set
    if (this.fgCustomer.get('partyType')?.value === 'FOREIGNER') {
      // Re-apply hasThaiTIN if it was meant to be false (Passport case)
      if (patchData.passportNo && !patchData.taxId) {
          this.fgCustomer.patchValue({ hasThaiTIN: false }, { emitEvent: false });
      }
      this.updateForeignerValidation();
    }

    // Save if Juristic
    if (this.fgCustomer.get('partyType')?.value === 'JURISTIC') {
      this.selectedJuristicBuyer = patchData;
    }
  }

  // ===== Custom Dropdown Logic =====
  opened: { [key: string]: boolean } = {};

  toggleDropdown(key: string) {
    this.opened[key] = !this.opened[key];
  }

  selectBranch(branch: { code: string; name: string; id?: string }) {
    this.fgHeader.patchValue({ branchCode: branch.code });
    this.opened['branch'] = false;
    
    // Fetch full branch details to update address and logo
    if (branch.id) {
        this.branchService.getBranchById(branch.id).subscribe(fullBranch => {
            const formattedAddress = this.formatBranchAddress(fullBranch);
            this.fgHeader.patchValue({
                address: formattedAddress
            });
            
            // Update Logo: use branch logo if available, else fallback to company logo
            if (fullBranch.logoUrl) {
                this.logoUrl = fullBranch.logoUrl;
            } else {
                this.logoUrl = this.user?.logoUrl || '';
            }
        });
    }
  }

  // Helper to format branch address similar to seller address
  private formatBranchAddress(branch: BranchDto): string {
    // Resolve names from IDs if possible
    let subdistrictName = this.subdistricts.find(s => String(s.code) === String(branch.subdistrictId))?.name_th || branch.subdistrictId || '';
    let districtName = this.districts.find(d => String(d.code) === String(branch.districtId))?.name_th || branch.districtId || '';
    let provinceName = this.provinces.find(p => String(p.code) === String(branch.provinceId))?.name_th || branch.provinceId || '';

    // Smart Prefixes
    const isBangkok = provinceName.includes('กรุงเทพ');
    
    // Clean up existing prefixes
    subdistrictName = String(subdistrictName).replace(/^(แขวง|ต\.|ตำบล)/, '').trim();
    districtName = String(districtName).replace(/^(เขต|อ\.|อำเภอ)/, '').trim();
    provinceName = String(provinceName).replace(/^(จ\.|จังหวัด)/, '').trim();

    const subPrefix = isBangkok ? 'แขวง' : 'ต.';
    const districtPrefix = isBangkok ? 'เขต' : 'อ.';
    const provincePrefix = isBangkok ? '' : 'จ.'; 

    const parts = [
      branch.buildingNo,
      branch.addressDetailTh,
      subdistrictName ? `${subPrefix}${subdistrictName}` : '',
      districtName ? `${districtPrefix}${districtName}` : '',
      provinceName ? `${provincePrefix}${provinceName}` : '',
      branch.zipCode
    ];
    return parts.filter(p => p && p.trim() !== '').join(' ');
  }

  selectPartyType(type: { value: string; label: string }) {
    this.fgCustomer.patchValue({ partyType: type.value });
    this.opened['partyType'] = false;
  }

  selectTaxRate(rate: number, index: number) {
    const item = this.itemForms[index];
    item.patchValue({ taxRate: rate });
    this.opened['taxRate-' + index] = false;
  }

  private _filterCountries(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.countries.filter(option => option.toLowerCase().includes(filterValue));
  }

  getBranchName(code: string): string {
    const b = this.branches.find((x) => x.code === code);
    return b ? b.name : 'เลือกสาขา';
  }

  getPartyTypeLabel(value: string): string {
    const t = this.partyTypes.find((x) => x.value === value);
    return t ? t.label : 'เลือกประเภท';
  }

  getRefDocTypeLabel(code: string): string {
    if (!code) {
      return 'เลือกประเภท';
    }
    const type = this.docTypes.find((x) => x.code === code);
    return type ? `${type.code} - ${type.name}` : 'เลือกประเภท';
  }

  selectRefDocType(type: any) {
    const code = typeof type === 'string' ? type : type.code;
    this.fgHeader.patchValue({ refDocType: code });
    this.opened['refDocType'] = false;
  }

  getReplacementReasonLabel(code: string): string {
    if (!code) {
      return 'เลือกเหตุผล';
    }
    const reason = this.replacementReasons.find((x) => x.code === code);
    return reason ? `${reason.code} - ${reason.name}` : 'เลือกเหตุผล';
  }

  selectReplacementReason(reason: any) {
    this.fgHeader.patchValue({ replacementReason: reason.code });
    this.opened['replacementReason'] = false;
  }

  getBankNameLabel(bankCode: string): string {
    if (!bankCode) {
      return 'เลือกธนาคาร';
    }
    const bank = this.banks.find((b) => b.bankCode === bankCode);
    return bank ? bank.bankNameTh : 'เลือกธนาคาร';
  }

  selectBank(bank: any) {
    this.fgPayment.patchValue({ bankName: bank.bankCode });
    this.opened['bankName'] = false;
    this.onBankChange(bank.bankCode);
  }


  onBankChange(bankCode: string): void {
    this.bankBranches = []; // Clear previous branches
    this.fgPayment.get('branch')?.setValue('');
    
    if (bankCode) {
      if (this.allBankBranches && this.allBankBranches.length > 0) {
        this.bankBranches = this.allBankBranches.filter(b => b.bankCode === bankCode);
        this.filteredBankBranches = [...this.bankBranches];
      } else {
          this.bankService.getBranches(bankCode).subscribe(res => {
            if (res && res.result && res.result.data) {
              this.bankBranches = res.result.data;
            } else if (Array.isArray(res)) {
              this.bankBranches = res;
            } else if (res && res.data) {
               this.bankBranches = res.data;
            }
            this.filteredBankBranches = [...this.bankBranches];
          });
      }
    } else {
        this.bankBranches = [];
        this.filteredBankBranches = [];
    }
  }

  filterBranches(event: any) {
    const query = (event.target as HTMLInputElement).value || '';
    if (!query) {
      this.filteredBankBranches = [...this.bankBranches];
    } else {
      const lowerQuery = query.toLowerCase();
      this.filteredBankBranches = this.bankBranches.filter(b => 
        (b.branchNameTh || '').toLowerCase().includes(lowerQuery) ||
        (b.name || '').toLowerCase().includes(lowerQuery)
      );
    }
    this.opened['bankBranch'] = true; 
  }

  openBranchDropdown() {
      this.opened['bankBranch'] = true;
  }

  selectBankBranch(branch: any) {
    // Assuming branch object has branchNameTh or name
    const branchName = branch.branchNameTh || branch.name || '';
    this.fgPayment.patchValue({ branch: branchName });
    this.opened['bankBranch'] = false;
  }

  // Helper: Map frontend partyType to backend BuyerType
  mapPartyTypeToBuyerType(partyType: string): string {
    const mapping: { [key: string]: string } = {
      'JURISTIC': 'JURISTIC',
      'PERSON': 'PERSON',
      'FOREIGNER': 'FOREIGN',
      'OTHER': 'OTHER',
    };
    return mapping[partyType] || 'PERSON';
  }

  // Helper: Build buyer address, appending country (in English) for FOREIGNER/OTHER types
  private buildBuyerAddress(customer: any): string {
    let address = customer.address || '';
    
    // For FOREIGNER or OTHER, append country in English if provided
    if ((customer.partyType === 'FOREIGNER' || customer.partyType === 'OTHER') && customer.country) {
      // Extract English name from country like "Switzerland (สวิตเซอร์แลนด์)"
      const countryEnglish = this.extractEnglishCountryName(customer.country);
      if (countryEnglish && !address.toLowerCase().includes(countryEnglish.toLowerCase())) {
        address = address.trim() + ', ' + countryEnglish;
      }
    }
    
    return address;
  }

  // Helper: Extract English country name from format "Switzerland (สวิตเซอร์แลนด์)"
  private extractEnglishCountryName(country: string): string {
    if (!country) return '';
    
    // If format is "English (Thai)", extract English part
    const match = country.match(/^([^(]+)/);
    if (match) {
      return match[1].trim();
    }
    return country.trim();
  }

  // Helper: Map backend BuyerType to frontend partyType
  mapBuyerTypeToPartyType(buyerType: string): string {
    const mapping: { [key: string]: string } = {
      'JURISTIC': 'JURISTIC',
      'PERSON': 'PERSON',
      'FOREIGN': 'FOREIGNER',
      'OTHER': 'OTHER',
    };
    return mapping[buyerType] || 'PERSON';
  }

  // Update validation for FOREIGNER based on hasThaiTIN toggle
  updateForeignerValidation(): void {
    const hasThaiTIN = this.fgCustomer.get('hasThaiTIN')?.value;
    const taxIdControl = this.fgCustomer.get('taxId');
    const passportNoControl = this.fgCustomer.get('passportNo');

    if (!taxIdControl || !passportNoControl) return;

    if (hasThaiTIN) {
      // Has Thai TIN: taxId required (13 digits + checksum), passportNo optional
      taxIdControl.setValidators([
        Validators.required,
        Validators.minLength(13),
        Validators.maxLength(13),
        Validators.pattern(/^\d+$/),
        thaiTaxIdValidator
      ]);
      passportNoControl.clearValidators();
    } else {
      // No Thai TIN: passportNo required (6-20 alphanumeric), taxId disabled
      taxIdControl.clearValidators();
      passportNoControl.setValidators([
        Validators.required,
        Validators.pattern(/^[A-Z0-9]+$/i) // Relaxed pattern
      ]);
    }

    taxIdControl.updateValueAndValidity();
    passportNoControl.updateValueAndValidity();
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

  private findInvalidControls(form: FormGroup): string[] {
    const invalid = [];
    const controls = form.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(name);
      }
    }
    return invalid;
  }
  // Helper to format seller address from user profile
  private getFormattedSellerAddress(): string {
    if (!this.user || !this.user.sellerAddress) {
      return '';
    }
    const addr = this.user.sellerAddress;
    
    // Resolve names from IDs if possible
    let subdistrictName = this.subdistricts.find(s => String(s.code) === String(addr.subdistrictId))?.name_th || addr.subdistrictId || '';
    let districtName = this.districts.find(d => String(d.code) === String(addr.districtId))?.name_th || addr.districtId || '';
    let provinceName = this.provinces.find(p => String(p.code) === String(addr.provinceId))?.name_th || addr.provinceId || '';

    // Smart Prefixes
    const isBangkok = provinceName.includes('กรุงเทพ');
    
    // Clean up existing prefixes if they exist in data (to avoid double prefix)
    subdistrictName = String(subdistrictName).replace(/^(แขวง|ต\.|ตำบล)/, '').trim();
    districtName = String(districtName).replace(/^(เขต|อ\.|อำเภอ)/, '').trim();
    provinceName = String(provinceName).replace(/^(จ\.|จังหวัด)/, '').trim();

    const subPrefix = isBangkok ? 'แขวง' : 'ต.';
    const districtPrefix = isBangkok ? 'เขต' : 'อ.';
    const provincePrefix = isBangkok ? '' : 'จ.'; // Bangkok usually doesn't have a prefix, others use จ.

    const parts = [
      addr.buildingNo,
      addr.addressDetailTh,
      subdistrictName ? `${subPrefix}${subdistrictName}` : '',
      districtName ? `${districtPrefix}${districtName}` : '',
      provinceName ? `${provincePrefix}${provinceName}` : '',
      addr.postalCode
    ];
    return parts.filter(p => p && p.trim() !== '').join(' ');
  }

  private refreshFormattedAddress() {
    if (this.user && this.fgHeader) {
      this.fgHeader.patchValue({
         address: this.getFormattedSellerAddress()
      });
    }
  }

  // ====================== Scroll to first invalid control ======================
  private scrollToFirstInvalidControl(): void {
    // Helper to find first invalid control path
    const findInvalidControl = (group: FormGroup | AbstractControl, path: string[] = []): string | null => {
      if (group instanceof FormGroup) {
        for (const key of Object.keys(group.controls)) {
          const control = group.get(key);
          if (control && control.invalid) {
            if (control instanceof FormGroup) {
              const nestedPath = findInvalidControl(control, [...path, key]);
              if (nestedPath) return nestedPath;
            } else {
              return [...path, key].join('.');
            }
          }
        }
      }
      return null;
    };

    // Check all form groups for invalid controls
    let invalidControlPath = findInvalidControl(this.fgHeader);
    if (!invalidControlPath) {
      invalidControlPath = findInvalidControl(this.fgCustomer);
    }
    if (!invalidControlPath) {
      invalidControlPath = findInvalidControl(this.form);
    }
    
    if (!invalidControlPath) return;

    // Try to find the element by formControlName attribute or id
    const controlName = invalidControlPath.split('.').pop();
    let element: HTMLElement | null = null;

    // Try formControlName first
    element = document.querySelector(`[formControlName="${controlName}"]`);

    // If not found, try by id
    if (!element) {
      element = document.getElementById(controlName || '');
    }

    // If still not found, try mat-form-field containing the control
    if (!element) {
      const formFields = document.querySelectorAll('mat-form-field');
      for (const field of Array.from(formFields)) {
        if (field.querySelector(`[formControlName="${controlName}"]`)) {
          element = field as HTMLElement;
          break;
        }
      }
    }

    // Also check for ng-invalid class if nothing found
    if (!element) {
      element = document.querySelector('.ng-invalid:not(form)');
    }

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Focus the element if it's focusable
      setTimeout(() => {
        if (element && typeof (element as any).focus === 'function') {
          (element as any).focus();
        }
      }, 500);
    }
  }

  // ===== Exit Confirmation Guard =====
  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges() && this.mode === 'create') {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  /**
   * Check if the form has unsaved data (for create mode)
   * Returns true if customer name or any item has data
   */
  hasUnsavedChanges(): boolean {
    // Only check in create mode and when not already saved
    if (this.mode !== 'create' || this.creationSuccess) {
      return false;
    }
    
    // Check customer name
    const customerName = this.fgCustomer.get('name')?.value;
    if (customerName && customerName.trim().length > 0) {
      return true;
    }
    
    // Check if any item has product name or sku
    const items = this.itemsFA().controls;
    for (const item of items) {
      const name = item.get('name')?.value;
      const sku = item.get('sku')?.value;
      if ((name && name.trim().length > 0) || (sku && sku.trim().length > 0)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * CanDeactivate guard integration
   * Shows SweetAlert2 confirmation dialog when navigating away with unsaved changes
   */
  canDeactivate(): boolean | Promise<boolean> {
    // No changes, allow navigation
    if (!this.hasUnsavedChanges()) {
      return true;
    }
    
    // Return a Promise that resolves based on dialog result
    return new Promise<boolean>((resolve) => {
      // Run outside Angular zone to prevent issues
      this.ngZone.runOutsideAngular(() => {
        Swal.fire({
          icon: 'question',
          title: 'ต้องการออกจากหน้าสร้างเอกสารหรือไม่?',
          text: 'ข้อมูลที่กรอกจะหายไป หากคุณออกจากหน้านี้',
          showCancelButton: true,
          confirmButtonColor: '#f8bb86',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'ยกเลิก',
          reverseButtons: true,
          heightAuto: false,
          allowOutsideClick: false,
          allowEscapeKey: false
        }).then((result) => {
          // Run inside Angular zone to trigger change detection
          this.ngZone.run(() => {
            resolve(result.isConfirmed);
          });
        });
      });
    });
  }

  /**
   * Format date to YYYY-MM-DD using local timezone (not UTC)
   * This prevents date shift issues when the user is in a timezone ahead of UTC
   */
  private formatLocalDate(dateValue: any): string {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
