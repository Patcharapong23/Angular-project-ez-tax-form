import { Directive, ElementRef, HostListener, OnInit, OnDestroy, Input, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Directive({
  selector: '[numberInputFormatter]',
  standalone: false,
})
export class NumberInputFormatterDirective implements OnInit, OnDestroy {
  @Input('numberInputFormatter') formatTypeInput: 'integer' | 'decimal' | '' = 'decimal';

  private destroy$ = new Subject<void>();

  constructor(private el: ElementRef, @Optional() private control: NgControl) {}

  get formatType(): 'integer' | 'decimal' {
    return this.formatTypeInput === '' ? 'decimal' : this.formatTypeInput;
  }

  ngOnInit(): void {
    if (this.control && this.control.control) {
      // Initial format from the control's value
      this.formatValue(this.control.control.value);

      // Listen for programmatic changes
      this.control.control.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          if (this.el.nativeElement !== document.activeElement) {
            this.formatValue(value);
          }
        });
    } else {
      // For non-form-control inputs, format the initial value from the element itself
      this.formatValue(this.el.nativeElement.value);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('focus')
  onFocus() {
    const value = this.el.nativeElement.value;
    if (value) {
      const parsedValue = this.parseValue(value);
      this.el.nativeElement.value = parsedValue;
    }
  }

  @HostListener('blur')
  onBlur() {
    if (this.control && this.control.control) {
      // If the control's value is null or undefined (e.g., user cleared the input), set it to 0
      if (this.control.control.value === null || this.control.control.value === undefined) {
        // This will trigger valueChanges, which in turn calls formatValue
        this.control.control.setValue(0);
        return;
      }
    }
    // For controls that already have a value, or for non-form-control inputs,
    // just format the current value.
    this.formatValue(this.el.nativeElement.value);
  }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    if (this.control && this.control.control) {
      const parsedValue = this.parseValue(value);
      const controlValue = this.control.control.value;
      if (parsedValue !== controlValue) {
        this.control.control.setValue(parsedValue, { emitEvent: false });
      }
    }
    // For non-control inputs, the value is already in the element.
    // The (input) event handler on the component is responsible for updating the component property.
  }

  private formatValue(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') {
      this.el.nativeElement.value = '';
      return;
    }

    const parsed = this.parseValue(value.toString());
    if (parsed === null) {
      this.el.nativeElement.value = '';
      return;
    }

    const options: Intl.NumberFormatOptions = {
      useGrouping: true,
    };

    if (this.formatType === 'integer') {
      options.minimumFractionDigits = 0;
      options.maximumFractionDigits = 0;
    } else { // 'decimal'
      options.minimumFractionDigits = 2;
      options.maximumFractionDigits = 4;
    }

    this.el.nativeElement.value = parsed.toLocaleString('th-TH', options);
  }

  private parseValue(value: string | null | undefined): number | null {
    if (value === null || value === undefined || value.toString().trim() === '') {
      return null;
    }
    const cleanedValue = value.toString().replace(/,/g, '').replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanedValue);
    return isNaN(num) ? null : num;
  }
}
