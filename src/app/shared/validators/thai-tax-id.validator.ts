export function isValidThaiTaxId(taxId: string): boolean {
  if (!taxId || taxId.length !== 13 || !/^\d{13}$/.test(taxId)) {
    return false; // ต้องเป็นตัวเลข 13 หลักเท่านั้น
  }

  const digits = taxId.split('').map(d => parseInt(d, 10));

  // น้ำหนัก
  const weights = [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * weights[i];
  }

  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === digits[12];
}