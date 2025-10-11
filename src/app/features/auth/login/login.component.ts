import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../shared/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  // --- (1) เปลี่ยนจาก email เป็น username ---
  username = '';
  password = '';
  errorMsg = '';

  // --- (2) เพิ่มตัวแปรสำหรับซ่อนรหัสผ่าน ---
  hidePass = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    this.errorMsg = '';
    if (!this.username || !this.password) {
      this.errorMsg = 'ไม่สามารถเข้าสู่ระบบได้';
      return;
    }

    // --- (3) สร้าง object ที่มี key เป็น username และ password ---
    const credentials = {
      username: this.username,
      password: this.password,
    };

    this.auth.login(credentials).subscribe({
      next: (response) => {
        localStorage.setItem('token', response.token);
        this.router.navigate(['/dashboard']);
      },
      error: (e) => {
        // แสดงข้อความ error จาก Backend
        this.errorMsg = e.error?.msg || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      },
    });
  }
}
