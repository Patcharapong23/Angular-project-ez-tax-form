import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, NG_VALIDATORS, Validator, AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Formats Thai phone numbers to standard format:
 * - Landline: 02-123-4567 (9 digits starting with 02-09)
 * - Mobile: 061-234-5678 (10 digits starting with 06, 08, 09)
 * 
 * Handles various input formats:
 * - +66xxxxxxxxx -> converts to 0xxxxxxxxx format (Thai international)
 * - Raw digits -> formats with dashes
 * - International numbers (+xx...) -> keeps as-is, no formatting
 */
@Directive({
  selector: '[phoneFormat]',
  standalone: false,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneFormatDirective),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneFormatDirective),
      multi: true
    }
  ]
})
export class PhoneFormatDirective implements ControlValueAccessor, Validator {
  private el: HTMLInputElement;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elementRef: ElementRef) {
    this.el = this.elementRef.nativeElement;
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.el.value = this.formatPhone(value || '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.disabled = isDisabled;
  }

  // Validator implementation
  validate(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) {
      return null; // Empty is valid (use Validators.required separately)
    }

    // Skip validation for international numbers (non-Thai)
    if (this.isInternationalNumber(value)) {
      return null;
    }

    const digits = this.extractDigits(value);
    
    // Check minimum length for Thai numbers
    if (digits.length > 0 && digits.length < 9) {
      return { phoneIncomplete: { requiredLength: 9, actualLength: digits.length } };
    }
    
    // Check maximum length for Thai numbers
    if (digits.length > 10) {
      return { phoneTooLong: { maxLength: 10, actualLength: digits.length } };
    }

    // Validate format patterns for Thai numbers
    if (digits.length === 9) {
      // Landline: must start with 02-09
      if (!/^0[2-9]/.test(digits)) {
        return { phoneInvalidFormat: true };
      }
    } else if (digits.length === 10) {
      // Mobile: must start with 06, 08, or 09
      if (!/^0[689]/.test(digits)) {
        return { phoneInvalidFormat: true };
      }
    }

    return null;
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatPhone(input.value);
    input.value = formatted;
    this.onChange(formatted);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
    // Reformat on blur to ensure consistent display
    this.el.value = this.formatPhone(this.el.value);
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const formatted = this.formatPhone(pastedText);
    this.el.value = formatted;
    this.onChange(formatted);
  }

  /**
   * Checks if the number is an international (non-Thai) format
   */
  private isInternationalNumber(value: string): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    // International if starts with + but NOT +66 (Thai)
    if (trimmed.startsWith('+') && !trimmed.startsWith('+66')) {
      return true;
    }
    return false;
  }

  /**
   * Extracts only digits from input, handling +66 prefix
   */
  private extractDigits(value: string): string {
    if (!value) return '';
    
    const trimmed = value.trim();
    
    // Skip extraction for non-Thai international numbers
    if (this.isInternationalNumber(trimmed)) {
      return trimmed;
    }
    
    // Remove all non-digit characters first
    let digits = trimmed.replace(/\D/g, '');
    
    // Handle +66 prefix (becomes 0)
    if (trimmed.includes('+66')) {
      digits = '0' + digits.substring(2);
    } else if (digits.startsWith('66') && digits.length > 10) {
      // Handle 66xxxxxxxxx format without + 
      digits = '0' + digits.substring(2);
    }
    
    return digits;
  }

  /**
   * Formats phone number to Thai standard format
   * International numbers are kept as-is
   */
  private formatPhone(value: string): string {
    if (!value) return '';
    
    const trimmed = value.trim();
    
    // Don't format international numbers (non-Thai)
    if (this.isInternationalNumber(trimmed)) {
      return trimmed;
    }
    
    const digits = this.extractDigits(trimmed);
    
    if (!digits) return '';
    
    // Format based on length
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 5) {
      // XX-XXX
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else if (digits.length <= 9) {
      // Landline: 02-123-4567 (2-3-4 pattern)
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    } else {
      // Mobile: 061-234-5678 (3-3-4 pattern)
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  }
}

