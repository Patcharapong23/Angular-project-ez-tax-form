import { AbstractControl, ValidationErrors } from '@angular/forms';
import { isValidThaiTaxId } from './thai-tax-id.validator';

export function thaiTaxIdValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;

  if (!value) return null; // ถ้าไม่กรอกให้ผ่านก่อน

  return isValidThaiTaxId(value) ? null : { invalidThaiTaxId: true };
}