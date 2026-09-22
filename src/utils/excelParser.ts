/**
 * Real Excel (.xlsx, .xls) and CSV Parser using SheetJS (xlsx)
 * Client-side in-browser ArrayBuffer parsing with intelligent multi-sheet and header detection
 */

import * as XLSX from 'xlsx';
import {
  SheetData,
  ColumnMetadata,
  Dataset,
  ParsedSheet,
  ParsedWorkbook,
  SheetRole,
  ConsolidatedPerformanceData
} from '../types';
import { detectColumnTypeAndMeaning, cleanHeaderName } from './typeDetector';
import {
  COMPANY_BY_ID,
  SECTOR_BY_ID,
  GENERAL_SECTOR,
  classifySheetName,
  ALL_VIGOR_COMPANIES,
  VIGOR_SECTORS
} from '../data/groupStructure';
import { isManagementWorkbook, parseManagementWorkbook } from './workbookParser';
import { findConsolidatedSheetName, parseConsolidatedWorksheet } from './consolidatedParser';
import { cacheWorkbook, getCachedWorkbook } from './workbookCache';

function findBestHeaderRow(rawRows: any[][]): number {
  if (!rawRows || rawRows.length === 0) return 0;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (Array.isArray(row)) {
      const nonEmpty = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
      if (nonEmpty.length >= 2) return i;
    }
  }
  return 0;
}

export interface ParseOptions {
  sectorId?: string;
  companyId?: string;
  reportingPeriod?: string;
  targetSheetName?: string;
  preferConsolidated?: boolean;
  onProgress?: (percent: number, status: string) => void;
}

