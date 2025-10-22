import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormGroup,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../shared/auth.service';
import { firstValueFrom } from 'rxjs';

interface Province {
  code: string;
  name_th: string;
}
interface District {
  code: string;
  name_th: string;
  parent_code: string;
}
interface Subdistrict {
  code: string;
  name_th: string;
  parent_code: string;
  zip: string;
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
  fullNameMaxLen = 120;
  emailMaxLen = 120;

  // ---------------------- Password UI ----------------------
  showPassword = false;
  showConfirm = false;

  rules = { minLen: false, hasDigit: false, hasSpecial: false, match: false };
  passwordScore = 0; // 0..1
  get allOk(): boolean {
    return (
      this.rules.minLen &&
      this.rules.hasDigit &&
      this.rules.hasSpecial &&
      this.rules.match
    );
  }
  strengthClass: 'idle' | 'weak' | 'medium' | 'strong' = 'idle';

  // ---------------------- Thai geo data ----------------------
  provinces: Province[] = [];
  districts: District[] = [];
  subdistricts: Subdistrict[] = [];
  provinceByCode = new Map<string, Province>();
  districtByCode = new Map<string, District>();
  districtsByProvince = new Map<string, District[]>();
  subdistrictsByDistrict = new Map<string, Subdistrict[]>();
  filteredProvinces: Province[] = [];
  filteredDistricts: District[] = [];
  filteredSubdistricts: Subdistrict[] = [];
  isDistrictLocked = true;
  isSubdistrictLocked = true;
  zipMessage = '';

