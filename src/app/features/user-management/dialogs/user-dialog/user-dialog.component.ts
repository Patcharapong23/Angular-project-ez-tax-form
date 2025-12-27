import { Component, Inject, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RoleService } from '../../../../shared/services/role.service';
import { BranchService } from '../../../../shared/services/branch.service';
import { UserService } from '../../../../shared/services/user.service';
import { forkJoin } from 'rxjs';

export interface UserDialogData {
  mode: 'create' | 'edit' | 'view';
  userId?: string;
}

@Component({
  selector: 'app-user-dialog',
  templateUrl: './user-dialog.component.html',
  styleUrls: ['./user-dialog.component.css']
})
export class UserDialogComponent implements OnInit {

  form!: FormGroup;
  dialogTitle = 'เพิ่มผู้ใช้';
  isViewMode = false;
  isEditMode = false;
  hidePassword = true;
  currentUser: any;

  roles: any[] = [];
  branches: any[] = [];
  
  // Track if selected role is SYSTEM_ADMIN (doesn't need branch)
  isSystemAdminRole = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UserDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogData,
    private roleService: RoleService,
    private branchService: BranchService,
    private userService: UserService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.isViewMode = this.data.mode === 'view';
    this.isEditMode = this.data.mode === 'edit';

    if (this.isEditMode) {
      this.dialogTitle = 'แก้ไขผู้ใช้';
    } else if (this.isViewMode) {
      this.dialogTitle = 'ดูรายละเอียดผู้ใช้';
      this.form.disable();
    }

