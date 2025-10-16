import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { RegisterSuccessComponent } from './features/auth/register-success/register-success.component';
import { LayoutComponent } from './features/layout/layout.component';
import { DocumentsallComponent } from './features/documentsall/documentsall.component';

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
      // { path: 'form-list', component: FormListComponent }, // <-- ตัวอย่างหน้าอื่นๆ ในอนาคต
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'documentsall', component: DocumentsallComponent },

      // <-- หน้าแรกหลัง login
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
