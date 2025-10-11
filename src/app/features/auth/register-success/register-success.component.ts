import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-success',
  templateUrl: './register-success.component.html',
  styleUrls: ['./register-success.component.css'],
})
export class RegisterSuccessComponent implements OnInit {
  username: string | null = null;

  constructor(private router: Router) {
    // ดึงข้อมูล state ที่ส่งมาตอน navigate
    const navigation = this.router.getCurrentNavigation();
    this.username = navigation?.extras?.state?.['username'];
  }

  ngOnInit(): void {
    // ถ้าไม่มี username ถูกส่งมา หรือ user refresh หน้า, ให้กลับไปหน้า login
    if (!this.username) {
      this.router.navigate(['/login']);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