export async function parseExcelFile(file: File, options?: ParseOptions): Promise<Dataset> {
  const filename = file.name;
  const fileSize = file.size;
  const sectorId = options?.sectorId;
  const companyId = options?.companyId;
  const reportingPeriod = options?.reportingPeriod || 'Current Period';

  console.log('[UPLOAD] File selected:', filename);

  // 1. Validate file extension
  const lowerName = filename.toLowerCase();
  const isXLSX = lowerName.endsWith('.xlsx');
  const isXLS = lowerName.endsWith('.xls');
  const isCSV = lowerName.endsWith('.csv');

  if (!isXLSX && !isXLS && !isCSV) {
    const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : 'unknown';
    throw new Error(`Unsupported file type '${ext}'. Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) workbook.`);
  }

  // 2. Validate non-empty file and reasonable size limit (up to 30MB)
  if (fileSize === 0) {
    throw new Error(`The selected file "${filename}" is empty (0 bytes). Please upload a valid spreadsheet containing data.`);
  }

  if (fileSize > 30 * 1024 * 1024) {
    throw new Error(`The file size (${(fileSize / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 30 MB.`);
  }

  // 3. Read ArrayBuffer from File object (client-side in-browser, no network request)
  let arrayBuffer: ArrayBuffer;
  try {
    options?.onProgress?.(10, `Reading file (${(fileSize / (1024 * 1024)).toFixed(1)} MB)...`);
    arrayBuffer = await file.arrayBuffer();
    console.log('[UPLOAD] ArrayBuffer loaded:', arrayBuffer.byteLength, 'bytes');
  } catch (readErr: any) {
    console.error('[CONSOLIDATED ERROR] Error reading file as ArrayBuffer:', readErr);
    throw new Error(`Could not read file: ${readErr?.message || 'Access error'}.`);
  }

  // 4. Parse workbook with SheetJS (using pre-evaluated cell values)
  let workbook: XLSX.WorkBook;
  try {
    options?.onProgress?.(25, 'Parsing workbook structure...');
    if (isCSV) {
      const textDecoder = new TextDecoder('utf-8');
      const csvText = textDecoder.decode(arrayBuffer);
      workbook = XLSX.read(csvText, {
        type: 'string',
        cellDates: true
      });
    } else {
      workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellDates: true,
        cellFormula: false // use pre-evaluated results for maximum speed
      });
    }
    console.log('[XLSX] Workbook parsed');
  } catch (parseErr: any) {
    console.error('[CONSOLIDATED ERROR] SheetJS parse error:', parseErr);
    throw new Error(`Could not parse workbook: ${parseErr?.message || 'The file may be corrupted or password protected.'}`);
  }

  // 5. Verify worksheets exist
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    console.error('[CONSOLIDATED ERROR] Workbook contains no worksheets');
    throw new Error('Workbook contains no worksheets.');
  }
  console.log('[XLSX] Sheet count detected:', workbook.SheetNames.length);

  // 6. PRIORITY MVP ROUTE: Check for CONSOLIDATED sheet
  // If user selected Group Consolidated (default) or the workbook contains a CONSOLIDATED sheet,
  // process ONLY the CONSOLIDATED worksheet for instantaneous speed and exact accuracy.
  const targetSheet = options?.targetSheetName;
  const detectedConsolidatedName = findConsolidatedSheetName(workbook.SheetNames);
  const consolidatedSheetName = targetSheet || detectedConsolidatedName;

  if (consolidatedSheetName && workbook.Sheets[consolidatedSheetName]) {
    console.log('[XLSX] CONSOLIDATED found:', consolidatedSheetName);
    options?.onProgress?.(50, `Analyzing ${consolidatedSheetName} worksheet...`);

    try {
      const consWs = workbook.Sheets[consolidatedSheetName];
      const consData = parseConsolidatedWorksheet(consWs, consolidatedSheetName, filename);
      console.log('[CONSOLIDATED] Reporting month detected:', consData.reportingPeriod);

      // Build SheetData rows and columns for table views and export
      const allMetrics = [...consData.operationalMetrics, ...consData.financialMetrics];
      const rows: Record<string, any>[] = allMetrics.map((m) => {
        const rowObj: Record<string, any> = {
          Metric: m.metricName,
          Section: m.section === 'operational' ? 'Operational' : 'Financial',
          Unit: m.unit || '',
          Actual: m.actual,
          Plan: m.plan,
          Variance: m.variance,
          'Achievement %': m.achievementPct !== null ? Number(m.achievementPct.toFixed(1)) : null,
          SPLY: m.priorYear,
          'Growth %': m.growthPct !== null ? Number(m.growthPct.toFixed(1)) : null,
          'Actual YTD': m.ytdActual,
          'Plan YTD': m.ytdPlan,
          'YTD Variance': m.ytdVariance,
          'YTD Achievement %': m.ytdAchievementPct !== null ? Number(m.ytdAchievementPct.toFixed(1)) : null,
          'YTD Growth %': m.ytdGrowthPct !== null ? Number(m.ytdGrowthPct.toFixed(1)) : null
        };
        if (m.monthlyValues) {
          for (const [mName, mVal] of Object.entries(m.monthlyValues)) {
            rowObj[mName] = mVal;
          }
        }
        return rowObj;
      });

      const colNames = [
        'Metric', 'Section', 'Unit', 'Actual', 'Plan', 'Variance', 'Achievement %', 'SPLY', 'Growth %',
        'Actual YTD', 'Plan YTD', 'YTD Variance', 'YTD Achievement %', 'YTD Growth %',
        ...consData.availableMonths
      ];

      const columns: ColumnMetadata[] = colNames.map((name) => {
        const isNum = name !== 'Metric' && name !== 'Section' && name !== 'Unit';
        const isPct = name.includes('%');
        const isCurr = name.includes('Actual') || name.includes('Plan') || name.includes('Variance') || name.includes('SPLY');
        return {
          name,
          originalName: name,
          detectedType: isPct ? 'percentage' : isCurr ? 'currency' : isNum ? 'number' : 'text',
          detectedMeaning: isPct ? 'Variance' : isCurr ? 'Actual Metric' : 'Category / Dimension',
          include: true,
          sampleValues: rows.slice(0, 3).map((r) => r[name]),
          nullCount: rows.filter((r) => r[name] === null || r[name] === undefined).length,
          distinctCount: new Set(rows.map((r) => r[name])).size,
          isCurrency: isCurr,
          currencySymbol: 'TZS'
        };
      });

      const sheetData: SheetData = {
        name: consolidatedSheetName,
        columns,
        rows,
        totalRows: rows.length,
        totalColumns: columns.length,
        missingValueCount: 0,
        duplicateRowCount: 0
      };

      const datasetId = `ds_cons_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      cacheWorkbook(datasetId, workbook);

      // Classify and register ALL sheets in workbook
      const hiddenSheetMap: Record<string, boolean> = {};
      if (workbook.Workbook && (workbook.Workbook as any).Sheets) {
        (workbook.Workbook as any).Sheets.forEach((sMeta: any) => {
          if (sMeta.name && sMeta.Hidden) {
            hiddenSheetMap[sMeta.name] = true;
          }
        });
      }

      const parsedSheets: ParsedSheet[] = workbook.SheetNames.map((sName) => {
        const isHidden = !!hiddenSheetMap[sName];
        const sc = classifySheetName(sName, isHidden);
        const displayName =
          sc.companyName ||
          sc.sectorName ||
          (sc.role === 'group_consolidated' || sc.role === 'group'
            ? 'VIGOR Group Consolidated'
            : sName);
        const isAnalysable =
          sc.role === 'company' ||
          sc.role === 'sector_summary' ||
          sc.role === 'group_consolidated' ||
          sc.role === 'group' ||
          sc.role === 'sector';

        let normalizedRole: SheetRole = sc.role;
        if (normalizedRole === 'group_consolidated') normalizedRole = 'group';
        if (normalizedRole === 'sector_summary') normalizedRole = 'sector';

        const pSheet: ParsedSheet = {
          sheetName: sName,
          displayName,
          role: normalizedRole,
          sectorId: sc.sectorId,
          sectorName: sc.sectorName,
          companyId: sc.companyId,
          companyName: sc.companyName,
          companyCode: sName,
          reportingPeriod: consData.reportingPeriod || 'August 2026',
          isAnalysable
        };

        if (sName.toLowerCase() === consolidatedSheetName.toLowerCase()) {
          pSheet.performanceData = consData;
        }

        return pSheet;
      });

      const groupSheets = parsedSheets.filter(s => s.role === 'group');
      const sectorSheets = parsedSheets.filter(s => s.role === 'sector');
      const companySheets = parsedSheets.filter(s => s.role === 'company');
      const helperSheets = parsedSheets.filter(s => s.role === 'helper');
      const chartSheets = parsedSheets.filter(s => s.role === 'chart');
      const unknownSheets = parsedSheets.filter(s => s.role === 'unknown');

      const parsedWorkbook: ParsedWorkbook = {
        filename,
        fileSize,
        reportingPeriod: consData.reportingPeriod || 'August 2026',
        totalSheets: workbook.SheetNames.length,
        sheets: parsedSheets,
        groupSheets,
        sectorSheets,
        companySheets,
        helperSheets,
        chartSheets,
        unknownSheets
      };

      // Lightweight sheet data for all sheets so tabular and raw previews work immediately
      const allSheetsList: SheetData[] = [sheetData];
      for (const sName of workbook.SheetNames) {
        if (sName.toLowerCase() === consolidatedSheetName.toLowerCase()) continue;
        const otherWs = workbook.Sheets[sName];
        if (!otherWs) continue;
        try {
          const rawRows: any[] = XLSX.utils.sheet_to_json(otherWs, { header: 1, defval: null });
          if (rawRows.length > 0) {
            const hIdx = findBestHeaderRow(rawRows);
            const rawH = (rawRows[hIdx] || []).map((h: any, i: number) => String(h || `Col_${i + 1}`).trim());
            const clnH = rawH.map(cleanHeaderName);
            const subRows = rawRows.slice(hIdx + 1, hIdx + 50).map((r: any[]) => {
              const rObj: Record<string, any> = {};
              clnH.forEach((h: string, idx: number) => {
                rObj[h] = r[idx] ?? null;
              });
              return rObj;
            });
            const otherCols: ColumnMetadata[] = clnH.map((name: string) => ({
              name,
              originalName: name,
              detectedType: 'text',
              detectedMeaning: 'Attribute',
              include: true,
              sampleValues: subRows.slice(0, 3).map(r => r[name]),
              nullCount: 0,
              distinctCount: 0
            }));
            allSheetsList.push({
              name: sName,
              columns: otherCols,
              rows: subRows,
              totalRows: rawRows.length,
              totalColumns: clnH.length,
              missingValueCount: 0,
              duplicateRowCount: 0
            });
          }
        } catch {
          // Keep parsing other sheets safely
        }
      }

      const detectedTypesRecord: Record<string, string> = {};
      columns.forEach((c) => {
        detectedTypesRecord[c.name] = c.detectedType;
      });

      const dataset: Dataset = {
        id: datasetId,
        name: `VIGOR Group Consolidated — ${consData.reportingPeriod}`,
        filename,
        original_file_name: filename,
        fileSize,
        uploadedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        sheets: allSheetsList,
        selectedSheet: consolidatedSheetName,
        sheetName: consolidatedSheetName,
        sheetNames: workbook.SheetNames,
        headers: colNames,
        rows,
        rowCount: rows.length,
        columnCount: columns.length,
        row_count: rows.length,
        column_count: columns.length,
        detectedTypes: detectedTypesRecord,
        sector: 'Executive Operations',
        sector_id: 'general',
        sectorName: 'Executive Group Operations',
        company: 'VIGOR Group',
        company_id: 'vigor-group',
        companyName: 'VIGOR Group Consolidated',
        reportingPeriod: consData.reportingPeriod,
        reporting_period: consData.reportingPeriod,
        status: 'current',
        isConsolidatedWorkbook: true,
        consolidatedData: consData,
        parsedWorkbook,
        activeSheetName: consolidatedSheetName
      };

      console.log('[DASHBOARD] Complete multi-sheet dataset initialized with', parsedWorkbook.sheets.length, 'sheets');
      options?.onProgress?.(100, 'Workbook ready');
      return dataset;
    } catch (parseConsError: any) {
      console.error('[CONSOLIDATED ERROR] Error parsing CONSOLIDATED sheet:', parseConsError);
      throw parseConsError;
    }
  }

  // If user requested Consolidated report specifically but sheet was not found
  if (options?.preferConsolidated) {
    console.error('[CONSOLIDATED ERROR] CONSOLIDATED worksheet not found among:', workbook.SheetNames);
    throw new Error(`CONSOLIDATED_NOT_FOUND:${JSON.stringify(workbook.SheetNames)}`);
  }

  // 7. Branch: If Multi-Sheet Management Workbook without a CONSOLIDATED sheet
  if (!isCSV && isManagementWorkbook(workbook)) {
    console.log('[XLSX] Multi-sheet Management Workbook detected. Engaging advanced workbook engine.');
    options?.onProgress?.(35, 'Analyzing VIGOR management workbook structure...');

    const mgmtReport = await parseManagementWorkbook(file, (p) => {
      options?.onProgress?.(p.percent, p.message);
    });

    const datasetId = `ds_mgmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanDatasetName = filename.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ');

    // Generate SheetData for each company and aggregate report
    const mgmtSheets: SheetData[] = [];

    const buildSheetFromReport = (title: string, report: any): SheetData => {
      const allMetrics = [...(report.operationalMetrics || []), ...(report.financialMetrics || [])];
      const rows: Record<string, any>[] = allMetrics.map((m) => {
        const rowObj: Record<string, any> = {
          Metric: m.metricName,
          Section: m.section === 'operational' ? 'Operational' : 'Financial',
          Unit: m.unit || '',
          Actual: m.actual,
          Plan: m.plan,
          Variance: m.variance,
          'Achievement %': m.achievementPct !== null ? Number(m.achievementPct.toFixed(1)) : null,
          SPLY: m.priorYear,
          'Growth %': m.growthPct !== null ? Number(m.growthPct.toFixed(1)) : null
        };
        if (m.monthlyValues) {
          for (const [mName, mVal] of Object.entries(m.monthlyValues)) {
            rowObj[mName] = mVal;
          }
        }
        return rowObj;
      });

      const colNames = ['Metric', 'Section', 'Unit', 'Actual', 'Plan', 'Variance', 'Achievement %', 'SPLY', 'Growth %', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
      const columns: ColumnMetadata[] = colNames.map((name) => {
        const isNum = name !== 'Metric' && name !== 'Section' && name !== 'Unit';
        const isPct = name.includes('%');
        const isCurr = name === 'Actual' || name === 'Plan' || name === 'Variance' || name === 'SPLY';
        return {
          name,
          originalName: name,
          detectedType: isPct ? 'percentage' : isCurr ? 'currency' : isNum ? 'number' : 'text',
          detectedMeaning: isPct ? 'Variance' : isCurr ? 'Actual Metric' : 'Category / Dimension',
          include: true,
          sampleValues: rows.slice(0, 3).map((r) => r[name]),
          nullCount: rows.filter((r) => r[name] === null || r[name] === undefined).length,
          distinctCount: new Set(rows.map((r) => r[name])).size,
          isCurrency: isCurr,
          currencySymbol: 'TZS'
        };
      });

      return {
        name: title,
        columns,
        rows,
        totalRows: rows.length,
        totalColumns: columns.length,
        missingValueCount: 0,
        duplicateRowCount: 0
      };
    };

    if (mgmtReport.consolidatedReport) {
      mgmtSheets.push(buildSheetFromReport('CONSOLIDATED', mgmtReport.consolidatedReport));
    }

    for (const compReport of Object.values(mgmtReport.companies)) {
      mgmtSheets.push(buildSheetFromReport(compReport.companyName, compReport));
    }

    for (const [secId, secReport] of Object.entries(mgmtReport.sectorReports)) {
      mgmtSheets.push(buildSheetFromReport(secReport.companyName || secId, secReport));
    }

    const firstActiveSheet = mgmtSheets[0] || {
      name: 'Summary',
      columns: [],
      rows: [],
      totalRows: 0,
      totalColumns: 0,
      missingValueCount: 0,
      duplicateRowCount: 0
    };

    const detectedTypesRecord: Record<string, string> = {};
    firstActiveSheet.columns.forEach((c) => {
      detectedTypesRecord[c.name] = c.detectedType;
    });

    const dataset: Dataset = {
      id: datasetId,
      name: cleanDatasetName,
      filename,
      original_file_name: filename,
      fileSize,
      uploadedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      sheets: mgmtSheets,
      selectedSheet: firstActiveSheet.name,
      sheetName: firstActiveSheet.name,
      sheetNames: mgmtSheets.map((s) => s.name),
      headers: firstActiveSheet.columns.map((c) => c.name),
      rows: firstActiveSheet.rows,
      rowCount: firstActiveSheet.totalRows,
      columnCount: firstActiveSheet.totalColumns,
      row_count: firstActiveSheet.totalRows,
      column_count: firstActiveSheet.totalColumns,
      detectedTypes: detectedTypesRecord,
      sector: 'general',
      sector_id: 'general',
      sectorName: 'Group Level',
      company: 'vigor-group',
      company_id: 'vigor-group',
      companyName: 'VIGOR Group Consolidated',
      reportingPeriod: mgmtReport.reportingPeriod,
      reporting_period: mgmtReport.reportingPeriod,
      status: 'current',
      isManagementWorkbook: true,
      workbookReport: mgmtReport
    };

    console.log('[DATASET] Management Workbook Dataset constructed successfully:', dataset.id, `${mgmtReport.totalSheets} sheets, ${mgmtReport.operatingCompanyCount} operating companies`);
    return dataset;
  }

  // 7. Otherwise, fallback to single-sheet flat dataset parsing
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

/**
 * Retrieves or lazily extracts the ConsolidatedPerformanceData for ANY sheet in the workbook.
 * Operates in memory in < 5ms without re-reading or re-uploading the file.
 */
export function getOrParseSheetPerformance(
  dataset: Dataset,
  targetSheetName: string
): ConsolidatedPerformanceData | null {
  if (!dataset || !targetSheetName) return null;

  // 1. Check if already parsed in dataset.parsedWorkbook
  const pSheet = dataset.parsedWorkbook?.sheets.find(
    s => s.sheetName.toLowerCase() === targetSheetName.toLowerCase()
  );
  if (pSheet?.performanceData) {
    return pSheet.performanceData;
  }

  // 2. If it's the currently active consolidatedData and names match
  if (
    dataset.consolidatedData &&
    (dataset.activeSheetName?.toLowerCase() === targetSheetName.toLowerCase() ||
      dataset.selectedSheet?.toLowerCase() === targetSheetName.toLowerCase())
  ) {
    return dataset.consolidatedData;
  }

  // 3. Look up workbook in memory cache
  const wb = getCachedWorkbook(dataset.id);
  if (!wb) {
    if (
      dataset.consolidatedData &&
      (dataset.consolidatedData.sheetName || '').toLowerCase() === targetSheetName.toLowerCase()
    ) {
      return dataset.consolidatedData;
    }
    return null;
  }

  const ws =
    wb.Sheets[targetSheetName] ||
    Object.entries(wb.Sheets).find(
      ([name]) => name.toLowerCase() === targetSheetName.toLowerCase()
    )?.[1];

  if (!ws) return null;

  try {
    const perfData = parseConsolidatedWorksheet(ws, targetSheetName, dataset.filename);
    if (pSheet) {
      pSheet.performanceData = perfData;
    }
    return perfData;
  } catch (err) {
    console.error(`[XLSX] Failed parsing performance data for sheet '${targetSheetName}':`, err);
    return null;
  }
}

/**
 * Returns a 2D raw cell grid for instant "Source Data / Sheet Preview" of any worksheet.
 */
export function getSheetRawPreview(
  dataset: Dataset,
  targetSheetName: string
): (string | number | null)[][] {
  if (!dataset || !targetSheetName) return [];

  const pSheet = dataset.parsedWorkbook?.sheets.find(
    s => s.sheetName.toLowerCase() === targetSheetName.toLowerCase()
  );
  if (pSheet?.rawPreview && pSheet.rawPreview.length > 0) {
    return pSheet.rawPreview;
  }

  const wb = getCachedWorkbook(dataset.id);
  if (!wb) return [];

  const ws =
    wb.Sheets[targetSheetName] ||
    Object.entries(wb.Sheets).find(
      ([name]) => name.toLowerCase() === targetSheetName.toLowerCase()
    )?.[1];

  if (!ws) return [];

  try {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:AJ80');
    const maxR = Math.min(range.e.r, 80);
    const maxC = Math.min(range.e.c, 35);
    const grid: (string | number | null)[][] = [];

    for (let r = 0; r <= maxR; r++) {
      const row: (string | number | null)[] = [];
      for (let c = 0; c <= maxC; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellRef];
        if (!cell || cell.v === undefined || cell.v === null) {
          row.push(null);
        } else if (typeof cell.v === 'number') {
          row.push(cell.v);
        } else {
          row.push(String(cell.w || cell.v).trim());
        }
      }
      if (row.some(v => v !== null && v !== '')) {
        grid.push(row);
      }
    }

    if (pSheet) {
      pSheet.rawPreview = grid;
    }
    return grid;
  } catch {
    return [];
  }
}

