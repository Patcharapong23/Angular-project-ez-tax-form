import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-first-login',
  templateUrl: './first-login.component.html',
  styleUrls: ['./first-login.component.css']
})
export class FirstLoginComponent {
  newPassword = '';
  confirmPassword = '';
  hideNewPass = true;
  hideConfirmPass = true;
  isSubmitting = false;

  // Password Strength Logic
  rules = {
    minLen: false,
    hasDigit: false,
    hasSpecial: false,
    hasUpper: false,
    hasLower: false,
    match: false,
  };
  passwordScore = 0;
  strengthClass: 'idle' | 'weak' | 'medium' | 'strong' = 'idle';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    // Initial evaluation
    this.evaluatePassword();
  }

  onPasswordInput() {
    this.evaluatePassword();
  }

  private evaluatePassword(): void {
    const pw = this.newPassword || '';
    const cf = this.confirmPassword || '';

    this.rules.minLen = pw.length >= 8;
    this.rules.hasDigit = /\d/.test(pw);
    this.rules.hasSpecial = /[!@.#$*&\-_]/.test(pw);
    this.rules.hasUpper = /[A-Z]/.test(pw);
    this.rules.hasLower = /[a-z]/.test(pw);
    this.rules.match = !!pw && pw === cf;

    // Score 0..1
    let score = 0;
    if (this.rules.minLen) score += 0.2;
    if (this.rules.hasDigit) score += 0.2;
    if (this.rules.hasSpecial) score += 0.2;
    if (this.rules.hasUpper) score += 0.2;
    if (this.rules.hasLower) score += 0.2;
    this.passwordScore = Math.min(1, score);

    if (!pw) {
      this.strengthClass = 'idle';
    } else if (this.passwordScore < 0.4) {
      this.strengthClass = 'weak';
    } else if (this.passwordScore < 0.8) {
      this.strengthClass = 'medium';
    } else {
      this.strengthClass = 'strong';
    }
  }

  onSubmit() {
    if (this.newPassword !== this.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'รหัสผ่านไม่ตรงกัน',
        text: 'กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่านให้ตรงกัน',
        confirmButtonColor: '#d33'
      });
      return;
    }

    if (this.newPassword.length < 6) {
        Swal.fire({
          icon: 'error',
          title: 'รหัสผ่านสั้นเกินไป',
          text: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
          confirmButtonColor: '#d33'
        });
        return;
      }

    this.isSubmitting = true;
    this.auth.changePassword(this.newPassword).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'เปลี่ยนรหัสผ่านสำเร็จ',
          text: 'กรุณาเข้าสู่ระบบอีกครั้งด้วยรหัสผ่านใหม่',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#1dfff1'
        }).then(() => {
          this.auth.logoutToLogin();
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: 'เปลี่ยนรหัสผ่านไม่สำเร็จ',
          text: err.error?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน',
          confirmButtonColor: '#d33'
        });
      }
    });
  }
}
