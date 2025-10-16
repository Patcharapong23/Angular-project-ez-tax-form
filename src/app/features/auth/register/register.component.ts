import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormGroup,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../shared/auth.service';

// ---------- Types (อิงไฟล์ assets/thai/*.json) ----------
interface Province {
  code: string;
  name_th: string;
}
interface District {
  code: string;
  name_th: string;
  parent_code: string; // province.code
}
interface Subdistrict {
  code: string;
  name_th: string;
  parent_code: string; // district.code
  zip: string; // "10120" เป็นต้น
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  // ---------------------- Step/UI ----------------------
  step = 1;
  step2Submitted = false;
  isSubmitting = false;
  formServerError = '';
  logoPreview: string | null = null;

  // ---------------------- Limits ----------------------
  firstNameMaxLen = 120;
  emailMaxLen = 120;

  // ---------------------- Thai geo data ----------------------
  provinces: Province[] = [];
  districts: District[] = [];
  subdistricts: Subdistrict[] = [];

  // index/map
  provinceByCode = new Map<string, Province>();
  districtByCode = new Map<string, District>();

  // grouped
  districtsByProvince = new Map<string, District[]>();
  subdistrictsByDistrict = new Map<string, Subdistrict[]>();

  // filtered lists used by mat-autocomplete
  filteredProvinces: Province[] = [];
  filteredDistricts: District[] = [];
  filteredSubdistricts: Subdistrict[] = [];

  // lock state (ตามลำดับจังหวัด→อำเภอ→ตำบล)
  isDistrictLocked = true;
  isSubdistrictLocked = true;

  // แจ้งเตือน zip (ถ้าต้องโชว์ใน UI ให้ bind เองได้)
  zipMessage = '';

