import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormGroup,
} from '@angular/forms';
import {
  ThaiAddressService,
  TAItem,
} from '../../../shared/thai-address.service';
import { AuthService, RegisterResponse } from '../../../shared/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent implements OnInit {
  step = 1;

  // เหมือนหน้า Login
  isSubmitting = false; // ป้องกันกดซ้ำ / สลับข้อความปุ่ม
  step1Submitted = false; // ให้โชว์ error step 1 เมื่อกด “ดำเนินการต่อ”
  step2Submitted = false; // ให้โชว์ error step 2 เมื่อกด “ลงทะเบียน”
  formServerError = ''; // ข้อผิดพลาดจาก backend (ถ้ามี)

  hidePass = true;
  hideConfirm = true;
  // กำหนดความยาวสูงสุดของ email, fullName, password
  readonly emailMaxLen = 254;
  readonly fullNameMaxLen = 100;
  readonly passwordMinLen = 14;
  readonly passwordMaxLen = 128;

  provinces: TAItem[] = [];
  districts: TAItem[] = [];
  subdistricts: TAItem[] = [];

  // เก็บ preview โลโก้
  logoPreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private addr: ThaiAddressService,
    private auth: AuthService
  ) {}

  form: FormGroup = this.fb.group({
    // ===== STEP 1 =====
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    passwordGroup: this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: RegisterComponent.passwordMatchValidator }
    ),

    // ===== STEP 2 =====
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
        district: ['', Validators.required],
        subdistrict: ['', Validators.required],
        postalCode: [{ value: '', disabled: false }, Validators.required],
      }),
      addressEn: this.fb.group({
        line1: ['', [Validators.maxLength(254)]],
      }),
      acceptTos: [false, Validators.requiredTrue],
    }),
  });

  // ====== getters ======
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

  // แถบเช็ครหัสผ่าน
  rules: {
    minLen: boolean;
    hasDigit: boolean;
    hasSpecial: boolean;
    match: boolean;
  } = {
    minLen: false,
    hasDigit: false,
    hasSpecial: false,
    match: false,
  };
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

  ngOnInit(): void {
    this.company.disable({ emitEvent: false });

    this.addr
      .getProvinces()
      .subscribe((list: TAItem[]) => (this.provinces = list));

    // subscribe รหัสผ่าน
    this.password?.valueChanges.subscribe(() => this.updatePasswordRules());
    // subscribe ยืนยันรหัสผ่าน
    this.confirmPassword?.valueChanges.subscribe(() =>
      this.updatePasswordRules()
    );
  }
  asciiEmailValidator = (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '') as string;
    if (!v) return null;
    // ถ้ามีตัวไทย หรือเกิน ASCII => error
    if (/[\u0E00-\u0E7F]/.test(v) || /[^\x00-\x7F]/.test(v)) {
      return { nonAscii: true };
    }
    return null;
  };
  // กัน “การพิมพ์” ภาษาไทยตั้งแต่ keydown (ถ้าอยากบล็อคไว้เลย)
  blockThai(e: KeyboardEvent) {
    if (/[\u0E00-\u0E7F]/.test(e.key)) e.preventDefault();
  }
  updatePasswordRules() {
    const p = this.password?.value || '';
    const c = this.confirmPassword?.value || '';
    this.rules.minLen = p.length >= 14;
    this.rules.hasDigit = /\d/.test(p);
    this.rules.hasSpecial = /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(p);
    this.rules.match = !!p && !!c && p === c;
  }

  // ตรวจรหัสผ่านตรงกัน
  static passwordMatchValidator(
    group: AbstractControl
  ): ValidationErrors | null {
    const p = group.get('password')?.value;
    const c = group.get('confirmPassword')?.value;
    if (!p || !c) return null;
    return p === c ? null : { passwordsNotMatch: true };
  }

  // ====== STEP CONTROL ======
  onContinue(): void {
    // ให้แสดง error ถ้าช่อง step 1 ไม่ครบ
    this.step1Submitted = true;
    ['fullName', 'email', 'passwordGroup'].forEach((n) =>
      this.form.get(n)?.markAllAsTouched()
    );

    if (
      ['fullName', 'email', 'passwordGroup'].some(
        (n) => this.form.get(n)?.invalid
      )
    ) {
      return;
    }

    // ผ่าน → เปิดสเต็ป 2
    this.company.enable({ emitEvent: false });
    this.step = 2;
    // รีเซ็ตสถานะ server error
    this.formServerError = '';
  }

  onBack(): void {
    this.step = 1;
    this.formServerError = '';
  }

  // ====== Upload Logo ======
  onLogoSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // จำกัด 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('ไฟล์มีขนาดเกิน 10MB');
      input.value = '';
      return;
    }
    this.company.get('logo')?.setValue(file);

    // preview
    const reader = new FileReader();
    reader.onload = () => (this.logoPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  // ====== Thai address cascade ======
  onProvinceChange(code: string) {
    this.districts = [];
    this.subdistricts = [];
    this.addressTh.patchValue({
      district: '',
      subdistrict: '',
      postalCode: '',
    });
    if (!code) return;
  }

  onDistrictChange(code: string) {
    this.subdistricts = [];
    this.addressTh.patchValue({ subdistrict: '', postalCode: '' });
    if (!code) return;
    this.addr
      .getSubdistricts(code)
      .subscribe((list: TAItem[]) => (this.subdistricts = list));
  }

  onSubdistrictChange(code: string) {
    const found = this.subdistricts.find((s) => s.code === code);
    this.addressTh.get('postalCode')?.setValue(found?.zip ?? '');
  }

  // ====== Submit ======
  onSubmit(): void {
    this.step2Submitted = true;
    this.company.markAllAsTouched();
    const payload = this.form.value;
    if (this.form.invalid) return;
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.formServerError = '';
    const formData = new FormData();
    formData.append('fullName', payload.fullName);
    formData.append('email', payload.email);
    formData.append('password', payload.passwordGroup.password);
    formData.append('companyName', payload.company.companyName);
    if (payload.company.logo) {
      formData.append('logo', payload.company.logo);
    }
    this.auth.register(formData).subscribe({
      next: (res: RegisterResponse) => {
        // ✅ ใส่ type ให้ res
        this.isSubmitting = false;
        alert('สมัครสมาชิกสำเร็จ');
      },
      error: (err: unknown) => {
        // ✅ ใส่ type ให้ err
        this.isSubmitting = false;
        const msg =
          (err as any)?.error?.message ||
          (err as any)?.message ||
          'เกิดข้อผิดพลาด';
        this.formServerError = msg;
        alert('เกิดข้อผิดพลาด: ' + msg);
      },
    });
    // TODO: call API จริง
    setTimeout(() => {
      this.isSubmitting = false;
      alert('ลงทะเบียนสำเร็จ');
      // this.router.navigateByUrl('/something');
    }, 800);
  }
}
