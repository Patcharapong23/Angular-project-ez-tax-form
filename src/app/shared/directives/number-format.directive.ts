import { Directive, ElementRef, HostListener, OnInit } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appNumberFormat]',
})
export class NumberFormatDirective implements OnInit {
  private el: HTMLInputElement;

  constructor(
    private elementRef: ElementRef,
    private ngControl: NgControl
  ) {
    this.el = this.elementRef.nativeElement;
  }

  ngOnInit() {
    // Initially format the value on load
    this.format(this.el.value);
  }

  @HostListener('focus', ['$event.target.value'])
  onFocus(value: string) {
    this.unformat(value);
  }

  @HostListener('blur', ['$event.target.value'])
  onBlur(value: string) {
    this.format(value);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const allowedKeys = [
      'Backspace',
      'Tab',
      'End',
      'Home',
      'ArrowLeft',
      'ArrowRight',
      'Delete',
    ];

    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X (and metaKey for Mac)
    if (
      (event.key === 'a' && (event.ctrlKey || event.metaKey)) ||
      (event.key === 'c' && (event.ctrlKey || event.metaKey)) ||
      (event.key === 'v' && (event.ctrlKey || event.metaKey)) ||
      (event.key === 'x' && (event.ctrlKey || event.metaKey))
    ) {
      return; // let it happen
    }

    if (allowedKeys.includes(event.key)) {
      return; // let it happen
    }

    // Handle decimal point
    if (event.key === '.' && !this.el.value.includes('.')) {
      return; // allow single decimal point
    }

    // Ensure that it is a number and stop the keypress
    const isNumber = event.key >= '0' && event.key <= '9';
    if (!isNumber) {
      event.preventDefault();
    }
  }

  private format(value: string | null) {
    if (value === null || value === '') {
      this.ngControl.control?.setValue(null);
      this.el.value = '';
      return;
    }

    const numericValue = parseFloat(value.toString().replace(/,/g, ''));
    if (isNaN(numericValue)) {
      return;
    }

    // Update the model value
    this.ngControl.control?.setValue(numericValue);

    // Format the view value
    // Use toLocaleString to format with commas and handle decimals
    this.el.value = numericValue.toLocaleString('en-US', {
      maximumFractionDigits: 4,
      minimumFractionDigits: 0,
    });
  }

  private unformat(value: string | null) {
    if (value === null || value === '') {
      this.ngControl.control?.setValue(null);
      this.el.value = '';
      return;
    }
    // When focusing, show the raw number without commas
    const unformattedValue = value.toString().replace(/,/g, '');
    this.el.value = unformattedValue;
  }
}