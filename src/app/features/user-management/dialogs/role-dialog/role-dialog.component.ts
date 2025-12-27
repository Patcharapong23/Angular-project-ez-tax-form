import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RoleService, RoleDetailResponse, MenuPermissionDto, RoleWithPermissionsRequest } from '../../../../shared/services/role.service';

export interface RoleDialogData {
  mode: 'create' | 'edit' | 'view';
  roleId?: string;
  currentUserRoleLevel?: string;
}

interface MenuOption {
  code: string;           // Must match backend: DASHBOARD, CUSTOMER, DOC, etc.
  label: string;
  labelEn: string;
  isParent: boolean;
  parentCode?: string;    // For hierarchy display
  selected: boolean;
  permissions: {
    VIEW: boolean;
    ADD: boolean;
    EDIT: boolean;
    DUP: boolean;
    CANCEL: boolean;
    DELETE: boolean;
  };
}

interface RoleLevelOption {
  value: string;
  label: string;
  order: number;
}

// Define allowed actions for each menu code
const ALLOWED_ACTIONS: { [key: string]: string[] } = {
  // Dashboard: View only
  'DASHBOARD': ['VIEW'],
  
  // Master Data: Read/Write usually
  'BRANCH': ['VIEW', 'ADD', 'EDIT', 'DELETE'],
  'GENERAL': ['VIEW', 'EDIT'],
  'CUSTOMER': ['VIEW', 'ADD', 'EDIT', 'DELETE'],
  'PRODUCT': ['VIEW', 'ADD', 'EDIT', 'DELETE'],
  
  // Document Management: All actions usually
  'IMPORT': ['VIEW', 'ADD'],
  'DOC': ['VIEW', 'ADD', 'EDIT', 'DUP', 'CANCEL', 'DELETE'],
  'TEMPLATE': ['VIEW', 'ADD', 'EDIT', 'DELETE'],
  
  // User Management
  'USER_MGT': ['VIEW', 'ADD', 'EDIT', 'DELETE'], // DELETE = disable user
  'ACTIVITY_LOG': ['VIEW'],
  'API_CONFIG': ['VIEW', 'EDIT']
};

@Component({
  selector: 'app-role-dialog',
  templateUrl: './role-dialog.component.html',
  styleUrls: ['./role-dialog.component.css']
})
export class RoleDialogComponent implements OnInit {

  roleForm!: FormGroup;
  isViewMode = false;
  isLoading = false;
  isSaving = false;

  allRoleLevels: RoleLevelOption[] = [
    { value: 'SYSTEM_ADMIN', label: 'System Admin (ผู้ดูแลระบบ)', order: 1 },
    { value: 'HQ_ADMIN', label: 'Headquarter Admin (ผู้ดูแลสำนักงานใหญ่)', order: 2 },
    { value: 'BRANCH_ADMIN', label: 'Branch Admin (ผู้ดูแลสาขา)', order: 3 },
    { value: 'STAFF', label: 'Staff (พนักงาน)', order: 4 }
  ];

  availableRoleLevels: RoleLevelOption[] = [];

