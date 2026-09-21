/**
 * VIGOR Management Workbook Ingestion & Analytics Engine
 * Capable of processing real, complex 24-sheet executive workbooks with:
 * - Structure & section detection (Operational & Financial performance)
 * - Dynamic header detection (varying start columns B/C/F/G)
 * - Formula evaluation with safe #DIV/0! error handling
 * - Double-counting prevention (companies vs sector summaries vs consolidated)
 * - MTZS unit normalization and physical volume separation
 * - Monthly time-series normalization up to last reported month (excluding future zero placeholder months)
 */

import * as XLSX from 'xlsx';
import {
  NormalizedWorkbook,
  NormalizedCompanyReport,
  NormalizedMetric,
  AnalysisSection,
  SheetClassification,
  SheetRole
} from '../types';
import {
  classifySheetName,
  ALL_VIGOR_COMPANIES,
  COMPANY_BY_ID,
  VIGOR_SECTORS,
  SECTOR_BY_ID
} from '../data/groupStructure';
import { parseCleanNumber } from './typeDetector';

export interface ParseWorkbookProgress {
  phase: 'reading' | 'scanning' | 'extracting' | 'aggregating' | 'done';
  percent: number;
  message: string;
  currentSheet?: string;
  sheetIndex?: number;
  totalSheets?: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LOOKUP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

/**
 * Check if a workbook is a complex management workbook or a flat single table
 */
export function isManagementWorkbook(workbook: XLSX.WorkBook): boolean {
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) return false;
  if (workbook.SheetNames.length > 1) return true;

  // Even with 1 sheet, check if it contains management keywords
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return false;

  const sampleRows: any[][] = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: '',
    blankrows: false,
    range: 25 // inspect first 25 rows
  });

  const textSample = JSON.stringify(sampleRows).toUpperCase();
  if (
    textSample.includes('OPERATIONAL PERFORMANCE') ||
    textSample.includes('FINANCIAL PERFORMANCE') ||
    textSample.includes('MTZS') ||
    textSample.includes('SPLY') ||
    textSample.includes('ACT AUG') ||
    textSample.includes('ACTUAL YTD')
  ) {
    return true;
  }

  return false;
}

/**
 * Safely parse a cell value, returning null if it represents an Excel error (#DIV/0!, #N/A, etc.)
 */
export function parseExcelCellValue(
  cell: any,
  dataQualityIssues?: string[],
  cellCoordinate?: string
): { value: number | null; rawString: string; isError: boolean } {
  if (cell === null || cell === undefined) {
    return { value: null, rawString: '', isError: false };
  }

  // Check for error values in SheetJS (type 'e' or string error representation)
  if (cell.t === 'e' || (typeof cell.v === 'string' && cell.v.startsWith('#'))) {
    const errCode = String(cell.v || cell.w || '#ERROR!');
    if (dataQualityIssues && cellCoordinate) {
      dataQualityIssues.push(`Formula error ${errCode} at ${cellCoordinate} ignored.`);
    }
    return { value: null, rawString: errCode, isError: true };
  }

  // String value inspection
  if (typeof cell.v === 'string') {
    const s = cell.v.trim();
    if (s.startsWith('#DIV/0!') || s.startsWith('#N/A') || s.startsWith('#VALUE!') || s.startsWith('#REF!') || s.startsWith('#NAME?')) {
      if (dataQualityIssues && cellCoordinate) {
        dataQualityIssues.push(`Formula error ${s} at ${cellCoordinate} ignored.`);
      }
      return { value: null, rawString: s, isError: true };
    }
    const cleanNum = parseCleanNumber(s);
    return { value: cleanNum, rawString: s, isError: false };
  }

  if (typeof cell.v === 'number') {
    if (!isFinite(cell.v) || isNaN(cell.v)) {
      return { value: null, rawString: String(cell.v), isError: true };
    }
    return { value: cell.v, rawString: String(cell.w || cell.v), isError: false };
  }

  return { value: null, rawString: String(cell.v || ''), isError: false };
}

/**
 * Propagate merged cells across a 2D grid
 */
