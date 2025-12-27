import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SystemDashboardComponent } from './system-dashboard/system-dashboard.component';
import { TenantManagementComponent } from './tenant-management/tenant-management.component';
import { SystemAuditLogComponent } from './system-audit-log/system-audit-log.component';
import { AuthSecurityComponent } from './auth-security/auth-security.component';
import { SystemRolesComponent } from './system-roles/system-roles.component';
import { PermissionGuard } from '../../shared/guards/permission.guard';

const routes: Routes = [
  {
    path: 'dashboard',
    component: SystemDashboardComponent,
    canActivate: [PermissionGuard],
    data: { requiredPermission: 'SYS_DASHBOARD_VIEW' }
  },
  {
    path: 'tenants',
    component: TenantManagementComponent,
    canActivate: [PermissionGuard],
    data: { requiredPermission: 'SYS_TENANT_VIEW' }
  },
  {
    path: 'audit',
    component: SystemAuditLogComponent,
    canActivate: [PermissionGuard],
    data: { requiredPermission: 'SYS_AUDIT_VIEW' }
  },
  {
    path: 'auth-security',
    component: AuthSecurityComponent,
    canActivate: [PermissionGuard],
    data: { requiredPermission: 'SYS_AUTH_MONITOR_VIEW' }
  },
  {
    path: 'roles',
    component: SystemRolesComponent,
    canActivate: [PermissionGuard],
    data: { requiredPermission: 'SYS_ROLE_VIEW' }
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SystemAdminRoutingModule { }
