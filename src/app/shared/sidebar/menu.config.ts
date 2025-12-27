// src/app/shared/sidebar/menu.config.ts

export interface AppMenuItem {
  key: string;                      // unique key for tracking
  label: string;
  icon?: string;                    // Tabler icon class
  route?: string;
  requiredPermissions?: string[];   // ถ้าไม่มี = ทุกคนเห็น
  excludedRoles?: string[];         // roles ที่ไม่ให้เห็นเมนูนี้
  children?: AppMenuItem[];
}

/**
 * Menu configuration matching backend menu codes:
 * DASHBOARD, BRANCH, GENERAL, CUSTOMER, PRODUCT, IMPORT, DOC, TEMPLATE, USER_MGT, ACTIVITY_LOG, API_CONFIG
 */
export const APP_MENU: AppMenuItem[] = [
  // แดชบอร์ด
  { 
    key: 'dashboard',
    label: 'แดชบอร์ด', 
    icon: 'ti-layout-dashboard', 
    route: '/dashboard', 
    requiredPermissions: ['DASHBOARD_VIEW'] 
  },

  // จัดการข้อมูล (parent group) - hide from System Admin
  {
    key: 'dataManagement',
    label: 'จัดการข้อมูล', 
    icon: 'ti-database',
    excludedRoles: ['SYSTEM_ADMIN'],
    // Parent shows if ANY child is visible
    children: [
      { 
        key: 'company',
        label: 'ข้อมูลบริษัท', 
        route: '/company', 
        requiredPermissions: ['COMPANY_VIEW'] // Changed from BRANCH_VIEW to hide from HQ_ADMIN
      },
      { 
        key: 'branches',
        label: 'ข้อมูลสาขา', 
        route: '/branches', 
        requiredPermissions: ['BRANCH_VIEW'] 
      },
      { 
        key: 'general',
        label: 'ข้อมูลทั่วไป', 
        route: '/general', 
        requiredPermissions: ['GENERAL_VIEW'] 
      },
      { 
        key: 'customers',
        label: 'ข้อมูลลูกค้า', 
        route: '/buyers', 
        requiredPermissions: ['CUSTOMER_VIEW'] 
      },
      { 
        key: 'products',
        label: 'ข้อมูลสินค้า', 
        route: '/products', 
        requiredPermissions: ['PRODUCT_VIEW'] 
      },
    ]
  },

  // จัดการเอกสาร (parent group) - hide from System Admin
  {
    key: 'documentManagement',
    label: 'จัดการเอกสาร', 
    icon: 'ti-file-text',
    excludedRoles: ['SYSTEM_ADMIN'],
    children: [
      { 
        key: 'import',
        label: 'นำเข้าข้อมูล', 
        route: '/import', 
        requiredPermissions: ['IMPORT_VIEW'] 
      },
      { 
        key: 'documentsall',
        label: 'รายการเอกสารทั้งหมด', 
        route: '/documentsall', 
        requiredPermissions: ['DOC_VIEW'] 
      },
      { 
        key: 'templates',
        label: 'จัดการแม่แบบข้อมูล', 
        route: '/templates', 
        requiredPermissions: ['TEMPLATE_VIEW'] 
      },
    ]
  },

  // จัดการผู้ใช้และสิทธิ์
  { 
    key: 'user-role-management',
    label: 'จัดการผู้ใช้และสิทธิ์', 
    icon: 'ti-user', 
    route: '/user-role-management', 
    requiredPermissions: ['USER_MGT_VIEW'] 
  },

  // ประวัติการทำรายการ
  { 
    key: 'history',
    label: 'ประวัติการทำรายการ', 
    icon: 'ti-history', 
    route: '/history', 
    requiredPermissions: ['ACTIVITY_LOG_VIEW'] 
  },

  // ตั้งค่า API
  { 
    key: 'api',
    label: 'ตั้งค่า API', 
    icon: 'ti-settings', 
    route: '/api-settings', 
    requiredPermissions: ['API_CONFIG_VIEW'] 
  },

  // ========================================
  // SYSTEM ADMIN MENUS (Platform Admin Only)
  // ========================================
  {
    key: 'systemAdmin',
    label: 'System Admin',
    icon: 'ti-server',
    requiredPermissions: ['SYS_ADMIN_VIEW'], // Parent requires permission too!
    children: [
      { 
        key: 'sys-dashboard',
        label: 'System Dashboard', 
        route: '/system/dashboard', 
        requiredPermissions: ['SYS_DASHBOARD_VIEW'] 
      },
      { 
        key: 'sys-tenants',
        label: 'Tenant Management', 
        route: '/system/tenants', 
        requiredPermissions: ['SYS_TENANT_VIEW'] 
      },
      // System Audit Log removed - Activity Log already supports SYSTEM_ADMIN
      { 
        key: 'sys-auth',
        label: 'Auth Security', 
        route: '/system/auth-security', 
        requiredPermissions: ['SYS_AUTH_MONITOR_VIEW'] 
      },
      { 
        key: 'sys-roles',
        label: 'System Roles', 
        route: '/system/roles', 
        requiredPermissions: ['SYS_ROLE_VIEW'] 
      },
    ]
  },
];
