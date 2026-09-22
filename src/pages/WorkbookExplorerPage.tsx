import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Building2,
  Factory,
  Layers,
  Search,
  ArrowRight,
  CheckCircle2,
  TableProperties,
  BarChart3,
  Calendar,
  Sparkles,
  Info,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { Dataset, ParsedSheet, SheetRole } from '../types';

interface WorkbookExplorerPageProps {
  dataset: Dataset | null;
  onSelectSheet: (sheetName: string) => void;
  onNavigateToDashboard: () => void;
}

export const WorkbookExplorerPage: React.FC<WorkbookExplorerPageProps> = ({
  dataset,
  onSelectSheet,
  onNavigateToDashboard
}) => {
  const [filterRole, setFilterRole] = useState<'all' | 'company' | 'sector' | 'group' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const parsedWorkbook = dataset?.parsedWorkbook;
  const currentSheetName = dataset?.activeSheetName || dataset?.selectedSheet || 'CONSOLIDATED';

  const allSheets = useMemo(() => {
    if (parsedWorkbook?.sheets && parsedWorkbook.sheets.length > 0) {
      return parsedWorkbook.sheets;
    }
    if (dataset?.sheetNames && dataset.sheetNames.length > 0) {
      return dataset.sheetNames.map(name => ({
        sheetName: name,
        displayName: name,
        role: (name.toUpperCase().includes('CONSOLIDAT') ? 'group' : 'company') as SheetRole,
        isAnalysable: true
      }));
    }
    return [];
  }, [parsedWorkbook, dataset]);

  // Counts
  const counts = useMemo(() => {
    const total = allSheets.length;
    const group = allSheets.filter(s => s.role === 'group' || s.sheetName.toUpperCase().includes('CONSOLIDAT')).length;
    const sector = allSheets.filter(s => s.role === 'sector').length;
    const company = allSheets.filter(s => s.role === 'company').length;
    const other = total - (group + sector + company);
    return { total, group, sector, company, other };
  }, [allSheets]);

  // Filtered sheets
  const filteredSheets = useMemo(() => {
    return allSheets.filter(sheet => {
      // Role match
      if (filterRole === 'group' && sheet.role !== 'group' && !sheet.sheetName.toUpperCase().includes('CONSOLIDAT')) return false;
      if (filterRole === 'sector' && sheet.role !== 'sector') return false;
      if (filterRole === 'company' && sheet.role !== 'company') return false;
      if (filterRole === 'other' && (sheet.role === 'group' || sheet.role === 'sector' || sheet.role === 'company' || sheet.sheetName.toUpperCase().includes('CONSOLIDAT'))) return false;

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = sheet.sheetName.toLowerCase().includes(q);
        const matchesDisplay = sheet.displayName?.toLowerCase().includes(q);
        const matchesCompany = sheet.companyName?.toLowerCase().includes(q);
        const matchesSector = sheet.sectorName?.toLowerCase().includes(q);
        const matchesCode = sheet.companyCode?.toLowerCase().includes(q);
        return matchesName || matchesDisplay || matchesCompany || matchesSector || matchesCode;
      }

      return true;
    });
  }, [allSheets, filterRole, searchQuery]);

  const handleOpenSheet = (sheetName: string) => {
    onSelectSheet(sheetName);
    onNavigateToDashboard();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Workbook Ready
              </span>
              <span className="text-slate-400 text-xs">
                {parsedWorkbook?.totalSheets || allSheets.length} Worksheets Parsed
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {dataset?.filename || 'Performance Review Aug 2026 Consolidated'}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Switch freely between consolidated management overviews, sector summaries, and individual operating companies with zero re-uploading.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              id="open-consolidated-dashboard-btn"
              onClick={() => handleOpenSheet(currentSheetName)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <BarChart3 className="w-4 h-4 text-slate-950" />
              Open Active Dashboard ({currentSheetName})
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Meta Pills */}
        <div className="mt-6 pt-6 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Reporting Period</span>
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              {dataset?.reportingPeriod || 'August 2026'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Primary Currency</span>
            <span className="font-semibold text-white">TZS (MTZS in Financials)</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Parse Engine</span>
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Formula Resilient
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Active Sheet</span>
            <span className="font-bold text-sky-300">{currentSheetName}</span>
          </div>
        </div>
      </div>

      {/* Metric Tiles Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setFilterRole('all')}
          className={`p-4 rounded-xl text-left border transition-all ${
            filterRole === 'all'
              ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <span className="text-xs text-slate-500 font-medium block mb-1">Total Sheets</span>
          <span className="text-2xl font-bold text-slate-900">{counts.total}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Full workbook scope</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterRole('group')}
          className={`p-4 rounded-xl text-left border transition-all ${
            filterRole === 'group'
              ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <span className="text-xs text-slate-500 font-medium block mb-1">Group Level</span>
          <span className="text-2xl font-bold text-sky-900">{counts.group}</span>
          <span className="text-[11px] text-sky-600 font-medium block mt-1">Consolidated P&L</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterRole('sector')}
          className={`p-4 rounded-xl text-left border transition-all ${
            filterRole === 'sector'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <span className="text-xs text-slate-500 font-medium block mb-1">Sector Summaries</span>
          <span className="text-2xl font-bold text-emerald-900">{counts.sector}</span>
          <span className="text-[11px] text-emerald-600 font-medium block mt-1">Division rollups</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterRole('company')}
          className={`p-4 rounded-xl text-left border transition-all ${
            filterRole === 'company'
              ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <span className="text-xs text-slate-500 font-medium block mb-1">Operating Companies</span>
          <span className="text-2xl font-bold text-indigo-900">{counts.company}</span>
          <span className="text-[11px] text-indigo-600 font-medium block mt-1">Business entities</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterRole('other')}
          className={`p-4 rounded-xl text-left border transition-all ${
            filterRole === 'other'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
          }`}
        >
          <span className="text-xs text-slate-500 font-medium block mb-1">Other / Helper</span>
          <span className="text-2xl font-bold text-slate-700">{counts.other}</span>
          <span className="text-[11px] text-slate-400 block mt-1">Formula & audit</span>
        </button>
      </div>

      {/* Directory Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by company code, name, sector (e.g. KCC, ATH, Tulip, Cement)..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setFilterRole('all')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterRole === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Sheets ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('company')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterRole === 'company'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Companies ({counts.company})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('sector')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterRole === 'sector'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Sectors ({counts.sector})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('group')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterRole === 'group'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Group ({counts.group})
          </button>
          <button
            type="button"
            onClick={() => setFilterRole('other')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              filterRole === 'other'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Other ({counts.other})
          </button>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSheets.map(sheet => {
          const isSelected = sheet.sheetName.toLowerCase() === currentSheetName.toLowerCase();
          const isGroup = sheet.role === 'group' || sheet.sheetName.toUpperCase().includes('CONSOLIDAT');
          const isSector = sheet.role === 'sector';
          const isCompany = sheet.role === 'company';

          return (
            <div
              key={sheet.sheetName}
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-sky-50/60 border-sky-300 ring-2 ring-sky-500/20 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900">
                        {sheet.sheetName}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                      {sheet.companyName || sheet.displayName || sheet.sheetName}
                    </p>
                  </div>

                  {/* Badge */}
                  <div className="shrink-0">
                    {isGroup && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                        <Layers className="w-3 h-3 text-sky-600" />
                        Group
                      </span>
                    )}
                    {isSector && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Factory className="w-3 h-3 text-emerald-600" />
                        Sector
                      </span>
                    )}
                    {isCompany && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        Operating Unit
                      </span>
                    )}
                    {!isGroup && !isSector && !isCompany && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        <TableProperties className="w-3 h-3 text-slate-400" />
                        Helper
                      </span>
                    )}
                  </div>
                </div>

                {/* Sector / Description */}
                <div className="space-y-1 text-xs text-slate-500 mb-4">
                  {sheet.sectorName && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Sector:</span>
                      <span className="font-medium text-slate-700">{sheet.sectorName}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Analysis:</span>
                    <span className="font-medium text-slate-700">
                      {sheet.isAnalysable ? 'Standard Dashboard (Actual vs Plan)' : 'Source Worksheet Preview'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  id={`open-sheet-${sheet.sheetName}-btn`}
                  onClick={() => handleOpenSheet(sheet.sheetName)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    isSelected
                      ? 'bg-sky-600 hover:bg-sky-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  {isSelected ? 'View Active Dashboard' : 'Open Dashboard'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSheets.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
          <p className="text-sm font-semibold text-slate-800 mb-1">No worksheets found</p>
          <p className="text-xs">No worksheets match the search "{searchQuery}"</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterRole('all');
            }}
            className="mt-4 px-3 py-1.5 text-xs text-sky-700 bg-sky-50 rounded-lg border border-sky-200 font-semibold"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
