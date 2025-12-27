import { Component, OnInit } from '@angular/core';
import { SystemAdminApiService, AuthSecurityStats } from '../services/system-admin-api.service';

@Component({
  selector: 'app-auth-security',
  templateUrl: './auth-security.component.html',
  styleUrls: ['./auth-security.component.css']
})
export class AuthSecurityComponent implements OnInit {
  stats: AuthSecurityStats = {
    topFailedUsernames: [],
    topFailedIps: [],
    recentLockouts: [],
    refreshDeniedCount: 0,
    tokenReuseCount: 0,
    totalFailedAttempts: 0
  };
  loading = true;

  constructor(private systemAdminApi: SystemAdminApiService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.systemAdminApi.getAuthSecurityStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load auth security stats:', err);
        this.loading = false;
      }
    });
  }

  unlockUser(username: string): void {
    console.log('Unlocking user:', username);
    // TODO: Call unlock API
  }
}