  // ---------------------- Form ----------------------
  form: FormGroup = this.fb.group({
    fullName: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
    ],
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(120)],
    ],
    password: ['', [Validators.required]],
    confirmPassword: ['', [Validators.required]],

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
    private router: Router,
    private snack: MatSnackBar
  ) {}
  private toast(msg: string) {
    // ถ้าไม่ได้ใช้ Material ให้ใช้ alert(msg) แทน
    this.snack.open(msg, 'ปิด', { duration: 3000 });
  }

  // ---------------------- Getters ----------------------
  get fullName(): AbstractControl | null {
    return this.form.get('fullName');
  }
  get email(): AbstractControl | null {
    return this.form.get('email');
  }
  get password(): AbstractControl | null {
    return this.form.get('password');
  }
  get confirmPassword(): AbstractControl | null {
    return this.form.get('confirmPassword');
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
  get isZipReadOnly(): boolean {
    return false;
  }

  // ---------------------- Lifecycle ----------------------

  ngOnInit(): void {
    this.loadThaiData();
    this.password?.valueChanges.subscribe(() => this.evaluatePassword());
    this.confirmPassword?.valueChanges.subscribe(() => this.evaluatePassword());
    this.evaluatePassword();
  }

  // ============== Password rules & meter ==================
  private evaluatePassword(): void {
    const pw = (this.password?.value || '').toString();
    const cf = (this.confirmPassword?.value || '').toString();

    this.rules.minLen = pw.length >= 14 && /[A-Za-z]/.test(pw);
    this.rules.hasDigit = /\d/.test(pw);
    this.rules.hasSpecial = /[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]/.test(pw);
    this.rules.match = !!pw && pw === cf;

    // คิดคะแนน 0..1
    let score = 0;
    if (this.rules.minLen) score += 0.4;
    if (this.rules.hasDigit) score += 0.3;
    if (this.rules.hasSpecial) score += 0.3;
    this.passwordScore = Math.min(1, score);

    // จัดระดับสีให้ตรงกับ CSS (.idle / .weak / .medium / .strong)
    if (!pw) {
      this.strengthClass = 'idle';
    } else if (this.passwordScore < 0.5) {
      this.strengthClass = 'weak';
    } else if (this.passwordScore < 0.9) {
      this.strengthClass = 'medium';
    } else {
      this.strengthClass = 'strong';
    }
  }

  // ================= ไทย: จังหวัด/อำเภอ/ตำบล =================
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

  // ======================== Step control ========================
  onContinue() {
    const ok =
      this.fullName?.valid &&
      this.email?.valid &&
      this.password?.valid &&
      this.confirmPassword?.valid &&
      this.rules.match;

    if (!ok) {
      this.fullName?.markAsTouched();
      this.email?.markAsTouched();
      this.password?.markAsTouched();
      this.confirmPassword?.markAsTouched();
      return;
    }
    this.step = 2;
  }
  onBack() {
    this.step = 1;
  }

  // ============= Province → District → Subdistrict ============
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
  fixProvinceDisplay() {}
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
  fixDistrictDisplay() {}
  onDistrictSelected(d: District) {
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
  fixSubdistrictDisplay() {}
  onSubdistrictSelected(s: Subdistrict) {
    this.addressTh.patchValue(
      { subdistrict: s, zipCode: s.zip },
      { emitEvent: false }
    );
    this.zipMessage = '';
  }

  // ============================ ZIP ============================
  onZipFocus(): void {
    this.zipMessage = '';
  }
  onZipEnter(): void {
    const raw = (this.addressTh.get('zipCode')?.value || '').toString().trim();
    this.addressTh.patchValue({ subdistrict: null }, { emitEvent: false });
    this.isSubdistrictLocked = true;
    this.zipMessage = '';
    if (!/^\d{5}$/.test(raw)) {
      this.notifyZipNotFound(raw);
      return;
    }

    const subs = this.subdistricts.filter((s) => s.zip === raw);
    if (!subs.length) {
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

    const districtCodes = Array.from(new Set(subs.map((s) => s.parent_code)));
    const ds = districtCodes
      .map((c) => this.districtByCode.get(c))
      .filter(Boolean) as District[];
    const provinceCodes = Array.from(new Set(ds.map((d) => d.parent_code)));
    const ps = provinceCodes
      .map((c) => this.provinceByCode.get(c))
      .filter(Boolean) as Province[];

    if (ps.length === 1) {
      this.addressTh.patchValue({ province: ps[0] }, { emitEvent: false });
      this.isDistrictLocked = false;
      const dsInProv = (this.districtsByProvince.get(ps[0].code) || []).slice();
      this.filteredDistricts = dsInProv.sort((a, b) =>
        a.name_th.localeCompare(b.name_th, 'th')
      );
    } else {
      this.addressTh.patchValue({ province: null }, { emitEvent: false });
      this.filteredProvinces = ps
        .slice()
        .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
      this.isDistrictLocked = true;
      this.isSubdistrictLocked = true;
    }

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

    if (ps.length === 1 && ds.length === 1) {
      const inOneDist = (
        this.subdistrictsByDistrict.get(ds[0].code) || []
      ).filter((s) => s.zip === raw);
      if (inOneDist.length === 1) {
        this.addressTh.patchValue(
          { subdistrict: inOneDist[0] },
          { emitEvent: false }
        );
      } else {
        this.filteredSubdistricts = inOneDist.sort((a, b) =>
          a.name_th.localeCompare(b.name_th, 'th')
        );
        this.isSubdistrictLocked = false;
      }
    }

    this.addressTh.patchValue({ zipCode: raw }, { emitEvent: false });
  }

  private notifyZipNotFound(zip: string) {
    this.zipMessage = zip
      ? `ไม่พบรหัสไปรษณีย์ ${zip}`
      : 'กรุณากรอกรหัสไปรษณีย์ 5 หลัก';
    alert(this.zipMessage);
  }

  // ====================== Helpers (digits/Thai) ======================
  private isCtrlKey(e: KeyboardEvent) {
    const k = e.key;
    return (
      [
        'Backspace',
        'Delete',
        'Tab',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ].includes(k) ||
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

  // ========================== Logo upload ==========================
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

  // ============================ Submit ============================
  onSubmit() {
    this.step2Submitted = true;
    if (this.form.invalid || this.isSubmitting) return;

    const fv = this.form.getRawValue();
    const userName = (fv.email || '').split('@')[0];
    if (!userName) {
      alert('อีเมลไม่ถูกต้อง ไม่สามารถสร้างชื่อผู้ใช้ได้');
      return;
    }
    if (fv.password !== fv.confirmPassword) {
      alert('รหัสผ่านไม่ตรงกัน');
      return;
    }

    this.isSubmitting = true;
    this.formServerError = '';

    const c = fv.company;
    const th = c.addressTh || {};
    const en = c.addressEn || {};
    const norm = (v: any) =>
      v && typeof v === 'object' ? v.name_th ?? '' : v ?? '';

    const payload = {
      // ฟิลด์ตามหน้าบ้าน (หลังบ้าน map เป็น full_name)
      fullName: fv.fullName,
      email: fv.email,
      userName: userName,
      password: fv.password,

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
      next: (res) => {
        const generatedUser = res.userName;
        sessionStorage.setItem('register.username', generatedUser);
        this.router.navigate(['/register-success'], {
          state: { username: generatedUser },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;

        if (err.status === 409) {
          // backend จะส่ง code ไว้ใน message / error / code (เผื่อกรณีต่าง ๆ)
          const code =
            err.error?.message || err.error?.error || err.error?.code;
          let msg = 'ข้อมูลซ้ำ';

          switch (code) {
            case 'USERNAME_TAKEN':
              msg = 'ชื่อผู้ใช้ถูกใช้แล้ว';
              break;
            case 'EMAIL_TAKEN':
              msg = 'อีเมลถูกใช้แล้ว';
              break;
            case 'TENANT_TAX_ID_TAKEN':
              msg = 'เลขประจำตัวผู้เสียภาษีซ้ำ';
              break;
          }

          this.formServerError = msg; // แสดงใต้ฟอร์ม
          // หรือ alert(msg);                // ถ้าอยากเด้งแจ้งเตือน
          return;
        }

        if (err.status === 400) {
          this.formServerError = 'กรอกข้อมูลไม่ถูกต้อง';
          return;
        }

        // อื่น ๆ
        this.formServerError = err?.error?.message || 'เกิดข้อผิดพลาดในระบบ';
        console.error('Registration error:', err);
      },
    });
  }
}
