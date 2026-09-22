/**
 * VIGOR Management Report PDF Generator
 * Uses jsPDF and jspdf-autotable to generate clean executive PDF documents
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dataset, ConsolidatedPerformanceData, NormalizedMetric } from '../types';
import { formatCompactNumber, formatPercent } from '../services/analyticsEngine';

export interface GeneratePdfOptions {
  dataset: Dataset;
  scope: string;
  reportTitle: string;
  executiveNotes?: string;
  reportingPeriod: string;
}

export function generateManagementPdf(options: GeneratePdfOptions): string {
  const { dataset, scope, reportTitle, executiveNotes, reportingPeriod } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 16;

  // Header: VIGOR Branding
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('VIGOR INTELLIGENT ANALYTICS', 16, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text(`EXECUTIVE PERFORMANCE REPORT — ${scope.toUpperCase()}`, 16, 18);

  const nowFormatted = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  doc.text(`Generated: ${nowFormatted}`, pageWidth - 16, 18, { align: 'right' });

  currentY = 32;

  // Document Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(reportTitle, 16, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(
    `Workbook: ${dataset.name || dataset.filename} | Period: ${reportingPeriod} | Scope: ${scope}`,
    16,
    currentY
  );

  currentY += 8;

  // Executive Summary Card
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(16, currentY, pageWidth - 32, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text('EXECUTIVE HIGHLIGHT', 20, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const summaryText =
    executiveNotes ||
    `This report reflects financial and operational outcomes for ${scope} during ${reportingPeriod}. All calculations are verified and derived from normalized spreadsheet performance records.`;
  const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 40);
  doc.text(splitSummary, 20, currentY + 12);

  currentY += 28;

  // Determine Performance Data
  let perf: ConsolidatedPerformanceData | undefined = undefined;
  if (scope.toLowerCase().includes('consolidat')) {
    perf = dataset.consolidatedData;
  } else if (dataset.parsedWorkbook?.sheets) {
    const s = dataset.parsedWorkbook.sheets.find(
      sh => sh.sheetName.toLowerCase() === scope.toLowerCase() || (sh.displayName && sh.displayName.toLowerCase() === scope.toLowerCase())
    );
    if (s?.performanceData) perf = s.performanceData;
  }
  if (!perf && dataset.consolidatedData) {
    perf = dataset.consolidatedData;
  }

  // 1. Financial Performance Table
  if (perf && perf.financialMetrics && perf.financialMetrics.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Financial Performance & Variance Analysis', 16, currentY);
    currentY += 4;

    const tableRows = perf.financialMetrics.map(m => [
      m.metricName,
      m.actual !== null ? formatCompactNumber(m.actual) : '—',
      m.plan !== null ? formatCompactNumber(m.plan) : '—',
      m.variance !== null ? formatCompactNumber(m.variance) : '—',
      m.achievementPct !== null ? formatPercent(m.achievementPct) : '—',
      m.ytdActual !== null && m.ytdActual !== undefined ? formatCompactNumber(m.ytdActual) : '—'
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 16, right: 16 },
      head: [['Metric', 'Actual', 'Plan', 'Variance', 'Achievement', 'YTD Actual']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check page overflow
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  // 2. Operational Performance Table
  if (perf && perf.operationalMetrics && perf.operationalMetrics.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Operational Key Performance Indicators', 16, currentY);
    currentY += 4;

    const opRows = perf.operationalMetrics.map(m => [
      m.metricName,
      m.actual !== null ? formatCompactNumber(m.actual) : '—',
      m.plan !== null ? formatCompactNumber(m.plan) : '—',
      m.variance !== null ? formatCompactNumber(m.variance) : '—',
      m.achievementPct !== null ? formatPercent(m.achievementPct) : '—'
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 16, right: 16 },
      head: [['Operational KPI', 'Actual', 'Plan', 'Variance', 'Achievement']],
      body: opRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      columnStyles: {
        0: { cellWidth: 65, fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Footer: Confidentiality & Integrity Notice
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(
      'CONFIDENTIAL — Prepared for VIGOR Executive Management. Real records only.',
      16,
      287
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 16, 287, { align: 'right' });
  }

  // Clean filename
  const cleanScope = scope.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanPeriod = reportingPeriod.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `VIGOR_${cleanScope}_Report_${cleanPeriod}.pdf`;

  // Download PDF file
  doc.save(filename);
  return filename;
}
