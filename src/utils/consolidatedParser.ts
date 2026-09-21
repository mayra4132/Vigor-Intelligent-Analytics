/**
 * VIGOR Group Consolidated Sheet Parser
 * Optimized for rapid, resilient in-browser extraction of the "CONSOLIDATED" worksheet.
 * 
 * Specifically extracts:
 * - Operational Performance section (Units, Volumes, Collections, Debtors)
 * - Financial Performance section (Revenue, GP, OPEX, EBITDA, Net Profit)
 * - Actuals through August 2026 (excludes future Sep-Dec placeholder zeroes)
 * - Computes clean variances, achievements, and growths safely from source values
 * - Recovers gracefully from #DIV/0!, #REF!, and formula errors
 */

import * as XLSX from 'xlsx';
import {
  ConsolidatedPerformanceData,
  NormalizedMetric,
  Dataset
} from '../types';
import { parseCleanNumber } from './typeDetector';
import {
  normalizeMonthHeader,
  normalizeNumericValue,
  MONTH_KEYS,
  NormalizedMonthHeader
} from './monthNormalizer';

export { normalizeMonthHeader, normalizeNumericValue, MONTH_KEYS };
export type { NormalizedMonthHeader };

export interface ParseConsolidatedResult {
  success: boolean;
  consolidatedData?: ConsolidatedPerformanceData;
  error?: string;
  sheetNames: string[];
}

/**
 * Safely extract and clean cell value from SheetJS cell object
 */
function getCellValue(cell: any): { num: number | null; text: string; isError: boolean } {
  if (cell === null || cell === undefined) {
    return { num: null, text: '', isError: false };
  }

  // Formula error flags in SheetJS
  if (cell.t === 'e' || (typeof cell.v === 'string' && cell.v.trim().startsWith('#'))) {
    return { num: null, text: String(cell.v || cell.w || '#ERROR!'), isError: true };
  }

  if (typeof cell.v === 'number') {
    if (!isFinite(cell.v) || isNaN(cell.v)) {
      return { num: null, text: '', isError: true };
    }
    return { num: cell.v, text: String(cell.w || cell.v), isError: false };
  }

  if (typeof cell.v === 'string') {
    const s = cell.v.trim();
    if (s.startsWith('#DIV/0!') || s.startsWith('#REF!') || s.startsWith('#N/A') || s.startsWith('#VALUE!') || s.startsWith('#NAME?')) {
      return { num: null, text: s, isError: true };
    }
    const clean = parseCleanNumber(s);
    return { num: clean, text: s, isError: false };
  }

  return { num: null, text: String(cell.v || ''), isError: false };
}

/**
 * Locate the CONSOLIDATED sheet in a workbook
 */
export function findConsolidatedSheetName(sheetNames: string[]): string | null {
  // 1. Exact match (case-insensitive, trimmed)
  const exact = sheetNames.find(s => s.trim().toUpperCase() === 'CONSOLIDATED');
  if (exact) return exact;

  // 2. Starts with or contains CONSOLIDAT
  const partial = sheetNames.find(s => s.toUpperCase().includes('CONSOLIDAT'));
  if (partial) return partial;

  // 3. Look for GROUP or SUMMARY
  const group = sheetNames.find(s => {
    const u = s.toUpperCase();
    return u === 'GROUP' || u === 'GROUP CONSOLIDATED' || u === 'GROUP SUMMARY';
  });
  if (group) return group;

  return null;
}

/**
 * Determine reporting period from filename and populated months
 */
export function detectReportingMonth(filename: string): { period: string; monthName: string; monthNum: number } {
  const lower = filename.toLowerCase();

  // Check filename first
  if (lower.includes('aug') || lower.includes('08')) {
    return { period: 'August 2026', monthName: 'August', monthNum: 8 };
  }
  if (lower.includes('jul') || lower.includes('07')) {
    return { period: 'July 2026', monthName: 'July', monthNum: 7 };
  }
  if (lower.includes('jun') || lower.includes('06')) {
    return { period: 'June 2026', monthName: 'June', monthNum: 6 };
  }
  if (lower.includes('sep') || lower.includes('09')) {
    return { period: 'September 2026', monthName: 'September', monthNum: 9 };
  }

  // Default to August 2026 as per VIGOR 2026 cycle
  return { period: 'August 2026', monthName: 'August', monthNum: 8 };
}

