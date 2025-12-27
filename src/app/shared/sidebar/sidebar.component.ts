import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../shared/auth.service';
import { filter } from 'rxjs/operators';
import { map } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { APP_MENU, AppMenuItem } from './menu.config';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isMobileView = false;
  @Input() mobileSidebarOpen = false;

  @Output() onToggle = new EventEmitter<boolean>();

  isCollapsed = false;
  hoverExpand = false;
  isLocked = true;

  openSubMenu: string | null = null;
  currentMain: string | null = 'dashboard';

  // Filtered menu based on permissions
  filteredMenu: AppMenuItem[] = [];
  private permSub?: Subscription;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.checkUrl(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkUrl(event.urlAfterRedirects || event.url);
    });

    // Subscribe to permission changes and filter menu
    this.permSub = this.auth.permissions$.subscribe(perms => {
      const userRoles = this.auth.currentUser?.roles || [];
      this.filteredMenu = this.filterMenu(APP_MENU, new Set(perms), userRoles);
    });

    // Load permissions if not loaded
    if (this.auth.currentUser) {
      this.auth.loadPermissions().subscribe();
    }
  }

  ngOnDestroy(): void {
    if (this.permSub) {
      this.permSub.unsubscribe();
    }
  }

  // Filter menu items based on permissions and excluded roles
  private filterMenu(items: AppMenuItem[], perms: Set<string>, userRoles: string[] = []): AppMenuItem[] {
    const result: AppMenuItem[] = [];
    
    for (const item of items) {
      // Check if user's role is in excludedRoles
      if (item.excludedRoles && item.excludedRoles.some(r => userRoles.includes(r))) {
        continue; // Skip this menu item
      }

      const children = item.children ? this.filterMenu(item.children, perms, userRoles) : undefined;

      const selfVisible = this.hasAny(item.requiredPermissions, perms);
      const childVisible = children && children.length > 0;

      let visible = false;

      // 1. If it has children but NO route (pure folder), it needs visible children to show
      if (item.children && !item.route) {
        visible = childVisible || false; // childVisible can be undefined
      } 
      // 2. Otherwise (standard item or clickable parent), show if self is permitted OR has children
      else {
        visible = selfVisible || (childVisible || false);
      }

      if (visible) {
        result.push({ ...item, children });
      }
    }
    
    return result;
  }

  private hasAny(required: string[] | undefined, perms: Set<string>): boolean {
    if (!required || required.length === 0) return true;
    return required.some(p => perms.has(p));
  }

  checkUrl(url: string): void {
    const previousMain = this.currentMain;
    
    if (url.includes('/system/dashboard') || url.includes('/system/')) {
      this.currentMain = 'systemAdmin';
      // Only auto-open if we're navigating FROM a different section
      if (previousMain !== 'systemAdmin') {
        this.openSubMenu = 'systemAdmin';
      }
    } else if (url.includes('/dashboard')) {
      this.currentMain = 'dashboard';
    } else if (
      url.includes('/company') ||
      url.includes('/branches') ||
      url.includes('/general') ||
      url.includes('/buyers') ||
      url.includes('/products')
    ) {
      this.currentMain = 'dataManagement';
      if (previousMain !== 'dataManagement') {
        this.openSubMenu = 'dataManagement';
      }
    } else if (
      url.includes('/documents') ||
      url.includes('/documentsall') ||
      url.includes('/invoice') ||
      url.includes('/import') ||
      url.includes('/templates')
    ) {
      this.currentMain = 'documentManagement';
      if (previousMain !== 'documentManagement') {
        this.openSubMenu = 'documentManagement';
      }
    } else if (url.includes('/user-role-management')) {
      this.currentMain = 'user-role-management';
    } else if (url.includes('/history')) {
      this.currentMain = 'history';
    } else if (url.includes('/api-settings')) {
      this.currentMain = 'api';
    }
  }

  toggleLock(): void {
    if (this.isMobileView) return;

    this.isLocked = !this.isLocked;
    this.isCollapsed = !this.isLocked;
    this.emitCollapsed();

    if (!this.isLocked) {
      this.hoverExpand = false;
      this.openSubMenu = null;
    }
  }

  onMouseEnter(): void {
    if (this.isMobileView) return;
    if (!this.isLocked) {
      this.hoverExpand = true;
      
      if (this.currentMain === 'dataManagement') {
         this.openSubMenu = 'dataManagement';
      } else if (this.currentMain === 'documentManagement') {
         this.openSubMenu = 'documentManagement';
      } else if (this.currentMain === 'systemAdmin') {
         this.openSubMenu = 'systemAdmin';
      }
    }
  }

  onMouseLeave(): void {
    if (this.isMobileView) return;
    if (!this.isLocked) {
      this.hoverExpand = false;
      this.openSubMenu = null;
    }
  }

  private emitCollapsed(): void {
    this.onToggle.emit(this.isCollapsed);
  }

  setActive(mainKey: string): void {
    this.currentMain = mainKey;
    this.openSubMenu = null;
  }

  toggleSubMenu(section: string): void {
    if (this.isCollapsed && !this.isMobileView) {
      return;
    }
    this.openSubMenu = this.openSubMenu === section ? null : section;
  }

  selectSub(parentKey: string, subKey: string): void {
    this.currentMain = parentKey;
  }

  logout(): void {
    if ((this.auth as any).logout) {
      (this.auth as any).logout();
    }
    this.router.navigate(['/login']);
  }
}
