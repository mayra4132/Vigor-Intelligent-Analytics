/**
 * In-Memory Workbook Cache
 * Retains parsed SheetJS WorkBook objects during the user session.
 * Enables zero-latency sheet switching without re-uploading or re-reading ArrayBuffers.
 */

import * as XLSX from 'xlsx';

const workbookCache = new Map<string, XLSX.WorkBook>();

export function cacheWorkbook(datasetId: string, workbook: XLSX.WorkBook): void {
  if (datasetId && workbook) {
    workbookCache.set(datasetId, workbook);
  }
}

export function getCachedWorkbook(datasetId: string): XLSX.WorkBook | undefined {
  return workbookCache.get(datasetId);
}

export function clearWorkbookCache(): void {
  workbookCache.clear();
}
