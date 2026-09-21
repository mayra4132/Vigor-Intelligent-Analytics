/**
 * Month Header Normalizer & Numeric Value Sanitizer for VIGOR Analytics
 * 
 * Handles all header variations:
 * - ACT JAN, Actual Jan, Jan, January
 * - ACT FEB, Actual Feb, Feb, February
 * - ACT MAR, Actual Mar, Mar, March
 * - ACT APR, Actual Apr, Apr, April
 * - ACT MAY, Actual May, May
 * - ACT JUNE, ACT JUN, Actual June, Jun, June
 * - ACT JULY, ACT JUL, Actual July, Jul, July
 * - ACT AUG, Actual Aug, Aug, August
 * - SEP / SEPT / SEPTEMBER
 * - OCT / OCTOBER
 * - NOV / NOVEMBER
 * - DEC / DECEMBER
 * 
 * Sanitizes numeric values for Recharts (returns number or null, never NaN, empty string, or error strings).
 */

export interface NormalizedMonthHeader {
  monthKey: string;   // 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  monthName: string;  // 'January', 'February', etc.
  monthIndex: number; // 0 to 11
  isYTD: boolean;
  isActual: boolean;
  isPlan: boolean;
  isSply: boolean;
}

export const MONTH_NAMES_MAP: Record<string, { name: string; index: number }> = {
  Jan: { name: 'January', index: 0 },
  Feb: { name: 'February', index: 1 },
  Mar: { name: 'March', index: 2 },
  Apr: { name: 'April', index: 3 },
  May: { name: 'May', index: 4 },
  Jun: { name: 'June', index: 5 },
  Jul: { name: 'July', index: 6 },
  Aug: { name: 'August', index: 7 },
  Sep: { name: 'September', index: 8 },
  Oct: { name: 'October', index: 9 },
  Nov: { name: 'November', index: 10 },
  Dec: { name: 'December', index: 11 }
};

export const MONTH_KEYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Normalizes header string to detect month name, index, and whether it's a monthly actual vs YTD
 */
export function normalizeMonthHeader(header: string | undefined | null): NormalizedMonthHeader | null {
  if (!header) return null;
  const raw = String(header).trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  const isYTD = upper.includes('YTD') || upper.includes('CUMULATIVE') || upper.includes('YEAR TO DATE');
  const isPlan = upper.includes('PLAN') || upper.includes('BUDGET') || upper.includes('TARGET');
  const isSply = upper.includes('SPLY') || upper.includes('PRIOR') || upper.includes('LAST YEAR');
  const isActual = !isPlan && !isSply;

  // Ordered check for month matching (handle JUNE before JUN, JULY before JUL, etc.)
  const monthDefinitions: { key: string; regex: RegExp }[] = [
    { key: 'Jan', regex: /\b(JANUARY|JAN)\b|(?:\bACT(?:UAL)?\s*JAN)/i },
    { key: 'Feb', regex: /\b(FEBRUARY|FEB)\b|(?:\bACT(?:UAL)?\s*FEB)/i },
    { key: 'Mar', regex: /\b(MARCH|MAR)\b|(?:\bACT(?:UAL)?\s*MAR)/i },
    { key: 'Apr', regex: /\b(APRIL|APR)\b|(?:\bACT(?:UAL)?\s*APR)/i },
    { key: 'May', regex: /\bMAY\b|(?:\bACT(?:UAL)?\s*MAY)/i },
    { key: 'Jun', regex: /\b(JUNE|JUN)\b|(?:\bACT(?:UAL)?\s*JUN)/i },
    { key: 'Jul', regex: /\b(JULY|JUL)\b|(?:\bACT(?:UAL)?\s*JUL)/i },
    { key: 'Aug', regex: /\b(AUGUST|AUG)\b|(?:\bACT(?:UAL)?\s*AUG)/i },
    { key: 'Sep', regex: /\b(SEPTEMBER|SEPT|SEP)\b|(?:\bACT(?:UAL)?\s*SEP)/i },
    { key: 'Oct', regex: /\b(OCTOBER|OCT)\b|(?:\bACT(?:UAL)?\s*OCT)/i },
    { key: 'Nov', regex: /\b(NOVEMBER|NOV)\b|(?:\bACT(?:UAL)?\s*NOV)/i },
    { key: 'Dec', regex: /\b(DECEMBER|DEC)\b|(?:\bACT(?:UAL)?\s*DEC)/i }
  ];

  for (const def of monthDefinitions) {
    if (def.regex.test(upper)) {
      const meta = MONTH_NAMES_MAP[def.key];
      return {
        monthKey: def.key,
        monthName: meta.name,
        monthIndex: meta.index,
        isYTD,
        isActual,
        isPlan,
        isSply
      };
    }
  }

  return null;
}

/**
 * Robust numeric normalizer for Recharts
 * Ensures values are real JavaScript numbers or null (NEVER undefined, "", "#DIV/0!", or NaN)
 * Does NOT convert unavailable values into zero.
 */
export function normalizeNumericValue(val: any): number | null {
  if (val === null || val === undefined) return null;

  if (typeof val === 'number') {
    return isFinite(val) && !isNaN(val) ? val : null;
  }

  if (typeof val === 'string') {
    const s = val.trim();
    if (!s || s === '' || s === '-' || s === '–' || s === '—') return null;

    // Excel formula error codes
    if (s.startsWith('#')) return null;

    // Accounting format negative numbers: (1,234.56) -> -1234.56
    let cleanStr = s;
    let isNegative = false;
    if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
      isNegative = true;
      cleanStr = cleanStr.slice(1, -1).trim();
    }

    // Strip currency symbols, commas, spaces, percentage signs, and currency abbreviations
    cleanStr = cleanStr
      .replace(/[\$,€£%]/g, '')
      .replace(/[, \t]/g, '')
      .replace(/\b(tzs|mtzs|shs|usd|eur|gbp)\b/gi, '')
      .trim();

    if (!cleanStr) return null;

    const num = Number(cleanStr);
    if (isNaN(num) || !isFinite(num)) return null;

    return isNegative ? -num : num;
  }

  return null;
}
