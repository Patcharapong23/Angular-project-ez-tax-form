import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phone'
})
export class PhonePipe implements PipeTransform {

  transform(value: string | undefined | null): string {
    if (!value) {
      return '';
    }

    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');

    // Check if it's a landline (starts with 02, 03, 04, 05, 07)
    // Landlines usually: 02-XXX-XXXX (9 digits) or 0XX-XXX-XXXX (9 digits)
    // Mobiles: 0X-XXXX-XXXX (10 digits) -> 0XX-XXX-XXXX

    if (cleaned.length === 9) {
      // Landline 9 digits
      if (cleaned.startsWith('02')) {
        return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
      } else {
        // Other provinces: 032-XXX-XXX which logic? 
        // Standard Thai format usually groups area code.
        // But simpler: 0XX-XXX-XXX
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      }
    } else if (cleaned.length === 10) {
      // Mobile 10 digits: 08X-XXX-XXXX
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // Fallback if length is not standard
    return value;
  }

}
