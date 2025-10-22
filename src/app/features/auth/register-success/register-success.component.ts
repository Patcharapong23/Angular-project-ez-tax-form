import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-success',
  templateUrl: './register-success.component.html',
  styleUrls: ['./register-success.component.css'],
})
export class RegisterSuccessComponent implements OnInit {
  userName: string | null = null;

  constructor(private router: Router) {
    const nav = this.router.getCurrentNavigation();
    this.userName =
      nav?.extras?.state?.['username'] ||
      (history.state && history.state['username']) ||
      sessionStorage.getItem('register.username');
  }

  ngOnInit(): void {
    if (!this.userName) {
      this.router.navigate(['/login']);
    } else {
      // แสดงผลเสร็จแล้วล้างค่า
      sessionStorage.removeItem('register.username');
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
