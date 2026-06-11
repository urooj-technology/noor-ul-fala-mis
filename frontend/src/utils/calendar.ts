/**
 * Afghanistan Calendar Utilities
 * Supports: Shamsi (Jalali/Persian Solar), Qamari (Hijri Lunar)
 * 
 * Note: Afghanistan uses the same Shamsi calendar as Iran (Jalali),
 * with Dari and Pashto month names.
 */

import { CalendarType } from '@/contexts/CalendarContext';

// Afghanistan Dari month names for Shamsi calendar
export const SHAMSI_MONTHS_DARI = [
  'حمل',      // Aries - March 21 - April 20
  'ثور',      // Taurus - April 21 - May 21
  'جوزا',     // Gemini - May 22 - June 21
  'سرطان',    // Cancer - June 22 - July 22
  'اسد',      // Leo - July 23 - August 22
  'سنبله',    // Virgo - August 23 - September 22
  'میزان',    // Libra - September 23 - October 22
  'عقرب',     // Scorpio - October 23 - November 21
  'قوس',      // Sagittarius - November 22 - December 21
  'جدی',      // Capricorn - December 22 - January 19
  'دلو',      // Aquarius - January 20 - February 18
  'حوت',      // Pisces - February 19 - March 20
];

// Afghanistan Pashto month names for Shamsi calendar
export const SHAMSI_MONTHS_PASHTO = [
  'وری',      // Wray
  'غوی',      // Ghway
  'غبرګولی',  // Ghbargolay
  'چنګاښ',    // Chungash
  'زمری',     // Zmaray
  'وږی',      // Wazhay
  'تله',      // Tala
  'لړم',      // Laram
  'لیندۍ',    // Linday
  'مرغومی',   // Marghumay
  'سلواغه',   // Salwagha
  'کب',       // Kab
];

// Hijri Qamari month names (Arabic - same for Dari/Pashto)
export const QAMARI_MONTHS = [
  'محرم الحرام',
  'صفر المظفر',
  'ربيع الاول',
  'ربيع الثاني',
  'جمادی الاول',
  'جمادی الثاني',
  'رجب المرجب',
  'شعبان المعظم',
  'رمضان المبارک',
  'شوال المکرم',
  'ذی القعده',
  'ذی الحجه',
];

// Days in each Shamsi month
const SHAMSI_DAYS_IN_MONTH = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

/**
 * Check if a Shamsi year is a leap year
 */
export function isShamsiLeapYear(year: number): boolean {
  const a = [1, 5, 9, 13, 17, 22, 26, 30];
  const b = year % 33;
  return a.includes(b);
}

/**
 * Get days in Shamsi month
 */
export function getShamsiDaysInMonth(year: number, month: number): number {
  if (month === 12 && isShamsiLeapYear(year)) {
    return 30;
  }
  return SHAMSI_DAYS_IN_MONTH[month - 1] || 0;
}

/**
 * Convert Gregorian to Shamsi (Jalali)
 * Based on algorithm by Kazimierz M. Borkowski
 */
export function gregorianToShamsi(gy: number, gm: number, gd: number): { year: number; month: number; day: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) 
    + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  
  if (days > 365) days = (days - 1) % 365;
  
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  
  return { year: jy, month: jm, day: jd };
}

/**
 * Convert Shamsi (Jalali) to Gregorian
 */
export function shamsiToGregorian(jy: number, jm: number, jd: number): { year: number; month: number; day: number } {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  
  let days = (365 * jy) + Math.floor(jy / 33) * 8 + Math.floor((jy % 33 + 3) / 4) 
    + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  
  const gd = days + 1;
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    // Loop through months
  }
  
  const gDay = gd - sal_a[gm - 1];
  
  return { year: gy, month: gm, day: gDay };
}

/**
 * Convert Gregorian to Hijri Qamari
 * Simplified astronomical approximation
 */
export function gregorianToQamari(gy: number, gm: number, gd: number): { year: number; month: number; day: number } {
  // Julian Day Number calculation
  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  
  let jdn = gd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) 
    - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  // Hijri calculation
  const l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) 
    + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) 
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l3) / 709);
  const day = l3 - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  
  return { year, month, day };
}

/**
 * Convert Hijri Qamari to Gregorian
 */
