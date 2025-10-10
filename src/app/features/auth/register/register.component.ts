import { Component, OnInit } from '@angular/core';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatFormFieldControl } from '@angular/material/form-field';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

import {
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormGroup,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  ThaiAddressService,
  TAItem,
  ZipLookupResult,
} from '../../../shared/thai-address.service';
import { AuthService, RegisterResponse } from '../../../shared/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  step = 1;

  isSubmitting = false;
  step1Submitted = false;
  step2Submitted = false;
  formServerError = '';

  hidePass = true;
  hideConfirm = true;

  filteredProvinces: TAItem[] = [];
  filteredDistricts: TAItem[] = [];
  filteredSubdistricts: TAItem[] = [];

  readonly emailMaxLen = 254;
  readonly fullNameMaxLen = 100;
  readonly passwordMinLen = 14;
  readonly passwordMaxLen = 128;

  provinces: TAItem[] = [];
  districts: TAItem[] = [];
  subdistricts: TAItem[] = [];

  logoPreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private addr: ThaiAddressService,
    private auth: AuthService,
    private router: Router
  ) {}

  /** ------------------ ฟอร์ม ------------------ */
  form: FormGroup = this.fb.group({
    fullName: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(this.fullNameMaxLen),
      ],
    ],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        this.asciiEmailValidator,
        Validators.maxLength(this.emailMaxLen),
      ],
    ],
    passwordGroup: this.fb.group(
      {
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(this.passwordMinLen),
            Validators.maxLength(this.passwordMaxLen),
          ],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: RegisterComponent.passwordMatchValidator }
    ),

    company: this.fb.group({
      logo: [null],
      companyName: ['', Validators.required],
      branchCode: [
        '',
        [Validators.required, Validators.minLength(5), Validators.maxLength(5)],
      ],
      branchName: ['', Validators.required],
      taxId: [
        '',
        [
          Validators.required,
          Validators.minLength(13),
          Validators.maxLength(13),
        ],
      ],
      businessPhone: [''],

      addressTh: this.fb.group({
        buildingNo: ['', Validators.required],
        street: [''],
        province: ['', Validators.required],
        district: [{ value: '', disabled: true }, Validators.required], // 🔒 เริ่มปิด
        subdistrict: [{ value: '', disabled: true }, Validators.required], // 🔒 เริ่มปิด
        postalCode: ['', Validators.required],
      }),

      addressEn: this.fb.group({
        line1: ['', [Validators.maxLength(254)]],
      }),

      acceptTos: [false, Validators.requiredTrue],
    }),
  });

  /** ------------------ Getters ------------------ */
  get fullName() {
    return this.form.get('fullName');
  }
  get email() {
    return this.form.get('email');
  }
  get passwordGroup() {
    return this.form.get('passwordGroup') as FormGroup;
  }
  get password() {
    return this.passwordGroup.get('password');
  }
  get confirmPassword() {
    return this.passwordGroup.get('confirmPassword');
  }
  get company() {
    return this.form.get('company') as FormGroup;
  }
  get addressTh() {
    return this.company.get('addressTh') as FormGroup;
  }
  zipLinked = false;

  get hasProvince(): boolean {
    return !!this.addressTh.get('province')?.value;
  }
  get hasDistrict(): boolean {
    return !!this.addressTh.get('district')?.value;
  }
  // ภายในคลาส RegisterComponent
  get isDistrictLocked(): boolean {
    return !this.addressTh.get('province')?.value; // ยังไม่เลือกจังหวัด
  }
  get isSubdistrictLocked(): boolean {
    return !this.addressTh.get('district')?.value; // ยังไม่เลือกอำเภอ
  }
  onDistrictFocus(trigger?: MatAutocompleteTrigger | null): void {
    if (this.isDistrictLocked || !trigger) return;
    trigger.openPanel();
  }
  onSubdistrictFocus(trigger?: MatAutocompleteTrigger | null): void {
    if (this.isSubdistrictLocked || !trigger) return;
    trigger.openPanel();
  }
  onDistrictType(term: string): void {
    if (this.isDistrictLocked) return;
    this.onDistrictInput(term);
  }
  onSubdistrictType(term: string): void {
    if (this.isSubdistrictLocked) return;
    this.onSubdistrictInput(term);
  }

  /** ------------------ Password meter ------------------ */
  rules = { minLen: false, hasDigit: false, hasSpecial: false, match: false };
  get passwordScore(): number {
    const passed = [
      this.rules.minLen,
      this.rules.hasDigit,
      this.rules.hasSpecial,
    ].filter(Boolean).length;
    return passed / 3;
  }
  get allOk() {
    return this.passwordScore === 1;
  }

  /** ------------------ Init ------------------ */
  ngOnInit(): void {
    // ปิดทั้ง STEP2 จนกว่าจะผ่าน STEP1
    this.company.disable({ emitEvent: false });

    this.addr.getProvinces().subscribe((list: TAItem[]) => {
      this.provinces = list;
      this.filteredProvinces = list.slice(0, 25);
    });

    this.password?.valueChanges.subscribe(() => this.updatePasswordRules());
    this.confirmPassword?.valueChanges.subscribe(() =>
      this.updatePasswordRules()
    );

    // ควบคุม enable/disable อำเภอ/ตำบล ตามจังหวัด/อำเภอ
    const provinceCtrl = this.addressTh.get('province');
    const districtCtrl = this.addressTh.get('district');
    const subdistrictCtrl = this.addressTh.get('subdistrict');

    districtCtrl?.disable({ emitEvent: false });
    subdistrictCtrl?.disable({ emitEvent: false });
    this.addressTh.get('province')?.valueChanges.subscribe((v) => {
      if (!v) {
        districtCtrl?.disable({ emitEvent: false });
        subdistrictCtrl?.disable({ emitEvent: false });
      } else {
        districtCtrl?.enable({ emitEvent: false });
        subdistrictCtrl?.disable({ emitEvent: false });
      }
    });

    // district เปลี่ยน -> เปิด/ปิด subdistrict
    districtCtrl?.valueChanges.subscribe((v) => {
      if (!v) {
        subdistrictCtrl?.disable({ emitEvent: false });
      } else {
        subdistrictCtrl?.enable({ emitEvent: false });
      }
    });
    // เมื่อ province ถูกล้าง → ปิดทั้ง district & subdistrict
    provinceCtrl?.valueChanges.subscribe((v) => {
      const hasProvince = !!v;
      if (!hasProvince) {
        districtCtrl?.disable({ emitEvent: false });
        subdistrictCtrl?.disable({ emitEvent: false });
        this.addressTh.patchValue(
          { district: null, subdistrict: null, postalCode: '' },
          { emitEvent: false }
        );
        this.districts = [];
        this.subdistricts = [];
        this.filteredDistricts = [];
        this.filteredSubdistricts = [];
      }
    });

    // เมื่อ district ถูกล้าง → ปิด subdistrict
    districtCtrl?.valueChanges.subscribe((v) => {
      const hasDistrict = !!v;
      if (!hasDistrict) {
        subdistrictCtrl?.disable({ emitEvent: false });
        this.addressTh.patchValue(
          { subdistrict: null, postalCode: '' },
          { emitEvent: false }
        );
        this.subdistricts = [];
        this.filteredSubdistricts = [];
      }
    });
  }

  /** ------------------ Email validator ------------------ */
  asciiEmailValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value ?? '') as string;
    if (!v) return null;
    if (/[\u0E00-\u0E7F]/.test(v) || /[^\x00-\x7F]/.test(v))
      return { nonAscii: true };
    return null;
  }

  /** ------------------ Province/District/Subdistrict (Autocomplete) ------------------ */
  displayProvince(v: TAItem | string | null): string {
    if (!v) return '';
    return typeof v === 'string'
      ? this.provinces.find((p) => p.code === v)?.name_th ?? ''
      : v.name_th;
  }
  displayDistrict(v: TAItem | string | null): string {
    if (!v) return '';
    return typeof v === 'string'
      ? this.districts.find((d) => d.code === v)?.name_th ?? ''
      : v.name_th;
  }
  displaySubdistrict(v: TAItem | string | null): string {
    if (!v) return '';
    return typeof v === 'string'
      ? this.subdistricts.find((s) => s.code === v)?.name_th ?? ''
      : v.name_th;
  }

  onProvinceInput(term: string) {
    const t = (term || '').trim();
    this.filteredProvinces = !t
      ? this.provinces.slice(0, 25)
      : this.provinces.filter((p) => p.name_th.includes(t)).slice(0, 25);
  }
  fixProvinceDisplay() {
    const v = this.addressTh.get('province')?.value;
    if (v && typeof v === 'string') {
      const found = this.provinces.find((p) => p.name_th === v);
      if (!found) this.addressTh.get('province')?.setValue(null);
    }
  }
  onProvinceSelected(item: TAItem) {
    this.addressTh.get('province')?.setValue(item);
    // reset ⤵
    this.addressTh.patchValue(
      { district: null, subdistrict: null, postalCode: '' },
      { emitEvent: false }
    );
    this.subdistricts = [];
    this.filteredSubdistricts = [];
    this.addressTh.get('subdistrict')?.disable({ emitEvent: false });

    this.addr.getDistricts(item.code).subscribe((list) => {
      this.districts = list;
      this.filteredDistricts = list.slice(0, 25);
      this.addressTh.get('district')?.enable({ emitEvent: false });
    });

    // load districts แล้วเปิด field
  }

  onDistrictInput(term: string) {
    const t = (term || '').trim();
    this.filteredDistricts = !t
      ? this.districts.slice(0, 25)
      : this.districts.filter((d) => d.name_th.includes(t)).slice(0, 25);
  }
  fixDistrictDisplay() {
    const v = this.addressTh.get('district')?.value;
    if (v && typeof v === 'string') {
      const found = this.districts.find((d) => d.name_th === v);
      if (!found) this.addressTh.get('district')?.setValue(null);
    }
  }
  onDistrictSelected(item: TAItem) {
    this.addressTh.get('district')?.setValue(item);
    this.addressTh.patchValue(
      { subdistrict: null, postalCode: '' },
      { emitEvent: false }
    );
    this.addr.getSubdistricts(item.code).subscribe((list) => {
      this.subdistricts = list;
      this.filteredSubdistricts = list.slice(0, 25);
      this.addressTh.get('subdistrict')?.enable({ emitEvent: false });
    });
  }

  onSubdistrictInput(term: string) {
    const t = (term || '').trim();
    this.filteredSubdistricts = !t
      ? this.subdistricts.slice(0, 25)
      : this.subdistricts.filter((s) => s.name_th.includes(t)).slice(0, 25);
  }
  fixSubdistrictDisplay() {
    const v = this.addressTh.get('subdistrict')?.value;
    if (v && typeof v === 'string') {
      const found = this.subdistricts.find((s) => s.name_th === v);
      if (!found) this.addressTh.get('subdistrict')?.setValue(null);
    }
  }
  onSubdistrictSelected(item: TAItem) {
    this.addressTh.get('subdistrict')?.setValue(item);
    this.addressTh.get('postalCode')?.setValue(item.zip ?? '');
  }

  /** ------------------ ZIP → auto fill ------------------ */
  onZipEnter() {
    const zip = (this.addressTh.get('postalCode')?.value || '').trim();
    if (!/^\d{5}$/.test(zip)) return;

    this.addr.lookupByZip(zip).subscribe((result: ZipLookupResult | null) => {
      if (!result) return;

      const { province, district, subdistrict } = result;

      const provinceCtrl = this.addressTh.get('province');
      const districtCtrl = this.addressTh.get('district');
      const subdistrictCtrl = this.addressTh.get('subdistrict');

      // 1) เซ็ตจังหวัดก่อน (ไม่กระตุ้น valueChanges เพื่อไม่ให้รีเซ็ตช่องอื่น)
      provinceCtrl?.setValue(province, { emitEvent: false });
      // 2) โหลดอำเภอตามจังหวัด แล้วเซ็ต + เปิดใช้งาน
      this.addr.getDistricts(province.code).subscribe((dlist: TAItem[]) => {
        this.districts = dlist;
        this.filteredDistricts = dlist.slice(0, 25);
        districtCtrl?.enable({ emitEvent: false });
        districtCtrl?.setValue(district, { emitEvent: false });

        this.addr
          .getSubdistricts(district.code)
          .subscribe((slist: TAItem[]) => {
            this.subdistricts = slist;
            this.filteredSubdistricts = slist.slice(0, 25);
            subdistrictCtrl?.enable({ emitEvent: false });
            subdistrictCtrl?.setValue(subdistrict, { emitEvent: false });
          });
        this.addressTh
          .get('postalCode')
          ?.setValue(subdistrict.zip ?? zip, { emitEvent: false });
      });
    });
  }

  /** ------------------ Utils ------------------ */
  blockThai(e: KeyboardEvent) {
    if (/[\u0E00-\u0E7F]/.test(e.key)) e.preventDefault();
  }

  updatePasswordRules() {
    const p = this.password?.value || '';
    const c = this.confirmPassword?.value || '';
    this.rules.minLen = p.length >= this.passwordMinLen;
    this.rules.hasDigit = /\d/.test(p);
    this.rules.hasSpecial = /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(p);
    this.rules.match = !!p && !!c && p === c;
  }

  static passwordMatchValidator(
    group: AbstractControl
  ): ValidationErrors | null {
    const p = group.get('password')?.value;
    const c = group.get('confirmPassword')?.value;
    if (!p || !c) return null;
    return p === c ? null : { passwordsNotMatch: true };
  }

  /** ------------------ Step control ------------------ */
  onContinue(): void {
    this.step1Submitted = true;
    ['fullName', 'email', 'passwordGroup'].forEach((n) =>
      this.form.get(n)?.markAllAsTouched()
    );
    if (
      ['fullName', 'email', 'passwordGroup'].some(
        (n) => this.form.get(n)?.invalid
      )
    )
      return;

    this.company.enable({ emitEvent: false });
    this.step = 2;
    this.formServerError = '';
  }

  onBack(): void {
    this.step = 1;
    this.formServerError = '';
  }

  /** ------------------ Upload logo ------------------ */
  onLogoSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('ไฟล์มีขนาดเกิน 10MB');
      input.value = '';
      return;
    }
    this.company.get('logo')?.setValue(file);
    const reader = new FileReader();
    reader.onload = () => (this.logoPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  /** ------------------ Submit ------------------ */
  onSubmit(): void {
    this.step2Submitted = true;
    this.company.markAllAsTouched();
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.formServerError = '';

    const payload = this.form.value as any;
    const formData = new FormData();
    formData.append('fullName', payload.fullName);
    formData.append('email', payload.email);
    formData.append('password', payload.passwordGroup.password);
    formData.append('companyName', payload.company.companyName);
    if (payload.company.logo) formData.append('logo', payload.company.logo);

    this.auth.register(formData).subscribe({
      next: (res: RegisterResponse) => {
        this.isSubmitting = false;
        alert(`สมัครสมาชิกสำเร็จ\nชื่อผู้ใช้ของคุณ: ${res.username}`);
        this.router.navigateByUrl('/login');
      },
      error: (err: unknown) => {
        this.isSubmitting = false;
        const message =
          (err as any)?.error?.message ||
          (err as any)?.message ||
          'เกิดข้อผิดพลาด';
        this.formServerError = message;
        alert('เกิดข้อผิดพลาด: ' + message);
      },
    });
  }
}
