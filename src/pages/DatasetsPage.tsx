/**
 * My Data Page
 * Real uploaded spreadsheets and workbooks stored in MySQL.
 * Search, Scope Filters, Details, cascading Delete with confirmation, and direct Open.
 */

import React, { useState, useMemo } from 'react';
import {
  Database,
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  ArrowRight,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
  X
} from 'lucide-react';
import { Dataset } from '../types';

interface DatasetsPageProps {
  datasets: Dataset[];
  activeDataset: Dataset | null;
  onSelectDataset: (ds: Dataset) => void;
  onDeleteDataset: (id: string) => void;
  onNavigateToUpload: () => void;
  onClearAll?: () => void;
}

export const DatasetsPage: React.FC<DatasetsPageProps> = ({
  datasets,
  activeDataset,
  onSelectDataset,
  onDeleteDataset,
  onNavigateToUpload,
  onClearAll
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'group' | 'sector' | 'company'>('all');
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Dataset | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Dataset | null>(null);

  // Filter out any legacy demo or sample datasets
  const realDatasets = useMemo(() => {
    return datasets.filter(
      ds => !ds.isSample && !ds.id.startsWith('sample-') && !ds.id.startsWith('demo-')
    );
  }, [datasets]);

  // Apply search and category filter
  const filteredDatasets = useMemo(() => {
    return realDatasets.filter(ds => {
      const q = searchQuery.toLowerCase();
      const nameMatch =
        (ds.companyName || ds.name || '').toLowerCase().includes(q) ||
        (ds.filename || '').toLowerCase().includes(q) ||
        (ds.reportingPeriod || ds.reporting_period || '').toLowerCase().includes(q);

      if (!nameMatch) return false;

      if (filterRole === 'group') {
        return (
          ds.isConsolidatedWorkbook ||
          (ds.name || '').toLowerCase().includes('consolidat') ||
          (ds.name || '').toLowerCase().includes('group')
        );
      }
      if (filterRole === 'sector') {
        return Boolean(ds.sectorName || ds.sector);
      }
      if (filterRole === 'company') {
        return Boolean(ds.companyName || ds.company);
      }
      return true;
    });
  }, [realDatasets, searchQuery, filterRole]);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>My Data</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Uploaded Workbooks & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {realDatasets.length === 0
              ? 'No workbooks currently saved in MySQL.'
              : `${realDatasets.length} saved workbook${realDatasets.length > 1 ? 's' : ''} available for analysis.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {realDatasets.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete all saved workbooks from database?')) {
                  onClearAll();
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateToUpload}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Data</span>
          </button>
        </div>
      </div>

      {realDatasets.length > 0 ? (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search workbooks, sheets, reporting periods..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Scope Filter Buttons */}
            <div className="flex items-center gap-1">
              {(['all', 'group', 'sector', 'company'] as const).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFilterRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    filterRole === role
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {role === 'all' ? 'All Workbooks' : role}
                </button>
              ))}
            </div>
          </div>

          {/* Datasets Table / List */}
          <div className="grid grid-cols-1 gap-3">
            {filteredDatasets.map(ds => {
              const isActive = activeDataset?.id === ds.id;
              const sheetCount =
                ds.parsedWorkbook?.totalSheets ||
                ds.sheets?.length ||
                1;
              const period =
                ds.consolidatedData?.reportingPeriod ||
                ds.reportingPeriod ||
                ds.reporting_period ||
                'Current Period';
              const uploadDate = ds.uploadedAt
                ? new Date(ds.uploadedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                : 'Recently';

              return (
                <div
                  key={ds.id}
                  className={`p-4 rounded-xl border transition-all bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive
                      ? 'border-indigo-500 ring-1 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {ds.companyName || ds.name}
                        </h3>
                        {isActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            Active
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Saved in MySQL</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 font-mono mt-0.5 truncate" title={ds.filename}>
                        {ds.filename}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span className="text-slate-700 font-semibold">{period}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          <span>{sheetCount} sheet{sheetCount !== 1 ? 's' : ''}</span>
                        </span>
                        <span>•</span>
                        <span>Uploaded {uploadDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setDetailsTarget(ds)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="View Details"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmTarget(ds)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete workbook"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectDataset(ds)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredDatasets.length === 0 && (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-500">
                No workbooks match your current search or filter.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No saved data yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Upload your first performance workbook. Once uploaded, it will be automatically saved in MySQL and available here across sessions.
            </p>
          </div>
          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={onNavigateToUpload}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Data</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Delete Saved Workbook?</h3>
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-900">“{deleteConfirmTarget.companyName || deleteConfirmTarget.name}”</span>?
              This will safely remove its saved sheets, normalized metrics, monthly values, and reports from MySQL.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDataset(deleteConfirmTarget.id);
                  setDeleteConfirmTarget(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workbook Details Modal */}
      {detailsTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Workbook Details</h3>
              <button
                type="button"
                onClick={() => setDetailsTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Workbook Name:</span>
                <span className="font-semibold text-slate-800">{detailsTarget.companyName || detailsTarget.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Original File:</span>
                <span className="font-mono text-slate-800">{detailsTarget.filename}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Reporting Period:</span>
                <span className="font-semibold text-indigo-600">
                  {detailsTarget.consolidatedData?.reportingPeriod || detailsTarget.reportingPeriod || 'Current Period'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Sheets:</span>
                <span className="font-semibold text-slate-800">
                  {detailsTarget.parsedWorkbook?.totalSheets || detailsTarget.sheets?.length || 1}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Storage Backend:</span>
                <span className="font-semibold text-emerald-600">MySQL Database (Normalized)</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailsTarget(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
