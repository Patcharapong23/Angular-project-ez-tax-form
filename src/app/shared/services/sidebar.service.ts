import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isMobileMenuOpenSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public isMobileMenuOpen$: Observable<boolean> = this.isMobileMenuOpenSubject.asObservable();

  constructor() { }

  toggleMobileMenu(): void {
    this.isMobileMenuOpenSubject.next(!this.isMobileMenuOpenSubject.value);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpenSubject.next(false);
  }
}
