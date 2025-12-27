import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RoleDialogComponent, RoleDialogData } from './dialogs/role-dialog/role-dialog.component';
import { RoleManagementComponent } from './role-management/role-management.component';
import { UserDialogComponent } from './dialogs/user-dialog/user-dialog.component';
import { UserListComponent } from './user-list/user-list.component';
import { AuthService } from '../../shared/auth.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {

  activeTab = 'role';
  
  @ViewChild(RoleManagementComponent) roleManagement!: RoleManagementComponent;
  @ViewChild(UserListComponent) userListComponent!: UserListComponent;

  constructor(private dialog: MatDialog, private authService: AuthService) { }

  ngOnInit(): void {
  }

  private getCurrentUserRoleLevel(): string {
    const user = this.authService.currentUser;
    if (user?.roles) {
      // Return highest role level
      if (user.roles.includes('SYSTEM_ADMIN')) return 'SYSTEM_ADMIN';
      if (user.roles.includes('HQ_ADMIN')) return 'HQ_ADMIN';
      if (user.roles.includes('BRANCH_ADMIN')) return 'BRANCH_ADMIN';
      if (user.roles.includes('STAFF')) return 'STAFF';
    }
    return 'HQ_ADMIN'; // Default
  }

  addRole(): void {
    const dialogData: RoleDialogData = { 
      mode: 'create',
      currentUserRoleLevel: this.getCurrentUserRoleLevel()
    };
    
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      data: dialogData,
      panelClass: 'role-dialog-panel',
      width: '900px',
      maxWidth: '95vw',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        // Refresh role list
        if (this.roleManagement) {
          this.roleManagement.loadRoles();
        }
      }
    });
  }
  
  editRole(roleId: string): void {
    const dialogData: RoleDialogData = { 
      mode: 'edit', 
      roleId,
      currentUserRoleLevel: this.getCurrentUserRoleLevel()
    };
    
    const dialogRef = this.dialog.open(RoleDialogComponent, {
      data: dialogData,
      panelClass: 'role-dialog-panel',
      width: '900px',
      maxWidth: '95vw',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        if (this.roleManagement) {
          this.roleManagement.loadRoles();
        }
      }
    });
  }
  
  viewRole(roleId: string): void {
    const dialogData: RoleDialogData = { 
      mode: 'view', 
      roleId,
      currentUserRoleLevel: this.getCurrentUserRoleLevel()
    };
    
    this.dialog.open(RoleDialogComponent, {
      data: dialogData,
      panelClass: 'role-dialog-panel',
      width: '900px',
      maxWidth: '95vw',
      disableClose: false
    });
  }

  addUser(): void {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      data: { mode: 'create' },
      panelClass: 'user-dialog-panel',
      width: '900px', // Match role dialog width
      maxWidth: '95vw',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        // Refresh user list
        // Note: We need to access UserListComponent to refresh it.
        // For now, simpler way is to just reload the tab or rely on existing logic if we had @ViewChild
        
        // Try to find the child component and refresh
        // This requires @ViewChild(UserListComponent) which we should add
        if (this.userListComponent) {
          this.userListComponent.loadUsers();
        }
      }
    });
  }
}
