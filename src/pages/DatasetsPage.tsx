/**
 * My Data Page
 * Simple overview of all uploaded spreadsheets, reports, and analyzed datasets.
 */

import React, { useState } from 'react';
import {
  Database,
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  Compass,
  Sliders,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Dataset } from '../types';

interface DatasetsPageProps {
  datasets: Dataset[];
  activeDataset: Dataset | null;
  onSelectDataset: (ds: Dataset) => void;
  onDeleteDataset: (id: string) => void;
  onNavigateToUpload: () => void;
  onReloadSample: () => void;
  onClearAll?: () => void;
  onNavigateToUnderstanding?: (ds: Dataset) => void;
  onNavigateToExplore?: (ds: Dataset) => void;
}

export const DatasetsPage: React.FC<DatasetsPageProps> = ({
  datasets,
  activeDataset,
  onSelectDataset,
  onDeleteDataset,
  onNavigateToUpload,
  onReloadSample,
  onClearAll,
  onNavigateToUnderstanding,
  onNavigateToExplore
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
            Uploaded Spreadsheets & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {datasets.length === 0
              ? 'No spreadsheets currently stored in this workspace.'
              : `${datasets.length} operational datasets available for instant analysis.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {datasets.length > 0 && onClearAll && (
            <button
              onClick={() => {
                if (window.confirm('Remove all stored datasets from this session?')) {
                  onClearAll();
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}

          <button
            onClick={onReloadSample}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Load Demo Data
          </button>

          <button
            onClick={onNavigateToUpload}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Data</span>
          </button>
        </div>
      </div>

      {/* Datasets Grid */}
      {datasets.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {datasets.map(ds => {
            const isActive = activeDataset?.id === ds.id;
            const activeSheet = ds.sheets.find(s => s.name === ds.selectedSheet) || ds.sheets[0];

            return (
              <div
                key={ds.id}
                className={`p-5 rounded-2xl border transition-all bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isActive
                    ? 'border-indigo-500 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <FileSpreadsheet className="w-6 h-6" />
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
                      {ds.sectorName && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {ds.sectorName}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 font-mono mt-0.5 truncate" title={ds.filename}>
                      {ds.filename}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                      <span>{activeSheet?.totalRows || ds.row_count} rows</span>
                      <span>•</span>
                      <span>{activeSheet?.columns?.length || ds.column_count} columns</span>
                      <span>•</span>
                      <span>{ds.sheets.length} sheet{ds.sheets.length !== 1 ? 's' : ''}</span>
                      {ds.reporting_period && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 font-medium">{ds.reporting_period}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {onNavigateToUnderstanding && (
                    <button
                      onClick={() => {
                        onSelectDataset(ds);
                        onNavigateToUnderstanding(ds);
                      }}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                      title="Check / Edit Data Mapping"
                    >
                      <Sliders className="w-4 h-4 text-slate-500" />
                    </button>
                  )}

                  {onNavigateToExplore && (
                    <button
                      onClick={() => {
                        onSelectDataset(ds);
                        onNavigateToExplore(ds);
                      }}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                      title="Explore Raw Data & Charts"
                    >
                      <Compass className="w-4 h-4 text-slate-500" />
                    </button>
                  )}

                  {deleteConfirmId === ds.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onDeleteDataset(ds.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(ds.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => onSelectDataset(ds)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">No spreadsheets uploaded yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Upload your operating spreadsheet or load pre-packaged multi-sector demo files.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onReloadSample}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              Load Demo Data
            </button>
            <button
              onClick={onNavigateToUpload}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs cursor-pointer"
            >
              Upload Spreadsheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
