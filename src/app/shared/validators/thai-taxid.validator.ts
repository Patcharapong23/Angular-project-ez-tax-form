// src/app/shared/validators/thai-taxid.validator.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * ฟังก์ชันเช็คเลขผู้เสียภาษี/เลข 13 หลักแบบไทยด้วยสูตร checksum มาตรฐาน
 * ใช้กับเลขที่เป็นตัวเลข 13 หลักเท่านั้น
 */
export function isValidThaiTaxId(value: string): boolean {
  const raw = (value ?? '').toString().trim();

  // ต้องเป็นตัวเลข 13 หลักเท่านั้น
  if (!/^\d{13}$/.test(raw)) {
    return false;
  }

  // เอา 12 หลักแรกมาคูณน้ำหนัก 13 -> 2 แล้วบวกกัน
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(raw.charAt(i));
    if (Number.isNaN(digit)) {
      return false;
    }
    const weight = 13 - i;
    sum += digit * weight;
  }

  // คำนวณเลขตรวจสอบตัวสุดท้าย (check digit)
  const checkDigit = (11 - (sum % 11)) % 10;
  const lastDigit = Number(raw.charAt(12));

  return checkDigit === lastDigit;
}

/**
 * Angular ValidatorFn สำหรับใช้ใน Reactive Forms
 *
 * - ถ้าเว้นว่าง -> คืน null (ให้ Validators.required เป็นคนเช็คเอง)
 * - ถ้ายังไม่ครบ 13 หลักหรือมีตัวที่ไม่ใช่ตัวเลข -> ปล่อยให้ minlength/maxlength/pattern จัดการ
 * - ถ้าเป็นตัวเลข 13 หลักแล้ว แต่ checksum ไม่ตรง -> คืน { thaiTaxId: true }
 */
export const thaiTaxIdValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const raw = (control.value ?? '').toString().trim();

  // ถ้ายังไม่กรอกอะไรเลย ให้ required เช็คเอง
  if (!raw) {
    return null;
  }

  // ถ้ายังไม่เป็นตัวเลข 13 หลัก ปล่อยให้ minlength/maxlength/pattern จัดการ
  if (!/^\d{13}$/.test(raw)) {
    return null;
  }

  // เช็ค checksum
  const ok = isValidThaiTaxId(raw);
  return ok ? null : { thaiTaxId: true };
};
