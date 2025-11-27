import { Component } from '@angular/core';
import { SidebarService } from '../../shared/services/sidebar.service'; // Import SidebarService

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent {
  isCollapsed = true;
  isMobileMenuOpen$ = this.sidebarService.isMobileMenuOpen$; // Expose observable

  constructor(private sidebarService: SidebarService) {} // Inject SidebarService

  onSidebarToggle(isCollapsed: boolean): void {
    this.isCollapsed = isCollapsed;
  }
}
