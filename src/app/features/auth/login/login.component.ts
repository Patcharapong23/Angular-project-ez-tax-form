import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../../../shared/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  userName = ''; // ✅ ใช้ userName (ไม่ใช่ username)
  password = '';
  hidePass = true; // ✅ ใช้กับปุ่มเปิด/ปิดตา
  isSubmitting = false;
  errorMsg = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.userName || !this.password || this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMsg = '';

    this.auth.login(this.userName, this.password).subscribe({
      next: () => {
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMsg = err?.error?.message || 'เข้าสู่ระบบไม่สำเร็จ';
        console.error('Login error:', err);
      },
    });
  }
}