export function qamariToGregorian(hy: number, hm: number, hd: number): { year: number; month: number; day: number } {
  // Hijri to Julian Day Number
  const jdn = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm 
    - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
  
  // Julian Day Number to Gregorian
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const m = Math.floor((5 * e + 2) / 153);
  
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  
  return { year, month, day };
}

/**
 * Format Shamsi date
 */
export function formatShamsi(year: number, month: number, day: number, lang: 'fa' | 'ps' = 'fa'): string {
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/**
 * Format Qamari date
 */
export function formatQamari(year: number, month: number, day: number): string {
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

/**
 * Parse a Shamsi date string (YYYY/MM/DD or YYYY-MM-DD)
 */
export function parseShamsiString(shamsiStr: string): { year: number; month: number; day: number } | null {
  try {
    const separator = shamsiStr.includes('/') ? '/' : '-';
    const parts = shamsiStr.split(separator);
    if (parts.length === 3) {
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        day: parseInt(parts[2], 10),
      };
    }
  } catch {
    // Invalid format
  }
  return null;
}

/**
 * Convert Date object or string to Shamsi
 */
export function dateToShamsi(date: Date | string): { year: number; month: number; day: number; formatted: string } | null {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;
    
    const { year, month, day } = gregorianToShamsi(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return {
      year,
      month,
      day,
      formatted: `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
    };
  } catch {
    return null;
  }
}

/**
 * Convert Date object or string to Qamari
 */
export function dateToQamari(date: Date | string): { year: number; month: number; day: number; formatted: string } | null {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;
    
    const { year, month, day } = gregorianToQamari(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return {
      year,
      month,
      day,
      formatted: `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
    };
  } catch {
    return null;
  }
}

/**
 * Convert Shamsi to ISO date string (YYYY-MM-DD)
 */
export function shamsiToISO(year: number, month: number, day: number): string {
  const { year: gy, month: gm, day: gd } = shamsiToGregorian(year, month, day);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

/**
 * Convert Qamari to ISO date string (YYYY-MM-DD)
 */
export function qamariToISO(year: number, month: number, day: number): string {
  const { year: gy, month: gm, day: gd } = qamariToGregorian(year, month, day);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

/**
 * Get current Shamsi date
 */
export function getCurrentShamsi(): { year: number; month: number; day: number; formatted: string } {
  const now = new Date();
  return dateToShamsi(now)!;
}

/**
 * Get current Qamari date
 */
export function getCurrentQamari(): { year: number; month: number; day: number; formatted: string } {
  const now = new Date();
  return dateToQamari(now)!;
}

/**
 * Format date based on calendar type
 * This is a unified function that formats any date according to the selected calendar type
 */
export function formatDateByCalendarType(
  date: Date | string,
  calendarType: CalendarType,
  lang: 'fa' | 'ps' = 'fa'
): string {
  if (calendarType === 'shamsi') {
    const shamsi = dateToShamsi(date);
    if (shamsi) {
      return formatShamsi(shamsi.year, shamsi.month, shamsi.day, lang);
    }
  } else if (calendarType === 'qamari') {
    const qamari = dateToQamari(date);
    if (qamari) {
      return formatQamari(qamari.year, qamari.month, qamari.day);
    }
  }
  
  // Fallback to original date string
  if (typeof date === 'string') {
    return date;
  }
  return date.toLocaleDateString();
}

/**
 * Get current year based on calendar type
 */
export function getCurrentYear(calendarType: CalendarType): number {
  if (calendarType === 'shamsi') {
    const shamsi = getCurrentShamsi();
    return shamsi.year;
  } else if (calendarType === 'qamari') {
    const qamari = getCurrentQamari();
    return qamari.year;
  }
  return new Date().getFullYear();
}

/**
 * Get years array based on calendar type
 */
export function getYearsArray(calendarType: CalendarType, length: number = 10): number[] {
  const currentYear = getCurrentYear(calendarType);
  return Array.from({ length }, (_, i) => currentYear - Math.floor(length / 2) + i);
}

/**
 * Return month names array based on calendar type and language
 */
export function getMonthNames(calendarType: CalendarType, lang: 'fa' | 'ps' = 'fa'): string[] {
  if (calendarType === 'shamsi') {
    return lang === 'ps' ? SHAMSI_MONTHS_PASHTO : SHAMSI_MONTHS_DARI;
  }
  if (calendarType === 'qamari') {
    return QAMARI_MONTHS;
  }
  // Fallback to Gregorian English month names
  return Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'long' }));
}
