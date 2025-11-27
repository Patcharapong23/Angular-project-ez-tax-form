// src/app/features/dashboard/dashboard.component.ts
import { Component } from '@angular/core';
import { AuthService, AuthUser } from '../../shared/auth.service';
import { DashboardService } from '../../shared/services/dashboard.service'; // New import
import { DashboardSummary } from '../../shared/models/dashboard.models'; // New import

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  user: AuthUser | null = null; // Initialize as null

  companyName = ''; // Will be set in ngOnInit
  displayName = ''; // Will be set in ngOnInit

  dashboardSummary: DashboardSummary | null = null; // New property

  constructor(private auth: AuthService, private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.auth.user$.subscribe(u => {
      this.user = u;
      this.companyName = this.user?.sellerNameTh || 'Northbkk';
      this.displayName =
        this.user?.fullName ||
        this.user?.userName ||
        (this.user?.email ? this.user.email.split('@')[0] : 'ผู้ใช้');
    });

    this.dashboardService.getDashboardSummary().subscribe(summary => {
      this.dashboardSummary = summary;
    });
  }
}