function expandMergedCells(ws: XLSX.WorkSheet, maxRows: number = 200, maxCols: number = 40): any[][] {
  const grid: any[][] = [];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z50');
  const endRow = Math.min(range.e.r, maxRows);
  const endCol = Math.min(range.e.c, maxCols);

  for (let r = 0; r <= endRow; r++) {
    const row: any[] = [];
    for (let c = 0; c <= endCol; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      row.push(cell || null);
    }
    grid.push(row);
  }

  // Apply merges if available
  if (ws['!merges']) {
    for (const merge of ws['!merges']) {
      const startCellRef = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
      const startCell = ws[startCellRef];
      if (!startCell) continue;

      for (let r = merge.s.r; r <= merge.e.r && r <= endRow; r++) {
        for (let c = merge.s.c; c <= merge.e.c && c <= endCol; c++) {
          if (r === merge.s.r && c === merge.s.c) continue;
          if (grid[r] && !grid[r][c]) {
            grid[r][c] = startCell;
          }
        }
      }
    }
  }

  return grid;
}

/**
 * Scan a single sheet and parse its Operational and Financial sections
 */
function parseCompanySheet(
  sheetName: string,
  ws: XLSX.WorkSheet,
  classification: SheetClassification,
  reportingMonthNum: number = 8, // 8 = August
  dataQualityIssues: string[]
): NormalizedCompanyReport {
  const grid = expandMergedCells(ws);
  const sections: AnalysisSection[] = [];
  const operationalMetrics: NormalizedMetric[] = [];
  const financialMetrics: NormalizedMetric[] = [];
  const monthlyTrendMetrics: NormalizedMetric[] = [];

  // Find section anchors
  interface SectionAnchor {
    name: string;
    type: 'operational' | 'financial' | 'other';
    anchorRow: number;
    headerRow: number;
    startRow: number;
    endRow: number;
  }

  const detectedAnchors: SectionAnchor[] = [];

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;

    const rowStrings = row
      .map(c => (c && c.v !== undefined ? String(c.v).trim().toUpperCase() : ''))
      .filter(s => s.length > 0);

    const fullRowText = rowStrings.join(' ');

    if (
      fullRowText.includes('OPERATIONAL PERFORMANCE') ||
      fullRowText.includes('OPERATIONAL HIGHLIGHTS') ||
      fullRowText.includes('OPERATIONS') ||
      fullRowText.includes('CLINICAL PERFORMANCE') ||
      fullRowText.includes('HOSPITALITY PERFORMANCE')
    ) {
      detectedAnchors.push({
        name: 'Operational Performance',
        type: 'operational',
        anchorRow: r,
        headerRow: r + 1,
        startRow: r + 2,
        endRow: grid.length - 1
      });
    } else if (
      fullRowText.includes('FINANCIAL PERFORMANCE') ||
      fullRowText.includes('FINANCIAL HIGHLIGHTS') ||
      fullRowText.includes('PROFIT & LOSS') ||
      fullRowText.includes('STATEMENT OF PROFIT')
    ) {
      detectedAnchors.push({
        name: 'Financial Performance',
        type: 'financial',
        anchorRow: r,
        headerRow: r + 1,
        startRow: r + 2,
        endRow: grid.length - 1
      });
    }
  }

  // Adjust section endRows so they don't overlap
  for (let i = 0; i < detectedAnchors.length; i++) {
    if (i < detectedAnchors.length - 1) {
      detectedAnchors[i].endRow = detectedAnchors[i + 1].anchorRow - 1;
    }
  }

  // If no sections were explicitly detected, create default section
  if (detectedAnchors.length === 0) {
    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(15, grid.length); r++) {
      const texts = (grid[r] || []).map(c => (c ? String(c.v || '').toUpperCase() : ''));
      if (texts.some(t => t.includes('ITEM') || t.includes('ACT') || t.includes('PLAN') || t.includes('REVENUE'))) {
        headerRowIdx = r;
        break;
      }
    }

    detectedAnchors.push({
      name: 'Financial Performance',
      type: 'financial',
      anchorRow: 0,
      headerRow: headerRowIdx,
      startRow: headerRowIdx + 1,
      endRow: grid.length - 1
    });
  }

  // Process each section
  for (const anchor of detectedAnchors) {
    const headerRow = grid[anchor.headerRow] || [];
    const subHeaderRow = grid[anchor.headerRow + 1] || [];

    // Detect column roles
    let itemCol = -1;
    let unitCol = -1;
    const monthlyCols: Record<number, number> = {}; // month 1..12 -> colIndex
    let actualCol = -1;
    let planCol = -1;
    let achievementCol = -1;
    let splyCol = -1;
    let growthCol = -1;

    let ytdActualCol = -1;
    let ytdPlanCol = -1;
    let ytdAchievementCol = -1;
    let ytdSplyCol = -1;
    let ytdGrowthCol = -1;

    const maxCols = Math.max(headerRow.length, subHeaderRow.length);

    for (let c = 0; c < maxCols; c++) {
      const topCell = headerRow[c];
      const subCell = subHeaderRow[c];

      const topText = topCell && topCell.v !== undefined ? String(topCell.v).trim().toUpperCase() : '';
      const subText = subCell && subCell.v !== undefined ? String(subCell.v).trim().toUpperCase() : '';
      const combined = `${topText} ${subText}`.trim();

      // Metric / Item name
      if (itemCol === -1 && (combined.includes('ITEM') || combined.includes('METRIC') || combined.includes('PARTICULAR') || combined.includes('DESCRIPTION'))) {
        itemCol = c;
        continue;
      }

      // Unit
      if (unitCol === -1 && (combined.includes('UNIT') || combined === 'UOM')) {
        unitCol = c;
        continue;
      }

      // Monthly columns (e.g. "ACT JAN", "Actual Feb", "MAR", etc.)
      for (const [mName, mNum] of Object.entries(MONTH_LOOKUP)) {
        const regex = new RegExp(`\\b(ACT|ACTUAL)?\\s*${mName}\\b`, 'i');
        if (regex.test(combined) && !combined.includes('YTD')) {
          if (!monthlyCols[mNum]) {
            monthlyCols[mNum] = c;
          }
        }
      }

      // YTD Columns
      if (combined.includes('YTD')) {
        if (combined.includes('ACT') && ytdActualCol === -1) {
          ytdActualCol = c;
        } else if ((combined.includes('PLAN') || combined.includes('BUDGET') || combined.includes('TARGET')) && ytdPlanCol === -1) {
          ytdPlanCol = c;
        } else if ((combined.includes('%') || combined.includes('ACH')) && ytdAchievementCol === -1) {
          ytdAchievementCol = c;
        } else if (combined.includes('SPLY') && ytdSplyCol === -1) {
          ytdSplyCol = c;
        } else if (combined.includes('GROWTH') && ytdGrowthCol === -1) {
          ytdGrowthCol = c;
        }
      }
      // Current Period Columns (Actual, Plan, %, SPLY, Growth)
      else {
        if ((combined === 'ACT' || combined === 'ACTUAL' || combined.includes('ACT AUG') || combined.includes('ACTUAL AUG')) && actualCol === -1) {
          actualCol = c;
        } else if ((combined === 'PLAN' || combined.includes('PLAN AUG') || combined === 'BUDGET') && planCol === -1) {
          planCol = c;
        } else if ((combined === '%' || combined.includes('ACH')) && achievementCol === -1) {
          achievementCol = c;
        } else if (combined.includes('SPLY') && splyCol === -1) {
          splyCol = c;
        } else if (combined.includes('GROWTH') && growthCol === -1) {
          growthCol = c;
        }
      }
    }

    // Fallback if itemCol not explicitly titled: choose the first non-empty text column
    if (itemCol === -1) {
      for (let c = 0; c < 5; c++) {
        let hasText = false;
        for (let r = anchor.startRow; r <= Math.min(anchor.startRow + 5, anchor.endRow); r++) {
          const cell = grid[r]?.[c];
          if (cell && typeof cell.v === 'string' && cell.v.trim().length > 2 && isNaN(Number(cell.v))) {
            hasText = true;
            break;
          }
        }
        if (hasText) {
          itemCol = c;
          break;
        }
      }
      if (itemCol === -1) itemCol = 1; // standard B column
    }

    // Fallback: If current actual col wasn't matched explicitly, use August month column if available
    if (actualCol === -1 && monthlyCols[reportingMonthNum] !== undefined) {
      actualCol = monthlyCols[reportingMonthNum];
    }

    const sectionMetrics: NormalizedMetric[] = [];

    // Parse metric rows
    for (let r = anchor.startRow; r <= anchor.endRow; r++) {
      const row = grid[r];
      if (!row) continue;

      const itemCell = row[itemCol];
      if (!itemCell || itemCell.v === undefined || itemCell.v === null) continue;

      const metricName = String(itemCell.v).trim();
      if (!metricName || metricName.length === 0) continue;

      // Skip row if it's another header or spacer
      const upperName = metricName.toUpperCase();
      if (
        upperName.includes('OPERATIONAL PERFORMANCE') ||
        upperName.includes('FINANCIAL PERFORMANCE') ||
        upperName === 'ITEM' ||
        upperName === 'UNIT'
      ) {
        continue;
      }

      // Extract Unit
      let unit = unitCol !== -1 && row[unitCol] && row[unitCol].v ? String(row[unitCol].v).trim() : null;
      if (!unit && upperName.includes('%')) unit = '%';
      if (!unit && (upperName.includes('MTZS') || upperName.includes('(MTZS)'))) unit = 'MTZS';

      const isMTZS = unit ? unit.toUpperCase() === 'MTZS' : false;

      // Current Month values
      const cellCoord = XLSX.utils.encode_cell({ r, c: actualCol });
      const actualParsed = actualCol !== -1 ? parseExcelCellValue(row[actualCol], dataQualityIssues, cellCoord) : { value: null, isError: false };
      const planParsed = planCol !== -1 ? parseExcelCellValue(row[planCol], dataQualityIssues) : { value: null, isError: false };
      const achParsed = achievementCol !== -1 ? parseExcelCellValue(row[achievementCol]) : { value: null, isError: false };
      const splyParsed = splyCol !== -1 ? parseExcelCellValue(row[splyCol]) : { value: null, isError: false };
      const growthParsed = growthCol !== -1 ? parseExcelCellValue(row[growthCol]) : { value: null, isError: false };

      // Variance & Achievement calculation
      let variance: number | null = null;
      let achievementPct: number | null = achParsed.value;

      if (actualParsed.value !== null && planParsed.value !== null) {
        variance = actualParsed.value - planParsed.value;
        if (achievementPct === null && planParsed.value !== 0) {
          achievementPct = (actualParsed.value / planParsed.value) * 100;
        }
      }

      // Monthly Series
      const monthlyValues: Record<string, number | null> = {};
      let hasMonthlyData = false;

      for (let m = 1; m <= 12; m++) {
        const colIdx = monthlyCols[m];
        const monthLabel = MONTH_NAMES[m - 1];

        if (colIdx !== undefined && row[colIdx] !== undefined) {
          const val = parseExcelCellValue(row[colIdx], dataQualityIssues).value;

          // CRITICAL: Filter out future-month placeholder zeros (e.g. Sept..Dec when report is August)
          if (m > reportingMonthNum && val === 0) {
            monthlyValues[monthLabel] = null;
          } else {
            monthlyValues[monthLabel] = val;
            if (val !== null) hasMonthlyData = true;
          }
        } else {
          monthlyValues[monthLabel] = null;
        }
      }

      const metricObj: NormalizedMetric = {
        id: `${classification.companyId || sheetName}_${anchor.type}_${r}`,
        companyId: classification.companyId || null,
        companyName: classification.companyName || sheetName,
        sectorId: classification.sectorId || null,
        section: anchor.type,
        metricName,
        unit,
        periodType: 'current_period',
        period: 'August 2026',
        actual: actualParsed.value,
        plan: planParsed.value,
        variance,
        achievementPct,
        priorYear: splyParsed.value,
        growthPct: growthParsed.value,
        monthlyValues: hasMonthlyData ? monthlyValues : undefined,
        sourceSheet: sheetName,
        sourceCell: cellCoord,
        isMTZS,
        hasFormulaError: actualParsed.isError || planParsed.isError
      };

      sectionMetrics.push(metricObj);

      if (anchor.type === 'operational') {
        operationalMetrics.push(metricObj);
      } else {
        financialMetrics.push(metricObj);
      }

      if (hasMonthlyData) {
        monthlyTrendMetrics.push(metricObj);
      }
    }

    sections.push({
      name: anchor.name,
      type: anchor.type,
      headerRow: anchor.headerRow,
      startRow: anchor.startRow,
      endRow: anchor.endRow,
      metrics: sectionMetrics
    });
  }

  // Extract Headline KPIs from metrics
  const findMetric = (keywords: string[], sectionType?: 'operational' | 'financial'): NormalizedMetric | undefined => {
    const searchList = sectionType === 'operational' ? operationalMetrics : sectionType === 'financial' ? financialMetrics : [...financialMetrics, ...operationalMetrics];
    return searchList.find(m => {
      const name = m.metricName.toUpperCase();
      return keywords.some(k => name.includes(k));
    });
  };

  const revMetric = findMetric(['REVENUE', 'TURNOVER', 'SALES REVENUE'], 'financial');
  const gpMetric = findMetric(['GROSS PROFIT', 'GROSS MARGIN'], 'financial');
  const opexMetric = findMetric(['TOTAL CASH OPEX', 'CASH OPEX', 'OPEX', 'OPERATING EXPENSES'], 'financial');
  const ebitdaMetric = findMetric(['EBITDA', 'EBTIDA'], 'financial');
  const npMetric = findMetric(['NET PROFIT', 'NET PROFIT BEFORE CONTRIBUTION'], 'financial');
  const debtorsMetric = findMetric(['DEBTORS', 'TOTAL DEBTORS', 'RECEIVABLES']);
  const collectionMetric = findMetric(['COLLECTION', 'COLLECTIONS']);
  const volumeMetric = findMetric(['PATIENT', 'OCCUPANCY', 'TONNE', 'BAGS', 'ROLLS', 'ROOM', 'VOLUME'], 'operational');

  return {
    companyId: classification.companyId || sheetName.toLowerCase().replace(/\s+/g, '-'),
    companyName: classification.companyName || sheetName,
    companyCode: sheetName,
    sectorId: classification.sectorId || 'general',
    sectorName: classification.sectorName || 'General',
    sheetName,
    reportingPeriod: 'August 2026',
    sections,
    operationalMetrics,
    financialMetrics,
    monthlyTrendMetrics,
    headlineKPIs: {
      revenue: revMetric ? {
        actual: revMetric.actual,
        plan: revMetric.plan,
        achievementPct: revMetric.achievementPct,
        variance: revMetric.variance,
        priorYear: revMetric.priorYear,
        growthPct: revMetric.growthPct
      } : undefined,
      grossProfit: gpMetric ? {
        actual: gpMetric.actual,
        plan: gpMetric.plan,
        achievementPct: gpMetric.achievementPct,
        variance: gpMetric.variance
      } : undefined,
      opex: opexMetric ? {
        actual: opexMetric.actual,
        plan: opexMetric.plan,
        achievementPct: opexMetric.achievementPct
      } : undefined,
      ebitda: ebitdaMetric ? {
        actual: ebitdaMetric.actual,
        plan: ebitdaMetric.plan,
        achievementPct: ebitdaMetric.achievementPct
      } : undefined,
      netProfit: npMetric ? {
        actual: npMetric.actual,
        plan: npMetric.plan,
        achievementPct: npMetric.achievementPct,
        variance: npMetric.variance
      } : undefined,
      debtors: debtorsMetric ? debtorsMetric.actual : null,
      collection: collectionMetric ? collectionMetric.actual : null,
      occupancyOrVolume: volumeMetric ? {
        label: volumeMetric.metricName,
        value: volumeMetric.actual,
        unit: volumeMetric.unit
      } : undefined
    },
    dataQualityIssues
  };
}

