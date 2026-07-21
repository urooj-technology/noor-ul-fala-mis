/** Persian (Extended Arabic-Indic) digits ۰-۹ */
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
/** Arabic-Indic digits ٠-٩ */
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/**
 * Convert Persian / Arabic-Indic digits to Latin 0-9.
 * Also normalizes common decimal separators to `.`
 */
export function toLatinDigits(value: string): string {
  if (!value) return '';

  let result = '';
  for (const char of value) {
    const persianIndex = PERSIAN_DIGITS.indexOf(char);
    if (persianIndex !== -1) {
      result += String(persianIndex);
      continue;
    }
    const arabicIndex = ARABIC_DIGITS.indexOf(char);
    if (arabicIndex !== -1) {
      result += String(arabicIndex);
      continue;
    }
    // Arabic decimal separator ٫ and Arabic thousands separator ٬, plus comma
    if (char === '٫' || char === ',' || char === '٬') {
      result += char === '٬' ? '' : '.';
      continue;
    }
    result += char;
  }
  return result;
}

export type NormalizeNumericOptions = {
  /** Allow a decimal point and fractional digits. Default true. */
  allowDecimal?: boolean;
  /** Allow a leading minus. Default false. */
  allowNegative?: boolean;
  /** Max digits after decimal. Undefined = unlimited (while typing). */
  maxDecimals?: number;
};

/**
 * Normalize user input into a Latin numeric string safe for forms/API.
 * Keeps intermediate states like "" , "." , "12." while typing.
 */
export function normalizeNumericInput(
  raw: string,
  options: NormalizeNumericOptions = {},
): string {
  const { allowDecimal = true, allowNegative = false, maxDecimals } = options;
  let value = toLatinDigits(String(raw ?? ''));

  // Strip everything except digits, dot, minus
  value = value.replace(/[^\d.-]/g, '');

  const negative = allowNegative && value.startsWith('-');
  value = value.replace(/-/g, '');
  if (negative) value = `-${value}`;

  if (!allowDecimal) {
    value = value.replace(/\./g, '');
    return value;
  }

  // Keep only the first decimal point
  const minus = value.startsWith('-') ? '-' : '';
  const unsigned = minus ? value.slice(1) : value;
  const firstDot = unsigned.indexOf('.');
  if (firstDot === -1) {
    return minus + unsigned;
  }

  const intPart = unsigned.slice(0, firstDot);
  let fracPart = unsigned.slice(firstDot + 1).replace(/\./g, '');
  if (typeof maxDecimals === 'number') {
    fracPart = fracPart.slice(0, maxDecimals);
  }
  return `${minus}${intPart}.${fracPart}`;
}

/**
 * Parse a localized / partially typed numeric string to a finite number.
 * Returns null for empty or incomplete values like "" or "." or "-".
 */
export function parseLocalizedNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (value === null || value === undefined) return null;

  const normalized = normalizeNumericInput(String(value), {
    allowDecimal: true,
    allowNegative: true,
  }).trim();

  if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') {
    return null;
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

/** Parse to number for submit; empty → fallback (default 0). */
export function toNumberOr(
  value: string | number | null | undefined,
  fallback = 0,
): number {
  return parseLocalizedNumber(value) ?? fallback;
}
