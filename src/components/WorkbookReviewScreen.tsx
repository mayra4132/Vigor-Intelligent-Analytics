import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  PieChart,
  ShieldAlert,
  Info
} from 'lucide-react';
import { NormalizedWorkbook, SheetClassification } from '../types';

interface WorkbookReviewScreenProps {
  workbook: NormalizedWorkbook;
  onConfirmAnalysis: (customizedWorkbook: NormalizedWorkbook) => void;
  onCancel: () => void;
}

export const WorkbookReviewScreen: React.FC<WorkbookReviewScreenProps> = ({
  workbook,
  onConfirmAnalysis,
  onCancel
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [classifications, setClassifications] = useState<SheetClassification[]>(
    workbook.sheetClassifications
  );

  const toggleIncludeRollup = (sheetName: string) => {
    setClassifications(prev =>
      prev.map(s => {
        if (s.sheetName === sheetName) {
          return { ...s, includeInGroupRollup: !s.includeInGroupRollup };
        }
        return s;
      })
    );
  };

  const handleConfirm = () => {
    // Recompute with updated classifications if user toggled any
    const updatedWorkbook: NormalizedWorkbook = {
      ...workbook,
      sheetClassifications: classifications
    };
    onConfirmAnalysis(updatedWorkbook);
  };

  const operatingSheets = classifications.filter(s => s.role === 'company' && !s.isDuplicate);
  const sectorSheets = classifications.filter(s => s.role === 'sector_summary');
  const consolidatedSheets = classifications.filter(s => s.role === 'group_consolidated');
  const helperSheets = classifications.filter(s => s.role === 'helper' || s.role === 'chart');

  return (
    <div className="max-w-4xl mx-auto py-4 px-2">
      {/* Header Card */}
      <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Workbook Structure Verified
              </div>
              <h2 className="text-2xl font-bold text-stone-900">We understood your workbook</h2>
              <p className="text-sm text-stone-600 font-mono mt-0.5">{workbook.filename}</p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-600 text-sm font-medium px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors"
          >
            Upload Different File
          </button>
        </div>

        {/* Structure Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-3">
            <span className="text-xs text-stone-500 font-medium block">Total Sheets</span>
            <span className="text-xl font-bold text-stone-900">{workbook.totalSheets}</span>
            <span className="text-xs text-stone-500 block mt-0.5">found in workbook</span>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-lg p-3">
            <span className="text-xs text-emerald-800 font-medium block">Operating Companies</span>
            <span className="text-xl font-bold text-emerald-900">{operatingSheets.length}</span>
            <span className="text-xs text-emerald-700 block mt-0.5">individual businesses</span>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/60 rounded-lg p-3">
            <span className="text-xs text-amber-800 font-medium block">Sector Summaries</span>
            <span className="text-xl font-bold text-amber-900">{sectorSheets.length}</span>
            <span className="text-xs text-amber-700 block mt-0.5">excluded from sum</span>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/60 rounded-lg p-3">
            <span className="text-xs text-blue-800 font-medium block">Consolidated Level</span>
            <span className="text-xl font-bold text-blue-900">{consolidatedSheets.length}</span>
            <span className="text-xs text-blue-700 block mt-0.5">group benchmark</span>
          </div>
        </div>

        {/* Warnings Banner if any */}
        {workbook.dataQualityWarnings.length > 0 && (
          <div className="mt-5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong className="font-semibold block mb-0.5">Double-Counting Protection Applied:</strong>
              {workbook.dataQualityWarnings.map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
          </div>
        )}

        {/* Identified Operating Companies Grid */}
        <div className="mt-6 pt-5 border-t border-stone-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-stone-600" />
              Operating Companies Identified ({operatingSheets.length})
            </h3>
            <span className="text-xs text-stone-500">All mapped to canonical VIGOR entities</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {operatingSheets.map(s => (
              <div
                key={s.sheetName}
                className="flex items-center justify-between p-2.5 bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-lg text-xs transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-stone-900 truncate">
                    {s.companyName || s.sheetName}
                  </div>
                  <div className="text-[11px] text-stone-500 truncate">
                    Sheet: <span className="font-mono">{s.sheetName}</span> · {s.sectorName}
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-5 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 text-sm font-medium transition-colors"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Detailed Sheet Table
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Review Details ({workbook.totalSheets} sheets)
              </>
            )}
          </button>

          <button
            onClick={handleConfirm}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            Analyse Workbook
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detailed Sheet Table (Expanded when Review Details is clicked) */}
      {showDetails && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm mb-6 animate-in fade-in duration-200">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-stone-900">Worksheet Classification & Role Mapping</h4>
              <p className="text-xs text-stone-600">
                Ensure aggregate sheets are not double-counted when calculating group totals.
              </p>
            </div>
            <span className="text-xs text-stone-500 font-mono">
              {classifications.filter(s => s.includeInGroupRollup).length} sheets included in group rollup
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-700 font-semibold">
                  <th className="py-2.5 px-3">Sheet Name</th>
                  <th className="py-2.5 px-3">Detected Role</th>
                  <th className="py-2.5 px-3">Entity Mapping</th>
                  <th className="py-2.5 px-3">Sector</th>
                  <th className="py-2.5 px-3 text-center">Group Rollup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-800">
                {classifications.map(s => {
                  const isExcluded = !s.includeInGroupRollup;
                  return (
                    <tr
                      key={s.sheetName}
                      className={isExcluded ? 'bg-stone-50/60 text-stone-600' : 'hover:bg-stone-50/50'}
                    >
                      <td className="py-2.5 px-3 font-mono font-medium text-stone-900">
                        {s.sheetName}
                        {s.isDuplicate && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-sans">
                            Duplicate of {s.duplicateOf}
                          </span>
                        )}
                        {s.isHidden && (
                          <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] bg-stone-200 text-stone-700 font-sans">
                            Hidden
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                            s.role === 'company'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.role === 'sector_summary'
                              ? 'bg-amber-100 text-amber-800'
                              : s.role === 'group_consolidated'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {s.role.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-medium">
                        {s.companyName || '—'}
                      </td>

                      <td className="py-2.5 px-3 text-stone-600">
                        {s.sectorName || '—'}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleIncludeRollup(s.sheetName)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            s.includeInGroupRollup
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                          }`}
                        >
                          {s.includeInGroupRollup ? 'Included' : 'Excluded'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
