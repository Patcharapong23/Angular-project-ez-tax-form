import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../shared/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  errorMsg = '';
  loginValid = true;
  returnUrl = '/dashboard';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    // อ่าน returnUrl จาก query param แล้วจำไว้
    const ru = this.route.snapshot.queryParamMap.get('returnUrl');
    if (ru) this.returnUrl = ru;
    this.auth.setReturnUrl(this.returnUrl);

    // ถ้าเคยล็อกอินแล้ว ให้เด้งไปเลย
    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl(this.returnUrl);
    }
  }

  onSubmit(): void {
    this.errorMsg = '';
    this.loginValid = true;

    if (!this.username || !this.password) {
      this.loginValid = false;
      this.errorMsg = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
      return;
    }

    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigateByUrl(this.auth.getReturnUrl()),
      error: (e) => {
        this.loginValid = false;
        this.errorMsg = e?.message || 'เข้าสู่ระบบไม่สำเร็จ';
      },
    });
  }
}
