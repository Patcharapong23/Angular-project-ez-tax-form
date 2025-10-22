// src/app/features/dashboard/dashboard.component.ts
import { Component } from '@angular/core';
import { AuthService, AuthUser } from '../../shared/auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  user: AuthUser | null = this.auth.getUser();

  companyName =
    this.user?.companyName ||
    this.user?.tenantNameTh ||
    this.user?.tenantNameEn ||
    'Northbkk';

  displayName =
    this.user?.fullName ||
    this.user?.userName ||
    (this.user?.email ? this.user.email.split('@')[0] : 'ผู้ใช้');

  constructor(private auth: AuthService) {}
}
