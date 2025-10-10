import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/auth.service';

@Component({
  selector: 'app-callback',
  template: `<p>กำลังตรวจสอบการเข้าสู่ระบบ...</p>`,
})
export class CallbackComponent implements OnInit {
  constructor(private auth: AuthService, private router: Router) {}

  async ngOnInit() {
    // await this.auth.handleRedirect();
    this.router.navigateByUrl('/dashboard');
  }
}
