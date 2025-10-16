import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, LoginResponse } from '../../../shared/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  // HTML เดิม bind กับ username/password
  private _userName = '';
  password = '';
  hidePass = true;
  errorMsg = '';
  returnUrl = '/dashboard'; // ค่าเริ่มต้น

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get username(): string {
    return this._userName;
  }
  set username(v: string) {
    this._userName = v ?? '';
    this.errorMsg = '';
  }

  ngOnInit() {
    this.returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
  }

  onSubmit() {
    if (!this._userName || !this.password) {
      /* ... */ return;
    }
    this.auth.login(this._userName, this.password).subscribe({
      next: (res) => {
        if (res?.mustChangePassword) {
          this.router.navigate(['/force-change-password']);
          return;
        }
        this.router.navigateByUrl(this.returnUrl); // <--
      },
      error: () => {
        this.errorMsg = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      },
    });
  }
}
