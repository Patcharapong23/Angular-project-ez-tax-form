import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

export interface CalculationTotals {
  subtotal: number;
  discount: number;
  netAfterDiscount: number;
  vat: number;
  grand: number;
}

@Injectable({
  providedIn: 'root'
})
export class CalculationService {

  constructor() { }

  calculateTotals(
    itemForms: FormGroup[],
    vatType: string,
    serviceFee: number,
    shippingFee: number,
    headerTax: number,
    use4Decimals: boolean
  ): CalculationTotals {
    const rows = itemForms.map((f) => f.getRawValue());

    let subtotal = 0;
    let discountTotal = 0;

    // Calculate subtotal and discount from items
    for (const r of rows) {
      const qty = Number(r.qty) || 0;
      const price = Number(r.price) || 0;
      const discount = Number(r.discount) || 0;

      const lineAmount = qty * price;
      subtotal += lineAmount;
      discountTotal += discount;
    }

    // New formula:
    // จำนวนเงินที่เสียภาษีมูลค่าเพิ่ม = (รวมราคาสินค้า - รวมส่วนลดทั้งหมด) + ค่าบริการ
    const taxableAmount = (subtotal - discountTotal) + serviceFee;
    
    // จำนวนภาษีมูลค่าเพิ่ม = จำนวนเงินที่เสียภาษีมูลค่าเพิ่ม * อัตราภาษี%
    const taxRate = headerTax > 0 ? headerTax : 7; // Default 7%
    let vatTotal = 0;
    
    if (vatType === 'include') {
      // ราคารวมภาษีแล้ว - VAT is already in the price
      vatTotal = taxableAmount - (taxableAmount / (1 + taxRate / 100));
    } else {
      // ราคาไม่รวมภาษี - VAT is calculated on top
      vatTotal = taxableAmount * (taxRate / 100);
    }

    // จำนวนเงินรวมทั้งสิ้น = จำนวนเงินที่เสียภาษีมูลค่าเพิ่ม + จำนวนภาษีมูลค่าเพิ่ม
    const grand = vatType === 'include' 
      ? taxableAmount  // Price already includes VAT
      : taxableAmount + vatTotal;

    return {
      subtotal: this.round(subtotal, use4Decimals),
      discount: this.round(discountTotal, use4Decimals),
      netAfterDiscount: this.round(taxableAmount, use4Decimals), // This is now taxableAmount
      vat: this.round(vatTotal, use4Decimals),
      grand: this.round(grand, use4Decimals),
    };
  }

  round(v: number, use4Decimals: boolean): number {
    const decimals = use4Decimals ? 4 : 2;
    return Number(v.toFixed(decimals));
  }

  formatNumber(v: number, use4Decimals: boolean): string {
    const num = Number.isFinite(v) ? v : 0;
    const decimals = use4Decimals ? 4 : 2;
    return num.toLocaleString('th-TH', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
}
