/**
 * Executive Management Dashboard for VIGOR Intelligence
 * "Simple on the surface. Deep when needed."
 * Answers 4 management questions:
 * 1. What is happening?
 * 2. Are we performing well or badly?
 * 3. What changed?
 * 4. What needs attention?
 */

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Compass,
  FileText,
  Sliders,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Building2,
  Calendar,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { Dataset, FilterState } from '../types';
import { analyzeSheet, filterRows } from '../services/analyticsEngine';
import { KPICardView } from '../components/KPICardView';
import { ChartWidget } from '../components/ChartWidget';

interface DashboardPageProps {
  dataset: Dataset;
  onNavigateToAskAI: (initialQuestion?: string) => void;
  onNavigateToExplore: () => void;
  onNavigateToReport: () => void;
  onNavigateToUnderstanding?: () => void;
  onNavigateToGroup?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  dataset,
  onNavigateToAskAI,
  onNavigateToExplore,
  onNavigateToReport,
  onNavigateToUnderstanding,
  onNavigateToGroup
}) => {
  const activeSheet = dataset.sheets.find(s => s.name === dataset.selectedSheet) || dataset.sheets[0];
  const [filters] = useState<FilterState>({});

  // Dynamic analysis
  const analysis = useMemo(() => {
    return analyzeSheet(activeSheet, filters, {
      sectorId: dataset.sector_id,
      sectorName: dataset.sectorName,
      companyId: dataset.company_id,
      companyName: dataset.companyName || dataset.name
    });
  }, [activeSheet, filters, dataset]);

  const filteredRows = useMemo(() => {
    return filterRows(activeSheet.rows, filters);
  }, [activeSheet.rows, filters]);

  // Restrict to 4-5 meaningful KPI cards maximum
  const displayKPIs = useMemo(() => {
    return analysis.kpis.slice(0, 5);
  }, [analysis.kpis]);

  // Restrict to 1 primary chart + at most 1 supporting chart on the main surface
  const primaryChart = analysis.charts[0];
  const supportingChart = analysis.charts[1];

  // Derive meaningful "Needs Attention" items (only when there are genuine exceptions)
  const attentionItems = useMemo(() => {
    const items: { id: string; text: string; severity: 'warning' | 'critical' }[] = [];
    const stats = analysis.statistics;

    if (stats.variancePercentage !== undefined && stats.variancePercentage < -5) {
      items.push({
        id: 'variance-under',
        text: `Operating performance is ${Math.abs(stats.variancePercentage).toFixed(1)}% below target budget.`,
        severity: stats.variancePercentage < -15 ? 'critical' : 'warning'
      });
    }

    if (stats.totalLoss && stats.totalLoss > 0) {
      items.push({
        id: 'loss-detected',
        text: `Recorded losses of ${stats.currencySymbol || 'TZS'} ${stats.totalLoss.toLocaleString()} require review.`,
        severity: 'warning'
      });
    }

    if (stats.totalDowntime && stats.totalDowntime > 50) {
      items.push({
        id: 'downtime-high',
        text: `High operational downtime logged: ${stats.totalDowntime} hours in reporting period.`,
        severity: 'warning'
      });
    }

    if (stats.biggestNegativeVariance) {
      items.push({
        id: 'worst-period',
        text: `Largest negative variance observed in ${stats.biggestNegativeVariance.period} (${stats.biggestNegativeVariance.percent.toFixed(1)}% gap).`,
        severity: 'warning'
      });
    }

    return items;
  }, [analysis.statistics]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* 1. Header: Company + Reporting Period + Human Actions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
              {dataset.companyName || dataset.name}
            </span>
            {dataset.sectorName && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {dataset.sectorName}
              </span>
            )}
            {dataset.reporting_period && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {dataset.reporting_period}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {dataset.companyName || dataset.name}
          </h1>

          <p className="text-xs text-slate-500 mt-0.5">
            Operating data from <span className="font-semibold text-slate-700">{dataset.filename}</span> ({activeSheet.name}) • {activeSheet.totalRows} records evaluated
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary CTA: Ask About This Data */}
          <button
            onClick={() => onNavigateToAskAI()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask About This Data</span>
          </button>

          {/* Deeper Exploration CTA */}
          <button
            onClick={onNavigateToExplore}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-slate-500" />
            <span>Explore More</span>
          </button>

          {/* Check / Edit Data */}
          {onNavigateToUnderstanding && (
            <button
              onClick={onNavigateToUnderstanding}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Inspect or adjust column mappings"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Check / Edit Data</span>
            </button>
          )}

          {/* Export Report */}
          <button
            onClick={onNavigateToReport}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
            title="Export or Print Report"
          >
            <FileText className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* 2. KEY NUMBERS: 4-5 Meaningful KPI Cards Max */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Key Numbers
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {displayKPIs.map(kpi => (
            <KPICardView key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* 3. PERFORMANCE: 1 Main Chart + 1 Supporting Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Performance
          </h2>
          <button
            onClick={onNavigateToExplore}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Explore More Charts & Filters</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {primaryChart ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Primary Chart (Large) */}
            <div className={supportingChart ? 'lg:col-span-8' : 'lg:col-span-12'}>
              <ChartWidget
                chart={primaryChart}
                data={filteredRows}
                currencySymbol={analysis.statistics.currencySymbol || 'TZS'}
              />
            </div>

            {/* Supporting Chart (Optional) */}
            {supportingChart && (
              <div className="lg:col-span-4">
                <ChartWidget
                  chart={supportingChart}
                  data={filteredRows}
                  currencySymbol={analysis.statistics.currencySymbol || 'TZS'}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-xs text-slate-500">
            No charts generated. Check data columns to enable charts.
          </div>
        )}
      </div>

      {/* 4. WHAT YOU SHOULD KNOW: AI Insights (approx. 3 Important Observations) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              What You Should Know
            </h3>
          </div>
          <button
            onClick={() => onNavigateToAskAI('Summarise the key findings from this dataset')}
            className="text-xs text-indigo-600 hover:underline font-semibold"
          >
            Ask AI to elaborate
          </button>
        </div>

        {/* Executive summary note */}
        {analysis.executiveSummary && (
          <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            {analysis.executiveSummary}
          </p>
        )}

        {/* ~3 Bullet Insights */}
        <div className="space-y-2 pt-1">
          {analysis.insights.slice(0, 3).map(insight => (
            <div
              key={insight.id}
              onClick={() => onNavigateToAskAI(insight.title)}
              className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-start gap-2.5 cursor-pointer group"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {insight.title}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  {insight.content}
                </p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 mt-0.5" />
            </div>
          ))}
        </div>
      </div>

      {/* 5. NEEDS ATTENTION: Only Show When Meaningful Exceptions Exist */}
      {attentionItems.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Needs Attention
            </h3>
          </div>

          <div className="space-y-2">
            {attentionItems.map(item => (
              <div
                key={item.id}
                className="p-2.5 bg-white/90 border border-amber-200/60 rounded-xl text-xs flex items-center justify-between gap-3 text-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 font-bold">⚠</span>
                  <span>{item.text}</span>
                </div>
                <button
                  onClick={() => onNavigateToAskAI(`What caused this exception: ${item.text}?`)}
                  className="text-[11px] font-semibold text-amber-800 hover:underline shrink-0"
                >
                  Analyze
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtle Link to Explore More */}
      <div className="text-center pt-2">
        <button
          onClick={onNavigateToExplore}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
        >
          <span>Looking for raw data tables, custom dimensions, or dynamic filters?</span>
          <span className="text-indigo-600 font-semibold underline underline-offset-2">Explore More</span>
        </button>
      </div>
    </div>
  );
};
