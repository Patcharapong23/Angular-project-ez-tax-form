import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../shared/auth.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="p-4">
      <h2>Dashboard</h2>
      <p *ngIf="user">ยินดีต้อนรับ, {{ user.fullName }} ({{ user.email }})</p>
      <button mat-stroked-button color="primary" (click)="logout()">
        ออกจากระบบ
      </button>
    </div>
  `,
})
export class DashboardComponent {
  user: AuthUser | null = this.auth.getUser();

  constructor(private auth: AuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
