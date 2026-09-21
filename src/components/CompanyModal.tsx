/**
 * Company & Context Selector Modal
 * Simple, intuitive modal: "What would you like to view?"
 * Select a company directly; sector is automatically derived.
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Building2,
  Globe2,
  Check,
  UploadCloud,
  ArrowRight,
  Sparkles,
  Factory,
  Hotel,
  Activity,
  ShoppingCart,
  Ship,
  Briefcase
} from 'lucide-react';
import { Dataset } from '../types';
import { VIGOR_SECTORS, ALL_VIGOR_COMPANIES, CompanyConfig } from '../data/groupStructure';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompanyId?: string;
  activeDataset: Dataset | null;
  allDatasets: Dataset[];
  onSelectCompany: (companyId: string, datasetId?: string) => void;
  onSelectGroup: () => void;
  onUploadForCompany: (companyId: string) => void;
}

const SECTOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  manufacturing: Factory,
  hospitality: Hotel,
  healthcare: Activity,
  trading: ShoppingCart,
  transport: Ship,
  services: Briefcase
};

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  activeCompanyId,
  activeDataset,
  allDatasets,
  onSelectCompany,
  onSelectGroup,
  onUploadForCompany
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Group datasets by company_id for instant status lookup
  const datasetsByCompany = useMemo(() => {
    const map = new Map<string, Dataset>();
    for (const ds of allDatasets) {
      if (ds.company_id && !map.has(ds.company_id)) {
        map.set(ds.company_id, ds);
      }
    }
    return map;
  }, [allDatasets]);

  // Filter companies based on search
  const filteredCompanies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return ALL_VIGOR_COMPANIES;
    return ALL_VIGOR_COMPANIES.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.sectorName.toLowerCase().includes(query) ||
        c.location.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group filtered companies by sector
  const groupedCompanies = useMemo(() => {
    const groups: { sectorId: string; sectorName: string; companies: CompanyConfig[] }[] = [];
    for (const sector of VIGOR_SECTORS) {
      const matching = filteredCompanies.filter(c => c.sectorId === sector.id);
      if (matching.length > 0) {
        groups.push({
          sectorId: sector.id,
          sectorName: sector.name,
          companies: matching
        });
      }
    }
    return groups;
  }, [filteredCompanies]);

  const isGroupActive = !activeCompanyId && !activeDataset;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              What would you like to view?
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose a business entity to open its dashboard, or view the overall group.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search company (e.g. Vigor Cement, Golden Tulip, Zenj...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-xs"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {/* VIGOR Group Executive Choice */}
          {!searchQuery && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Executive Group Level
              </div>
              <button
                onClick={() => {
                  onSelectGroup();
                  onClose();
                }}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-4 cursor-pointer ${
                  isGroupActive
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isGroupActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        VIGOR Group (All Companies)
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        Consolidated
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Executive overview across all 7 operational business divisions
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isGroupActive && (
                    <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  )}
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Companies Grouped by Sector */}
          {groupedCompanies.map(group => {
            const Icon = SECTOR_ICONS[group.sectorId] || Building2;
            return (
              <div key={group.sectorId} className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{group.sectorName}</span>
                  <span className="text-slate-300 font-normal">({group.companies.length})</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {group.companies.map(company => {
                    const dataset = datasetsByCompany.get(company.id);
                    const isSelected = activeCompanyId === company.id || activeDataset?.company_id === company.id;

                    return (
                      <div
                        key={company.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 bg-white ${
                          isSelected
                            ? 'border-indigo-500 ring-1 ring-indigo-500/20 bg-indigo-50/30'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div
                          onClick={() => {
                            if (dataset) {
                              onSelectCompany(company.id, dataset.id);
                              onClose();
                            } else {
                              onUploadForCompany(company.id);
                              onClose();
                            }
                          }}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : dataset
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}
                          >
                            {company.code}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {company.name}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {company.location} • {company.defaultCurrency}
                            </p>
                          </div>
                        </div>

                        {/* Status / Action Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {dataset ? (
                            <button
                              onClick={() => {
                                onSelectCompany(company.id, dataset.id);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>{dataset.reporting_period || 'View Data'}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onUploadForCompany(company.id);
                                onClose();
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <UploadCloud className="w-3 h-3 text-slate-400" />
                              <span>Upload Data</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {groupedCompanies.length === 0 && (
            <div className="py-10 text-center text-slate-500 text-xs">
              <p className="font-semibold text-slate-700">No companies found</p>
              <p className="mt-1 text-slate-400">Try searching for another company name or code.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>{ALL_VIGOR_COMPANIES.length} operating businesses across East Africa</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
