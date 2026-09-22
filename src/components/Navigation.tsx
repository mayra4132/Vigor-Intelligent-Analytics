/**
 * Simplified Working Navigation for VIGOR Intelligence
 * Required core navigation items:
 * Overview, Workbook, My Data, Ask AI, Reports, Upload Data
 */

import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  BarChart3,
  TableProperties,
  ChevronRight,
  FileSpreadsheet,
  Database,
  Sparkles,
  FileText,
  LogOut,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { AppView, Dataset, User } from '../types';

interface NavigationProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  activeDataset: Dataset | null;
  allDatasets?: Dataset[];
  onNavigateToUpload?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  activeDataset,
  allDatasets = [],
  currentUser,
  onLogout
}) => {
  const navItems: {
    id: AppView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'overview' as AppView, label: 'Overview', icon: LayoutDashboard },
    {
      id: 'workbook' as AppView,
      label: 'Workbook',
      icon: TableProperties,
      badge: activeDataset?.parsedWorkbook
        ? `${activeDataset.parsedWorkbook.totalSheets}`
        : undefined
    },
    {
      id: 'datasets' as AppView,
      label: 'My Data',
      icon: Database,
      badge: allDatasets.length > 0 ? `${allDatasets.length}` : undefined
    },
    { id: 'ask' as AppView, label: 'Ask AI', icon: Sparkles },
    { id: 'report' as AppView, label: 'Reports', icon: FileText },
    { id: 'home' as AppView, label: 'Upload Data', icon: UploadCloud }
  ];

  const isOverviewActive = currentView === 'overview' || currentView === 'dashboard';

  const currentSheetName =
    activeDataset?.activeSheetName ||
    activeDataset?.selectedSheet ||
    'CONSOLIDATED';

  return (
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

      {/* Currently Viewing Sheet (Only shown when a real workbook is loaded) */}
      {activeDataset && (
        <div className="p-3 border-b border-slate-800/60 bg-slate-900/40">
          <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1 flex items-center justify-between">
            <span>Currently Viewing</span>
            <span className="text-[9px] text-slate-500 font-mono">Sheet</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('workbook')}
            className="w-full text-left p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-2 group cursor-pointer"
            title="Click to view workbook sheets"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                  {currentSheetName}
                </p>
                <p className="text-[10px] text-indigo-400 group-hover:text-indigo-300">
                  Switch sheet
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
          </button>
        </div>
      )}

      {/* Primary Navigation Items */}
      <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto text-xs">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive =
            item.id === 'overview' ? isOverviewActive : currentView === item.id;

          return (
            <button
              key={item.id}
              id={`nav-link-${item.id}`}
              type="button"
              onClick={() => onNavigate(item.id)}
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

      {/* Authenticated User & Sign Out */}
      {currentUser && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full border border-indigo-400/40 object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {currentUser.name}
                  </p>
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold shrink-0">
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate font-mono">
                  {currentUser.email}
                </p>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign out of VIGOR"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="font-medium text-slate-400 text-[11px] flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>VIGOR Auth ✓</span>
        </span>
        <span className="font-mono text-[10px] text-slate-600">MySQL ✓</span>
      </div>
    </aside>
  );
};
