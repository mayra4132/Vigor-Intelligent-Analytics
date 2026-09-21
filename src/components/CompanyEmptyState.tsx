/**
 * Company-Specific Empty State for VIGOR Intelligence
 * "Simple on the surface. Deep when needed."
 * Displayed when an active company has no uploaded dataset yet.
 * Never falls back to another company's data.
 */

import React from 'react';
import {
  UploadCloud,
  Building2,
  Factory,
  Hotel,
  Activity,
  ShoppingCart,
  Ship,
  Briefcase,
  Layers,
  ArrowRight,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { CompanyConfig, SectorConfig, SECTOR_BY_ID, GENERAL_SECTOR } from '../data/groupStructure';

interface CompanyEmptyStateProps {
  company: CompanyConfig;
  onNavigateToUpload: () => void;
  onOpenCompanyModal: () => void;
  onLoadSampleForCompany?: () => void;
}

const SECTOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  manufacturing: Factory,
  hospitality: Hotel,
  healthcare: Activity,
  trading: ShoppingCart,
  transport: Ship,
  services: Briefcase,
  real_estate: Building2,
  general: Layers
};

export const CompanyEmptyState: React.FC<CompanyEmptyStateProps> = ({
  company,
  onNavigateToUpload,
  onOpenCompanyModal,
  onLoadSampleForCompany
}) => {
  const sector: SectorConfig = SECTOR_BY_ID[company.sectorId] || GENERAL_SECTOR;
  const SectorIcon = SECTOR_ICONS[company.sectorId] || Building2;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Context Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
              {company.name}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {company.sectorName}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Awaiting Dataset
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {company.name}
          </h1>

          <p className="text-xs text-slate-500 mt-0.5">
            {company.location} • Standard Currency: <span className="font-semibold text-slate-700">{company.defaultCurrency}</span> • Code: <span className="font-mono font-semibold text-slate-700">{company.code}</span>
          </p>
        </div>

        <button
          onClick={onOpenCompanyModal}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Switch Business Entity</span>
        </button>
      </div>

      {/* Main Empty State Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-12 text-center shadow-2xs space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
          <SectorIcon className="w-8 h-8" />
        </div>

        <div className="max-w-xl mx-auto space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            No data uploaded for {company.name} yet.
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Upload an operating or financial spreadsheet (.xlsx, .xls, or .csv) for {company.name} to generate instant KPIs, performance charts, variance analysis, and AI intelligence.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onNavigateToUpload}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Spreadsheet</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={onOpenCompanyModal}
            className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span>Choose Another Company</span>
          </button>
        </div>

        {/* Typical Sector Metrics Preview */}
        {sector.primaryMetrics && sector.primaryMetrics.length > 0 && (
          <div className="pt-6 border-t border-slate-100 max-w-lg mx-auto">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Expected Operating Metrics for {sector.name}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {sector.primaryMetrics.map(metric => (
                <span
                  key={metric}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200/60"
                >
                  {metric}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
