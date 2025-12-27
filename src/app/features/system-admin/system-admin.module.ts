import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxEchartsModule } from 'ngx-echarts';
import { SystemAdminRoutingModule } from './system-admin-routing.module';
import { SystemDashboardComponent } from './system-dashboard/system-dashboard.component';
import { TenantManagementComponent } from './tenant-management/tenant-management.component';
import { SystemAuditLogComponent } from './system-audit-log/system-audit-log.component';
import { AuthSecurityComponent } from './auth-security/auth-security.component';
import { SystemRolesComponent } from './system-roles/system-roles.component';

@NgModule({
  declarations: [
    SystemDashboardComponent,
    TenantManagementComponent,
    SystemAuditLogComponent,
    AuthSecurityComponent,
    SystemRolesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgxEchartsModule.forChild(),
    SystemAdminRoutingModule
  ]
})
export class SystemAdminModule { }

