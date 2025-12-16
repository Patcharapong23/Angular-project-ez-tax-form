// src/app/app.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoadingService } from './shared/Loding/loading.service'; // พาธเดิมของโปรเจ็กต์
import { AuthService } from './shared/auth.service'; // ✅ เพิ่ม import
import { environment } from '../environments/environment';
import { SidebarService } from './shared/services/sidebar.service'; // Import SidebarService

import { delay } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  loading$ = this.loading.isLoading$.pipe(delay(0));
  isMobileMenuOpen$ = this.sidebarService.isMobileMenuOpen$; // Expose observable

  // เก็บ reference ของ storage listener ไว้ถอดตอน destroy
  private onStorage = (e: StorageEvent) => {
    if (e.key === 'logout.broadcast') {
      // ✅ รับสัญญาณแล้ว “ห้าม” broadcast กลับ
      this.auth.logout(false);
    }
  };

  constructor(
    private loading: LoadingService,
    private http: HttpClient,
    private auth: AuthService, // ✅ inject ให้เรียกใช้ใน ngOnInit ได้
    private sidebarService: SidebarService // Inject SidebarService
  ) {}

  ngOnInit() {
    window.addEventListener('storage', this.onStorage);

    // if (this.auth.isLoggedIn()) {
    //   this.auth.fetchMe().subscribe({
    //     error: () => this.auth.logoutToLogin() // ถ้า 401/403 ค่อยเด้ง
    //   });
    // } else {
    //   // Defer navigation to the next event loop cycle to avoid ExpressionChangedAfterItHasBeenCheckedError.
    //   setTimeout(() => this.auth.logoutToLogin());
    // }
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.onStorage);
  }

  // ปุ่มทดสอบสปินเนอร์แบบ manual
  fakeWork() {
    this.loading.show();
    setTimeout(() => this.loading.hide(), 2000);
  }

  // ปุ่มทดสอบยิง HTTP (ให้ Interceptor โชว์/ซ่อนโหลดเอง)
  testHttp() {
    this.http
      .get(`${environment.apiBase}/ping`, { responseType: 'text' })
      .subscribe({ next: () => {}, error: () => {} });
  }

  closeMobileMenu(): void {
    this.sidebarService.closeMobileMenu();
  }
}
