/**
 * VIGOR Compact Global Context Switcher Header
 * When workbook is loaded: Displays active sheet/workbook context and sheet switcher.
 * When no workbook is loaded: Displays clean title and upload CTA.
 */

import React from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Calendar
} from 'lucide-react';
import { Dataset } from '../types';
import { WorkbookSheetSwitcher } from './WorkbookSheetSwitcher';

interface GlobalHeaderSwitcherProps {
  activeSectorId?: string;
  activeCompanyId?: string;
  activeDataset: Dataset | null;
  allDatasets: Dataset[];
  onSelectSector: (sectorId: string) => void;
  onSelectCompany: (companyId: string, datasetId?: string) => void;
  onSelectDataset: (dataset: Dataset) => void;
  onGoToGroupOverview: () => void;
  onNavigateToUpload: (forCompanyId?: string) => void;
  onSelectSheet?: (sheetName: string) => void;
  onOpenExplorer?: () => void;
}

export const GlobalHeaderSwitcher: React.FC<GlobalHeaderSwitcherProps> = ({
  activeDataset,
  onNavigateToUpload,
  onSelectSheet,
  onOpenExplorer
}) => {
  const currentSheetName =
    activeDataset?.activeSheetName ||
    activeDataset?.selectedSheet ||
    'CONSOLIDATED';

  const reportingPeriod =
    activeDataset?.consolidatedData?.reportingPeriod ||
    activeDataset?.reporting_period;

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs select-none no-print">
      {/* Left Side */}
      <div className="flex items-center gap-3">
        {activeDataset ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Currently Viewing:</span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-900 shadow-2xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span className="max-w-[200px] truncate">{currentSheetName}</span>
            </div>

            {reportingPeriod && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 font-medium">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{reportingPeriod}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-wider text-slate-900">VIGOR</span>
            <span className="text-xs text-slate-400 hidden sm:inline">Performance Analytics</span>
          </div>
        )}
      </div>

      {/* Center/Right: Quick Workbook Sheet Switcher when workbook is loaded */}
      <div className="flex items-center gap-2">
        {activeDataset?.parsedWorkbook && onSelectSheet && (
          <div className="hidden md:block">
            <WorkbookSheetSwitcher
              dataset={activeDataset}
              activeSheetName={currentSheetName}
              onSelectSheet={onSelectSheet}
              onOpenExplorer={onOpenExplorer}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => onNavigateToUpload()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>{activeDataset ? 'Upload New Workbook' : 'Upload Workbook'}</span>
        </button>
      </div>
    </header>
  );
};
