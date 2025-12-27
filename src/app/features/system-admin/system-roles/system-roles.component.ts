import { Component, OnInit } from '@angular/core';
import { SystemAdminApiService, RoleWithCount } from '../services/system-admin-api.service';

@Component({
  selector: 'app-system-roles',
  templateUrl: './system-roles.component.html',
  styleUrls: ['./system-roles.component.css']
})
export class SystemRolesComponent implements OnInit {
  roles: RoleWithCount[] = [];
  loading = true;

  constructor(private systemAdminApi: SystemAdminApiService) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading = true;
    this.systemAdminApi.getRoles().subscribe({
      next: (data) => {
        this.roles = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load roles:', err);
        this.loading = false;
      }
    });
  }
}