  // ---------------------- Form ----------------------
  form: FormGroup = this.fb.group({
    firstName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
    ],
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(120)],
    ],
    company: this.fb.group({
      logoImg: [''],

      tenantNameTh: ['', [Validators.required]],
      tenantNameEn: [''],

      branchCode: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(5),
          Validators.pattern(/^\d+$/),
        ],
      ],
      branchNameTh: ['', [Validators.required]],
      branchNameEn: [''],

      tenantTaxId: [
        '',
        [
          Validators.required,
          Validators.minLength(13),
          Validators.maxLength(13),
          Validators.pattern(/^\d+$/),
        ],
      ],
      tenantTel: ['', [Validators.pattern(/^\d*$/)]],

      addressTh: this.fb.group({
        buildingNo: ['', [Validators.required]],
        addressDetailTh: [''],
        province: [null as Province | null, Validators.required],
        district: [null as District | null, Validators.required],
        subdistrict: [null as Subdistrict | null, Validators.required],
        zipCode: [
          '',
          [
            Validators.required,
            Validators.minLength(5),
            Validators.maxLength(5),
            Validators.pattern(/^\d+$/),
          ],
        ],
      }),

      addressEn: this.fb.group({
        addressDetailEn: [''],
      }),

      acceptTos: [false, Validators.requiredTrue],
    }),
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  // ---------------------- Getters ----------------------
  get firstName(): AbstractControl | null {
    return this.form.get('firstName');
  }
  get email(): AbstractControl | null {
    return this.form.get('email');
  }

  get company(): FormGroup {
    return this.form.get('company') as FormGroup;
  }
  get addressTh(): FormGroup {
    return this.company.get('addressTh') as FormGroup;
  }
  get addressEn(): FormGroup {
    return this.company.get('addressEn') as FormGroup;
  }

  // ZIP ให้พิมพ์/แก้ได้เสมอ
  get isZipReadOnly(): boolean {
    return false;
  }

  // ---------------------- Lifecycle ----------------------
  ngOnInit(): void {
    this.loadThaiData();
  }

  // ==========================================================
  //                     โหลดข้อมูลจังหวัดฯ
  // ==========================================================
  private loadThaiData() {
    this.http
      .get<Province[]>('assets/thai/provinces.json')
      .subscribe((prov) => {
        this.provinces = (prov || [])
          .slice()
          .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
        this.provinceByCode.clear();
        this.provinces.forEach((p) => this.provinceByCode.set(p.code, p));
        this.filteredProvinces = this.provinces.slice();
      });

    this.http.get<District[]>('assets/thai/districts.json').subscribe((ds) => {
      this.districts = ds || [];
      this.districtByCode.clear();
      this.districts.forEach((d) => this.districtByCode.set(d.code, d));

      this.districtsByProvince.clear();
      for (const d of this.districts) {
        const arr = this.districtsByProvince.get(d.parent_code) || [];
        arr.push(d);
        this.districtsByProvince.set(d.parent_code, arr);
      }
    });

    this.http
      .get<Subdistrict[]>('assets/thai/subdistricts.json')
      .subscribe((ss) => {
        this.subdistricts = (ss || []).map((s) => ({
          ...s,
          zip: (s.zip || '').toString().padStart(5, '0'),
        }));

        this.subdistrictsByDistrict.clear();
        for (const s of this.subdistricts) {
          const arr = this.subdistrictsByDistrict.get(s.parent_code) || [];
          arr.push(s);
          this.subdistrictsByDistrict.set(s.parent_code, arr);
        }
      });
  }

  // ==========================================================
  //                     Step control
  // ==========================================================
  onContinue() {
    if (!this.firstName?.valid || !this.email?.valid) {
      this.firstName?.markAsTouched();
      this.email?.markAsTouched();
      return;
    }
    this.step = 2;
  }
  onBack() {
    this.step = 1;
  }

  // ==========================================================
  //                Province → District → Subdistrict
  // ==========================================================
  onProvinceFocus(trigger?: any) {
    this.filteredProvinces = this.provinces.slice();
    if (trigger?.openPanel) trigger.openPanel();
  }
  onProvinceInput(q: string) {
    const v = (q || '').trim().toLowerCase();
    this.filteredProvinces = !v
      ? this.provinces.slice()
      : this.provinces.filter((p) => p.name_th.toLowerCase().includes(v));
  }
  fixProvinceDisplay() {
    /* no-op */
  }

  // ✅ displayWith helpers (ต้องมีให้ตรงกับ HTML)
  displayProvince(v: Province | string | null): string {
    return v && typeof v === 'object' ? v.name_th : v ?? '';
  }
  displayDistrict(v: District | string | null): string {
    return v && typeof v === 'object' ? v.name_th : v ?? '';
  }
  displaySubdistrict(v: Subdistrict | string | null): string {
    return v && typeof v === 'object' ? v.name_th : v ?? '';
  }

  onProvinceSelected(p: Province) {
    // เลือกจังหวัด → รีเซ็ต อำเภอ/ตำบล/ZIP
    this.addressTh.patchValue(
      { province: p, district: null, subdistrict: null, zipCode: '' },
      { emitEvent: false }
    );

    const ds = (this.districtsByProvince.get(p.code) || []).slice();
    ds.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
    this.filteredDistricts = ds;

    this.filteredSubdistricts = [];
    this.isDistrictLocked = false;
    this.isSubdistrictLocked = true;
    this.zipMessage = '';
  }

  onDistrictFocus(trigger?: any) {
    const p = this.addressTh.get('province')?.value as Province | null;
    const base = p ? this.districtsByProvince.get(p.code) || [] : [];
    this.filteredDistricts = base
      .slice()
      .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
    if (trigger?.openPanel) trigger.openPanel();
  }
  onDistrictType(q: string) {
    const p = this.addressTh.get('province')?.value as Province | null;
    const base = p ? this.districtsByProvince.get(p.code) || [] : [];
    const v = (q || '').trim().toLowerCase();
    this.filteredDistricts = !v
      ? base.slice().sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'))
      : base
          .filter((d) => d.name_th.toLowerCase().includes(v))
          .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
  }
  fixDistrictDisplay() {
    /* no-op */
  }

  onDistrictSelected(d: District) {
    // เลือกอำเภอ → รีเซ็ตตำบล/ZIP
    this.addressTh.patchValue(
      { district: d, subdistrict: null, zipCode: '' },
      { emitEvent: false }
    );

    const subs = (this.subdistrictsByDistrict.get(d.code) || []).slice();
    subs.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
    this.filteredSubdistricts = subs;

    this.isSubdistrictLocked = false;
    this.zipMessage = '';
  }

  onSubdistrictFocus(trigger?: any) {
    const d = this.addressTh.get('district')?.value as District | null;
    const base = d ? this.subdistrictsByDistrict.get(d.code) || [] : [];
    this.filteredSubdistricts = base
      .slice()
      .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
    if (trigger?.openPanel) trigger.openPanel();
  }
  onSubdistrictType(q: string) {
    const d = this.addressTh.get('district')?.value as District | null;
    const base = d ? this.subdistrictsByDistrict.get(d.code) || [] : [];
    const v = (q || '').trim().toLowerCase();
    this.filteredSubdistricts = !v
      ? base.slice().sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'))
      : base
          .filter((s) => s.name_th.toLowerCase().includes(v))
          .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
  }
  fixSubdistrictDisplay() {
    /* no-op */
  }

  onSubdistrictSelected(s: Subdistrict) {
    // เลือกตำบล → เติม ZIP อัตโนมัติ
    this.addressTh.patchValue(
      { subdistrict: s, zipCode: s.zip },
      { emitEvent: false }
    );
    this.zipMessage = '';
  }

  // ==========================================================
  //                         ZIP
  // ==========================================================
  onZipFocus(): void {
    this.zipMessage = '';
  }

  onZipEnter(): void {
    const raw = (this.addressTh.get('zipCode')?.value || '').toString().trim();

    // ✅ เคลียร์ "ตำบล" ทันทีที่ผู้ใช้กด Enter ใส่ ZIP (กันค้างจากค่าเดิม)
    this.addressTh.patchValue({ subdistrict: null }, { emitEvent: false });
    this.isSubdistrictLocked = true; // ล็อกไว้ก่อนจนกว่าจะรู้เขต/อำเภอที่ถูกต้อง
    this.zipMessage = '';

    // ตรวจรูปแบบ ZIP
    if (!/^\d{5}$/.test(raw)) {
      this.notifyZipNotFound(raw);
      return;
    }

    // หา subdistricts ตาม ZIP
    const subs = this.subdistricts.filter((s) => s.zip === raw);

    if (!subs.length) {
      // ไม่พบ ZIP นี้ → เคลียร์ทั้งหมด + แจ้งเตือน
      this.addressTh.patchValue(
        { province: null, district: null, subdistrict: null, zipCode: '' },
        { emitEvent: false }
      );
      this.filteredProvinces = this.provinces.slice();
      this.filteredDistricts = [];
      this.filteredSubdistricts = [];
      this.isDistrictLocked = true;
      this.isSubdistrictLocked = true;
      this.notifyZipNotFound(raw);
      return;
    }

    // ทำ candidate ของอำเภอ/จังหวัดจาก ZIP
    const districtCodes = Array.from(new Set(subs.map((s) => s.parent_code)));
    const ds = districtCodes
      .map((c) => this.districtByCode.get(c))
      .filter(Boolean) as District[];

    const provinceCodes = Array.from(new Set(ds.map((d) => d.parent_code)));
    const ps = provinceCodes
      .map((c) => this.provinceByCode.get(c))
      .filter(Boolean) as Province[];

    // ----- Province -----
    if (ps.length === 1) {
      this.addressTh.patchValue({ province: ps[0] }, { emitEvent: false });
      this.isDistrictLocked = false;

      const dsInProv = (this.districtsByProvince.get(ps[0].code) || []).slice();
      this.filteredDistricts = dsInProv.sort((a, b) =>
        a.name_th.localeCompare(b.name_th, 'th')
      );
    } else {
      // มีหลายจังหวัดใน ZIP เดียว → ให้ผู้ใช้เลือกจังหวัด
      this.addressTh.patchValue({ province: null }, { emitEvent: false });
      this.filteredProvinces = ps
        .slice()
        .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
      this.isDistrictLocked = true;
      this.isSubdistrictLocked = true;
    }

    // ----- District -----
    if (ps.length === 1 && ds.length === 1) {
      this.addressTh.patchValue({ district: ds[0] }, { emitEvent: false });
      this.isSubdistrictLocked = false;

      const subsInDist = (
        this.subdistrictsByDistrict.get(ds[0].code) || []
      ).slice();
      this.filteredSubdistricts = subsInDist.sort((a, b) =>
        a.name_th.localeCompare(b.name_th, 'th')
      );
    } else if (ps.length === 1 && ds.length > 1) {
      const prov = ps[0];
      const dsInProv = (this.districtsByProvince.get(prov.code) || []).slice();
      this.filteredDistricts = dsInProv
        .filter((d) => ds.find((x) => x.code === d.code))
        .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
      this.addressTh.patchValue({ district: null }, { emitEvent: false });
      this.isDistrictLocked = false;
      this.isSubdistrictLocked = true;
    }

    // ----- Subdistrict -----
    if (ps.length === 1 && ds.length === 1) {
      // จำกัดตำบลตาม ZIP + district ที่สรุปได้
      const inOneDist = (
        this.subdistrictsByDistrict.get(ds[0].code) || []
      ).filter((s) => s.zip === raw);
      if (inOneDist.length === 1) {
        // เจอตำบลเดียว → เติมให้อัตโนมัติ
        this.addressTh.patchValue(
          { subdistrict: inOneDist[0] },
          { emitEvent: false }
        );
      } else {
        // หลายตำบลใน ZIP เดียว → ให้ผู้ใช้เลือก
        this.filteredSubdistricts = inOneDist.sort((a, b) =>
          a.name_th.localeCompare(b.name_th, 'th')
        );
        this.isSubdistrictLocked = false;
      }
    }

    // คง ZIP ตามที่กรอกไว้
    this.addressTh.patchValue({ zipCode: raw }, { emitEvent: false });
  }

  private notifyZipNotFound(zip: string) {
    this.zipMessage = zip
      ? `ไม่พบรหัสไปรษณีย์ ${zip}`
      : 'กรุณากรอกรหัสไปรษณีย์ 5 หลัก';
    alert(this.zipMessage);
  }

  // ==========================================================
  //                   Input constraints helpers
  // ==========================================================
  private isCtrlKey(e: KeyboardEvent) {
    const k = e.key;
    return (
      k === 'Backspace' ||
      k === 'Delete' ||
      k === 'Tab' ||
      k === 'ArrowLeft' ||
      k === 'ArrowRight' ||
      k === 'Home' ||
      k === 'End' ||
      e.ctrlKey ||
      e.metaKey
    );
  }
  onlyDigitsKeydown(e: KeyboardEvent) {
    if (this.isCtrlKey(e)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  }
  sanitizeDigits(e: Event, control?: AbstractControl | null) {
    const el = e.target as HTMLInputElement;
    const clean = (el.value || '').replace(/\D/g, '');
    if (el.value !== clean) {
      el.value = clean;
      if (control) control.setValue(clean);
    }
  }
  blockThai(e: KeyboardEvent) {
    if (/[\u0E00-\u0E7F]/.test(e.key)) e.preventDefault();
  }

  // Upload logo → base64 preview
  onLogoSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result as string;
      this.company.patchValue({ logoImg: this.logoPreview });
    };
    reader.readAsDataURL(file);
  }

  // ==========================================================
  //                        Submit
  // ==========================================================
  onSubmit() {
    this.step2Submitted = true;
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.formServerError = '';

    const fv = this.form.getRawValue();
    const c = fv.company;
    const th = c.addressTh || {};
    const en = c.addressEn || {};

    const norm = (v: any) =>
      v && typeof v === 'object' ? v.name_th ?? '' : v ?? '';

    const payload = {
      firstName: fv.firstName,
      email: fv.email,
      logoImg: c.logoImg || null,

      tenantNameTh: c.tenantNameTh,
      tenantNameEn: c.tenantNameEn,

      tenantTaxId: c.tenantTaxId,

      branchCode: c.branchCode,
      branchNameTh: c.branchNameTh,
      branchNameEn: c.branchNameEn,

      tenantTel: c.tenantTel,

      buildingNo: th.buildingNo,
      addressDetailTh: th.addressDetailTh,
      province: norm(th.province),
      district: norm(th.district),
      subdistrict: norm(th.subdistrict),
      zipCode: th.zipCode,

      addressDetailEn: en.addressDetailEn,
    };

    this.auth.register(payload).subscribe({
      next: () => {
        alert(
          `สมัครสำเร็จ! userName ของคุณคือ: ${
            (fv.email || '').split('@')[0]
          }\n` +
            `รหัสผ่านเริ่มต้น = userName (ระบบจะให้ตั้งใหม่เมื่อเข้าสู่ระบบครั้งแรก)`
        );
        this.router.navigateByUrl('/register-success');
      },
      error: (err) => {
        this.isSubmitting = false;
        this.formServerError = err?.error?.message || 'เกิดข้อผิดพลาด';
        console.error('Registration error:', err);
      },
    });
  }
}