  // Menu options with codes matching backend exactly
  menuOptions: MenuOption[] = [
    // Dashboard
    { code: 'DASHBOARD', label: 'แดชบอร์ด', labelEn: 'Dashboard', isParent: false, selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    
    // Master Data - Parent (for display only)
    { code: 'MASTER_DATA', label: 'จัดการข้อมูล', labelEn: 'Master Data', isParent: true, selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    { code: 'BRANCH', label: 'ข้อมูลสาขา', labelEn: 'Branch Info', isParent: false, parentCode: 'MASTER_DATA', selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    { code: 'GENERAL', label: 'ข้อมูลทั่วไป', labelEn: 'General Info', isParent: false, parentCode: 'MASTER_DATA', selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    { code: 'CUSTOMER', label: 'ข้อมูลลูกค้า', labelEn: 'Customer Info', isParent: false, parentCode: 'MASTER_DATA', selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    { code: 'PRODUCT', label: 'ข้อมูลสินค้า', labelEn: 'Product Info', isParent: false, parentCode: 'MASTER_DATA', selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    
    // Document Management - Parent
    { code: 'DOC_MGT', label: 'จัดการเอกสาร', labelEn: 'Document Management', isParent: true, selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    { code: 'IMPORT', label: 'นำเข้าข้อมูล', labelEn: 'Data Import', isParent: false, parentCode: 'DOC_MGT', selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    { code: 'DOC', label: 'รายการเอกสาร', labelEn: 'Documents', isParent: false, parentCode: 'DOC_MGT', selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    { code: 'TEMPLATE', label: 'จัดการแม่แบบ', labelEn: 'Template Management', isParent: false, parentCode: 'DOC_MGT', selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    
    // Other menus
    { code: 'USER_MGT', label: 'จัดการผู้ใช้และสิทธิ์', labelEn: 'User Management', isParent: false, selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    { code: 'ACTIVITY_LOG', label: 'ประวัติการใช้งาน', labelEn: 'Activity Log', isParent: false, selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } },
    { code: 'API_CONFIG', label: 'ตั้งค่า API', labelEn: 'API Configuration', isParent: false, selected: false, permissions: { VIEW: false, ADD: false, EDIT: false, DUP: false, CANCEL: false, DELETE: false } }
  ];

  roleLevelDropdownOpen = false;
  menuDropdownOpen = false;
  selectedRoleLevelLabel = '';

  // Header checkboxes state
  headerChecks = {
    ADD: false,
    DUP: false,
    EDIT: false,
    CANCEL: false,
    DELETE: false,
    VIEW: false
  };

  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    public dialogRef: MatDialogRef<RoleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RoleDialogData
  ) {}

  ngOnInit(): void {
    this.isViewMode = this.data.mode === 'view';
    this.filterRoleLevels();

    this.roleForm = this.fb.group({
      roleCode: [{ value: '', disabled: this.isViewMode || this.data.mode === 'edit' }, Validators.required],
      roleName: [{ value: '', disabled: this.isViewMode }, Validators.required],
      roleLevel: [{ value: '', disabled: this.isViewMode }, Validators.required],
      enableFlag: [{ value: 'Y', disabled: this.isViewMode }]
    });

    // Load role detail if edit/view mode
    if (this.data.roleId && (this.data.mode === 'edit' || this.data.mode === 'view')) {
      this.loadRoleDetail();
    }
  }

  loadRoleDetail(): void {
    if (!this.data.roleId) return;
    
    this.isLoading = true;
    this.roleService.getRoleDetail(this.data.roleId).subscribe({
      next: (role: RoleDetailResponse) => {
        this.roleForm.patchValue({
          roleCode: role.roleCode,
          roleName: role.roleName,
          roleLevel: role.roleLevel,
          enableFlag: role.enableFlag || 'Y'
        });
        this.updateRoleLevelLabel();

        // Map permissions to menuOptions
        if (role.menuPermissions) {
          role.menuPermissions.forEach(mp => {
            const menu = this.menuOptions.find(m => m.code === mp.menuCode);
            if (menu) {
              menu.selected = true;
              menu.permissions.VIEW = mp.permissions.includes('VIEW');
              menu.permissions.ADD = mp.permissions.includes('ADD');
              menu.permissions.EDIT = mp.permissions.includes('EDIT');
              menu.permissions.DUP = mp.permissions.includes('DUP');
              menu.permissions.CANCEL = mp.permissions.includes('CANCEL');
              menu.permissions.DELETE = mp.permissions.includes('DELETE');
            }
          });
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load role:', err);
        this.isLoading = false;
      }
    });
  }

  // Helper to check if permission is applicable for the menu
  isActionAllowed(menuCode: string, action: string): boolean {
    const allowed = ALLOWED_ACTIONS[menuCode];
    if (!allowed) return true; // Default to allow all if not defined
    return allowed.includes(action);
  }

  filterRoleLevels(): void {
    const currentRole = this.data.currentUserRoleLevel || 'HQ_ADMIN';
    const currentRoleOrder = this.allRoleLevels.find(r => r.value === currentRole)?.order || 2;
    
    // SYSTEM_ADMIN is for developers only - hide from all other users
    // Only show roles at or below the current user's level
    this.availableRoleLevels = this.allRoleLevels.filter(r => {
      // If current user is not SYSTEM_ADMIN, hide SYSTEM_ADMIN option completely
      if (r.value === 'SYSTEM_ADMIN' && currentRole !== 'SYSTEM_ADMIN') {
        return false;
      }
      return r.order >= currentRoleOrder;
    });
  }

  // Get selectable (non-parent) menus for dropdown
  get selectableMenus(): MenuOption[] {
    return this.menuOptions.filter(m => !m.isParent);
  }

  // Get selected menus for chips
  get selectedMenus(): MenuOption[] {
    return this.menuOptions.filter(m => m.selected && !m.isParent);
  }

  // Get menus to display in permission table (with hierarchy)
  get permissionTableMenus(): MenuOption[] {
    const result: MenuOption[] = [];
    const selectedCodes = new Set(this.selectedMenus.map(m => m.code));
    
    this.menuOptions.forEach(menu => {
      if (menu.isParent) {
        const hasSelectedChild = this.menuOptions.some(m => m.parentCode === menu.code && selectedCodes.has(m.code));
        if (hasSelectedChild) {
          result.push(menu);
          this.menuOptions.filter(m => m.parentCode === menu.code && selectedCodes.has(m.code)).forEach(child => {
            result.push(child);
          });
        }
      } else if (!menu.parentCode && selectedCodes.has(menu.code)) {
        result.push(menu);
      }
    });
    
    return result;
  }

  toggleMenu(menu: MenuOption): void {
    if (!this.isViewMode && !menu.isParent) {
      menu.selected = !menu.selected;
      if (!menu.selected) {
        // Reset permissions when deselected
        Object.keys(menu.permissions).forEach(key => {
          (menu.permissions as any)[key] = false;
        });
      } else {
        // Auto-select VIEW when menu is selected
        menu.permissions.VIEW = true;
      }
    }
  }

  removeMenu(menu: MenuOption, event: Event): void {
    event.stopPropagation();
    if (!this.isViewMode) {
      menu.selected = false;
      Object.keys(menu.permissions).forEach(key => {
        (menu.permissions as any)[key] = false;
      });
    }
  }

  toggleRoleLevelDropdown(): void {
    if (!this.isViewMode) {
      this.roleLevelDropdownOpen = !this.roleLevelDropdownOpen;
      this.menuDropdownOpen = false;
    }
  }

  toggleMenuDropdown(): void {
    if (!this.isViewMode) {
      this.menuDropdownOpen = !this.menuDropdownOpen;
      this.roleLevelDropdownOpen = false;
    }
  }

  selectRoleLevel(level: RoleLevelOption): void {
    this.roleForm.patchValue({ roleLevel: level.value });
    this.selectedRoleLevelLabel = level.label;
    this.roleLevelDropdownOpen = false;
  }

  updateRoleLevelLabel(): void {
    const currentValue = this.roleForm.get('roleLevel')?.value;
    const found = this.allRoleLevels.find(r => r.value === currentValue);
    this.selectedRoleLevelLabel = found?.label || '';
  }

  closeDropdowns(): void {
    this.roleLevelDropdownOpen = false;
    this.menuDropdownOpen = false;
  }

  // Header checkbox toggle
  onHeaderCheckChange(type: 'ADD' | 'DUP' | 'EDIT' | 'CANCEL' | 'DELETE' | 'VIEW', event: any): void {
    const checked = event.target.checked;
    this.headerChecks[type] = checked;
    this.selectedMenus.forEach(m => {
      m.permissions[type] = checked;
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.roleForm.valid && this.selectedMenus.length > 0) {
      this.isSaving = true;
      
      const formValue = this.roleForm.getRawValue();
      
      // Build menuPermissions array
      const menuPermissions: MenuPermissionDto[] = this.selectedMenus.map(menu => {
        const perms: string[] = [];
        if (menu.permissions.VIEW) perms.push('VIEW');
        if (menu.permissions.ADD) perms.push('ADD');
        if (menu.permissions.EDIT) perms.push('EDIT');
        if (menu.permissions.DUP) perms.push('DUP');
        if (menu.permissions.CANCEL) perms.push('CANCEL');
        if (menu.permissions.DELETE) perms.push('DELETE');

        // Fix: Auto-grant VIEW if any other permission is present
        // This prevents menu visibility issues
        if (perms.length > 0 && !perms.includes('VIEW')) {
          perms.push('VIEW');
        }

        return {
          menuCode: menu.code,
          permissions: perms
        };
      }).filter(mp => mp.permissions.length > 0);

      const request: RoleWithPermissionsRequest = {
        roleCode: formValue.roleCode,
        roleName: formValue.roleName,
        roleLevel: formValue.roleLevel,
        enableFlag: formValue.enableFlag,
        menuPermissions: menuPermissions
      };

      const operation = this.data.mode === 'edit' && this.data.roleId
        ? this.roleService.updateRole(this.data.roleId, request)
        : this.roleService.createRole(request);

      operation.subscribe({
        next: (result) => {
          this.isSaving = false;
          this.dialogRef.close({ success: true, roleId: result.roleId });
        },
        error: (err) => {
          console.error('Failed to save role:', err);
          this.isSaving = false;
          alert(err.error?.message || 'Failed to save role');
        }
      });
    }
  }

  getTitle(): string {
    switch (this.data.mode) {
      case 'create': return 'เพิ่มบทบาทและสิทธิ์การเข้าถึง';
      case 'edit': return 'แก้ไขบทบาทและสิทธิ์การเข้าถึง';
      case 'view': return 'รายละเอียดบทบาทและสิทธิ์การเข้าถึง';
      default: return 'บทบาทและสิทธิ์การเข้าถึง';
    }
  }
}
