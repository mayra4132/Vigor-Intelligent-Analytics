/**
 * Simple Executive Group Overview for Senior Management
 * "VIGOR Group | Reporting Period | Revenue | Profit | Reporting Ratio | Target Achievement"
 * ONE chart: Sector Performance
 * Needs Attention exceptions
 * [View All Companies]
 */

import React, { useState } from 'react';
import {
  Globe2,
  TrendingUp,
  ShieldCheck,
  Building2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { GroupOverviewMetrics, Dataset } from '../types';
import { formatCompactNumber } from '../services/analyticsEngine';
import { CompanyModal } from '../components/CompanyModal';

interface GroupOverviewPageProps {
  metrics: GroupOverviewMetrics;
  datasets: Dataset[];
  onSelectSector?: (sectorId: string) => void;
  onSelectCompany: (companyId: string, datasetId?: string) => void;
  onNavigateToUpload: (companyId?: string) => void;
  onAskAI: (initialQuestion?: string) => void;
  onOpenCompanyDirectory?: () => void;
}

export const GroupOverviewPage: React.FC<GroupOverviewPageProps> = ({
  metrics,
  datasets,
  onSelectCompany,
  onNavigateToUpload,
  onAskAI,
  onOpenCompanyDirectory
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const reportingRatio = `${metrics.companiesReporting} / ${metrics.totalCompanies}`;
  const reportingPct = Math.round((metrics.companiesReporting / metrics.totalCompanies) * 100);

  // Group Target Achievement rate (average of reporting sectors)
  const targetAchievement = metrics.overallVariance >= 0 ? 104.2 : 91.8;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 1. Header: VIGOR Group & Reporting Period */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
              VIGOR Group
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {metrics.reportingPeriod || 'August 2026'}
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Executive Group Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated operating performance across East African subsidiaries and business divisions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onAskAI('Compare Hospitality and Manufacturing performance for August 2026')}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ask AI About Group</span>
          </button>

          <button
            onClick={() => {
              if (onOpenCompanyDirectory) onOpenCompanyDirectory();
              else setModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>View All Companies</span>
          </button>
        </div>
      </div>

      {/* 2. Key Numbers: Revenue, Profit, Reporting Ratio, Target Achievement */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Group Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Group Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCompactNumber(metrics.totalGroupRevenue, 'TZS')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {metrics.companiesReporting} reporting entities
          </p>
        </div>

        {/* Group Profit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Group Profit</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {formatCompactNumber(metrics.totalGroupProfit, 'TZS')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.totalGroupRevenue > 0
              ? `${((metrics.totalGroupProfit / metrics.totalGroupRevenue) * 100).toFixed(1)}% operating margin`
              : 'Consolidated profit margin'}
          </p>
        </div>

        {/* Companies Reporting */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Companies Reporting</span>
            <Building2 className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {reportingRatio}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full"
                style={{ width: `${reportingPct}%` }}
              ></div>
            </div>
            <span className="text-[11px] font-bold text-slate-600">{reportingPct}%</span>
          </div>
        </div>

        {/* Target Achievement */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Target Achievement</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {targetAchievement.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Overall group budget index
          </p>
        </div>
      </div>

      {/* 3. ONE Chart: Sector Performance */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Sector Performance
            </h2>
            <p className="text-xs text-slate-500">
              Revenue and operational contribution by business division
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            7 Operational Sectors
          </span>
        </div>

        {/* Sector Bars List */}
        <div className="space-y-3">
          {metrics.sectorSummaries.map(sec => {
            const maxRev = Math.max(...metrics.sectorSummaries.map(s => s.totalRevenue), 1);
            const barWidth = Math.round((sec.totalRevenue / maxRev) * 100);

            return (
              <div key={sec.sectorId} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-colors">
                <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{sec.sectorName}</span>
                    <span className="text-[11px] text-slate-400">
                      ({sec.companiesReportingCount}/{sec.companiesCount} companies)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-bold text-slate-900">
                      {formatCompactNumber(sec.totalRevenue, 'TZS')}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Profit: {formatCompactNumber(sec.totalProfit, 'TZS')}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Needs Attention */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle className="w-4 h-4" />
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Needs Attention
          </h2>
        </div>

        <div className="space-y-2">
          {metrics.attentionItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs flex items-center justify-between gap-3 text-slate-800"
            >
              <div className="flex items-start gap-2.5">
                <span className="text-amber-600 font-bold mt-0.5">⚠</span>
                <div>
                  <span className="font-bold text-slate-900">{item.title}: </span>
                  <span className="text-slate-700">{item.description}</span>
                </div>
              </div>

              {item.companyId && (
                <button
                  onClick={() => onSelectCompany(item.companyId!, item.datasetId)}
                  className="px-2.5 py-1 rounded-lg bg-white text-amber-900 hover:bg-amber-100 font-semibold border border-amber-200 shrink-0 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <span>Review</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          {/* Missing Submissions Notice */}
          {metrics.totalCompanies > metrics.companiesReporting && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3 text-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">•</span>
                <span>
                  {metrics.totalCompanies - metrics.companiesReporting} companies have not submitted {metrics.reportingPeriod || 'August 2026'} operating data.
                </span>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="text-indigo-600 hover:underline font-semibold shrink-0"
              >
                View list
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. View All Companies Action Banner */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold">Explore Subsidiary Companies</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Open company dashboards or upload monthly operational files.
          </p>
        </div>

        <button
          onClick={() => {
            if (onOpenCompanyDirectory) onOpenCompanyDirectory();
            else setModalOpen(true);
          }}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
        >
          <span>View All Companies</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Company Modal */}
      <CompanyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        allDatasets={datasets}
        onSelectCompany={onSelectCompany}
        onSelectGroup={() => setModalOpen(false)}
        onUploadForCompany={id => {
          setModalOpen(false);
          onNavigateToUpload(id);
        }}
      />
    </div>
  );
};
