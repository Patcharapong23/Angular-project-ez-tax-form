import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator that fails if the control's value contains any English letters (A-Z, a-z).
 * Useful for fields that require "Thai only" (or at least "No English").
 */
export function noEnglishValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    const hasEnglish = /[a-zA-Z]/.test(control.value);
    return hasEnglish ? { hasEnglish: true } : null;
  };
}

/**
 * Validator that fails if the control's value contains any Thai characters.
 * Useful for fields that require "English only" (or at least "No Thai").
 */
export function noThaiValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) {
      return null;
    }
    // Thai Unicode Block: \u0E00-\u0E7F
    const hasThai = /[\u0E00-\u0E7F]/.test(control.value);
    return hasThai ? { hasThai: true } : null;
  };
}