/**
 * Main Management Workbook Parser
 * Processes the entire multi-sheet workbook, performs sheet classification,
 * parses company and aggregate sheets, prevents double counting, and generates executive summaries.
 */
export async function parseManagementWorkbook(
  file: File,
  onProgress?: (progress: ParseWorkbookProgress) => void
): Promise<NormalizedWorkbook> {
  const filename = file.name;
  const fileSize = file.size;

  onProgress?.({
    phase: 'reading',
    percent: 10,
    message: `Reading workbook (${(fileSize / (1024 * 1024)).toFixed(1)} MB)...`
  });

  const arrayBuffer = await file.arrayBuffer();

  onProgress?.({
    phase: 'scanning',
    percent: 30,
    message: 'Scanning worksheets & workbook structure...'
  });

  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
    cellFormula: false // use cached values for fast responsive parsing
  });

  const sheetNames = workbook.SheetNames || [];
  const totalSheets = sheetNames.length;
  const sheetClassifications: SheetClassification[] = [];
  const dataQualityWarnings: string[] = [];

  // Sheet visibility inspection
  const hiddenSheetMap: Record<string, boolean> = {};
  if (workbook.Workbook && workbook.Workbook.Sheets) {
    workbook.Workbook.Sheets.forEach((sMeta: any, idx: number) => {
      const name = sheetNames[idx];
      if (name && (sMeta.Hidden === 1 || sMeta.Hidden === 2)) {
        hiddenSheetMap[name] = true;
      }
    });
  }

  // 1. Classify all sheets
  for (const sName of sheetNames) {
    const isHidden = !!hiddenSheetMap[sName];
    const classification = classifySheetName(sName, isHidden);
    const ws = workbook.Sheets[sName];
    if (ws && ws['!ref']) {
      const decoded = XLSX.utils.decode_range(ws['!ref']);
      classification.cellCount = (decoded.e.r + 1) * (decoded.e.c + 1);
    }
    sheetClassifications.push(classification);
  }

  // 2. Handle Duplicate Company Sheets (e.g. VCN vs VCN (2))
  // Group sheets by target companyId
  const sheetsByCompany: Record<string, SheetClassification[]> = {};
  sheetClassifications.forEach(sc => {
    if (sc.role === 'company' && sc.companyId) {
      if (!sheetsByCompany[sc.companyId]) sheetsByCompany[sc.companyId] = [];
      sheetsByCompany[sc.companyId].push(sc);
    }
  });

  for (const [compId, compSheets] of Object.entries(sheetsByCompany)) {
    if (compSheets.length > 1) {
      // Sort by cellCount descending to find the most complete sheet
      compSheets.sort((a, b) => (b.cellCount || 0) - (a.cellCount || 0));
      const primary = compSheets[0];
      primary.isDuplicate = false;
      primary.includeInGroupRollup = true;

      for (let i = 1; i < compSheets.length; i++) {
        const dup = compSheets[i];
        dup.isDuplicate = true;
        dup.duplicateOf = primary.sheetName;
        dup.includeInGroupRollup = false; // Exclude duplicate from rollup!
        dataQualityWarnings.push(
          `We found multiple sheets for ${primary.companyName} (${primary.sheetName} and ${dup.sheetName}). We selected ${primary.sheetName} as the primary record.`
        );
      }
    }
  }

  // Count statistics
  const operatingCompanyCount = sheetClassifications.filter(s => s.role === 'company' && !s.isDuplicate).length;
  const sectorSummaryCount = sheetClassifications.filter(s => s.role === 'sector_summary').length;
  const consolidatedCount = sheetClassifications.filter(s => s.role === 'group_consolidated').length;
  const helperOrChartCount = sheetClassifications.filter(s => s.role === 'helper' || s.role === 'chart').length;

  onProgress?.({
    phase: 'extracting',
    percent: 50,
    message: `Identified ${operatingCompanyCount} operating companies across ${totalSheets} sheets...`
  });

  const companies: Record<string, NormalizedCompanyReport> = {};
  const sectorReports: Record<string, NormalizedCompanyReport> = {};
  let consolidatedReport: NormalizedCompanyReport | undefined = undefined;

  let processedCount = 0;

  // 3. Extract metrics for company and summary sheets
  for (const classification of sheetClassifications) {
    processedCount++;
    const sName = classification.sheetName;

    // Skip charts and pure helper sheets for metric extraction
    if (classification.role === 'chart' || classification.role === 'helper') {
      continue;
    }

    const ws = workbook.Sheets[sName];
    if (!ws) continue;

    onProgress?.({
      phase: 'extracting',
      percent: Math.min(85, 50 + Math.floor((processedCount / totalSheets) * 35)),
      message: `Analyzing sheet ${processedCount} / ${totalSheets}: ${sName}...`,
      currentSheet: sName,
      sheetIndex: processedCount,
      totalSheets
    });

    const report = parseCompanySheet(sName, ws, classification, 8, dataQualityWarnings);

    if (classification.role === 'company') {
      if (classification.includeInGroupRollup || !companies[report.companyId]) {
        companies[report.companyId] = report;
      }
    } else if (classification.role === 'sector_summary') {
      if (classification.sectorId) {
        sectorReports[classification.sectorId] = report;
      }
    } else if (classification.role === 'group_consolidated') {
      consolidatedReport = report;
    }
  }

  onProgress?.({
    phase: 'aggregating',
    percent: 90,
    message: 'Computing group consolidations and preventing double-counting...'
  });

  // 4. Compute Group Totals using ONLY operating company sheets (Double-Counting Prevention!)
  let totalRevenue = 0;
  let totalPlanRevenue = 0;
  let totalGrossProfit = 0;
  let totalOpex = 0;
  let totalEbitda = 0;
  let totalNetProfit = 0;
  let totalNetProfitPlan = 0;
  let totalDebtors = 0;
  const companiesReporting = Object.keys(companies).length;
  const companiesMissingPlan: string[] = [];
  const companiesNegativeProfit: string[] = [];

  let topRevVal = -1;
  let topRevName = '';
  let topProfVal = -Infinity;
  let topProfName = '';
  let highestDebtorsVal = -1;
  let highestDebtorsName = '';

  for (const comp of Object.values(companies)) {
    const kpis = comp.headlineKPIs;

    // Revenue
    if (kpis.revenue?.actual !== null && kpis.revenue?.actual !== undefined) {
      const rev = kpis.revenue.actual;
      totalRevenue += rev;
      if (rev > topRevVal) {
        topRevVal = rev;
        topRevName = comp.companyName;
      }
    }

    if (kpis.revenue?.plan !== null && kpis.revenue?.plan !== undefined) {
      totalPlanRevenue += kpis.revenue.plan;
      if (kpis.revenue.actual !== null && kpis.revenue.actual < kpis.revenue.plan) {
        companiesMissingPlan.push(comp.companyName);
      }
    }

    // Gross profit
    if (kpis.grossProfit?.actual !== null && kpis.grossProfit?.actual !== undefined) {
      totalGrossProfit += kpis.grossProfit.actual;
    }

    // OPEX
    if (kpis.opex?.actual !== null && kpis.opex?.actual !== undefined) {
      totalOpex += kpis.opex.actual;
    }

    // EBITDA
    if (kpis.ebitda?.actual !== null && kpis.ebitda?.actual !== undefined) {
      totalEbitda += kpis.ebitda.actual;
    }

    // Net Profit
    if (kpis.netProfit?.actual !== null && kpis.netProfit?.actual !== undefined) {
      const np = kpis.netProfit.actual;
      totalNetProfit += np;
      if (np < 0) {
        companiesNegativeProfit.push(comp.companyName);
      }
      if (np > topProfVal) {
        topProfVal = np;
        topProfName = comp.companyName;
      }
    }

    if (kpis.netProfit?.plan !== null && kpis.netProfit?.plan !== undefined) {
      totalNetProfitPlan += kpis.netProfit.plan;
    }

    // Debtors
    if (kpis.debtors !== null && kpis.debtors !== undefined) {
      totalDebtors += kpis.debtors;
      if (kpis.debtors > highestDebtorsVal) {
        highestDebtorsVal = kpis.debtors;
        highestDebtorsName = comp.companyName;
      }
    }
  }

  // Fallback: If company sheets didn't have revenue, but CONSOLIDATED exists, use CONSOLIDATED as benchmark
  if (totalRevenue === 0 && consolidatedReport && consolidatedReport.headlineKPIs.revenue?.actual) {
    totalRevenue = consolidatedReport.headlineKPIs.revenue.actual;
    totalPlanRevenue = consolidatedReport.headlineKPIs.revenue.plan || 0;
    totalNetProfit = consolidatedReport.headlineKPIs.netProfit?.actual || 0;
  }

  const revenueAchievementPct = totalPlanRevenue > 0 ? (totalRevenue / totalPlanRevenue) * 100 : 100;
  const netProfitAchievementPct = totalNetProfitPlan > 0 ? (totalNetProfit / totalNetProfitPlan) * 100 : 100;

  onProgress?.({
    phase: 'done',
    percent: 100,
    message: 'Workbook ready for analysis!'
  });

  return {
    filename,
    fileSize,
    reportingPeriod: 'August 2026',
    lastReportedMonth: 'August',
    totalSheets,
    operatingCompanyCount,
    sectorSummaryCount,
    consolidatedCount,
    helperOrChartCount,
    sheetClassifications,
    companies,
    sectorReports,
    consolidatedReport,
    groupSummary: {
      totalRevenue,
      totalPlanRevenue,
      revenueAchievementPct,
      totalGrossProfit,
      totalOpex,
      totalEbitda,
      totalNetProfit,
      totalNetProfitPlan,
      netProfitAchievementPct,
      totalDebtors,
      companiesReporting,
      companiesMissingPlan,
      companiesNegativeProfit,
      topRevenueCompany: topRevVal > 0 ? { name: topRevName, value: topRevVal } : undefined,
      topProfitCompany: topProfVal > -Infinity ? { name: topProfName, value: topProfVal } : undefined,
      highestDebtorsCompany: highestDebtorsVal > 0 ? { name: highestDebtorsName, value: highestDebtorsVal } : undefined
    },
    dataQualityWarnings
  };
}
