import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  DollarSign,
  Activity,
  CheckCircle2,
  Clock,
  HelpCircle
} from 'lucide-react';
import {
  NormalizedCompanyReport,
  NormalizedMetric,
  Dataset
} from '../types';
import { COMPANY_BY_ID } from '../data/groupStructure';

interface CompanyExecutiveDashboardProps {
  companyReport: NormalizedCompanyReport;
  dataset: Dataset;
  onNavigateToAskAI?: (question?: string) => void;
  onNavigateToExplore?: () => void;
}

export const CompanyExecutiveDashboard: React.FC<CompanyExecutiveDashboardProps> = ({
  companyReport,
  dataset,
  onNavigateToAskAI,
  onNavigateToExplore
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'financials'>('overview');
  const [timeView, setTimeView] = useState<'current_month' | 'ytd' | 'trend'>('current_month');

  const kpis = companyReport.headlineKPIs;
  const companyMeta = COMPANY_BY_ID[companyReport.companyId];

  const formatVal = (val: number | null | undefined, isCurrency = true, unit?: string | null) => {
    if (val === null || val === undefined) return '—';
    const isMTZS = unit ? unit.toUpperCase() === 'MTZS' : false;

    if (isCurrency || isMTZS) {
      if (Math.abs(val) >= 1_000_000_000) {
        return `TZS ${(val / 1_000_000_000).toFixed(2)}B`;
      }
      if (Math.abs(val) >= 1_000_000) {
        return `TZS ${(val / 1_000_000).toFixed(1)}M`;
      }
      return `${val.toLocaleString()} ${unit || 'MTZS'}`;
    }

    if (unit === '%') {
      return `${val.toFixed(1)}%`;
    }

    return `${val.toLocaleString()} ${unit ? unit : ''}`.trim();
  };

  const getAchievementBadge = (pct: number | null | undefined) => {
    if (pct === null || pct === undefined) return null;
    const isGood = pct >= 95;
    const isFair = pct >= 80 && pct < 95;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
          isGood
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : isFair
            ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}
      >
        {pct >= 95 ? (
          <TrendingUp className="w-3 h-3" />
        ) : (
          <TrendingDown className="w-3 h-3" />
        )}
        {pct.toFixed(1)}% of Plan
      </span>
    );
  };

  // Trend Data for Jan-Aug
  const trendMetrics = companyReport.monthlyTrendMetrics.filter(m =>
    m.metricName.toUpperCase().includes('REVENUE') ||
    m.metricName.toUpperCase().includes('TURNOVER') ||
    m.metricName.toUpperCase().includes('NET PROFIT')
  );

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200">
              <Building2 className="w-3 h-3 text-stone-500" />
              {companyReport.sectorName}
            </span>
            <span className="text-xs text-stone-500 font-mono">
              Sheet: {companyReport.sheetName}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            {companyReport.companyName}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {companyMeta?.description || 'Operating business unit performance review'}
          </p>
        </div>

        {/* View Controls & Period */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time View Selector */}
          <div className="bg-stone-100 p-1 rounded-lg flex items-center gap-1 text-xs">
            <button
              onClick={() => setTimeView('current_month')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                timeView === 'current_month'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Current Month (Aug)
            </button>
            <button
              onClick={() => setTimeView('ytd')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                timeView === 'ytd'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Year-to-Date (YTD)
            </button>
            <button
              onClick={() => setTimeView('trend')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                timeView === 'trend'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Monthly Trend (Jan–Aug)
            </button>
          </div>

          <button
            onClick={() => onNavigateToAskAI?.(`Explain performance highlights for ${companyReport.companyName}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ask VIGOR</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-stone-200 flex items-center gap-6 text-sm">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 font-semibold border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Executive Overview
        </button>
        <button
          onClick={() => setActiveTab('operations')}
          className={`pb-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'operations'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>Operational Performance</span>
          <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-stone-100 text-stone-600">
            {companyReport.operationalMetrics.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'financials'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <span>Financial Performance</span>
          <span className="px-1.5 py-0.2 rounded-full text-[11px] bg-stone-100 text-stone-600">
            {companyReport.financialMetrics.length}
          </span>
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Headline Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Revenue */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Revenue / Turnover</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-stone-900">
                  {formatVal(kpis.revenue?.actual)}
                </span>
                {getAchievementBadge(kpis.revenue?.achievementPct)}
              </div>
              <div className="mt-2 pt-2 border-t border-stone-100 text-xs text-stone-500 flex justify-between">
                <span>Plan: {formatVal(kpis.revenue?.plan)}</span>
                {kpis.revenue?.growthPct !== null && kpis.revenue?.growthPct !== undefined && (
                  <span className={kpis.revenue.growthPct >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                    YoY: {kpis.revenue.growthPct >= 0 ? '+' : ''}{kpis.revenue.growthPct.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* 2. Gross Profit */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Gross Profit</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-stone-900">
                  {formatVal(kpis.grossProfit?.actual)}
                </span>
                {getAchievementBadge(kpis.grossProfit?.achievementPct)}
              </div>
              <div className="mt-2 pt-2 border-t border-stone-100 text-xs text-stone-500 flex justify-between">
                <span>Plan: {formatVal(kpis.grossProfit?.plan)}</span>
                {kpis.revenue?.actual && kpis.grossProfit?.actual && (
                  <span className="text-stone-600 font-medium">
                    Margin: {((kpis.grossProfit.actual / kpis.revenue.actual) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* 3. Net Profit */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Net Profit</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span
                  className={`text-2xl font-bold ${
                    kpis.netProfit?.actual !== null && kpis.netProfit?.actual !== undefined && kpis.netProfit.actual < 0
                      ? 'text-rose-600'
                      : 'text-stone-900'
                  }`}
                >
                  {formatVal(kpis.netProfit?.actual)}
                </span>
                {getAchievementBadge(kpis.netProfit?.achievementPct)}
              </div>
              <div className="mt-2 pt-2 border-t border-stone-100 text-xs text-stone-500 flex justify-between">
                <span>Plan: {formatVal(kpis.netProfit?.plan)}</span>
                {kpis.netProfit?.variance !== null && kpis.netProfit?.variance !== undefined && (
                  <span className={kpis.netProfit.variance >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                    Var: {kpis.netProfit.variance >= 0 ? '+' : ''}{formatVal(kpis.netProfit.variance)}
                  </span>
                )}
              </div>
            </div>

            {/* 4. Physical Operational Volume / Debtors */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-stone-500 font-medium truncate block">
                {kpis.occupancyOrVolume?.label || 'Total Overdue Debtors'}
              </span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-stone-900">
                  {kpis.occupancyOrVolume
                    ? formatVal(kpis.occupancyOrVolume.value, false, kpis.occupancyOrVolume.unit)
                    : formatVal(kpis.debtors)}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-stone-100 text-xs text-stone-500 flex justify-between">
                <span>Collections: {formatVal(kpis.collection)}</span>
                <span className="text-stone-400">August 2026</span>
              </div>
            </div>
          </div>

          {/* Monthly Trajectory Chart (Jan - Aug) */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  2026 Monthly Trajectory (Jan – Aug)
                </h3>
                <p className="text-xs text-stone-500">
                  Reporting period ends at August. Future months (Sept–Dec) excluded to prevent false zeroes.
                </p>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                8 Reported Months
              </span>
            </div>

            {trendMetrics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-600 font-semibold bg-stone-50">
                      <th className="py-2 px-3">Metric</th>
                      <th className="py-2 px-2 text-right">Jan</th>
                      <th className="py-2 px-2 text-right">Feb</th>
                      <th className="py-2 px-2 text-right">Mar</th>
                      <th className="py-2 px-2 text-right">Apr</th>
                      <th className="py-2 px-2 text-right">May</th>
                      <th className="py-2 px-2 text-right">Jun</th>
                      <th className="py-2 px-2 text-right">Jul</th>
                      <th className="py-2 px-2 text-right font-bold text-stone-900 bg-emerald-50/50">Aug</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {trendMetrics.map(m => (
                      <tr key={m.id} className="hover:bg-stone-50/50">
                        <td className="py-2.5 px-3 font-semibold text-stone-900">
                          {m.metricName}
                          {m.unit && <span className="ml-1 text-[10px] text-stone-400 font-normal">({m.unit})</span>}
                        </td>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'].map(mo => (
                          <td
                            key={mo}
                            className={`py-2.5 px-2 text-right font-mono ${
                              mo === 'Aug' ? 'font-bold text-emerald-800 bg-emerald-50/30' : 'text-stone-700'
                            }`}
                          >
                            {m.monthlyValues?.[mo] !== null && m.monthlyValues?.[mo] !== undefined
                              ? Number(m.monthlyValues[mo]).toLocaleString()
                              : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-stone-500">
                Monthly trend metrics are available in the detailed operations/financial tables below.
              </div>
            )}
          </div>

          {/* Quick Operations & Financials Preview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Operational Highlights */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Activity className="w-3.5 h-3.5 text-stone-600" />
                  Key Operational Metrics
                </h4>
                <button
                  onClick={() => setActiveTab('operations')}
                  className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                >
                  View All ({companyReport.operationalMetrics.length})
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {companyReport.operationalMetrics.slice(0, 5).map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-stone-50 text-xs"
                  >
                    <span className="font-medium text-stone-800 truncate pr-2">
                      {m.metricName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-stone-900 font-mono">
                        {formatVal(m.actual, false, m.unit)}
                      </span>
                      {m.achievementPct !== null && (
                        <span className="text-[10px] text-stone-500">
                          ({m.achievementPct.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Highlights */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <DollarSign className="w-3.5 h-3.5 text-stone-600" />
                  Key Financial Metrics
                </h4>
                <button
                  onClick={() => setActiveTab('financials')}
                  className="text-xs text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                >
                  View All ({companyReport.financialMetrics.length})
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {companyReport.financialMetrics.slice(0, 5).map(m => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-stone-50 text-xs"
                  >
                    <span className="font-medium text-stone-800 truncate pr-2">
                      {m.metricName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-stone-900 font-mono">
                        {formatVal(m.actual, m.unit?.toUpperCase() === 'MTZS', m.unit)}
                      </span>
                      {m.achievementPct !== null && (
                        <span className="text-[10px] text-stone-500">
                          ({m.achievementPct.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OPERATIONS TAB */}
      {activeTab === 'operations' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Operational Performance Metrics</h3>
              <p className="text-xs text-stone-500">
                Extracted directly from {companyReport.sheetName} (Physical output, occupancy, volume, targets)
              </p>
            </div>
            <span className="text-xs font-medium text-stone-500">
              {companyReport.operationalMetrics.length} metrics
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-700 font-semibold">
                  <th className="py-2.5 px-3">Metric Name</th>
                  <th className="py-2.5 px-2">Unit</th>
                  <th className="py-2.5 px-3 text-right">Actual (Aug)</th>
                  <th className="py-2.5 px-3 text-right">Plan (Aug)</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                  <th className="py-2.5 px-3 text-right">Ach %</th>
                  <th className="py-2.5 px-3 text-right">SPLY</th>
                  <th className="py-2.5 px-3 text-right">Growth %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {companyReport.operationalMetrics.map(m => (
                  <tr key={m.id} className="hover:bg-stone-50/60">
                    <td className="py-2.5 px-3 font-semibold text-stone-900">
                      {m.metricName}
                    </td>
                    <td className="py-2.5 px-2 text-stone-500 font-mono">
                      {m.unit || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {m.actual !== null ? m.actual.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                      {m.plan !== null ? m.plan.toLocaleString() : '—'}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono ${
                        m.variance !== null && m.variance < 0 ? 'text-rose-600' : 'text-stone-700'
                      }`}
                    >
                      {m.variance !== null ? (m.variance >= 0 ? `+${m.variance.toLocaleString()}` : m.variance.toLocaleString()) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold">
                      {m.achievementPct !== null ? `${m.achievementPct.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-500">
                      {m.priorYear !== null ? m.priorYear.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                      {m.growthPct !== null ? `${m.growthPct >= 0 ? '+' : ''}${m.growthPct.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FINANCIALS TAB */}
      {activeTab === 'financials' && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Financial Performance Metrics</h3>
              <p className="text-xs text-stone-500">
                P&L Statement, Margins, Cash OPEX, Debtors and Collections in MTZS
              </p>
            </div>
            <span className="text-xs font-medium text-stone-500">
              {companyReport.financialMetrics.length} metrics
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-stone-100/80 border-b border-stone-200 text-stone-700 font-semibold">
                  <th className="py-2.5 px-3">Item / Metric</th>
                  <th className="py-2.5 px-2">Unit</th>
                  <th className="py-2.5 px-3 text-right">Actual (Aug)</th>
                  <th className="py-2.5 px-3 text-right">Plan (Aug)</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                  <th className="py-2.5 px-3 text-right">Ach %</th>
                  <th className="py-2.5 px-3 text-right">SPLY</th>
                  <th className="py-2.5 px-3 text-right">Growth %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {companyReport.financialMetrics.map(m => {
                  const isProfit = m.metricName.toUpperCase().includes('PROFIT') || m.metricName.toUpperCase().includes('EBITDA');
                  const isLoss = isProfit && m.actual !== null && m.actual < 0;

                  return (
                    <tr key={m.id} className={`hover:bg-stone-50/60 ${isLoss ? 'bg-rose-50/30' : ''}`}>
                      <td className="py-2.5 px-3 font-semibold text-stone-900">
                        {m.metricName}
                      </td>
                      <td className="py-2.5 px-2 text-stone-500 font-mono">
                        {m.unit || 'MTZS'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          isLoss ? 'text-rose-600' : 'text-stone-900'
                        }`}
                      >
                        {m.actual !== null ? m.actual.toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                        {m.plan !== null ? m.plan.toLocaleString() : '—'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono ${
                          m.variance !== null && m.variance < 0 ? 'text-rose-600' : 'text-stone-700'
                        }`}
                      >
                        {m.variance !== null ? (m.variance >= 0 ? `+${m.variance.toLocaleString()}` : m.variance.toLocaleString()) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {m.achievementPct !== null ? `${m.achievementPct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-500">
                        {m.priorYear !== null ? m.priorYear.toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                        {m.growthPct !== null ? `${m.growthPct >= 0 ? '+' : ''}${m.growthPct.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
