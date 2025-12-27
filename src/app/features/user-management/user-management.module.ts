import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';

import { UserManagementRoutingModule } from './user-management-routing.module';
import { UserManagementComponent } from './user-management.component';
import { RoleManagementComponent } from './role-management/role-management.component';
import { RoleDialogComponent } from './dialogs/role-dialog/role-dialog.component';
import { UserListComponent } from './user-list/user-list.component';
import { SharedModule } from '../../shared/shared.module';
import { UserDialogComponent } from './dialogs/user-dialog/user-dialog.component';


@NgModule({
  declarations: [
    UserManagementComponent,
    RoleManagementComponent,
    RoleDialogComponent,
    UserListComponent,
    UserDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    UserManagementRoutingModule,
    SharedModule
  ]
})
export class UserManagementModule { }
