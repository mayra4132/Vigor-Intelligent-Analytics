import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Activity,
  Layers
} from 'lucide-react';
import { NormalizedWorkbook, NormalizedCompanyReport, Dataset } from '../types';
import { VIGOR_SECTORS } from '../data/groupStructure';

interface GroupExecutiveDashboardProps {
  workbook: NormalizedWorkbook;
  dataset: Dataset;
  onSelectCompany: (companyId: string) => void;
  onNavigateToAskAI?: (question?: string) => void;
}

export const GroupExecutiveDashboard: React.FC<GroupExecutiveDashboardProps> = ({
  workbook,
  dataset,
  onSelectCompany,
  onNavigateToAskAI
}) => {
  const gs = workbook.groupSummary;

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    if (Math.abs(val) >= 1_000_000_000) {
      return `TZS ${(val / 1_000_000_000).toFixed(2)}B`;
    }
    if (Math.abs(val) >= 1_000_000) {
      return `TZS ${(val / 1_000_000).toFixed(1)}M`;
    }
    return `TZS ${val.toLocaleString()}`;
  };

  const companiesList: NormalizedCompanyReport[] = Object.values(workbook.companies || {});

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Consolidated Performance Review · {workbook.reportingPeriod}
            </span>
            <span className="text-xs text-stone-500 font-mono">
              {workbook.operatingCompanyCount} Operating Companies
            </span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            VIGOR Group Executive Overview
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Cross-company consolidation aggregated strictly across operating businesses without double-counting.
          </p>
        </div>

        <button
          onClick={() => onNavigateToAskAI?.('Summarise VIGOR group performance for August 2026')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ask VIGOR Executive Intelligence</span>
        </button>
      </div>

      {/* Group KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* 1. Group Revenue */}
        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-xs text-stone-500 font-medium">Group Revenue</span>
          <div className="mt-1 text-xl font-bold text-stone-900 truncate">
            {formatCurrency(gs.totalRevenue)}
          </div>
          <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex justify-between">
            <span>Plan: {formatCurrency(gs.totalPlanRevenue)}</span>
            <span className={gs.revenueAchievementPct >= 95 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
              {gs.revenueAchievementPct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* 2. Group Gross Profit */}
        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-xs text-stone-500 font-medium">Gross Profit</span>
          <div className="mt-1 text-xl font-bold text-stone-900 truncate">
            {formatCurrency(gs.totalGrossProfit)}
          </div>
          <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex justify-between">
            <span>Margin</span>
            <span className="font-semibold text-stone-700">
              {gs.totalRevenue > 0 ? `${((gs.totalGrossProfit / gs.totalRevenue) * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>

        {/* 3. Group OPEX */}
        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-xs text-stone-500 font-medium">Cash OPEX</span>
          <div className="mt-1 text-xl font-bold text-stone-900 truncate">
            {formatCurrency(gs.totalOpex)}
          </div>
          <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex justify-between">
            <span>Cost of Ops</span>
            <span className="text-stone-700 font-medium">August 2026</span>
          </div>
        </div>

        {/* 4. Group EBITDA */}
        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-xs text-stone-500 font-medium">Group EBITDA</span>
          <div className="mt-1 text-xl font-bold text-stone-900 truncate">
            {formatCurrency(gs.totalEbitda)}
          </div>
          <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex justify-between">
            <span>Operating Cash</span>
            <span className="text-emerald-600 font-medium">Profitable</span>
          </div>
        </div>

        {/* 5. Group Net Profit */}
        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-xs text-stone-500 font-medium">Net Profit</span>
          <div className={`mt-1 text-xl font-bold truncate ${gs.totalNetProfit < 0 ? 'text-rose-600' : 'text-stone-900'}`}>
            {formatCurrency(gs.totalNetProfit)}
          </div>
          <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex justify-between">
            <span>Plan: {formatCurrency(gs.totalNetProfitPlan)}</span>
            <span className={gs.netProfitAchievementPct >= 95 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
              {gs.netProfitAchievementPct.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* 6. Overdue Debtors */}
        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-xs text-stone-500 font-medium">Total Debtors</span>
          <div className="mt-1 text-xl font-bold text-stone-900 truncate">
            {formatCurrency(gs.totalDebtors)}
          </div>
          <div className="mt-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex justify-between">
            <span>Overdue Exposure</span>
            <span className="text-amber-700 font-medium">Working Cap</span>
          </div>
        </div>
      </div>

      {/* Executive Callouts / Attention Panel */}
      {(gs.companiesNegativeProfit.length > 0 || gs.companiesMissingPlan.length > 0) && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-amber-900 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Executive Attention Highlights</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-amber-950">
            {gs.companiesNegativeProfit.length > 0 && (
              <div>
                <strong className="block font-semibold mb-1">
                  Operating with Net Loss ({gs.companiesNegativeProfit.length} businesses):
                </strong>
                <div className="flex flex-wrap gap-1.5">
                  {gs.companiesNegativeProfit.map(name => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-medium text-[11px]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {gs.companiesMissingPlan.length > 0 && (
              <div>
                <strong className="block font-semibold mb-1">
                  Revenue Below Monthly Target ({gs.companiesMissingPlan.length} businesses):
                </strong>
                <div className="flex flex-wrap gap-1.5">
                  {gs.companiesMissingPlan.slice(0, 6).map(name => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-medium text-[11px]"
                    >
                      {name}
                    </span>
                  ))}
                  {gs.companiesMissingPlan.length > 6 && (
                    <span className="text-[11px] text-stone-500 self-center">
                      +{gs.companiesMissingPlan.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Operating Companies Directory Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              Operating Companies Performance Directory ({companiesList.length})
            </h3>
            <p className="text-xs text-stone-500">
              Click any company row to switch immediately to its dedicated operational & financial dashboard.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-700 font-semibold">
                <th className="py-2.5 px-3">Company / Business Unit</th>
                <th className="py-2.5 px-2">Sector</th>
                <th className="py-2.5 px-3 text-right">Revenue (Aug)</th>
                <th className="py-2.5 px-3 text-right">Plan (Aug)</th>
                <th className="py-2.5 px-3 text-right">Ach %</th>
                <th className="py-2.5 px-3 text-right">Net Profit</th>
                <th className="py-2.5 px-3 text-right">Debtors</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {companiesList.map(comp => {
                const k = comp.headlineKPIs;
                const isLoss = k.netProfit?.actual !== null && k.netProfit?.actual !== undefined && k.netProfit.actual < 0;

                return (
                  <tr
                    key={comp.companyId}
                    onClick={() => onSelectCompany(comp.companyId)}
                    className="hover:bg-stone-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="font-bold text-stone-900">{comp.companyName}</div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        Sheet: {comp.sheetName}
                      </div>
                    </td>

                    <td className="py-3 px-2">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-stone-100 text-stone-700">
                        {comp.sectorName}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {formatCurrency(k.revenue?.actual)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-stone-600">
                      {formatCurrency(k.revenue?.plan)}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {k.revenue?.achievementPct !== null && k.revenue?.achievementPct !== undefined ? (
                        <span
                          className={`font-semibold ${
                            k.revenue.achievementPct >= 95
                              ? 'text-emerald-600'
                              : k.revenue.achievementPct >= 80
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {k.revenue.achievementPct.toFixed(1)}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td
                      className={`py-3 px-3 text-right font-mono font-bold ${
                        isLoss ? 'text-rose-600' : 'text-stone-900'
                      }`}
                    >
                      {formatCurrency(k.netProfit?.actual)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-stone-600">
                      {formatCurrency(k.debtors)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCompany(comp.companyId);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 text-stone-700 text-xs font-semibold transition-colors"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
