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
import { thaiTaxIdValidator } from '../../../shared/validators/thai-taxid.validator';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

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
  selectedLogoFile: File | null = null;

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
  subdistrictByCode = new Map<string, Subdistrict>();
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
      sellerNameTh: ['', [Validators.required]],
      sellerNameEn: [''],
      branchCode: [
        '00000',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(5),
          Validators.pattern(/^\d+$/),
        ],
      ],
      branchNameTh: ['สำนักงานใหญ่', [Validators.required]],
      branchNameEn: ['Head office'],
      sellerTaxId: [
        '',
        [
          Validators.required,
          Validators.minLength(13),
          Validators.maxLength(13),
          Validators.pattern(/^\d+$/),
          thaiTaxIdValidator,
        ],
      ],
      sellerPhoneNumber: ['', [Validators.pattern(/^\d*$/)]],
      addressTh: this.fb.group({
        buildingNo: ['', [Validators.required]],
        addressDetailTh: [''],
        provinceId: [null as string | null, Validators.required],
        districtId: [null as string | null, Validators.required],
        subdistrictId: [null as string | null, Validators.required],
        postalCode: [
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

    this.rules.minLen = pw.length >= 8 && /[A-Za-z]/.test(pw);
    this.rules.hasDigit = /\d/.test(pw);
    this.rules.hasSpecial = /[!@.#$*&\-_]/.test(pw);
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
        this.subdistrictByCode.clear(); // Clear the map before populating
        for (const s of this.subdistricts) {
          const arr = this.subdistrictsByDistrict.get(s.parent_code) || [];
          arr.push(s);
          this.subdistrictsByDistrict.set(s.parent_code, arr);
          this.subdistrictByCode.set(s.code, s); // Populate the new map
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
  fixProvinceDisplay() {
    const provinceControl = this.addressTh.get('provinceId');
    const currentValue = provinceControl?.value;

    // Case 1: Value is already a valid code (after selection from autocomplete)
    if (currentValue && typeof currentValue === 'string' && this.provinceByCode.has(currentValue)) {
      // The value is a valid code, no need to do anything, just ensure dependents are set up
      this.isDistrictLocked = false;
      const ds = (this.districtsByProvince.get(currentValue) || []).slice();
      ds.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
      this.filteredDistricts = ds;
      this.zipMessage = '';
      return; // No further processing needed
    }

    // Case 2: User typed a partial/full name or an invalid code
    if (currentValue && typeof currentValue === 'string') {
      const matchedProvince = this.provinces.find(p => p.name_th === currentValue);
      if (matchedProvince) {
        provinceControl.patchValue(matchedProvince.code, { emitEvent: false });
        this.isDistrictLocked = false;
        const ds = (this.districtsByProvince.get(matchedProvince.code) || []).slice();
        ds.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
        this.filteredDistricts = ds;
      } else {
        // Clear invalid input and reset dependent fields
        provinceControl.patchValue(null, { emitEvent: false });
        this.addressTh.patchValue(
          { districtId: null, subdistrictId: null, postalCode: '' },
          { emitEvent: false }
        );
        this.isDistrictLocked = true;
        this.isSubdistrictLocked = true;
        this.filteredDistricts = [];
        this.filteredSubdistricts = [];
      }
    } else if (currentValue === null) {
      // If province was cleared or never set, lock districts and subdistricts
      this.addressTh.patchValue(
        { districtId: null, subdistrictId: null, postalCode: '' },
        { emitEvent: false }
      );
      this.isDistrictLocked = true;
      this.isSubdistrictLocked = true;
      this.filteredDistricts = [];
      this.filteredSubdistricts = [];
    }
    this.zipMessage = '';
  }
  displayProvince(v: Province | string | null): string {
    if (v && typeof v === 'object') return v.name_th;
    if (v && typeof v === 'string')
      return this.provinceByCode.get(v)?.name_th ?? v;
    return '';
  }
  displayDistrict(v: District | string | null): string {
    if (v && typeof v === 'object') return v.name_th;
    if (v && typeof v === 'string')
      return this.districtByCode.get(v)?.name_th ?? v;
    return '';
  }
  displaySubdistrict(v: Subdistrict | string | null): string {
    if (v && typeof v === 'object') return v.name_th;
    if (v && typeof v === 'string')
      return this.subdistrictByCode.get(v)?.name_th ?? v;
    return '';
  }

  onProvinceSelected(event: MatAutocompleteSelectedEvent) {
    if (!event.option || !event.option.value) {
      return;
    }
    const p = event.option.value as Province;
    this.addressTh.patchValue(
      {
        provinceId: p.code,
        districtId: null,
        subdistrictId: null,
        postalCode: '',
      },
      { emitEvent: false }
    );
    const ds = (this.districtsByProvince.get(p.code) || []).slice();
    ds.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
    this.filteredDistricts = ds;
    this.filteredSubdistricts = [];
    this.isDistrictLocked = false;
    this.isSubdistrictLocked = true;
    this.zipMessage = '';
    console.log('onProvinceSelected: isDistrictLocked =', this.isDistrictLocked);
    console.log('onProvinceSelected: filteredDistricts =', this.filteredDistricts);
  }

  onDistrictSelected(event: MatAutocompleteSelectedEvent) {
    const d = event.option.value as District;
    this.addressTh.patchValue(
      { districtId: d.code, subdistrictId: null, postalCode: '' },
      { emitEvent: false }
    );
    const subs = (this.subdistrictsByDistrict.get(d.code) || []).slice();
    subs.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
    this.filteredSubdistricts = subs;
    this.isSubdistrictLocked = false;
    this.zipMessage = '';
    console.log('onDistrictSelected: isSubdistrictLocked =', this.isSubdistrictLocked);
    console.log('onDistrictSelected: filteredSubdistricts =', this.filteredSubdistricts);
  }

  onSubdistrictSelected(event: MatAutocompleteSelectedEvent) {
    const s = event.option.value as Subdistrict;
    this.addressTh.patchValue(
      { subdistrictId: s.code, postalCode: s.zip },
      { emitEvent: false }
    );
    this.zipMessage = '';
    console.log('onSubdistrictSelected: zip =', s.zip);
  }

  onDistrictFocus(trigger?: any) {
    const p = this.addressTh.get('provinceId')?.value as string | null;
    const base = p ? this.districtsByProvince.get(p) || [] : [];
    this.filteredDistricts = base
      .slice()
      .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
    if (trigger?.openPanel) trigger.openPanel();
    console.log('onDistrictFocus: isDistrictLocked =', this.isDistrictLocked);
    console.log('onDistrictFocus: filteredDistricts count =', this.filteredDistricts.length);
  }
  onDistrictType(q: string) {
    const p = this.addressTh.get('provinceId')?.value as string | null;
    const base = p ? this.districtsByProvince.get(p) || [] : [];
    const v = (q || '').trim().toLowerCase();
    this.filteredDistricts = !v
      ? base.slice().sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'))
      : base
          .filter((d) => d.name_th.toLowerCase().includes(v))
          .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
  }
  fixDistrictDisplay() {
    const districtControl = this.addressTh.get('districtId');
    const postalCodeControl = this.addressTh.get('postalCode');
    const currentValue = districtControl?.value;
    const provinceCode = this.addressTh.get('provinceId')?.value;

    if (!provinceCode) {
      districtControl?.patchValue(null, { emitEvent: false });
      this.addressTh.patchValue(
        { subdistrictId: null, postalCode: '' },
        { emitEvent: false }
      );
      this.isSubdistrictLocked = true;
      this.filteredSubdistricts = [];
      console.log('fixDistrictDisplay: No provinceCode, isSubdistrictLocked =', this.isSubdistrictLocked);
      this.zipMessage = '';
      return;
    }

    // Case 1: Value is already a valid code (after selection from autocomplete)
    if (currentValue && typeof currentValue === 'string' && this.districtByCode.has(currentValue)) {
      // The value is a valid code, no need to do anything, just ensure dependents are set up
      this.isSubdistrictLocked = false;
      const subs = (this.subdistrictsByDistrict.get(currentValue) || []).slice();
      subs.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
      this.filteredSubdistricts = subs;
      this.zipMessage = '';
      return; // No further processing needed
    }

    // Case 2: User typed a partial/full name or an invalid code
    if (currentValue && typeof currentValue === 'string') {
      const baseDistricts = this.districtsByProvince.get(provinceCode) || [];
      const matchedDistrict = baseDistricts.find(d => d.name_th === currentValue);

      if (matchedDistrict) {
        districtControl.patchValue(matchedDistrict.code, { emitEvent: false });
        this.isSubdistrictLocked = false;
        const subs = (this.subdistrictsByDistrict.get(matchedDistrict.code) || []).slice();
        subs.sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
        this.filteredSubdistricts = subs;
        console.log('fixDistrictDisplay: Matched district, isSubdistrictLocked =', this.isSubdistrictLocked);
        console.log('fixDistrictDisplay: filteredSubdistricts =', this.filteredSubdistricts);
      } else {
        // Clear invalid input and reset dependent fields
        districtControl.patchValue(null, { emitEvent: false });
        this.addressTh.patchValue(
          { subdistrictId: null, postalCode: '' },
          { emitEvent: false }
        );
        this.isSubdistrictLocked = true;
        this.filteredSubdistricts = [];
        console.log('fixDistrictDisplay: No matched district, isSubdistrictLocked =', this.isSubdistrictLocked);
      }
    } else if (currentValue === null) {
      // If district was cleared or never set, lock subdistricts
      this.addressTh.patchValue(
        { subdistrictId: null, postalCode: '' },
        { emitEvent: false }
      );
      this.isSubdistrictLocked = true;
      this.filteredSubdistricts = [];
      console.log('fixDistrictDisplay: districtControl is null, isSubdistrictLocked =', this.isSubdistrictLocked);
    }
    this.zipMessage = '';
  }

  onSubdistrictFocus(trigger?: any) {
    const d = this.addressTh.get('districtId')?.value as string | null;
    const base = d ? this.subdistrictsByDistrict.get(d) || [] : [];
    this.filteredSubdistricts = base
      .slice()
      .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
    if (trigger?.openPanel) trigger.openPanel();
    console.log('onSubdistrictFocus: isSubdistrictLocked =', this.isSubdistrictLocked);
    console.log('onSubdistrictFocus: filteredSubdistricts count =', this.filteredSubdistricts.length);
  }
  onSubdistrictType(q: string) {
    const d = this.addressTh.get('districtId')?.value as string | null;
    const base = d ? this.subdistrictsByDistrict.get(d) || [] : [];
    const v = (q || '').trim().toLowerCase();
    this.filteredSubdistricts = !v
      ? base.slice().sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'))
      : base
          .filter((s) => s.name_th.toLowerCase().includes(v))
          .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
  }
  fixSubdistrictDisplay() {
    const subdistrictControl = this.addressTh.get('subdistrictId');
    const postalCodeControl = this.addressTh.get('postalCode');
    const currentValue = subdistrictControl?.value;
    const districtCode = this.addressTh.get('districtId')?.value;

    if (!districtCode) {
      // If no district is selected, subdistrict should be locked and cleared
      subdistrictControl?.patchValue(null, { emitEvent: false });
      postalCodeControl?.patchValue('', { emitEvent: false });
      this.zipMessage = ''; // Ensure zipMessage is cleared
      return;
    }

    // Case 1: Value is already a valid code (after selection from autocomplete)
    if (currentValue && typeof currentValue === 'string' && this.subdistrictByCode.has(currentValue)) {
      // The value is a valid code, ensure postal code is correctly set
      const matchedSubdistrict = this.subdistrictByCode.get(currentValue);
      if (matchedSubdistrict) {
        postalCodeControl?.patchValue(matchedSubdistrict.zip, { emitEvent: false });
      } else {
        // Fallback: If code is somehow in control but not in map, clear it.
        subdistrictControl.patchValue(null, { emitEvent: false });
        postalCodeControl?.patchValue('', { emitEvent: false });
      }
      this.zipMessage = '';
      return; // No further processing needed
    }

    // Case 2: User typed a partial/full name or an invalid code
    if (currentValue && typeof currentValue === 'string') {
      const baseSubdistricts = this.subdistrictsByDistrict.get(districtCode) || [];
      const matchedSubdistrict = baseSubdistricts.find(s => s.name_th === currentValue);

      if (matchedSubdistrict) {
        subdistrictControl.patchValue(matchedSubdistrict.code, { emitEvent: false });
        postalCodeControl?.patchValue(matchedSubdistrict.zip, { emitEvent: false });
      } else {
        // Clear invalid input
        subdistrictControl.patchValue(null, { emitEvent: false });
        postalCodeControl?.patchValue('', { emitEvent: false });
      }
    } else if (currentValue === null) {
      // If subdistrict was cleared or never set
      postalCodeControl?.patchValue('', { emitEvent: false });
    }
    this.zipMessage = '';
  }

  // ============================ ZIP ============================
  onZipFocus(): void {
    this.zipMessage = '';
  }
  onZipEnter(): void {
    const raw = (this.addressTh.get('postalCode')?.value || '')
      .toString()
      .trim();
    this.addressTh.patchValue({ subdistrictId: null }, { emitEvent: false });
    this.isSubdistrictLocked = true;
    this.zipMessage = '';
    if (!/^\d{5}$/.test(raw)) {
      this.notifyZipNotFound(raw);
      return;
    }

    const subs = this.subdistricts.filter((s) => s.zip === raw);
    if (!subs.length) {
      this.addressTh.patchValue(
        {
          provinceId: null,
          districtId: null,
          subdistrictId: null,
          postalCode: '',
        },
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
      this.addressTh.patchValue(
        { provinceId: ps[0].code },
        { emitEvent: false }
      );
      this.isDistrictLocked = false;
      const dsInProv = (this.districtsByProvince.get(ps[0].code) || []).slice();
      this.filteredDistricts = dsInProv.sort((a, b) =>
        a.name_th.localeCompare(b.name_th, 'th')
      );
    } else {
      this.addressTh.patchValue({ provinceId: null }, { emitEvent: false });
      this.filteredProvinces = ps
        .slice()
        .sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));
      this.isDistrictLocked = true;
      this.isSubdistrictLocked = true;
    }

    if (ps.length === 1 && ds.length === 1) {
      this.addressTh.patchValue(
        { districtId: ds[0].code },
        { emitEvent: false }
      );
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
      this.addressTh.patchValue({ districtId: null }, { emitEvent: false });
      this.isDistrictLocked = false;
      this.isSubdistrictLocked = true;
    }

    if (ps.length === 1 && ds.length === 1) {
      const inOneDist = (
        this.subdistrictsByDistrict.get(ds[0].code) || []
      ).filter((s) => s.zip === raw);
      if (inOneDist.length === 1) {
        this.addressTh.patchValue(
          { subdistrictId: inOneDist[0].code },
          { emitEvent: false }
        );
      } else {
        this.filteredSubdistricts = inOneDist.sort((a, b) =>
          a.name_th.localeCompare(b.name_th, 'th')
        );
        this.isSubdistrictLocked = false;
      }
    }

    this.addressTh.patchValue({ postalCode: raw }, { emitEvent: false });
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

  get sellerTaxIdCtrl(): AbstractControl | null {
    return this.company.get('sellerTaxId');
  }

  getSellerTaxIdError(): string {
    const c = this.sellerTaxIdCtrl;
    if (!c) return '';

    if (!(c.touched || this.step2Submitted)) return ''; // ยังไม่เคยแตะ/ยังไม่พยายาม submit

    const errors = c.errors;
    if (!errors) return '';

    if (errors['required']) {
      return 'กรุณากรอกเลขประจำตัวผู้เสียภาษีอากร';
    }
    if (errors['minlength'] || errors['maxlength']) {
      return 'เลขประจำตัวผู้เสียภาษีต้องมีความยาว 13 หลัก';
    }
    if (errors['pattern']) {
      return 'กรอกได้เฉพาะตัวเลข 0–9 เท่านั้น';
    }
    if (errors['thaiTaxId']) {
      // error จาก thaiTaxIdValidator
      return 'เลขประจำตัวผู้เสียภาษีไม่ถูกต้องตามรูปแบบที่กำหนด';
    }

    return 'ข้อมูลไม่ถูกต้อง';
  }

  // ========================== Logo upload ==========================
  onLogoSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      this.selectedLogoFile = null;
      this.logoPreview = null;
      return;
    }
    this.selectedLogoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  // ============================ Submit ============================
  onSubmit() {
    this.step2Submitted = true; // Keep this for UI state
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true; // Set submitting state
    this.formServerError = ''; // Clear previous errors

    const fv = this.form.getRawValue(); // Get all form values

    // Derive userName from email as per existing logic
    const userName = (fv.email || '').split('@')[0];
    if (!userName) {
      alert('อีเมลไม่ถูกต้อง ไม่สามารถสร้างชื่อผู้ใช้ได้');
      this.isSubmitting = false;
      return;
    }
    if (fv.password !== fv.confirmPassword) {
      alert('รหัสผ่านไม่ตรงกัน');
      this.isSubmitting = false;
      return;
    }

    // --- map form -> DTO ตรงชื่อคีย์หลังบ้าน ---
    const dto = {
      userName: userName, // Use derived userName
      password: fv.password,
      confirmPassword: fv.confirmPassword,
      email: fv.email,
      fullName: fv.fullName,

      sellerNameTh: fv.company.sellerNameTh || '',
      sellerNameEn: fv.company.sellerNameEn || '',
      sellerTaxId: fv.company.sellerTaxId,
      sellerPhoneNumber: fv.company.sellerPhoneNumber || '',

      branchCode: fv.company.branchCode, // ต้อง 5 หลัก เช่น "00000"
      branchNameTh: fv.company.branchNameTh || '',
      branchNameEn: fv.company.branchNameEn || '',

      buildingNo: fv.company.addressTh.buildingNo || '',
      addressDetailTh: fv.company.addressTh.addressDetailTh || '',
      addressDetailEn: fv.company.addressEn.addressDetailEn || '', // From addressEn

      provinceId: String(fv.company.addressTh.provinceId),
      districtId: String(fv.company.addressTh.districtId),
      subdistrictId: String(fv.company.addressTh.subdistrictId),
      zipCode: fv.company.addressTh.postalCode, // Use postalCode from addressTh

      acceptTos: !!fv.company.acceptTos,
    };

    // --- สร้าง FormData ตามสัญญา API ---
    const fd = new FormData();
    fd.append('registerDto', JSON.stringify(dto)); // <-- ต้องเป็นชื่อ registerDto แบบนี้

    // ถ้ามีโลโก้ที่ผู้ใช้เลือก (File หรือ Blob)
    if (this.selectedLogoFile) {
      // Use this.selectedLogoFile
      // ชื่อ field ต้องเป็น 'logo' เท่านั้นสำหรับ endpoint สมัคร
      const fileName = this.selectedLogoFile.name || 'logo.webp';
      fd.append('logo', this.selectedLogoFile, fileName);
    }

    this.auth.register(fd).subscribe({
      next: (res) => {
        const generatedUser = res.user.username;
        sessionStorage.setItem('register.username', generatedUser);
        this.router.navigate(['/register-success'], {
          state: { username: generatedUser },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting = false;

        if (err.status === 409) {
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
            case 'BRANCH_CODE_TAKEN': // Added based on common backend errors for branchCode
              msg = 'รหัสสาขาซ้ำ';
              break;
          }

          this.formServerError = msg;
          return;
        }

        if (err.status === 400) {
          this.formServerError = 'กรอกข้อมูลไม่ถูกต้อง';
          return;
        }

        this.formServerError = err?.error?.message || 'เกิดข้อผิดพลาดในระบบ';
        console.error('Registration error:', err);
      },
    });
  }
}
