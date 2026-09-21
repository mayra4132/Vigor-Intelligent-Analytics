/**
 * Executive Report Export Page
 * Clean, printable layout with KPIs, Visualisations, AI Executive Summary,
 * and custom management notes. Styled for both screen and print/PDF output.
 */

import React, { useState } from 'react';
import {
  Printer,
  FileText,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Download,
  ArrowLeft,
  Building2
} from 'lucide-react';
import { Dataset } from '../types';
import { analyzeSheet } from '../services/analyticsEngine';
import { KPICardView } from '../components/KPICardView';
import { ChartWidget } from '../components/ChartWidget';

interface ReportPageProps {
  dataset: Dataset;
  onBackToDashboard: () => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  dataset,
  onBackToDashboard
}) => {
  const activeSheet = dataset.sheets.find(s => s.name === dataset.selectedSheet) || dataset.sheets[0];
  const analysis = analyzeSheet(activeSheet, {});

  const companyName = dataset.companyName || dataset.name;
  const reportingPeriod = dataset.reporting_period || 'August 2026';

  const [reportTitle, setReportTitle] = useState(`${companyName} — Performance Report (${reportingPeriod})`);
  const [executiveNotes, setExecutiveNotes] = useState(
    'Key management action items: Review budget variance with departmental leads. Monitor cost drivers to protect operating margins.'
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Top Action Bar (Hidden during Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Executive Report Preview</h1>
            <p className="text-xs text-slate-500">Formatted for print and PDF export</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print or Save to PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wider text-slate-900">
                VIGOR
              </span>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Management Report
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Generated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <input
            type="text"
            value={reportTitle}
            onChange={e => setReportTitle(e.target.value)}
            className="w-full text-2xl font-black text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors"
          />

          <p className="text-xs text-slate-500 font-mono mt-1">
            Source Workbook: {dataset.filename} • Sheet: {activeSheet.name} • {activeSheet.totalRows} records evaluated
          </p>
        </div>

        {/* Executive Summary Section */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
            Executive Summary
          </h3>
          <p className="text-xs leading-relaxed text-slate-700 font-medium">
            {analysis.executiveSummary}
          </p>
        </div>

        {/* Key Metrics Section */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Core Operating Metrics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {analysis.kpis.slice(0, 4).map(kpi => (
              <KPICardView key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </div>

        {/* Primary Chart Visualization */}
        {analysis.charts[0] && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Performance Trajectory
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden p-2">
              <ChartWidget chart={analysis.charts[0]} data={activeSheet.rows} />
            </div>
          </div>
        )}

        {/* Strategic AI Observations */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Management Observations
          </h3>
          <div className="space-y-2">
            {analysis.insights.slice(0, 3).map(insight => (
              <div
                key={insight.id}
                className="p-3 rounded-xl border border-slate-200 bg-white flex items-start gap-2.5 text-xs"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></div>
                <div>
                  <span className="font-bold text-slate-900">{insight.title}: </span>
                  <span className="text-slate-600">{insight.content}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Management Notes & Directives */}
        <div className="pt-2 border-t border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
            Management Directives
          </h3>
          <textarea
            rows={3}
            value={executiveNotes}
            onChange={e => setExecutiveNotes(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Add specific notes, actions, or owner assignments..."
          />
        </div>

        {/* Report Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Confidential — Internal VIGOR Management Distribution Only</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
};
