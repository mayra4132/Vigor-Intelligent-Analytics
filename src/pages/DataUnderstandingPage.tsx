/**
 * "Check Your Data" Review Page (formerly Data Mapping)
 * Simple on the surface: shows recognized columns with ✓ Recognised or ? Please check.
 * Deep when needed: "Something is wrong" reveals full advanced mapping and sheet inspections.
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  Building2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Eye,
  Sliders
} from 'lucide-react';
import { Dataset, ColumnMetadata, ColumnType, ColumnMeaning } from '../types';
import { CANONICAL_METRICS, CanonicalMetricId } from '../data/canonicalMetrics';

interface DataUnderstandingPageProps {
  dataset: Dataset;
  onConfirmMapping: (updatedDataset: Dataset) => void;
  onBackToUpload: () => void;
}

const DATA_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'date', label: 'Date / Time' },
  { value: 'currency', label: 'Currency' },
  { value: 'number', label: 'Number' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'category', label: 'Category' },
  { value: 'text', label: 'Text' },
  { value: 'identifier', label: 'Identifier' }
];

const COLUMN_MEANINGS: ColumnMeaning[] = [
  'Time Period',
  'Estimated Metric',
  'Actual Metric',
  'Revenue',
  'Profit',
  'Loss',
  'Cost / Expense',
  'Quantity / Volume',
  'Target / Budget',
  'Variance',
  'Department / Branch',
  'Category / Dimension',
  'Identifier / ID',
  'General Text'
];

export const DataUnderstandingPage: React.FC<DataUnderstandingPageProps> = ({
  dataset,
  onConfirmMapping,
  onBackToUpload
}) => {
  const [selectedSheetName, setSelectedSheetName] = useState(
    dataset.selectedSheet || dataset.sheets[0]?.name || ''
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDataPreview, setShowDataPreview] = useState(false);

  // Active sheet
  const activeSheet = dataset.sheets.find(s => s.name === selectedSheetName) || dataset.sheets[0];
  const [columns, setColumns] = useState<ColumnMetadata[]>(activeSheet ? [...activeSheet.columns] : []);

  // Sync columns when sheet changes
  React.useEffect(() => {
    const sheet = dataset.sheets.find(s => s.name === selectedSheetName) || dataset.sheets[0];
    if (sheet) {
      setColumns([...sheet.columns]);
    }
  }, [selectedSheetName, dataset]);

  const handleUpdateColumn = (colName: string, updates: Partial<ColumnMetadata>) => {
    setColumns(prev =>
      prev.map(c => (c.name === colName ? { ...c, ...updates } : c))
    );
  };

  const handleToggleInclude = (colName: string) => {
    setColumns(prev =>
      prev.map(c => (c.name === colName ? { ...c, include: !c.include } : c))
    );
  };

  const handleFinish = () => {
    const updatedSheets = dataset.sheets.map(s => {
      if (s.name === activeSheet.name) {
        return { ...s, columns };
      }
      return s;
    });

    const updatedDataset: Dataset = {
      ...dataset,
      selectedSheet: activeSheet.name,
      row_count: activeSheet.totalRows,
      column_count: activeSheet.totalColumns,
      sheets: updatedSheets
    };

    onConfirmMapping(updatedDataset);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Step 3 of 3
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {dataset.companyName} ({dataset.sectorName || 'Business'})
            </span>
          </div>

          <button
            onClick={onBackToUpload}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Upload a different file</span>
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Check Your Data
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            We understood your spreadsheet like this. Please check before continuing.
          </p>
        </div>

        {/* Simple File Summary Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] font-bold uppercase text-slate-400">File</p>
            <p className="text-xs font-bold text-slate-800 truncate mt-0.5" title={dataset.filename}>
              {dataset.filename}
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] font-bold uppercase text-slate-400">Rows</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">
              {activeSheet.totalRows}
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] font-bold uppercase text-slate-400">Columns</p>
            <p className="text-base font-extrabold text-slate-900 mt-0.5">
              {activeSheet.totalColumns}
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[10px] font-bold uppercase text-slate-400">Sheet</p>
            <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
              {activeSheet.name}
            </p>
          </div>
        </div>
      </div>

      {/* Multiple Sheets Option if applicable */}
      {dataset.sheets.length > 1 && (
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Multiple sheets detected. Analyzing:</span>
          </div>
          <select
            value={selectedSheetName}
            onChange={e => setSelectedSheetName(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
          >
            {dataset.sheets.map(s => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.totalRows} rows)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* "What We Found" - The Humanised Review List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900">
            What we found
          </h2>
          <span className="text-xs text-slate-400">
            {columns.filter(c => c.include).length} active columns recognized
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {columns.map(col => {
            const isHighConfidence = col.confidence === 'high' || !col.confidence;
            const meaningLabel = col.detectedMeaning || col.canonicalMetric || col.detectedType;

            return (
              <div key={col.name} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[180px]" title={col.name}>
                    {col.name}
                  </div>
                  <span className="text-slate-400 text-xs">→</span>
                  <div className="text-xs font-semibold text-indigo-700 truncate">
                    {meaningLabel}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isHighConfidence ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                      <Check className="w-3 h-3" />
                      <span>Recognised</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
                      <AlertCircle className="w-3 h-3" />
                      <span>Please check</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary and Secondary Decision Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Something is wrong</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          <button
            onClick={handleFinish}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Everything Looks Good</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADVANCED MAPPING CONTROLS (Only expanded if "Something is wrong" is clicked) */}
      {/* ========================================================================= */}
      {showAdvanced && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Advanced Column Adjustments
              </h3>
              <p className="text-xs text-slate-500">
                Manually adjust data types, semantic roles, or omit columns.
              </p>
            </div>

            <button
              onClick={() => setShowDataPreview(!showDataPreview)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showDataPreview ? 'Hide Raw Rows' : 'Inspect Raw Rows'}</span>
            </button>
          </div>

          {/* Raw Rows Preview Table */}
          {showDataPreview && (
            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56 text-xs">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700">
                  <tr>
                    {columns.map(c => (
                      <th key={c.name} className="px-3 py-2 text-left whitespace-nowrap">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {activeSheet.rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {columns.map(c => (
                        <td key={c.name} className="px-3 py-1.5 whitespace-nowrap text-slate-700">
                          {row[c.name] !== undefined && row[c.name] !== null
                            ? String(row[c.name])
                            : <span className="text-slate-300">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Column Editing Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3 text-left">Include</th>
                  <th className="p-3 text-left">Header Name</th>
                  <th className="p-3 text-left">Data Type</th>
                  <th className="p-3 text-left">Business Role</th>
                  <th className="p-3 text-left">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {columns.map(col => (
                  <tr key={col.name} className={col.include ? 'hover:bg-slate-50/50' : 'bg-slate-50/40 opacity-60'}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={col.include}
                        onChange={() => handleToggleInclude(col.name)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      {col.name}
                    </td>
                    <td className="p-3">
                      <select
                        value={col.detectedType}
                        onChange={e => handleUpdateColumn(col.name, { detectedType: e.target.value as ColumnType })}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-800"
                      >
                        {DATA_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={col.detectedMeaning}
                        onChange={e => handleUpdateColumn(col.name, { detectedMeaning: e.target.value })}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-800"
                      >
                        {COLUMN_MEANINGS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {col.confidence || 'high'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              Apply Changes & Generate Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
