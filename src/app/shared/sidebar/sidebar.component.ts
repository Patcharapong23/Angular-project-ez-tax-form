import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../shared/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  @Input() isMobileView = false;
  @Input() mobileSidebarOpen = false;

  @Output() onToggle = new EventEmitter<boolean>();

  isCollapsed = true;
  hoverExpand = false;
  isLocked = false;

  openSubMenu: string | null = null;
  currentMain: string | null = 'dashboard';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.checkUrl(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkUrl(event.urlAfterRedirects || event.url);
    });
  }

  checkUrl(url: string): void {
    if (url.includes('/dashboard')) {
      this.currentMain = 'dashboard';
    } else if (
      url.includes('/company') ||
      url.includes('/branches') ||
      url.includes('/general') ||
      url.includes('/buyers') ||
      url.includes('/products')
    ) {
      this.currentMain = 'dataManagement';
      this.openSubMenu = 'dataManagement';
    } else if (
      url.includes('/documents') ||
      url.includes('/documentsall')
    ) {
      this.currentMain = 'documentManagement';
      this.openSubMenu = 'documentManagement';
    } else if (url.includes('/users')) {
      this.currentMain = 'users';
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
      this.isCollapsed = false;
      this.emitCollapsed();
      
      if (this.currentMain === 'dataManagement') {
         this.openSubMenu = 'dataManagement';
      } else if (this.currentMain === 'documentManagement') {
         this.openSubMenu = 'documentManagement';
      }
    }
  }

  onMouseLeave(): void {
    if (this.isMobileView) return;
    if (!this.isLocked) {
      this.hoverExpand = false;
      this.isCollapsed = true;
      this.emitCollapsed();
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
