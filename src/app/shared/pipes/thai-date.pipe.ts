import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'thaiDate',
  standalone: false
})
export class ThaiDatePipe implements PipeTransform {

  constructor(private datePipe: DatePipe) {}

  transform(value: any, format: string = 'dd/MM/yyyy HH:mm:ss'): string | null {
    if (!value) return null;

    let date: Date;

    // Check if value is a number or a numeric string
    const isNumeric = !isNaN(parseFloat(value)) && isFinite(value);

    if (isNumeric) {
        let timestamp = Number(value);
        // If timestamp is in seconds (e.g., 10 digits), convert to milliseconds
        if (timestamp < 100000000000) {
            timestamp *= 1000;
        }
        date = new Date(timestamp);
    } else if (typeof value === 'string') {
        // Handle SQL timestamp format "yyyy-MM-dd HH:mm:ss.SSSSSS"
        // Truncate microseconds to milliseconds (3 digits) to ensure compatibility
        let dateStr = value.replace(' ', 'T');
        const parts = dateStr.split('.');
        if (parts.length > 1 && parts[1].length > 3) {
            dateStr = parts[0] + '.' + parts[1].substring(0, 3);
        }
        date = new Date(dateStr);
    } else {
        date = new Date(value);
    }

    if (isNaN(date.getTime())) {
        console.error('ThaiDatePipe: Invalid date value', value);
        return null;
    }

    const thaiYear = date.getFullYear() + 543;
    
    let result = this.datePipe.transform(date, format);
    
    if (result) {
        const ceYear = date.getFullYear().toString();
        const beYear = thaiYear.toString();
        result = result.replace(ceYear, beYear);
    }

    return result;
  }
}
