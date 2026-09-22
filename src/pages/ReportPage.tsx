/**
 * Executive Report & PDF Export Page
 * Generate verified PDF reports, select scope (Consolidated vs Sheet),
 * live metric preview, instant PDF download, and MySQL report persistence.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  Trash2,
  CheckCircle2,
  FileCheck,
  Building2,
  Clock
} from 'lucide-react';
import { Dataset, SavedReport, AppView } from '../types';
import { apiClient } from '../services/apiClient';
import { generateManagementPdf } from '../utils/pdfGenerator';
import { formatCompactNumber, formatPercent } from '../services/analyticsEngine';

interface ReportPageProps {
  dataset: Dataset | null;
  onNavigate: (view: AppView) => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  dataset,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
  const [selectedScope, setSelectedScope] = useState<string>('Consolidated');
  const [executiveNotes, setExecutiveNotes] = useState<string>(
    'Key management action items: Review budget variances with operational leads. Protect gross profit margins and prioritize credit collections.'
  );
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  const reportingPeriod =
    dataset?.consolidatedData?.reportingPeriod ||
    dataset?.reportingPeriod ||
    dataset?.reporting_period ||
    'August 2026';

  const defaultTitle = `${dataset?.companyName || dataset?.name || 'VIGOR'} — ${selectedScope} Performance Report`;
  const [reportTitle, setReportTitle] = useState(defaultTitle);

  useEffect(() => {
    if (dataset) {
      setReportTitle(`${dataset.companyName || dataset.name} — ${selectedScope} Performance Report`);
    }
  }, [selectedScope, dataset?.name]);

  // Load saved reports from MySQL
  const loadSavedReports = async () => {
    const reports = await apiClient.getReports(dataset?.id);
    setSavedReports(reports);
  };

  useEffect(() => {
    loadSavedReports();
  }, [dataset?.id]);

  const availableSheets = dataset?.parsedWorkbook?.sheets || [];

  // Determine performance metrics for preview
  let activePerf = dataset?.consolidatedData;
  if (selectedScope !== 'Consolidated' && dataset?.parsedWorkbook?.sheets) {
    const s = dataset.parsedWorkbook.sheets.find(
      sh => sh.sheetName === selectedScope || sh.displayName === selectedScope
    );
    if (s?.performanceData) {
      activePerf = s.performanceData;
    }
  }

  const handleGenerateAndDownload = async () => {
    if (!dataset) return;
    setIsDownloading(true);
    setDownloadSuccessMsg(null);

    try {
      const filename = generateManagementPdf({
        dataset,
        scope: selectedScope,
        reportTitle,
        executiveNotes,
        reportingPeriod
      });

      // Save report record in MySQL
      const reportId = `rep_${Date.now()}`;
      const newReport: SavedReport = {
        id: reportId,
        workbook_id: dataset.id,
        workbook_name: dataset.name || dataset.filename,
        scope: selectedScope,
        report_type: 'executive_summary',
        title: reportTitle,
        reporting_period: reportingPeriod,
        generated_by: 'Executive User',
        created_at: new Date().toISOString(),
        snapshot_json: {
          metricsCount: (activePerf?.financialMetrics?.length || 0) + (activePerf?.operationalMetrics?.length || 0)
        }
      };

      await apiClient.saveReport(newReport);
      await loadSavedReports();
      setDownloadSuccessMsg(`Downloaded ${filename} and saved to MySQL!`);
      setTimeout(() => setDownloadSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('PDF generation error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (window.confirm('Delete this saved report record?')) {
      await apiClient.deleteReport(id);
      await loadSavedReports();
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Reports & Exports</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Executive Performance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and export verified executive PDF documents with zero sample values.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Generate Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'saved'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Saved Reports</span>
            {savedReports.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                {savedReports.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {downloadSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{downloadSuccessMsg}</span>
        </div>
      )}

      {/* Tab: Generate Report */}
      {activeTab === 'generate' && (
        <>
          {dataset ? (
            <div className="space-y-6">
              {/* Configuration Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span>Report Configuration</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Scope Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Report Scope
                    </label>
                    <select
                      value={selectedScope}
                      onChange={e => setSelectedScope(e.target.value)}
                      className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="Consolidated">Consolidated Group</option>
                      {availableSheets
                        .filter(s => !s.sheetName.toUpperCase().includes('CONSOLIDAT'))
                        .map(s => (
                          <option key={s.sheetName} value={s.sheetName}>
                            {s.displayName || s.sheetName}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Reporting Period */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Reporting Period
                    </label>
                    <input
                      type="text"
                      disabled
                      value={reportingPeriod}
                      className="w-full text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Report Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Report Title
                  </label>
                  <input
                    type="text"
                    value={reportTitle}
                    onChange={e => setReportTitle(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Executive Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Executive Notes & Management Directives
                  </label>
                  <textarea
                    rows={3}
                    value={executiveNotes}
                    onChange={e => setExecutiveNotes(e.target.value)}
                    className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateAndDownload}
                    disabled={isDownloading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? 'Generating PDF...' : 'Download Executive PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Verified Metrics Preview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Verified Content Preview ({selectedScope})
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Real numbers only
                  </span>
                </div>

                {activePerf?.financialMetrics && activePerf.financialMetrics.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Financial Metric</th>
                          <th className="py-2.5 px-3 text-right">Actual</th>
                          <th className="py-2.5 px-3 text-right">Plan</th>
                          <th className="py-2.5 px-3 text-right">Variance</th>
                          <th className="py-2.5 px-3 text-right">Achievement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activePerf.financialMetrics.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-semibold text-slate-800">{m.metricName}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-900">
                              {m.actual !== null ? formatCompactNumber(m.actual) : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500">
                              {m.plan !== null ? formatCompactNumber(m.plan) : '—'}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono font-semibold ${
                                (m.variance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {m.variance !== null ? formatCompactNumber(m.variance) : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700">
                              {m.achievementPct !== null ? formatPercent(m.achievementPct) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No financial metrics detected for this sheet.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">No active workbook</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Select a workbook from My Data or upload a new spreadsheet to generate executive PDF reports.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('datasets')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>My Data</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Upload Data</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Saved Reports */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {savedReports.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {savedReports.map(rep => (
                <div
                  key={rep.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {rep.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="text-indigo-600 font-semibold">{rep.scope}</span>
                        <span>•</span>
                        <span>{rep.reporting_period || 'Current Period'}</span>
                        <span>•</span>
                        <span>
                          {new Date(rep.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold">MySQL Record ✓</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteReport(rep.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {dataset && (
                      <button
                        type="button"
                        onClick={() => {
                          generateManagementPdf({
                            dataset,
                            scope: rep.scope,
                            reportTitle: rep.title,
                            reportingPeriod: rep.reporting_period || reportingPeriod
                          });
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-2xs">
              <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">No generated reports yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate your first executive PDF report from the Generate Report tab. Stored records will appear here.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
