import { Component } from '@angular/core';
import {
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  FormGroup,
} from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  hidePass = true;
  hideConfirm = true;

  constructor(private fb: FormBuilder) {}

  // ไม่ใช้ updateOn: 'blur' เพื่อให้ปุ่มกดครั้งเดียวติด
  form: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    passwordGroup: this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator.bind(this) }
    ),
    acceptTos: [false, Validators.requiredTrue],
  });

  // getters
  get fullName() {
    return this.form.get('fullName');
  }
  get email() {
    return this.form.get('email');
  }
  get passwordGroup() {
    return this.form.get('passwordGroup');
  }
  get password() {
    return this.form.get('passwordGroup.password');
  }
  get confirmPassword() {
    return this.form.get('passwordGroup.confirmPassword');
  }

  // เช็ครหัสผ่านตรงกัน (method + bind(this))
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const p = group.get('password')?.value;
    const c = group.get('confirmPassword')?.value;
    if (p == null || c == null) return null;
    return p === c ? null : { passwordsNotMatch: true };
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    console.log('Register payload:', this.form.value);
    alert('สมัครสมาชิกสำเร็จ');
  }
  // บนคลาส RegisterComponent
  rules = { minLen: false, hasDigit: false, hasSpecial: false };
  passwordScore = 0; // 0..1 สำหรับแถบเขียว

  ngOnInit(): void {
    // ถ้ามี formReady ก็ทำหลังตั้งค่านั้นเสร็จ; ไม่มีก็ subscribe ตรงนี้ได้เลย
    const pwdCtrl = this.password as AbstractControl | null;
    pwdCtrl?.valueChanges.subscribe((value: string) => {
      const v = value || '';
      this.rules.minLen = v.length >= 14;
      this.rules.hasDigit = /\d/.test(v);
      this.rules.hasSpecial = /[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(v);

      const passed = Object.values(this.rules).filter(Boolean).length;
      this.passwordScore = passed / 3; // 0, .33, .66, 1
    });
  }
}