    this.loadMasterData();
  }

  initForm(): void {
    const isCreate = this.data.mode === 'create';
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      branchId: [''], // Not required by default - will be set dynamically based on role
      phoneNumber: [''],
      username: [{ value: '', disabled: true }, Validators.required],
      password: ['', isCreate ? Validators.required : []],
      roleId: ['', Validators.required],
      enableFlag: ['Y', Validators.required]
    });
    
    // Watch for role changes to toggle branch requirement
    this.form.get('roleId')?.valueChanges.subscribe(roleId => {
      this.onRoleChange(roleId);
    });
  }

  onRoleChange(roleId: string): void {
    // Find role by roleId (UUID)
    const selectedRole = this.roles.find(r => r.roleId === roleId);
    const roleLevel = selectedRole?.roleLevel || '';
    
    // SYSTEM_ADMIN doesn't need a branch
    this.isSystemAdminRole = roleLevel === 'SYSTEM_ADMIN';
    
    const branchControl = this.form.get('branchId');
    if (this.isSystemAdminRole) {
      // Remove branch validation for SYSTEM_ADMIN
      branchControl?.clearValidators();
      branchControl?.setValue('');
    } else {
      // Branch is required for all other roles
      branchControl?.setValidators([Validators.required]);
    }
    branchControl?.updateValueAndValidity();
  }

  onEmailInput(event: Event): void {
    if (this.data.mode === 'create') {
      const input = event.target as HTMLInputElement;
      const email = input.value;
      // Extract username from email (before @)
      const username = email.split('@')[0];
      this.form.get('username')?.setValue(username);
    }
  }

  loadMasterData(): void {
    forkJoin({
      roles: this.roleService.getRoles('', 0, 100),
      branches: this.branchService.getBranches()
    }).subscribe({
      next: (res: any) => {
        this.roles = res.roles.content || res.roles;
        this.branches = (res.branches && res.branches.content) ? res.branches.content : res.branches;
        
        if (this.data.userId) {
          this.loadUserData();
        }
      },
      error: (err) => {
        console.error('Error loading master data:', err);
      }
    });
  }

  // Helper to convert Java LocalDateTime array [Y,M,D,H,m,s,ns] to JS Date
  private convertArrayToDate(arr: any): Date | null {
    if (!arr || !Array.isArray(arr) || arr.length < 3) return null;
    // Array format: [year, month, day, hour?, minute?, second?, nanosecond?]
    // Note: JavaScript months are 0-indexed, but Java months are 1-indexed
    return new Date(arr[0], arr[1] - 1, arr[2], arr[3] || 0, arr[4] || 0, arr[5] || 0);
  }

  loadUserData(): void {
    if (!this.data.userId) return;
    
    this.userService.getUserById(this.data.userId).subscribe({
      next: (user: any) => {
        // Convert date arrays to Date objects
        if (Array.isArray(user.createDate)) {
          user.createDate = this.convertArrayToDate(user.createDate);
        }
        if (Array.isArray(user.updateDate)) {
          user.updateDate = this.convertArrayToDate(user.updateDate);
        }
        this.currentUser = user;
        // Find role based on user data
        // For now, assuming user has a role property or logic to determine it.
        // Adjust based on actual API response structure for User
        // If API returns roles array, we might need to pick the first one or handle appropriately
        
        // Patch simple values
        // Handle Role Binding
        // The API returns roles as a list of RoleDto objects
        // We need to match with available roles in this.roles to ensure correct dropdown selection
        const userRoles = user.roles || [];
        const userRole = userRoles.length > 0 ? userRoles[0] : null;
        const roleCode = userRole ? userRole.roleCode : '';

        // Find role by roleCode and get its roleId
        const matchedRole = this.roles.find(r => r.roleCode === roleCode);
        const roleIdValue = matchedRole ? matchedRole.roleId : '';

        // Patch values including Role
        // Note: Branch is patched separately after role logic to ensure it's not cleared by onRoleChange if not needed
        this.form.patchValue({
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          enableFlag: user.enableFlag === 'Enabled' ? 'Y' : 'N',
          roleId: roleIdValue
        });

        // Trigger logic to hide/show Branch based on Role
        if (roleIdValue) {
            this.onRoleChange(roleIdValue);
        }

        // Patch Branch ID if NOT System Admin
        if (!this.isSystemAdminRole) {
            this.form.patchValue({ branchId: user.branchId });
        } else {
             // Ensure it is empty for System Admin
             this.form.patchValue({ branchId: '' });
        }

        // 🟡 Force View Mode if Cancelled
        if (user.enableFlag === 'Cancelled' || user.enableFlag === 'N') {
           this.isViewMode = true;
           this.isEditMode = false;
           this.dialogTitle = 'ดูรายละเอียดผู้ใช้ (ยกเลิกใช้งาน)';
           this.form.disable();
        }

        if (roleIdValue) {
            this.onRoleChange(roleIdValue);
            // Re-patch branchId because onRoleChange might have cleared it if logic was slightly off, 
            // generally good to ensure it's set after controls are configured.
            // However, onRoleChange clears it for SYSTEM_ADMIN, so we should only re-patch if NOT system admin?
            // Actually, if it IS system admin, we want it cleared/hidden.
            // If it is NOT system admin, onRoleChange sets validators but keeps value? 
            // Let's verify: access form control directly.
            if (!this.isSystemAdminRole) {
               this.form.get('branchId')?.setValue(user.branchId);
            }
        }
        
        if (this.isEditMode) {
            this.form.get('username')?.disable();
        }
      },
      error: (err) => {
        console.error('Error loading user:', err);
      }
    });
  }

  onSave(): void {
    if (this.form.invalid) return;

    const formValue = this.form.getRawValue();
    
    // For SYSTEM_ADMIN, explicitly set branchId to null
    if (this.isSystemAdminRole) {
      formValue.branchId = null;
    }

    if (this.data.mode === 'create') {
      this.userService.createUser(formValue).subscribe({
        next: (res) => {
          this.dialogRef.close({ success: true, data: res });
        },
        error: (err) => {
          console.error('Error creating user:', err);
          // Ideally show a snackbar or error message here
        }
      });
    } else if (this.data.mode === 'edit' && this.data.userId) {
       this.userService.updateUser(this.data.userId, formValue).subscribe({
         next: (res) => {
           this.dialogRef.close({ success: true, data: res });
         },
         error: (err) => {
           console.error('Error updating user:', err);
         }
       });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  // ===== Custom Dropdown Logic =====
  opened: { [key: string]: boolean } = {};

  toggleDropdown(key: string): void {
    if (this.isViewMode) return;
    this.opened[key] = !this.opened[key];
  }

  selectRole(roleId: string, roleCode: string): void {
    this.form.patchValue({ roleId: roleId }); // Store actual roleId (UUID)
    this.opened['roleId'] = false; // Close dropdown
    // Logic for hiding branch handled by valueChanges subscription
  }
  
  selectBranch(branchId: string): void {
    this.form.patchValue({ branchId: branchId });
    this.opened['branchId'] = false;
  }

  getRoleLabel(): string {
    const roleId = this.form.get('roleId')?.value;
    if (!roleId) return 'เลือกบทบาท';
    const role = this.roles.find(r => r.roleId === roleId);
    return role ? role.roleName : 'เลือกบทบาท';
  }

  getBranchLabel(): string {
    const branchId = this.form.get('branchId')?.value;
    if (!branchId) return 'เลือกสาขา';
    const branch = this.branches.find(b => b.branchId === branchId);
    return branch ? `${branch.branchCode} - ${branch.branchNameTh}` : 'เลือกสาขา';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.opened = {};
    }
  }

  onResetPassword(): void {
    if (!this.data.userId) return;
    
    // Using SweetAlert2 for confirmation
    import('sweetalert2').then((Swal) => {
      Swal.default.fire({
        title: 'รีเซ็ตรหัสผ่าน?',
        text: 'รหัสผ่านจะถูกรีเซ็ตเป็น "Username" และผู้ใช้จะต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#facc15',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
      }).then((result: any) => {
        if (result.isConfirmed) {
          this.userService.resetPassword(this.data.userId!).subscribe({
            next: () => {
              Swal.default.fire({
                title: 'สำเร็จ!',
                text: 'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว รหัสผ่านใหม่คือ Username ของผู้ใช้',
                icon: 'success',
                confirmButtonColor: '#facc15'
              });
            },
            error: (err: any) => {
              console.error('Error resetting password:', err);
              Swal.default.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถรีเซ็ตรหัสผ่านได้',
                icon: 'error',
                confirmButtonColor: '#facc15'
              });
            }
          });
        }
      });
    });
  }
}

