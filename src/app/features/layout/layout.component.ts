import { Component } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { SidebarService } from '../../shared/services/sidebar.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent {
  isCollapsed = false;
  isMobileView = false;
  isMobileMenuOpen$ = this.sidebarService.isMobileMenuOpen$;

  constructor(
    public sidebarService: SidebarService,
    private breakpointObserver: BreakpointObserver
  ) {
    this.breakpointObserver
      .observe(['(max-width: 1023px)'])
      .subscribe((result) => {
        this.isMobileView = result.matches;
        if (!this.isMobileView) {
          this.sidebarService.closeMobileMenu();
        }
      });
  }

  onSidebarToggle(isCollapsed: boolean): void {
    this.isCollapsed = isCollapsed;
  }
}
