// src/app/shared/directives/has-permission.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth.service';

/**
 * Structural directive to show/hide elements based on user permissions.
 * 
 * Usage:
 * <button *hasPermission="'DOC_ADD'">Add Document</button>
 * <button *hasPermission="['DOC_EDIT', 'DOC_DELETE']">Edit or Delete</button>
 * <button *hasPermission="['DOC_ADD', 'DOC_EDIT']; requireAll: true">Requires both</button>
 */
@Directive({
  selector: '[hasPermission]'
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private permissions: string | string[] = [];
  private requireAll = false;
  private subscription?: Subscription;
  private hasView = false;

  @Input()
  set hasPermission(value: string | string[]) {
    this.permissions = value;
    this.updateView();
  }

  @Input()
  set hasPermissionRequireAll(value: boolean) {
    this.requireAll = value;
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe to permission changes
    this.subscription = this.authService.permissions$.subscribe(() => {
      this.updateView();
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private updateView(): void {
    const hasAccess = this.checkPermissions();

    if (hasAccess && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasAccess && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }

  private checkPermissions(): boolean {
    if (!this.permissions || (Array.isArray(this.permissions) && this.permissions.length === 0)) {
      return true; // No permission required
    }

    const permArray = Array.isArray(this.permissions) ? this.permissions : [this.permissions];

    if (this.requireAll) {
      return this.authService.hasAllPermissions(permArray);
    } else {
      return this.authService.hasAnyPermission(permArray);
    }
  }
}
