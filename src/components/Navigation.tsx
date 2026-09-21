/**
 * Simplified Primary Sidebar Navigation for VIGOR Intelligence
 * "Simple on the surface. Deep when needed."
 * Exactly 5 primary items: Overview, Upload Data, My Data, Ask AI, Reports.
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Database,
  Sparkles,
  FileText,
  BarChart3,
  Building2,
  Globe2,
  ChevronRight,
  Settings
} from 'lucide-react';
import { AppView, Dataset } from '../types';
import { CompanyModal } from './CompanyModal';
import { COMPANY_BY_ID } from '../data/groupStructure';

interface NavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  activeDataset: Dataset | null;
  activeCompanyId?: string;
  allDatasets?: Dataset[];
  onSelectCompany?: (companyId: string, datasetId?: string) => void;
  onSelectGroup?: () => void;
  onNavigateToUpload?: (companyId?: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  activeDataset,
  activeCompanyId,
  allDatasets = [],
  onSelectCompany,
  onSelectGroup,
  onNavigateToUpload
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Exactly the 5 requested primary navigation items
  const navItems: {
    id: AppView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'overview' as AppView, label: 'Overview', icon: LayoutDashboard },
    { id: 'home', label: 'Upload Data', icon: UploadCloud },
    { id: 'datasets', label: 'My Data', icon: Database, badge: allDatasets.length > 0 ? `${allDatasets.length}` : undefined },
    { id: 'ask', label: 'Ask AI', icon: Sparkles, badge: 'AI' },
    { id: 'report', label: 'Reports', icon: FileText }
  ];

  // Active view matching (overview maps to 'overview', 'dashboard', or 'group_overview')
  const isOverviewActive = currentView === 'overview' || currentView === 'dashboard' || currentView === 'group_overview';

  const activeCompany = activeCompanyId
    ? COMPANY_BY_ID[activeCompanyId]
    : activeDataset?.company_id
    ? COMPANY_BY_ID[activeDataset.company_id]
    : null;

  const displayName = activeCompany ? activeCompany.name : (activeDataset?.companyName || 'VIGOR Group');
  const isGroup = !activeCompany && !activeDataset;

  return (
    <>
      <aside className="w-60 bg-slate-950 border-r border-slate-800/80 flex flex-col shrink-0 select-none no-print">
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center gap-2.5 border-b border-slate-800/80">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-2xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-wider text-slate-100">VIGOR</span>
              <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Intelligence
              </span>
            </div>
          </div>
        </div>

        {/* Simplified Context Switcher Chip */}
        <div className="p-3 border-b border-slate-800/60 bg-slate-900/40">
          <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1">
            Currently Viewing
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="w-full text-left p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-2 group cursor-pointer"
            title="Click to switch company or group"
          >
            <div className="flex items-center gap-2 min-w-0">
              {isGroup ? (
                <Globe2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                  {displayName}
                </p>
                <p className="text-[10px] text-indigo-400 group-hover:text-indigo-300">
                  Change entity
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
          </button>
        </div>

        {/* 5 Primary Navigation Items */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto text-xs">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive =
              item.id === 'overview' ? isOverviewActive : currentView === item.id;

            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => {
                  if (item.id === 'overview') {
                    onNavigate('overview');
                  } else {
                    onNavigate(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-indigo-700 text-white'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: Subtle Settings link and Version */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950 text-[11px] text-slate-500 flex items-center justify-between">
          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors text-xs"
            title="System Configuration"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <span className="font-mono text-[10px] text-slate-500">v3.0</span>
        </div>
      </aside>

      {/* Switcher Modal */}
      {onSelectCompany && onSelectGroup && onNavigateToUpload && (
        <CompanyModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          activeCompanyId={activeCompanyId}
          activeDataset={activeDataset}
          allDatasets={allDatasets}
          onSelectCompany={onSelectCompany}
          onSelectGroup={onSelectGroup}
          onUploadForCompany={onNavigateToUpload}
        />
      )}
    </>
  );
};
