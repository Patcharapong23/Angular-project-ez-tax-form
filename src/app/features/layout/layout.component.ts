import { Component } from '@angular/core';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
})
export class LayoutComponent {
  //   isSidebarCollapsed = false;
  isCollapsed = true; // ให้เริ่มพับไว้ก่อนเพื่อพื้นที่ content มากขึ้น

  onSidebarToggle(isCollapsed: boolean): void {
    this.isCollapsed = isCollapsed;
  }
  //   onSidebarToggle(collapsed: boolean) {
  //     this.isCollapsed = collapsed;
  //   }
}
