// Strict amount input formatter — accepts only digits + a single comma/dot
// and caps at 2 decimal places. Returns the sanitized string using ","
// as separator (display form). Use `toNumeric()` to convert back to a
// number-string with "." for storage.
export function sanitizeAmountInput(raw) {
  let s = String(raw ?? '');
  // unify separator → comma
  s = s.replace(/\./g, ',');
  // strip anything that isn't a digit or comma
  s = s.replace(/[^0-9,]/g, '');
  const parts = s.split(',');
  if (parts.length <= 1) return parts[0] || '';
  // keep first comma; merge remaining digits, cap at 2 decimals
  return parts[0] + ',' + parts.slice(1).join('').slice(0, 2);
}

// Convert the sanitised display string ("12,30") to a numeric-string ("12.30")
// suitable for storage / parseFloat.
export function amountInputToNumeric(displayValue) {
  return String(displayValue ?? '').replace(',', '.');
}