/**
 * Parse the CONSOLIDATED worksheet
 */
export function parseConsolidatedWorksheet(
  ws: XLSX.WorkSheet,
  sheetName: string,
  filename: string
): ConsolidatedPerformanceData {
  const dataQualityIssues: string[] = [];
  const rep = detectReportingMonth(filename);
  const activeMonthNum = rep.monthNum; // 8 for Aug

  // Convert worksheet to dense 2D grid
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:AJ150');
  const maxR = Math.min(range.e.r, 200);
  const maxC = Math.min(range.e.c, 45);

  const grid: any[][] = [];
  for (let r = 0; r <= maxR; r++) {
    const row: any[] = [];
    for (let c = 0; c <= maxC; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      row.push(ws[cellRef] || null);
    }
    grid.push(row);
  }

  // Propagate merged cells if present
  if (ws['!merges']) {
    for (const merge of ws['!merges']) {
      const startRef = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
      const startVal = ws[startRef];
      if (!startVal) continue;
      for (let r = merge.s.r; r <= merge.e.r && r <= maxR; r++) {
        for (let c = merge.s.c; c <= merge.e.c && c <= maxC; c++) {
          if (r === merge.s.r && c === merge.s.c) continue;
          if (grid[r] && !grid[r][c]) {
            grid[r][c] = startVal;
          }
        }
      }
    }
  }

  // 1. Locate Section Anchors: Operational Performance & Financial Performance
  let opHeaderRow = -1;
  let opStartRow = -1;
  let finHeaderRow = -1;
  let finStartRow = -1;

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    const rowTexts = row.map(c => (c && c.v !== undefined ? String(c.v).trim().toUpperCase() : ''));
    const fullText = rowTexts.join(' ');

    if (
      (fullText.includes('OPERATIONAL PERFORMANCE') || fullText.includes('OPERATIONAL HIGHLIGHTS')) &&
      opHeaderRow === -1
    ) {
      console.log(`[CONSOLIDATED] Operational section found at row ${r + 1}`);
      opHeaderRow = r + 1; // header row is typically next row
      opStartRow = r + 2;
    }

    if (
      (fullText.includes('FINANCIAL PERFORMANCE') || fullText.includes('PROFIT & LOSS') || fullText.includes('FINANCIAL HIGHLIGHTS')) &&
      finHeaderRow === -1
    ) {
      console.log(`[CONSOLIDATED] Financial section found at row ${r + 1}`);
      finHeaderRow = r + 1;
      finStartRow = r + 2;
    }
  }

  // If operational section wasn't explicitly found, scan for "Item" / "Unit" / "ACT JAN"
  if (opHeaderRow === -1 && finHeaderRow === -1) {
    for (let r = 0; r < Math.min(20, grid.length); r++) {
      const rowTexts = (grid[r] || []).map(c => (c && c.v !== undefined ? String(c.v).trim().toUpperCase() : ''));
      if (rowTexts.some(t => t.includes('ACT JAN') || t.includes('ACTUAL JAN') || t.includes('ITEM'))) {
        opHeaderRow = r;
        opStartRow = r + 1;
        break;
      }
    }
  }

  // Column Mapping Helper for a given header row
  interface ColumnMap {
    itemCol: number;
    unitCol: number;
    monthCols: Record<string, number>; // 'Jan' -> colIndex
    monthPlanCols: Record<string, number>; // 'Jan' -> planColIndex
    planCol: number;
    splyCol: number;
    growthCol: number;
    // YTD columns
    ytdMonthCols: Record<string, number>;
    ytdActualCol: number;
    ytdPlanCol: number;
    ytdSplyCol: number;
    ytdGrowthCol: number;
  }

  const buildColumnMap = (hRowIdx: number): ColumnMap => {
    const colMap: ColumnMap = {
      itemCol: -1,
      unitCol: -1,
      monthCols: {},
      monthPlanCols: {},
      planCol: -1,
      splyCol: -1,
      growthCol: -1,
      ytdMonthCols: {},
      ytdActualCol: -1,
      ytdPlanCol: -1,
      ytdSplyCol: -1,
      ytdGrowthCol: -1
    };

    if (hRowIdx < 0 || hRowIdx >= grid.length) return colMap;

    // We examine both hRowIdx and hRowIdx - 1 (in case of two-tier headers)
    const headerRow = grid[hRowIdx] || [];
    const prevRow = hRowIdx > 0 ? grid[hRowIdx - 1] || [] : [];

    // Track whether we have passed into the YTD section
    let inYTDSection = false;

    for (let c = 0; c < headerRow.length; c++) {
      const cellText = String(headerRow[c]?.v || '').trim().toUpperCase();
      const prevText = String(prevRow[c]?.v || '').trim().toUpperCase();
      const combined = `${prevText} ${cellText}`.trim();

      // Detect item / metric column
      if (colMap.itemCol === -1) {
        if (cellText === 'ITEM' || cellText === 'PARTICULARS' || cellText === 'METRIC' || cellText === 'DESCRIPTION') {
          colMap.itemCol = c;
          continue;
        }
      }

      // Detect unit column
      if (colMap.unitCol === -1) {
        if (cellText === 'UNIT' || cellText === 'UNITS' || combined.includes('UNIT')) {
          colMap.unitCol = c;
          continue;
        }
      }

      // Check if entering YTD section
      if (
        combined.includes('ACT JAN YTD') ||
        combined.includes('ACTUAL YTD') ||
        combined.includes('JAN YTD') ||
        (combined.includes('YTD') && (combined.includes('ACT') || combined.includes('ACTUAL')))
      ) {
        inYTDSection = true;
      }

      // Check month header variations using normalizeMonthHeader
      const normMonth = normalizeMonthHeader(cellText) || normalizeMonthHeader(combined);
      if (normMonth) {
        if (normMonth.isYTD || inYTDSection) {
          if (colMap.ytdMonthCols[normMonth.monthKey] === undefined) {
            colMap.ytdMonthCols[normMonth.monthKey] = c;
            if (normMonth.monthKey === 'Aug' && colMap.ytdActualCol === -1) {
              colMap.ytdActualCol = c;
            }
          }
        } else if (normMonth.isPlan) {
          if (!inYTDSection) {
            colMap.monthPlanCols[normMonth.monthKey] = c;
            if (colMap.planCol === -1 || normMonth.monthKey === 'Aug') colMap.planCol = c;
          } else {
            if (colMap.ytdPlanCol === -1) colMap.ytdPlanCol = c;
          }
        } else if (normMonth.isSply) {
          if (!inYTDSection && colMap.splyCol === -1) colMap.splyCol = c;
          else if (inYTDSection && colMap.ytdSplyCol === -1) colMap.ytdSplyCol = c;
        } else if (normMonth.isActual) {
          // If monthly column for this month hasn't been set yet
          if (colMap.monthCols[normMonth.monthKey] === undefined) {
            colMap.monthCols[normMonth.monthKey] = c;
          } else {
            // Subsequent occurrence is YTD
            if (colMap.ytdMonthCols[normMonth.monthKey] === undefined) {
              colMap.ytdMonthCols[normMonth.monthKey] = c;
              if (normMonth.monthKey === 'Aug' && colMap.ytdActualCol === -1) {
                colMap.ytdActualCol = c;
              }
            }
          }
        }
      }

      // Detect Plan
      if (cellText === 'PLAN' || combined === 'PLAN' || cellText === 'TARGET') {
        if (!inYTDSection && colMap.planCol === -1) {
          colMap.planCol = c;
        } else if (inYTDSection && colMap.ytdPlanCol === -1) {
          colMap.ytdPlanCol = c;
        }
      }

      // Detect SPLY
      if (cellText.includes('SPLY') || combined.includes('SPLY') || cellText.includes('PRIOR') || cellText.includes('LAST YEAR')) {
        if (!inYTDSection && colMap.splyCol === -1) {
          colMap.splyCol = c;
        } else if (inYTDSection && colMap.ytdSplyCol === -1) {
          colMap.ytdSplyCol = c;
        }
      }

      // Detect Growth
      if (cellText.includes('GROWTH') || combined.includes('GROWTH') || cellText === 'GRW%') {
        if (!inYTDSection && colMap.growthCol === -1) {
          colMap.growthCol = c;
        } else if (inYTDSection && colMap.ytdGrowthCol === -1) {
          colMap.ytdGrowthCol = c;
        }
      }

      // Detect Actual YTD directly
      if (combined.includes('ACTUAL YTD') || combined.includes('ACT YTD') || cellText === 'ACTUAL YTD') {
        colMap.ytdActualCol = c;
      }
    }

    console.log('[CONSOLIDATED] Detected monthly columns:', colMap.monthCols);
    console.log('[CONSOLIDATED] Detected monthly plan columns:', colMap.monthPlanCols);
    console.log('[CONSOLIDATED] Detected YTD columns:', colMap.ytdMonthCols);

    // Defaults / heuristics if some columns weren't labeled with "ITEM" or "UNIT"
    if (colMap.itemCol === -1) {
      // Find the first column that has text rows
      for (let c = 0; c < 3; c++) {
        let textRows = 0;
        for (let r = hRowIdx + 1; r < Math.min(hRowIdx + 8, grid.length); r++) {
          const v = grid[r]?.[c]?.v;
          if (typeof v === 'string' && v.trim().length > 2 && isNaN(Number(v))) textRows++;
        }
        if (textRows >= 2) {
          colMap.itemCol = c;
          break;
        }
      }
      if (colMap.itemCol === -1) colMap.itemCol = 1; // default to col B
    }

    if (colMap.unitCol === -1) {
      // Typically the column right after itemCol
      const cand = colMap.itemCol + 1;
      let isUnit = false;
      for (let r = hRowIdx + 1; r < Math.min(hRowIdx + 8, grid.length); r++) {
        const v = String(grid[r]?.[cand]?.v || '').trim().toUpperCase();
        if (v === 'MTZS' || v === 'TON' || v === 'BAGS' || v === 'PATIENT' || v === 'GUEST' || v === 'NO' || v === '%') {
          isUnit = true;
          break;
        }
      }
      if (isUnit) colMap.unitCol = cand;
    }

    return colMap;
  };

  // Helper to extract rows for a given section
  const extractSectionRows = (
    sName: string,
    sectionType: 'operational' | 'financial',
    startRow: number,
    endRow: number,
    cMap: ColumnMap
  ): NormalizedMetric[] => {
    const metrics: NormalizedMetric[] = [];
    if (startRow < 0 || startRow >= grid.length) return metrics;

    for (let r = startRow; r <= endRow && r < grid.length; r++) {
      const row = grid[r];
      if (!row) continue;

      const itemCell = row[cMap.itemCol];
      const itemNameRaw = itemCell && itemCell.v !== undefined ? String(itemCell.v).trim() : '';

      if (!itemNameRaw || itemNameRaw === '' || itemNameRaw === '-' || itemNameRaw.length < 2) {
        continue;
      }

      const itemUpper = itemNameRaw.toUpperCase();

      // Skip sub-headers or empty structural divider rows
      if (
        itemUpper.includes('OPERATIONAL PERFORMANCE') ||
        itemUpper.includes('FINANCIAL PERFORMANCE') ||
        itemUpper.includes('PROFIT & LOSS') ||
        itemUpper.includes('ACTUALS') ||
        itemUpper === 'ITEM' ||
        itemUpper === 'TOTAL'
      ) {
        continue;
      }

      // Unit
      let unit: string | null = null;
      if (cMap.unitCol !== -1 && row[cMap.unitCol]) {
        const uText = String(row[cMap.unitCol].v || '').trim();
        if (uText && uText !== '-') unit = uText;
      }
      if (!unit && sectionType === 'financial') {
        unit = 'MTZS';
      }

      // Monthly values Jan - Aug (exclude Sep-Dec future zero placeholders!)
      const monthlyValues: Record<string, number | null> = {};
      const monthlyPlanValues: Record<string, number | null> = {};
      let hasAnyMonthlyPlan = false;
      let augActual: number | null = null;

      for (let i = 0; i < activeMonthNum; i++) {
        const mName = MONTH_KEYS[i];
        const mCol = cMap.monthCols[mName];
        if (mCol !== undefined && mCol !== -1) {
          const parsed = getCellValue(row[mCol]);
          const num = normalizeNumericValue(parsed.num ?? parsed.text);
          monthlyValues[mName] = num;
          if (mName === 'Aug') {
            augActual = num;
          }
        } else {
          monthlyValues[mName] = null;
        }

        const mPlanCol = cMap.monthPlanCols[mName];
        if (mPlanCol !== undefined && mPlanCol !== -1) {
          const parsed = getCellValue(row[mPlanCol]);
          const num = normalizeNumericValue(parsed.num ?? parsed.text);
          monthlyPlanValues[mName] = num;
          if (num !== null) hasAnyMonthlyPlan = true;
        } else {
          monthlyPlanValues[mName] = null;
        }
      }

      // Fallback for augActual if monthCol['Aug'] was not present or empty
      if (augActual === null && cMap.ytdActualCol !== -1) {
        const ytdParsed = getCellValue(row[cMap.ytdActualCol]);
        augActual = normalizeNumericValue(ytdParsed.num ?? ytdParsed.text);
      }

      // Plan (August)
      let planVal: number | null = null;
      if (cMap.planCol !== -1) {
        const parsed = getCellValue(row[cMap.planCol]);
        planVal = normalizeNumericValue(parsed.num ?? parsed.text);
      }

      // SPLY (August)
      let splyVal: number | null = null;
      if (cMap.splyCol !== -1) {
        const parsed = getCellValue(row[cMap.splyCol]);
        splyVal = normalizeNumericValue(parsed.num ?? parsed.text);
      }

      // SOURCE-CALCULATED VALUES (Do NOT blindly trust broken formula % or stale cells!)
      let variance: number | null = null;
      let achievementPct: number | null = null;
      let growthPct: number | null = null;

      if (augActual !== null && planVal !== null) {
        variance = augActual - planVal;
        if (planVal > 0 || planVal < 0) {
          achievementPct = (augActual / planVal) * 100;
        }
      }

      if (augActual !== null && splyVal !== null && splyVal !== 0) {
        growthPct = ((augActual - splyVal) / Math.abs(splyVal)) * 100;
      }

      // YTD VALUES
      // YTD Actual: use ACT AUG YTD or Actual YTD column
      let ytdActual: number | null = null;
      if (cMap.ytdActualCol !== -1) {
        const parsed = getCellValue(row[cMap.ytdActualCol]);
        ytdActual = normalizeNumericValue(parsed.num ?? parsed.text);
      } else if (cMap.ytdMonthCols['Aug'] !== undefined) {
        const parsed = getCellValue(row[cMap.ytdMonthCols['Aug']]);
        ytdActual = normalizeNumericValue(parsed.num ?? parsed.text);
      }

      // If YTD actual is not in a dedicated column, sum Jan..Aug values
      if (ytdActual === null && Object.keys(monthlyValues).length > 0) {
        let sum = 0;
        let count = 0;
        for (const v of Object.values(monthlyValues)) {
          if (v !== null) {
            sum += v;
            count++;
          }
        }
        if (count > 0 && !itemNameRaw.includes('%') && !itemNameRaw.includes('Margin %')) {
          ytdActual = sum;
        }
      }

      // YTD Plan
      let ytdPlan: number | null = null;
      if (cMap.ytdPlanCol !== -1) {
        const parsed = getCellValue(row[cMap.ytdPlanCol]);
        ytdPlan = normalizeNumericValue(parsed.num ?? parsed.text);
      }

      // YTD SPLY
      let ytdSply: number | null = null;
      if (cMap.ytdSplyCol !== -1) {
        const parsed = getCellValue(row[cMap.ytdSplyCol]);
        ytdSply = normalizeNumericValue(parsed.num ?? parsed.text);
      }

      // Calculate YTD variance, achievement, growth
      let ytdVariance: number | null = null;
      let ytdAchievementPct: number | null = null;
      let ytdGrowthPct: number | null = null;

      if (ytdActual !== null && ytdPlan !== null) {
        ytdVariance = ytdActual - ytdPlan;
        if (ytdPlan !== 0) {
          ytdAchievementPct = (ytdActual / ytdPlan) * 100;
        }
      }

      if (ytdActual !== null && ytdSply !== null && ytdSply !== 0) {
        ytdGrowthPct = ((ytdActual - ytdSply) / Math.abs(ytdSply)) * 100;
      }

      const metric: NormalizedMetric = {
        id: `cons_${sectionType}_${r}`,
        companyId: null,
        companyName: 'VIGOR Group Consolidated',
        sectorId: null,
        section: sectionType,
        metricName: itemNameRaw,
        unit,
        periodType: 'current_period',
        period: rep.period,
        actual: augActual,
        plan: planVal,
        variance,
        achievementPct,
        priorYear: splyVal,
        growthPct,
        ytdActual,
        ytdPlan,
        ytdVariance,
        ytdAchievementPct,
        ytdPriorYear: ytdSply,
        ytdGrowthPct,
        monthlyValues,
        monthlyPlanValues: hasAnyMonthlyPlan ? monthlyPlanValues : undefined,
        sourceSheet: sheetName,
        sourceCell: `A${r + 1}`,
        isMTZS: unit?.toUpperCase() === 'MTZS',
        hasFormulaError: false
      };

      metrics.push(metric);
    }

    return metrics;
  };

  // Determine section ranges
  let operationalMetrics: NormalizedMetric[] = [];
  let financialMetrics: NormalizedMetric[] = [];

  const opEndRow = finHeaderRow > opStartRow ? finHeaderRow - 1 : grid.length - 1;
  const finEndRow = grid.length - 1;

  if (opHeaderRow !== -1) {
    const opColMap = buildColumnMap(opHeaderRow);
    operationalMetrics = extractSectionRows('CONSOLIDATED', 'operational', opStartRow, opEndRow, opColMap);
  }

  if (finHeaderRow !== -1) {
    const finColMap = buildColumnMap(finHeaderRow);
    financialMetrics = extractSectionRows('CONSOLIDATED', 'financial', finStartRow, finEndRow, finColMap);
  } else if (operationalMetrics.length > 0) {
    // If financial section wasn't separated by a header, see if financial rows are mixed in
    const finKeywords = ['REVENUE', 'TURNOVER', 'GROSS PROFIT', 'OPEX', 'EBITDA', 'NET PROFIT'];
    const finList: NormalizedMetric[] = [];
    const opList: NormalizedMetric[] = [];

    for (const m of operationalMetrics) {
      const u = m.metricName.toUpperCase();
      if (finKeywords.some(k => u.includes(k))) {
        m.section = 'financial';
        finList.push(m);
      } else {
        opList.push(m);
      }
    }
    if (finList.length > 0) {
      financialMetrics = finList;
      operationalMetrics = opList;
    }
  }

  console.log(`[CONSOLIDATED] Metrics extracted: ${financialMetrics.length} financial, ${operationalMetrics.length} operational`);

  // Quick Headline KPI helper
  const findFin = (keywords: string[]): NormalizedMetric | undefined => {
    return financialMetrics.find(m => {
      const u = m.metricName.toUpperCase();
      return keywords.some(k => u.includes(k));
    });
  };

  const revMetric = findFin(['REVENUE', 'TURNOVER', 'SALES REVENUE']);
  const gpMetric = findFin(['GROSS PROFIT']);
  const gpPctMetric = findFin(['GROSS PROFIT %', 'GROSS MARGIN %', 'MARGIN %']);
  const opexMetric = findFin(['TOTAL CASH OPEX', 'CASH OPEX', 'OPEX', 'OPERATING EXPENSES']);
  const ebitdaMetric = findFin(['EBITDA', 'EBTIDA']);
  const npMetric = findFin(['NET PROFIT', 'NET PROFIT BEFORE CONTRIBUTION']);
  const npPctMetric = findFin(['NET PROFIT %']);
  const debtorsMetric = operationalMetrics.find(m => m.metricName.toUpperCase().includes('DEBTOR'));
  const collectionMetric = operationalMetrics.find(m => m.metricName.toUpperCase().includes('COLLECTION'));

  // Generate deterministic executive management insights (No Gemini blocking required!)
  const insights: { type: 'positive' | 'warning' | 'neutral'; text: string }[] = [];

  // 1. Revenue achievement insight
  if (revMetric) {
    if (revMetric.achievementPct !== null && revMetric.achievementPct !== undefined) {
      if (revMetric.achievementPct >= 100) {
        insights.push({
          type: 'positive',
          text: `Consolidated August revenue of ${formatMtzs(revMetric.actual)} surpassed plan at ${revMetric.achievementPct.toFixed(1)}% achievement.`
        });
      } else {
        insights.push({
          type: 'warning',
          text: `Consolidated August revenue reached ${formatMtzs(revMetric.actual)}, tracking at ${revMetric.achievementPct.toFixed(1)}% of budget.`
        });
      }
    }
  }

  // 2. EBITDA / Operating Cash insight
  if (ebitdaMetric) {
    if (ebitdaMetric.actual !== null && ebitdaMetric.actual > 0) {
      insights.push({
        type: 'positive',
        text: `Operating EBITDA closed positive at ${formatMtzs(ebitdaMetric.actual)} for August${
          ebitdaMetric.plan ? ` against a plan of ${formatMtzs(ebitdaMetric.plan)}` : ''
        }.`
      });
    } else if (ebitdaMetric.actual !== null && ebitdaMetric.actual < 0) {
      insights.push({
        type: 'warning',
        text: `Consolidated EBITDA was negative at ${formatMtzs(ebitdaMetric.actual)} for August, requiring operational expense restraint.`
      });
    }
  }

  // 3. Net Profit / Margin insight
  if (npMetric) {
    if (npMetric.growthPct !== null && npMetric.growthPct !== undefined) {
      const dir = npMetric.growthPct >= 0 ? 'improved by' : 'declined by';
      insights.push({
        type: npMetric.growthPct >= 0 ? 'positive' : 'warning',
        text: `Net Profit ${dir} ${Math.abs(npMetric.growthPct).toFixed(1)}% compared to Same Period Last Year (SPLY).`
      });
    } else if (npMetric.actual !== null) {
      insights.push({
        type: npMetric.actual >= 0 ? 'positive' : 'warning',
        text: `Consolidated Net Profit for August concluded at ${formatMtzs(npMetric.actual)}.`
      });
    }
  }

  // 4. Working Capital / Debtors insight
  if (debtorsMetric && debtorsMetric.actual !== null) {
    insights.push({
      type: 'neutral',
      text: `Total Overdue Debtors exposure stands at ${formatMtzs(debtorsMetric.actual)}. Priority collection efforts remain critical.`
    });
  }

  return {
    filename,
    sheetName,
    reportingPeriod: rep.period,
    reportingMonth: rep.monthName,
    reportingMonthNum: rep.monthNum,
    availableMonths: MONTH_KEYS.slice(0, rep.monthNum),
    hasOperationalSection: operationalMetrics.length > 0,
    hasFinancialSection: financialMetrics.length > 0,
    financialMetrics,
    operationalMetrics,
    currentMonthKPIs: {
      revenue: revMetric,
      grossProfit: gpMetric,
      grossProfitPct: gpPctMetric,
      opex: opexMetric,
      ebitda: ebitdaMetric,
      netProfit: npMetric,
      netProfitPct: npPctMetric,
      debtors: debtorsMetric,
      collection: collectionMetric
    },
    insights,
    dataQualityIssues
  };
}

function formatMtzs(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  if (Math.abs(val) >= 1_000_000_000) {
    return `TZS ${(val / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(val) >= 1_000_000) {
    return `TZS ${(val / 1_000_000).toFixed(1)}M`;
  }
  return `TZS ${val.toLocaleString()}`;
}
