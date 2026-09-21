/**
 * Intelligent Column Type and Meaning Detector with Canonical Metric Mapping
 * Context-aware for VIGOR Group sectors and abbreviations
 */

import { ColumnType, ColumnMeaning, ConfidenceLevel } from '../types';
import { CanonicalMetricId, CANONICAL_METRICS } from '../data/canonicalMetrics';

interface DetectionResult {
  type: ColumnType;
  meaning: ColumnMeaning;
  canonicalMetric: CanonicalMetricId;
  confidence: ConfidenceLevel;
  confidenceReason?: string;
  isCurrency: boolean;
  currencySymbol?: string;
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

export function cleanHeaderName(header: string): string {
  if (!header) return 'Column';
  return String(header).trim();
}

/**
 * Normalizes header string for alias comparisons
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_\s-]+/g, ' ')
    .replace(/[^a-z0-9 %]/g, '')
    .trim();
}

export function detectColumnTypeAndMeaning(
  header: string,
  values: any[],
  sectorId?: string
): DetectionResult {
  const normHeader = normalizeHeader(header);
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

  let type: ColumnType = 'text';
  let meaning: ColumnMeaning = 'General Text';
  let canonicalMetric: CanonicalMetricId = 'unmapped';
  let confidence: ConfidenceLevel = 'high';
  let confidenceReason: string | undefined = undefined;
  let isCurrency = false;
  let currencySymbol: string | undefined = undefined;

  // Currency symbols check
  const hasDollar = nonNullValues.some(v => typeof v === 'string' && v.includes('$'));
  const hasTZS = nonNullValues.some(v => typeof v === 'string' && (v.toUpperCase().includes('TZS') || v.toUpperCase().includes('SHS')));
  const hasEUR = nonNullValues.some(v => typeof v === 'string' && (v.includes('€') || v.toUpperCase().includes('EUR')));
  const hasGBP = nonNullValues.some(v => typeof v === 'string' && (v.includes('£') || v.toUpperCase().includes('GBP')));

  if (hasTZS) currencySymbol = 'TZS';
  else if (hasDollar) currencySymbol = '$';
  else if (hasEUR) currencySymbol = '€';
  else if (hasGBP) currencySymbol = '£';

  // Count numeric and date instances
  let numericCount = 0;
  let dateCount = 0;

  for (const val of nonNullValues.slice(0, 100)) {
    if (typeof val === 'number') {
      numericCount++;
    } else if (typeof val === 'string') {
      const s = val.trim();
      const stripped = s.replace(/^\((.+)\)$/, '-$1').replace(/[\$,\s€£%]/g, '').replace(/\b(tzs|tsh|usd|eur|gbp)\b/gi, '').replace(/,/g, '').trim();
      if (!isNaN(Number(stripped)) && stripped.length > 0 && !/^#(VALUE|DIV\/0|N\/A)/i.test(s)) {
        numericCount++;
      } else if (!isNaN(Date.parse(s)) && (s.includes('-') || s.includes('/') || s.includes('.'))) {
        dateCount++;
      } else if (MONTH_NAMES.includes(s.toLowerCase().trim())) {
        dateCount++;
      }
    }
  }

  const sampleSize = Math.min(nonNullValues.length, 100);
  const isMostlyNumeric = sampleSize > 0 && numericCount / sampleSize >= 0.7;
  const isMostlyDate = sampleSize > 0 && dateCount / sampleSize >= 0.7;

  // 1. DATE / TIME DETECTION
  if (
    isMostlyDate ||
    MONTH_NAMES.includes(normHeader) ||
    normHeader === 'month' ||
    normHeader === 'date' ||
    normHeader === 'period' ||
    normHeader === 'reporting period' ||
    normHeader === 'year' ||
    normHeader === 'quarter' ||
    normHeader === 'week' ||
    normHeader === 'day'
  ) {
    type = 'date';
    meaning = 'Time Period';
    canonicalMetric = 'time_period';
    confidence = 'high';
    return { type, meaning, canonicalMetric, confidence, isCurrency: false };
  }

  // 2. PERCENTAGE DETECTION
  if (
    normHeader.includes('percent') ||
    normHeader.includes('pct') ||
    normHeader.includes('%') ||
    normHeader.includes('margin') ||
    normHeader.includes('ratio') ||
    nonNullValues.some(v => typeof v === 'string' && v.includes('%'))
  ) {
    type = 'percentage';
    meaning = 'Variance';
    canonicalMetric = 'variance';
    confidence = 'high';
    return { type, meaning, canonicalMetric, confidence, isCurrency: false };
  }

  // 3. CANONICAL ALIAS MATCHING WITH SECTOR AFFINITY
  let bestMatch: { id: CanonicalMetricId; score: number } | null = null;

  for (const [metricId, def] of Object.entries(CANONICAL_METRICS) as [CanonicalMetricId, typeof CANONICAL_METRICS[CanonicalMetricId]][]) {
    for (const alias of def.aliases) {
      const normAlias = normalizeHeader(alias);
      if (normHeader === normAlias) {
        let score = 100;
        if (def.sectorAffinity && sectorId && def.sectorAffinity.includes(sectorId)) {
          score += 20; // Sector boost
        }
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: metricId, score };
        }
      } else if (normHeader.includes(normAlias) || normAlias.includes(normHeader)) {
        let score = 50;
        if (def.sectorAffinity && sectorId && def.sectorAffinity.includes(sectorId)) {
          score += 15;
        }
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { id: metricId, score };
        }
      }
    }
  }

  if (bestMatch && bestMatch.score >= 50) {
    canonicalMetric = bestMatch.id;
    const def = CANONICAL_METRICS[canonicalMetric];

    if (bestMatch.score >= 100) {
      confidence = 'high';
    } else {
      confidence = 'medium';
      confidenceReason = `Matched alias for ${def.displayName}`;
    }

    // Set appropriate semantic meaning and type
    if (def.typicalUnit === 'Currency') {
      type = 'currency';
      isCurrency = true;
      currencySymbol = currencySymbol || 'TZS';
    } else if (def.typicalUnit === 'Hours' || def.typicalUnit === 'Units' || def.typicalUnit === 'Passengers' || def.typicalUnit === 'Room Nights') {
      type = 'number';
    }

    // Map canonical metric to UI meaning
    if (canonicalMetric === 'revenue') meaning = 'Revenue';
    else if (canonicalMetric === 'target_revenue') meaning = 'Revenue';
    else if (canonicalMetric === 'profit') meaning = 'Actual Metric';
    else if (canonicalMetric === 'target_profit') meaning = 'Estimated Metric';
    else if (canonicalMetric === 'cost') meaning = 'Cost / Expense';
    else if (canonicalMetric === 'loss') meaning = 'Loss';
    else if (canonicalMetric === 'target_production') meaning = 'Production Target';
    else if (canonicalMetric === 'actual_production') meaning = 'Production Output';
    else if (canonicalMetric === 'downtime') meaning = 'Downtime';
    else if (canonicalMetric === 'waste') meaning = 'Waste / Defects';
    else if (canonicalMetric === 'rooms_available') meaning = 'Rooms Available';
    else if (canonicalMetric === 'rooms_sold') meaning = 'Rooms Sold';
    else if (canonicalMetric === 'guests') meaning = 'Guests';
    else if (canonicalMetric === 'patients') meaning = 'Patients';
    else if (canonicalMetric === 'admissions') meaning = 'Admissions';
    else if (canonicalMetric === 'units_total') meaning = 'Units Total';
    else if (canonicalMetric === 'units_sold') meaning = 'Units Sold';
    else if (canonicalMetric === 'passengers') meaning = 'Passengers';
    else if (canonicalMetric === 'trips') meaning = 'Trips';
    else if (canonicalMetric === 'department' || canonicalMetric === 'branch') meaning = 'Department / Branch';
    else if (canonicalMetric === 'category') meaning = 'Category / Dimension';

    return { type, meaning, canonicalMetric, confidence, confidenceReason, isCurrency, currencySymbol };
  }

  // 4. GENERAL NUMERIC OR CURRENCY FALLBACK
  if (isMostlyNumeric || hasDollar || hasTZS || hasEUR || hasGBP) {
    if (hasDollar || hasTZS || hasEUR || hasGBP || normHeader.includes('price') || normHeader.includes('cost') || normHeader.includes('amount') || normHeader.includes('value')) {
      type = 'currency';
      isCurrency = true;
      currencySymbol = currencySymbol || 'TZS';
      meaning = 'Actual Metric';
      canonicalMetric = 'revenue';
      confidence = 'medium';
    } else {
      type = 'number';
      meaning = 'Quantity / Volume';
      confidence = 'medium';
    }
    return { type, meaning, canonicalMetric, confidence, isCurrency, currencySymbol };
  }

  // 5. CATEGORICAL VS TEXT
  const uniqueCount = new Set(nonNullValues.map(String)).size;
  if (uniqueCount <= 25 && nonNullValues.length >= 2) {
    type = 'category';
    meaning = 'Category / Dimension';
    canonicalMetric = 'category';
    confidence = 'high';
  } else if (normHeader.includes('id') || normHeader.includes('code') || normHeader.includes('sku') || normHeader.includes('number')) {
    type = 'identifier';
    meaning = 'Identifier / ID';
    confidence = 'high';
  } else {
    type = 'text';
    meaning = 'General Text';
    canonicalMetric = 'unmapped';
    confidence = 'low';
    confidenceReason = 'Could not confidently determine a standard business metric for this column.';
  }

  return { type, meaning, canonicalMetric, confidence, confidenceReason, isCurrency, currencySymbol };
}

/**
 * Clean and parse numeric values from spreadsheet cells
 * Handles accounting negatives (123.45), currencies, percentages, and Excel error codes
 */
export function parseCleanNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isFinite(val) && !isNaN(val) ? val : null;
  }
  if (typeof val !== 'string') return null;

  const s = val.trim();
  if (!s || s === '') return null;

  // Excel accounting dashes often represent 0
  if (s === '-' || s === '–' || s === '—') return 0;

  // Excel formula error strings
  if (/^#(DIV\/0!|N\/A|VALUE!|REF!|NAME\?|NUM!|NULL!)/i.test(s)) {
    return null;
  }

  // Handle accounting format: (1,234.56) -> -1234.56
  let cleanStr = s;
  let isNegative = false;
  if (cleanStr.startsWith('(') && cleanStr.endsWith(')')) {
    isNegative = true;
    cleanStr = cleanStr.slice(1, -1);
  }

  // Remove currency symbols, commas, and percentage signs
  cleanStr = cleanStr.replace(/[\$,\s€£%]/g, '').replace(/\b(tzs|tsh|usd|eur|gbp)\b/gi, '').trim();

  const num = Number(cleanStr);
  if (isNaN(num)) return null;

  return isNegative ? -num : num;
}
