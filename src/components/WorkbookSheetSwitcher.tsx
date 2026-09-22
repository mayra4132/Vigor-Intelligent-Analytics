import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  Search,
  Check,
  Building2,
  Layers,
  Factory,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink,
  TableProperties
} from 'lucide-react';
import { Dataset, ParsedSheet, SheetRole } from '../types';

interface WorkbookSheetSwitcherProps {
  dataset: Dataset | null;
  activeSheetName?: string;
  onSelectSheet: (sheetName: string) => void;
  onOpenExplorer?: () => void;
  className?: string;
  compact?: boolean;
}

export const WorkbookSheetSwitcher: React.FC<WorkbookSheetSwitcherProps> = ({
  dataset,
  activeSheetName,
  onSelectSheet,
  onOpenExplorer,
  className = '',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentSheetName = activeSheetName || dataset?.activeSheetName || dataset?.selectedSheet || 'CONSOLIDATED';

  // Find active sheet metadata
  const currentSheetMeta = useMemo(() => {
    return dataset?.parsedWorkbook?.sheets.find(
      s => s.sheetName.toLowerCase() === currentSheetName.toLowerCase()
    );
  }, [dataset, currentSheetName]);

  // Sheets categorized
  const allSheets = useMemo(() => {
    if (dataset?.parsedWorkbook?.sheets && dataset.parsedWorkbook.sheets.length > 0) {
      return dataset.parsedWorkbook.sheets;
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
  }, [dataset]);

  // Filter sheets by search query
  const filteredSheets = useMemo(() => {
    if (!searchQuery.trim()) return allSheets;
    const q = searchQuery.toLowerCase().trim();
    return allSheets.filter(s => {
      return (
        s.sheetName.toLowerCase().includes(q) ||
        s.displayName.toLowerCase().includes(q) ||
        (s.companyName && s.companyName.toLowerCase().includes(q)) ||
        (s.sectorName && s.sectorName.toLowerCase().includes(q)) ||
        (s.companyCode && s.companyCode.toLowerCase().includes(q))
      );
    });
  }, [allSheets, searchQuery]);

  // Categorize filtered sheets
  const { groupSheets, sectorSheets, companySheets, otherSheets } = useMemo(() => {
    const groups: ParsedSheet[] = [];
    const sectors: ParsedSheet[] = [];
    const companies: ParsedSheet[] = [];
    const others: ParsedSheet[] = [];

    for (const sheet of filteredSheets) {
      if (sheet.role === 'group' || sheet.role === 'group_consolidated' || sheet.sheetName.toUpperCase().includes('CONSOLIDAT')) {
        groups.push(sheet);
      } else if (sheet.role === 'sector' || sheet.role === 'sector_summary') {
        sectors.push(sheet);
      } else if (sheet.role === 'company') {
        companies.push(sheet);
      } else {
        others.push(sheet);
      }
    }

    return { groupSheets: groups, sectorSheets: sectors, companySheets: companies, otherSheets: others };
  }, [filteredSheets]);

  const handleSelect = (sheetName: string) => {
    onSelectSheet(sheetName);
    setIsOpen(false);
    setSearchQuery('');
  };

  const getRoleBadge = (sheet: ParsedSheet) => {
    if (sheet.role === 'group' || sheet.sheetName.toUpperCase().includes('CONSOLIDAT')) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
          <Layers className="w-2.5 h-2.5" />
          Group Consolidated
        </span>
      );
    }
    if (sheet.role === 'sector') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <Factory className="w-2.5 h-2.5" />
          Sector Summary
        </span>
      );
    }
    if (sheet.role === 'company') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
          <Building2 className="w-2.5 h-2.5 text-slate-500" />
          {sheet.sectorName || 'Operating Unit'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
        <FileSpreadsheet className="w-2.5 h-2.5 text-slate-400" />
        Sheet
      </span>
    );
  };

  const renderSheetRow = (sheet: ParsedSheet) => {
    const isSelected = sheet.sheetName.toLowerCase() === currentSheetName.toLowerCase();
    return (
      <button
        key={sheet.sheetName}
        type="button"
        onClick={() => handleSelect(sheet.sheetName)}
        className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors group ${
          isSelected
            ? 'bg-sky-50 text-sky-950 font-medium border border-sky-200'
            : 'hover:bg-slate-100 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              isSelected ? 'bg-sky-600' : 'bg-slate-300 group-hover:bg-slate-400'
            }`}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-900 truncate">
                {sheet.sheetName}
              </span>
              {sheet.displayName && sheet.displayName !== sheet.sheetName && (
                <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                  • {sheet.displayName}
                </span>
              )}
            </div>
            {sheet.companyName && sheet.companyName !== sheet.sheetName && (
              <p className="text-[11px] text-slate-500 truncate">{sheet.companyName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {getRoleBadge(sheet)}
          {isSelected && <Check className="w-4 h-4 text-sky-600" />}
        </div>
      </button>
    );
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Compact Header Switcher Trigger */}
      <button
        type="button"
        id="workbook-sheet-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
            : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-xs'
        }`}
        title="Switch to another sheet in this workbook"
      >
        <div className="flex items-center gap-1.5">
          <Layers className={`w-3.5 h-3.5 ${isOpen ? 'text-sky-300' : 'text-sky-600'}`} />
          <span className={`text-[11px] uppercase tracking-wider ${isOpen ? 'text-slate-300' : 'text-slate-500'}`}>
            Viewing:
          </span>
          <span className="font-bold text-xs max-w-[140px] sm:max-w-[200px] truncate">
            {currentSheetName}
          </span>
        </div>

        {currentSheetMeta?.role === 'group' && (
          <span
            className={`hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              isOpen ? 'bg-sky-950 text-sky-200 border border-sky-800' : 'bg-sky-50 text-sky-700 border border-sky-200'
            }`}
          >
            Consolidated
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-white' : 'text-slate-400'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="workbook-sheet-switcher-dropdown"
          className="absolute left-0 mt-1.5 w-84 sm:w-96 rounded-xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header & Search */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
                Workbook Worksheets
              </span>
              <span className="text-[11px] text-slate-500">
                {allSheets.length} sheets total
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search company or sheet (e.g. KCC, ATH, Tulip)..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Sheet List Scroller */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-3">
            {/* Group Consolidated Sheets */}
            {groupSheets.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-900 flex items-center justify-between">
                  <span>Group Consolidated</span>
                  <span className="text-slate-400 font-normal">{groupSheets.length}</span>
                </div>
                <div className="space-y-0.5">
                  {groupSheets.map(renderSheetRow)}
                </div>
              </div>
            )}

            {/* Sector Summary Sheets */}
            {sectorSheets.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-900 flex items-center justify-between">
                  <span>Sector Summaries</span>
                  <span className="text-slate-400 font-normal">{sectorSheets.length}</span>
                </div>
                <div className="space-y-0.5">
                  {sectorSheets.map(renderSheetRow)}
                </div>
              </div>
            )}

            {/* Operating Company Sheets */}
            {companySheets.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Operating Companies</span>
                  <span className="text-slate-400 font-normal">{companySheets.length}</span>
                </div>
                <div className="space-y-0.5">
                  {companySheets.map(renderSheetRow)}
                </div>
              </div>
            )}

            {/* Other / Helper Sheets */}
            {otherSheets.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Other Sheets</span>
                  <span className="text-slate-400 font-normal">{otherSheets.length}</span>
                </div>
                <div className="space-y-0.5">
                  {otherSheets.map(renderSheetRow)}
                </div>
              </div>
            )}

            {filteredSheets.length === 0 && (
              <div className="p-6 text-center text-slate-500 text-xs">
                No worksheets match <span className="font-semibold text-slate-700">"{searchQuery}"</span>
              </div>
            )}
          </div>

          {/* Footer Action to Open Workbook Landing Page */}
          {onOpenExplorer && (
            <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenExplorer();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-sky-700 hover:text-sky-900 hover:bg-sky-50 rounded-lg border border-sky-200 transition-colors"
              >
                <TableProperties className="w-3.5 h-3.5" />
                View Full Workbook Directory & Status
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
