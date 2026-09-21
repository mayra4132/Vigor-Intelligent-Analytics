/**
 * VIGOR Compact Global Context Switcher Header
 * One simple context control:
 * "Currently Viewing: VIGOR Group [Change]" or "Currently Viewing: Vigor Cement Works [Change]"
 */

import React, { useState } from 'react';
import {
  Building2,
  Globe2,
  UploadCloud,
  ChevronDown,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Dataset } from '../types';
import { COMPANY_BY_ID } from '../data/groupStructure';
import { CompanyModal } from './CompanyModal';

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
}

export const GlobalHeaderSwitcher: React.FC<GlobalHeaderSwitcherProps> = ({
  activeCompanyId,
  activeDataset,
  allDatasets,
  onSelectCompany,
  onGoToGroupOverview,
  onNavigateToUpload
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const currentCompany = activeCompanyId
    ? COMPANY_BY_ID[activeCompanyId]
    : activeDataset?.company_id
    ? COMPANY_BY_ID[activeDataset.company_id]
    : null;

  const displayName = currentCompany
    ? currentCompany.name
    : activeDataset?.companyName
    ? activeDataset.companyName
    : 'VIGOR Group';

  const isGroup = !currentCompany && !activeDataset;

  const reportingPeriod = activeDataset?.reporting_period || (isGroup ? 'August 2026' : undefined);

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs select-none no-print">
        {/* Left Side: Single Clean Context Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Currently Viewing:</span>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-xs font-bold text-slate-900 transition-all cursor-pointer shadow-2xs group"
              title="Click to switch business entity or view group"
            >
              {isGroup ? (
                <Globe2 className="w-3.5 h-3.5 text-indigo-600" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span className="max-w-[220px] truncate">{displayName}</span>
              <span className="text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-700 underline underline-offset-2">
                Change
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 ml-0.5" />
            </button>
          </div>

          {reportingPeriod && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 font-medium">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{reportingPeriod}</span>
            </div>
          )}
        </div>

        {/* Right Side: Quick Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToUpload()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Data</span>
          </button>
        </div>
      </header>

      {/* Switcher Modal */}
      <CompanyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        activeCompanyId={activeCompanyId}
        activeDataset={activeDataset}
        allDatasets={allDatasets}
        onSelectCompany={onSelectCompany}
        onSelectGroup={onGoToGroupOverview}
        onUploadForCompany={compKey => onNavigateToUpload(compKey)}
      />
    </>
  );
};
