import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { FirstLoginComponent } from './features/auth/first-login/first-login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { RegisterSuccessComponent } from './features/auth/register-success/register-success.component';
import { LayoutComponent } from './features/layout/layout.component';
import { DocumentsallComponent } from './features/documentsall/documentsall.component';
import { InvoiceFormComponent } from './features/invoice/invoice-form/invoice-form.component';
import { PlaceholderComponent } from './features/placeholder/placeholder.component';
import { ActivityHistoryComponent } from './features/activity-history/activity-history.component';

import { AuthGuard } from './auth.guard';
import { CanDeactivateGuard } from './core/guards/can-deactivate.guard';
import { PermissionGuard } from './shared/guards/permission.guard';
import { GeneralInfoComponent } from './features/general-info/general-info.component';
// ถ้ามี RegisterComponent อยู่คง path ได้เลย; ถ้าไม่มี ให้ลบ route นั้น

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'auth/first-login', component: FirstLoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'register-success', component: RegisterSuccessComponent },
  {
    path: 'legal',
    loadChildren: () => import('./pages/legal/legal.module').then(m => m.LegalModule)
  },

  {
    path: '',
    component: LayoutComponent, // <-- ใช้ LayoutComponent เป็นกรอบ
    canActivate: [AuthGuard],
    children: [
      { 
        path: 'dashboard', 
        component: DashboardComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'DASHBOARD_VIEW' }
      },
      { 
        path: 'documentsall', 
        component: DocumentsallComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'DOC_VIEW' }
      },
      { 
        path: 'invoice/new', 
        component: InvoiceFormComponent, 
        data: { mode: 'create', requiredPermission: 'DOC_ADD' }, 
        canActivate: [PermissionGuard],
        canDeactivate: [CanDeactivateGuard] 
      },
      { 
        path: 'documents/edit/:id', 
        component: InvoiceFormComponent, 
        canActivate: [PermissionGuard],
        data: { mode: 'edit', requiredPermission: 'DOC_EDIT' } 
      },
      { 
        path: 'documents/:id', 
        component: InvoiceFormComponent, 
        canActivate: [PermissionGuard],
        data: { mode: 'view', requiredPermission: 'DOC_VIEW' } 
      },

      // Placeholder routes for sidebar menus
      { path: 'company', component: PlaceholderComponent },
      {
        path: 'branches',
        loadChildren: () =>
          import('./features/branches/branches.module').then((m) => m.BranchesModule),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'BRANCH_VIEW' }
      },
      { 
        path: 'general', 
        component: GeneralInfoComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'GENERAL_VIEW' }
      },
      {
        path: 'buyers',
        loadChildren: () =>
          import('./features/buyers/buyers.module').then((m) => m.BuyersModule),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'CUSTOMER_VIEW' }
      },
      {
        path: 'products',
        loadChildren: () =>
          import('./features/products/products.module').then(
            (m) => m.ProductsModule
          ),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'PRODUCT_VIEW' }
      },
      { 
        path: 'import', 
        component: PlaceholderComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'IMPORT_VIEW' }
      },
      { 
        path: 'templates', 
        component: PlaceholderComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'TEMPLATE_VIEW' }
      },
      {
        path: 'user-role-management',
        loadChildren: () =>
          import('./features/user-management/user-management.module').then(
            (m) => m.UserManagementModule
          ),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'USER_MGT_VIEW' }
      },
      { 
        path: 'history', 
        component: ActivityHistoryComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'ACTIVITY_LOG_VIEW' }
      },
      { 
        path: 'api-settings', 
        component: PlaceholderComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'API_CONFIG_VIEW' }
      },
      
      // System Admin Routes (Platform Admin only)
      {
        path: 'system',
        loadChildren: () =>
          import('./features/system-admin/system-admin.module').then(
            (m) => m.SystemAdminModule
          ),
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'SYS_ADMIN_VIEW' }
      },

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // <-- หน้าแรกหลัง login
    ],
  },

  { path: 'register', component: RegisterComponent },
  { path: 'register-success', component: RegisterSuccessComponent },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
