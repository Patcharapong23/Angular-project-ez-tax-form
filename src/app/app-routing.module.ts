import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { RegisterSuccessComponent } from './features/auth/register-success/register-success.component';
import { LayoutComponent } from './features/layout/layout.component';
import { DocumentsallComponent } from './features/documentsall/documentsall.component';
import { InvoiceFormComponent } from './features/invoice/invoice-form/invoice-form.component';
import { PlaceholderComponent } from './features/placeholder/placeholder.component';

import { AuthGuard } from './auth.guard';
// ถ้ามี RegisterComponent อยู่คง path ได้เลย; ถ้าไม่มี ให้ลบ route นั้น

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'register-success', component: RegisterSuccessComponent },

  {
    path: '',
    component: LayoutComponent, // <-- ใช้ LayoutComponent เป็นกรอบ
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'documentsall', component: DocumentsallComponent },
      { path: 'invoice/new', component: InvoiceFormComponent, data: { mode: 'create' } },
      { path: 'documents/edit/:id', component: InvoiceFormComponent, data: { mode: 'edit' } },
      { path: 'documents/:id', component: InvoiceFormComponent, data: { mode: 'view' } },

      // Placeholder routes for sidebar menus
      { path: 'company', component: PlaceholderComponent },
      { path: 'branches', component: PlaceholderComponent },
      { path: 'general', component: PlaceholderComponent },
      {
        path: 'buyers',
        loadChildren: () =>
          import('./features/buyers/buyers.module').then((m) => m.BuyersModule),
      },
      {
        path: 'products',
        loadChildren: () =>
          import('./features/products/products.module').then(
            (m) => m.ProductsModule
          ),
      },
      { path: 'import', component: PlaceholderComponent },
      { path: 'templates', component: PlaceholderComponent },
      { path: 'users', component: PlaceholderComponent },
      { path: 'history', component: PlaceholderComponent },
      { path: 'api-settings', component: PlaceholderComponent },

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
