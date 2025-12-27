import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { InvoiceFormComponent } from '../../features/invoice/invoice-form/invoice-form.component';

@Injectable({
  providedIn: 'root'
})
export class CanDeactivateGuard implements CanDeactivate<InvoiceFormComponent> {
  
  canDeactivate(component: InvoiceFormComponent): boolean | Promise<boolean> {
    // Delegate to component's canDeactivate method
    if (component && typeof component.canDeactivate === 'function') {
      return component.canDeactivate();
    }
    return true;
  }
}
