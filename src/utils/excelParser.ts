/**
 * Real Excel (.xlsx, .xls) and CSV Parser using SheetJS (xlsx)
 * Client-side in-browser ArrayBuffer parsing with intelligent multi-sheet and header detection
 */

import * as XLSX from 'xlsx';
import { SheetData, ColumnMetadata, Dataset } from '../types';
import { detectColumnTypeAndMeaning, cleanHeaderName } from './typeDetector';
import { COMPANY_BY_ID, SECTOR_BY_ID, GENERAL_SECTOR } from '../data/groupStructure';

export interface ParseOptions {
  sectorId?: string;
  companyId?: string;
  reportingPeriod?: string;
  onProgress?: (percent: number, status: string) => void;
}

export async function parseExcelFile(file: File, options?: ParseOptions): Promise<Dataset> {
  const filename = file.name;
  const fileSize = file.size;
  const sectorId = options?.sectorId;
  const companyId = options?.companyId;
  const reportingPeriod = options?.reportingPeriod || 'Current Period';

  // 1. Validate file extension
  const lowerName = filename.toLowerCase();
  const isXLSX = lowerName.endsWith('.xlsx');
  const isXLS = lowerName.endsWith('.xls');
  const isCSV = lowerName.endsWith('.csv');

  if (!isXLSX && !isXLS && !isCSV) {
    const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : 'unknown';
    throw new Error(`Unsupported file type '${ext}'. Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) workbook.`);
  }

  // 2. Validate non-empty file
  if (fileSize === 0) {
    throw new Error(`The selected file "${filename}" is empty (0 bytes). Please upload a valid spreadsheet containing data.`);
  }

  // 3. Read ArrayBuffer from File object
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
    console.log('[XLSX] ArrayBuffer loaded:', arrayBuffer.byteLength, 'bytes');
  } catch (readErr: any) {
    console.error('[UPLOAD ERROR] Error reading file as ArrayBuffer:', readErr);
    throw new Error(`Could not read file: ${readErr?.message || 'Access error'}.`);
  }

  // 4. Parse workbook with SheetJS
  let workbook: XLSX.WorkBook;
  try {
    if (isCSV) {
      // Decode CSV string directly to prevent character encoding issues
      const textDecoder = new TextDecoder('utf-8');
      const csvText = textDecoder.decode(arrayBuffer);
      workbook = XLSX.read(csvText, {
        type: 'string',
        cellDates: true
      });
    } else {
      workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true
      });
    }
    console.log('[XLSX] Workbook parsed');
  } catch (parseErr: any) {
    console.error('[UPLOAD ERROR] SheetJS parse error:', parseErr);
    throw new Error(`Could not parse workbook: ${parseErr?.message || 'The file may be corrupted or password protected.'}`);
  }

  // 5. Verify worksheets exist
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Workbook contains no worksheets.');
  }
  console.log('[XLSX] Sheets detected:', workbook.SheetNames);

  const sheets: SheetData[] = [];

  // 6. Inspect each worksheet
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    // Convert sheet to 2D array of rows (preserving empty/null values)
    const rawData: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: null,
      blankrows: false
    });

    if (!rawData || rawData.length === 0) {
      sheets.push({
        name: sheetName,
        columns: [],
        rows: [],
        totalRows: 0,
        totalColumns: 0,
        missingValueCount: 0,
        duplicateRowCount: 0
      });
      continue;
    }

    // 7. Intelligent Header Row Detection
    const bestHeaderRowIndex = findBestHeaderRowIndex(rawData);
    const rawHeaders: any[] = rawData[bestHeaderRowIndex] || [];
    const rawDataRows: any[][] = rawData.slice(bestHeaderRowIndex + 1);

    // 8. Clean and Deduplicate Headers while preserving originalHeader
    const columnMetaList: { safeKey: string; originalHeader: string }[] = [];
    const keyOccurrences: Record<string, number> = {};

    rawHeaders.forEach((h, i) => {
      const rawStr = h !== null && h !== undefined ? String(h).trim() : '';
      const displayOriginal = rawStr.length > 0 ? rawStr : `Column ${i + 1}`;
      let safeKey = cleanHeaderName(displayOriginal);

      if (!safeKey || safeKey === 'null' || safeKey === 'undefined') {
        safeKey = `Column_${i + 1}`;
      }

      if (keyOccurrences[safeKey] !== undefined) {
        keyOccurrences[safeKey]++;
        safeKey = `${safeKey}_${keyOccurrences[safeKey]}`;
      } else {
        keyOccurrences[safeKey] = 1;
      }

      columnMetaList.push({
        safeKey,
        originalHeader: displayOriginal
      });
    });

    // 9. Extract and transform data rows
    let missingValueCount = 0;
    const rowSignatures = new Set<string>();
    let duplicateRowCount = 0;
    const rows: Record<string, any>[] = [];

    for (const rawRow of rawDataRows) {
      if (!Array.isArray(rawRow) || rawRow.every(c => c === null || c === undefined || String(c).trim() === '')) {
        continue; // Skip entirely blank rows
      }

      // Check if this row is a total/summary row (e.g. first column is "Total" or "Grand Total")
      const firstCell = rawRow[0] !== null && rawRow[0] !== undefined ? String(rawRow[0]).trim().toLowerCase() : '';
      const isSummaryRow = firstCell === 'total' || firstCell === 'grand total' || firstCell === 'sum' || firstCell === 'average';

      const rowObj: Record<string, any> = {};
      let rowSig = '';

      columnMetaList.forEach((colMeta, idx) => {
        let val = rawRow[idx];

        if (val === null || val === undefined || val === '') {
          missingValueCount++;
          rowObj[colMeta.safeKey] = null;
        } else {
          // Date formatting
          if (val instanceof Date) {
            val = formatDateValue(val);
          } else if (typeof val === 'number') {
            // Already numeric
            val = isNaN(val) ? null : val;
          } else if (typeof val === 'string') {
            val = val.trim();
            // Parse formatted currency, comma-separated numbers, parenthesized accounting negatives
            const numVal = parseCleanNumber(val);
            if (numVal !== null) {
              val = numVal;
            }
          }
          rowObj[colMeta.safeKey] = val;
        }
        rowSig += `|${rowObj[colMeta.safeKey]}`;
      });

      if (isSummaryRow) {
        rowObj._isSummaryRow = true;
      }

      if (rowSignatures.has(rowSig)) {
        duplicateRowCount++;
      } else {
        rowSignatures.add(rowSig);
      }

      rows.push(rowObj);
    }

    // 10. Infer column types and semantic meanings
    const columns: ColumnMetadata[] = columnMetaList.map(colMeta => {
      const colValues = rows.map(r => r[colMeta.safeKey]);
      const nonNullValues = colValues.filter(v => v !== null && v !== undefined && v !== '');
      const distinctCount = new Set(nonNullValues).size;
      const nullCount = colValues.length - nonNullValues.length;

      const detection = detectColumnTypeAndMeaning(colMeta.safeKey, colValues, sectorId);

      return {
        name: colMeta.safeKey,
        originalName: colMeta.originalHeader,
        detectedType: detection.type,
        detectedMeaning: detection.meaning,
        canonicalMetric: detection.canonicalMetric,
        confidence: detection.confidence,
        confidenceReason: detection.confidenceReason,
        include: true,
        sampleValues: nonNullValues.slice(0, 3),
        nullCount,
        distinctCount,
        isCurrency: detection.isCurrency,
        currencySymbol: detection.currencySymbol
      };
    });

    const sheetData: SheetData = {
      name: sheetName,
      columns,
      rows,
      totalRows: rows.length,
      totalColumns: columns.length,
      missingValueCount,
      duplicateRowCount
    };

    sheets.push(sheetData);
  }

  // 11. Check if all sheets are empty
  const hasAnyData = sheets.some(s => s.totalRows > 0);
  if (!hasAnyData) {
    throw new Error('Selected worksheet is empty. The uploaded workbook contains no data rows to analyse.');
  }

  // Choose the best sheet (the sheet with the most data rows)
  const sortedSheets = [...sheets].sort((a, b) => b.totalRows - a.totalRows);
  const activeSheet = sortedSheets[0] || sheets[0];

  console.log('[XLSX] Selected sheet:', activeSheet.name, 'with', activeSheet.totalRows, 'rows');

  const datasetId = `ds_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const cleanDatasetName = filename.replace(/\.(xlsx|xls|csv)$/i, '');

  const detectedTypesRecord: Record<string, string> = {};
  activeSheet.columns.forEach(c => {
    detectedTypesRecord[c.name] = c.detectedType;
  });

  // Resolve company and sector configuration
  const resolvedCompany = companyId ? COMPANY_BY_ID[companyId] : undefined;
  const resolvedSectorId = sectorId || resolvedCompany?.sectorId || 'general';
  const resolvedSector = SECTOR_BY_ID[resolvedSectorId] || GENERAL_SECTOR;

  const dataset: Dataset = {
    id: datasetId,
    name: cleanDatasetName,
    filename,
    original_file_name: filename,
    fileSize,
    uploadedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
    sheets,
    selectedSheet: activeSheet.name,
    sheetName: activeSheet.name,
    sheetNames: sheets.map(s => s.name),
    headers: activeSheet.columns.map(c => c.name),
    rows: activeSheet.rows,
    rowCount: activeSheet.totalRows,
    columnCount: activeSheet.totalColumns,
    row_count: activeSheet.totalRows,
    column_count: activeSheet.totalColumns,
    detectedTypes: detectedTypesRecord,
    sector: resolvedSectorId,
    sector_id: resolvedSectorId,
    sectorName: resolvedSector.name,
    company: companyId || 'vigor-cement',
    company_id: companyId || 'vigor-cement',
    companyName: resolvedCompany?.name || 'VIGOR Business Unit',
    reportingPeriod: reportingPeriod,
    reporting_period: reportingPeriod,
    status: 'current'
  };

  console.log('[DATASET] Dataset constructed:', dataset.id, dataset.name, 'for', dataset.companyName);
  return dataset;
}

/**
 * Robust header row locator that handles titles, blank rows, and notes at the top
 */
function findBestHeaderRowIndex(rawData: any[][]): number {
  if (!rawData || rawData.length === 0) return 0;
  let bestIndex = 0;
  let highestScore = -1;

  const maxScan = Math.min(rawData.length, 12);
  for (let r = 0; r < maxScan; r++) {
    const row = rawData[r];
    if (!Array.isArray(row)) continue;

    const cells = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
    if (cells.length < 2) continue;

    let stringCount = 0;
    let numberCount = 0;
    let keywordCount = 0;

    cells.forEach(c => {
      if (typeof c === 'number') {
        numberCount++;
      } else if (typeof c === 'string') {
        const s = c.trim().toLowerCase();
        if (/^[0-9,.\-+%\$\s()]+$/.test(s)) {
          numberCount++;
        } else {
          stringCount++;
          if (/revenue|cost|expense|profit|target|actual|variance|month|date|period|year|total|loss|output|production|sales|qty|quantity|name|id|department|branch|room|rate|hour|downtime|budget/i.test(s)) {
            keywordCount++;
          }
        }
      }
    });

    // Score header candidates: prioritize rows with multiple string headers & metric keywords over pure data
    const score = (stringCount * 3) + (keywordCount * 5) - (numberCount * 2) + cells.length;
    if (score > highestScore) {
      highestScore = score;
      bestIndex = r;
    }
  }

  return bestIndex;
}

function formatDateValue(date: Date): string {
  try {
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Parses numbers with financial, currency, and accounting notation:
 * - Parentheses notation: (1,234.50) -> -1234.50
 * - Minus notation: -1,234.50 -> -1234.50
 * - Currency prefixes: TZS 50,000,000, $1,200.00, EUR 300, etc.
 * - Thousands separators with commas or spaces: 50 000 000 or 50,000,000
 * - Percentages: 15.5% -> 15.5
 */
export function parseCleanNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val !== 'string') return null;

  let str = val.trim();
  if (!str) return null;

  // Ignore spreadsheet formula errors
  if (/^#(VALUE|DIV\/0|N\/A|REF|NAME\?|NUM!|NULL!)/i.test(str)) {
    return null;
  }

  // Handle accounting parentheses: (1,234.56) -> -1234.56
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Remove currency symbols & currency codes
  str = str.replace(/[\$,€,£,¥]/g, '');
  str = str.replace(/\b(tzs|tsh|shs|usd|kes|ugx|eur|gbp)\b/gi, '').trim();

  // Strip percentage sign
  if (str.endsWith('%')) {
    str = str.slice(0, -1).trim();
  }

  // Remove spaces used as thousand separators (e.g. 50 000 000)
  str = str.replace(/\s+/g, '');

  // Handle standard 1,234,567.89 or European 1.234.567,89
  if (/^[0-9]{1,3}(,[0-9]{3})+(\.[0-9]+)?$/.test(str)) {
    str = str.replace(/,/g, '');
  } else if (/^[0-9]{1,3}(\.[0-9]{3})+(,[0-9]+)?$/.test(str)) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/^[0-9]+,[0-9]+$/.test(str)) {
    str = str.replace(',', '.');
  } else {
    str = str.replace(/,/g, '');
  }

  const num = parseFloat(str);
  if (isNaN(num)) return null;

  return isNegative ? -num : num;
}

