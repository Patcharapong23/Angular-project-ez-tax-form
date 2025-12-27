import { Component } from '@angular/core';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../../../shared/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  userName = '';
  password = '';
  hidePass = true;
  isSubmitting = false;
  errorMsg = '';

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.userName || !this.password || this.isSubmitting) return;

    this.isSubmitting = true;
    this.errorMsg = '';

    this.auth.login(this.userName, this.password).subscribe({
      next: () => {
        // Check if user is SYSTEM_ADMIN and redirect accordingly
        const user = this.auth.currentUser;
        if (user?.mustChangePassword) {
            this.router.navigateByUrl('/auth/first-login');
        } else if (user?.roles?.includes('SYSTEM_ADMIN')) {
          this.router.navigateByUrl('/system/dashboard');
        } else {
          this.router.navigateByUrl('/dashboard');
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        
        // Parse standard API error: { success: false, error: { code, message, ... } }
        const apiError = err.error?.error;
        const msg = apiError?.message || 'เกิดข้อผิดพลาดในระบบ';
        
        // DEBUG: Confirm error block reached
        console.log('Login error:', err, 'Parsed message:', msg);

        Swal.fire({
          icon: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          text: msg,
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#d33'
        });
      },
    });
  }
}

