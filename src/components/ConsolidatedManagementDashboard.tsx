/**
 * VIGOR Group Consolidated Performance Dashboard
 * Strictly renders data extracted directly from the "CONSOLIDATED" worksheet.
 * Provides Current Month | YTD | Trend views, along with physical unit-safe Operational Performance.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  LineChart as LineChartIcon,
  Table as TableIcon,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Info,
  Building2,
  Factory,
  ChevronRight,
  Search,
  FileSpreadsheet,
  TableProperties,
  SlidersHorizontal
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { ConsolidatedPerformanceData, NormalizedMetric, Dataset } from '../types';
import { AnalyticsChart, AnalyticsChartType } from './AnalyticsChart';
import { normalizeNumericValue } from '../utils/monthNormalizer';
import { WorkbookSheetSwitcher } from './WorkbookSheetSwitcher';
import { getSheetRawPreview } from '../utils/excelParser';

interface ConsolidatedManagementDashboardProps {
  dataset: Dataset;
  consolidatedData: ConsolidatedPerformanceData;
  onNavigateToAskAI?: (initialQuestion?: string) => void;
  onNavigateToUpload?: () => void;
  onSelectSheet?: (sheetName: string) => void;
  onOpenExplorer?: () => void;
}

export type DashboardTab = 'overview' | 'financial' | 'operational' | 'trend' | 'ytd' | 'data' | 'current_month';

export const ConsolidatedManagementDashboard: React.FC<ConsolidatedManagementDashboardProps> = ({
  dataset,
  consolidatedData,
  onNavigateToAskAI,
  onNavigateToUpload,
  onSelectSheet,
  onOpenExplorer
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedOpMetricId, setSelectedOpMetricId] = useState<string>('');
  const [selectedTrendMetricId, setSelectedTrendMetricId] = useState<string>('');
  const [trendChartType, setTrendChartType] = useState<AnalyticsChartType>('line');
  const [opViewMode, setOpViewMode] = useState<'snapshot' | 'table'>('snapshot');
  const [opChartFormat, setOpChartFormat] = useState<'grouped' | 'horizontal'>('grouped');
  const [showAiNotice, setShowAiNotice] = useState(false);
  const [sourceDataView, setSourceDataView] = useState<'grid' | 'metrics'>('grid');
  const [sourceDataSearch, setSourceDataSearch] = useState<string>('');

  useEffect(() => {
    console.log('[DASHBOARD] Render complete');
  }, []);

  const {
    reportingPeriod,
    reportingMonth,
    availableMonths,
    financialMetrics,
    operationalMetrics,
    currentMonthKPIs,
    insights
  } = consolidatedData;

  // Filter metrics that have reported monthly values in the workbook
  const financialTrendMetrics = useMemo(() => {
    return financialMetrics.filter(m =>
      m.monthlyValues && Object.values(m.monthlyValues).some(v => v !== null && v !== undefined)
    );
  }, [financialMetrics]);

  const operationalTrendMetrics = useMemo(() => {
    return operationalMetrics.filter(m =>
      m.monthlyValues && Object.values(m.monthlyValues).some(v => v !== null && v !== undefined)
    );
  }, [operationalMetrics]);

  // Set default selected trend metric (Default to Revenue if available, else first valid metric)
  useEffect(() => {
    if (!selectedTrendMetricId) {
      const rev = financialTrendMetrics.find(m =>
        m.metricName.toUpperCase().includes('REVENUE') ||
        m.metricName.toUpperCase().includes('TURNOVER') ||
        m.id === 'revenue'
      );
      if (rev) {
        setSelectedTrendMetricId(rev.id);
      } else if (financialTrendMetrics.length > 0) {
        setSelectedTrendMetricId(financialTrendMetrics[0].id);
      } else if (operationalTrendMetrics.length > 0) {
        setSelectedTrendMetricId(operationalTrendMetrics[0].id);
      }
    }
  }, [financialTrendMetrics, operationalTrendMetrics, selectedTrendMetricId]);

  const selectedTrendMetric = useMemo(() => {
    return (
      financialTrendMetrics.find(m => m.id === selectedTrendMetricId) ||
      operationalTrendMetrics.find(m => m.id === selectedTrendMetricId) ||
      financialTrendMetrics[0] ||
      operationalTrendMetrics[0] ||
      currentMonthKPIs.revenue
    );
  }, [financialTrendMetrics, operationalTrendMetrics, selectedTrendMetricId, currentMonthKPIs.revenue]);

  // Initialize selected operational metric
  useEffect(() => {
    if (operationalMetrics.length > 0 && !selectedOpMetricId) {
      setSelectedOpMetricId(operationalMetrics[0].id);
    }
  }, [operationalMetrics, selectedOpMetricId]);

  const selectedOpMetric = useMemo(() => {
    return operationalMetrics.find(m => m.id === selectedOpMetricId) || operationalMetrics[0];
  }, [operationalMetrics, selectedOpMetricId]);

  // Metric direction logic (OPEX, Expenses, Overdue, Debtors -> lower is better)
  const isLowerBetter = (metricName?: string | null): boolean => {
    if (!metricName) return false;
    const upper = metricName.toUpperCase();
    return (
      upper.includes('OPEX') ||
      upper.includes('EXPENSE') ||
      upper.includes('COST') ||
      upper.includes('OVERDUE') ||
      upper.includes('DEBTOR') ||
      upper.includes('LIABILITY') ||
      upper.includes('PAYABLE') ||
      upper.includes('LOSS') ||
      upper.includes('DOWNTIME') ||
      upper.includes('DEFECT') ||
      upper.includes('SCRAP') ||
      upper.includes('ACCIDENT') ||
      upper.includes('OUTAGE')
    );
  };

  // Color-coding for variance respecting direction
  const getVarianceClass = (variance: number | null | undefined, metricName?: string | null): string => {
    if (variance === null || variance === undefined || isNaN(variance) || variance === 0) {
      return 'text-slate-500';
    }
    const lowerBetter = isLowerBetter(metricName);
    const isFavorable = lowerBetter ? variance < 0 : variance > 0;
    return isFavorable ? 'text-emerald-600' : 'text-rose-600';
  };

  // Color-coding for achievement percentage respecting direction
  const getAchievementClass = (pct: number | null | undefined, metricName?: string | null): string => {
    if (pct === null || pct === undefined || isNaN(pct)) return 'text-slate-600';
    const lowerBetter = isLowerBetter(metricName);
    const isFavorable = lowerBetter ? pct <= 100 : pct >= 100;
    if (isFavorable) return 'text-emerald-600';
    const severe = lowerBetter ? pct > 115 : pct < 85;
    return severe ? 'text-rose-600' : 'text-amber-600';
  };

  // Format currency / volume values
  const formatVal = (val: number | null | undefined, unit?: string | null) => {
    if (val === null || val === undefined) return '—';
    if (unit && unit.toUpperCase() === '%') {
      return `${val.toFixed(1)}%`;
    }
    const isCurrency = !unit || unit.toUpperCase() === 'MTZS' || unit.toUpperCase() === 'TZS';
    if (isCurrency) {
      if (Math.abs(val) >= 1_000_000_000) {
        return `TZS ${(val / 1_000_000_000).toFixed(2)}B`;
      }
      if (Math.abs(val) >= 1_000_000) {
        return `TZS ${(val / 1_000_000).toFixed(1)}M`;
      }
      return `TZS ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return `${val.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit || ''}`;
  };

  const formatPct = (pct: number | null | undefined) => {
    if (pct === null || pct === undefined || isNaN(pct)) return '—';
    return `${pct.toFixed(1)}%`;
  };

  // Requirement 22 Logging: Verification of key workbook metrics
  useEffect(() => {
    if (!consolidatedData) return;
    const testMetrics = [
      currentMonthKPIs.revenue,
      currentMonthKPIs.grossProfit,
      currentMonthKPIs.opex,
      currentMonthKPIs.ebitda,
      currentMonthKPIs.netProfit,
      ...operationalMetrics.slice(0, 3)
    ].filter(Boolean);

    console.log('====== [VIGOR CONSOLIDATED DATA VERIFICATION] ======');
    testMetrics.forEach(m => {
      if (!m) return;
      const mActualCount = m.monthlyValues ? Object.values(m.monthlyValues).filter(v => v !== null).length : 0;
      const mPlanCount = m.monthlyPlanValues ? Object.values(m.monthlyPlanValues).filter(v => v !== null).length : 0;
      console.log(`[METRIC] ${m.metricName}`);
      console.log(`  Current Actual: ${m.actual}`);
      console.log(`  Current Plan: ${m.plan}`);
      console.log(`  Monthly Actual points: ${mActualCount}`);
      console.log(`  Monthly Plan points: ${mPlanCount}`);
      console.log(`  YTD Actual: ${m.ytdActual}`);
      console.log(`  YTD Plan: ${m.ytdPlan}`);
    });
    console.log('====================================================');
  }, [consolidatedData, currentMonthKPIs, operationalMetrics]);

  // Primary chart data: Actual vs Plan (August 2026) - Monetary only (MTZS)
  const primaryChartData = useMemo(() => {
    const chartKeys = [
      { name: 'Revenue', metric: currentMonthKPIs.revenue },
      { name: 'Gross Profit', metric: currentMonthKPIs.grossProfit },
      { name: 'Cash OPEX', metric: currentMonthKPIs.opex },
      { name: 'EBITDA', metric: currentMonthKPIs.ebitda },
      { name: 'Net Profit', metric: currentMonthKPIs.netProfit }
    ];

    return chartKeys
      .filter(item => item.metric && (item.metric.actual !== null || item.metric.plan !== null))
      .map(item => ({
        name: item.name,
        Actual: item.metric?.actual ? Number((item.metric.actual / 1_000_000).toFixed(1)) : 0,
        Plan: item.metric?.plan ? Number((item.metric.plan / 1_000_000).toFixed(1)) : 0
      }));
  }, [currentMonthKPIs]);

  // YTD Primary Chart Data: Actual YTD vs Plan YTD (MTZS)
  const ytdChartData = useMemo(() => {
    const chartKeys = [
      { name: 'Revenue', metric: currentMonthKPIs.revenue },
      { name: 'Gross Profit', metric: currentMonthKPIs.grossProfit },
      { name: 'Cash OPEX', metric: currentMonthKPIs.opex },
      { name: 'EBITDA', metric: currentMonthKPIs.ebitda },
      { name: 'Net Profit', metric: currentMonthKPIs.netProfit }
    ];

    return chartKeys
      .filter(item => item.metric && (item.metric.ytdActual !== null || item.metric.ytdPlan !== null))
      .map(item => ({
        name: item.name,
        'Actual YTD': item.metric?.ytdActual ? Number((item.metric.ytdActual / 1_000_000).toFixed(1)) : 0,
        'Plan YTD': item.metric?.ytdPlan ? Number((item.metric.ytdPlan / 1_000_000).toFixed(1)) : 0
      }));
  }, [currentMonthKPIs]);

  // Check if selected metric has genuine monthly plan data
  const hasMonthlyPlan = useMemo(() => {
    return Boolean(
      selectedTrendMetric?.monthlyPlanValues &&
      Object.values(selectedTrendMetric.monthlyPlanValues).some(v => v !== null && v !== undefined)
    );
  }, [selectedTrendMetric]);

  // Monthly trend series (Jan to August only)
  const trendChartData = useMemo(() => {
    if (!selectedTrendMetric || !selectedTrendMetric.monthlyValues) return [];

    return availableMonths.map(mName => {
      const rawActual = selectedTrendMetric.monthlyValues?.[mName];
      const actualNum = normalizeNumericValue(rawActual);
      const rawPlan = selectedTrendMetric.monthlyPlanValues?.[mName];
      const planNum = normalizeNumericValue(rawPlan);

      return {
        month: mName,
        actual: actualNum,
        plan: planNum,
        value: actualNum
      };
    });
  }, [selectedTrendMetric, availableMonths]);

  // Diagnostics for trend points
  useEffect(() => {
    if (!selectedTrendMetric) return;
    console.log(`[TREND] Selected metric: ${selectedTrendMetric.metricName}`);
    trendChartData.forEach(pt => {
      console.log(`[TREND] ${pt.month.toUpperCase()} actual: ${pt.actual}, plan: ${pt.plan}`);
    });
    console.log(`[TREND] Normalized points: ${trendChartData.length}, hasMonthlyPlan: ${hasMonthlyPlan}`);
  }, [selectedTrendMetric, trendChartData, hasMonthlyPlan]);

  // Chart series configuration for Monthly Trends
  const trendChartSeries = useMemo(() => {
    if (!selectedTrendMetric) return [{ key: 'value', name: 'Actual', color: '#4f46e5' }];
    if (hasMonthlyPlan) {
      return [
        { key: 'actual', name: 'Actual', color: '#4f46e5' },
        { key: 'plan', name: 'Plan', color: '#94a3b8', strokeDasharray: '4 4' }
      ];
    }
    return [
      { key: 'actual', name: `${selectedTrendMetric.metricName} (Actual)`, color: '#4f46e5' }
    ];
  }, [selectedTrendMetric, hasMonthlyPlan]);

  // Operational Snapshot Chart Data (August Actual vs Plan)
  const opSnapshotChartData = useMemo(() => {
    if (!selectedOpMetric) return [];
    return [
      {
        name: selectedOpMetric.metricName,
        Actual: selectedOpMetric.actual !== null ? selectedOpMetric.actual : 0,
        Plan: selectedOpMetric.plan !== null ? selectedOpMetric.plan : 0
      }
    ];
  }, [selectedOpMetric]);

  // Operational metrics sharing the same physical unit
  const sameUnitOpMetrics = useMemo(() => {
    if (!selectedOpMetric) return [];
    const targetUnit = (selectedOpMetric.unit || '').trim().toUpperCase();
    const matches = operationalMetrics.filter(m =>
      (m.unit || '').trim().toUpperCase() === targetUnit &&
      (m.actual !== null || m.plan !== null)
    );
    return matches.length > 0 ? matches : [selectedOpMetric];
  }, [selectedOpMetric, operationalMetrics]);

  const sameUnitChartData = useMemo(() => {
    if (sameUnitOpMetrics.length <= 1) {
      return [
        {
          name: selectedOpMetric ? (selectedOpMetric.metricName.length > 22 ? selectedOpMetric.metricName.slice(0, 20) + '…' : selectedOpMetric.metricName) : '',
          fullName: selectedOpMetric?.metricName || '',
          Actual: selectedOpMetric?.actual !== null ? selectedOpMetric.actual : 0,
          Plan: selectedOpMetric?.plan !== null ? selectedOpMetric.plan : 0
        }
      ];
    }
    return sameUnitOpMetrics.map(m => ({
      name: m.metricName.length > 22 ? m.metricName.slice(0, 20) + '…' : m.metricName,
      fullName: m.metricName,
      Actual: m.actual !== null ? m.actual : 0,
      Plan: m.plan !== null ? m.plan : 0
    }));
  }, [sameUnitOpMetrics, selectedOpMetric]);

  const currentSheetName =
    consolidatedData.sheetName ||
    dataset.activeSheetName ||
    dataset.selectedSheet ||
    'CONSOLIDATED';

  const sheetMeta = useMemo(() => {
    return dataset.parsedWorkbook?.sheets.find(
      s => s.sheetName.toLowerCase() === currentSheetName.toLowerCase()
    );
  }, [dataset, currentSheetName]);

  const entityTitle =
    sheetMeta?.companyName ||
    sheetMeta?.displayName ||
    (currentSheetName.toUpperCase().includes('CONSOLIDAT')
      ? 'VIGOR Group Consolidated Performance'
      : currentSheetName);

  const isGroupLevel =
    sheetMeta?.role === 'group' ||
    currentSheetName.toUpperCase().includes('CONSOLIDAT');

  const rawGrid = useMemo(() => {
    return getSheetRawPreview(dataset, currentSheetName);
  }, [dataset, currentSheetName]);

  const filteredRawGrid = useMemo(() => {
    if (!sourceDataSearch.trim()) return rawGrid;
    const q = sourceDataSearch.toLowerCase().trim();
    return rawGrid.filter(row =>
      row.some(c => c !== null && String(c).toLowerCase().includes(q))
    );
  }, [rawGrid, sourceDataSearch]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Executive Context */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 flex-wrap">
          <button
            type="button"
            onClick={() => onSelectSheet?.('CONSOLIDATED')}
            className="hover:text-slate-900 font-medium transition-colors"
          >
            VIGOR Group
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          {sheetMeta?.sectorName && (
            <>
              <span className="text-slate-600">{sheetMeta.sectorName}</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </>
          )}
          <span className="font-bold text-slate-900">{currentSheetName}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sheet: {currentSheetName}
              </span>
              {sheetMeta?.role === 'company' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  <Building2 className="w-3 h-3 text-slate-500" />
                  Operating Entity
                </span>
              )}
              {sheetMeta?.role === 'sector' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Factory className="w-3 h-3 text-emerald-600" />
                  Sector Rollup
                </span>
              )}
              {isGroupLevel && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                  <Layers className="w-3 h-3 text-sky-600" />
                  Consolidated Group P&L
                </span>
              )}
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs font-medium text-slate-500 truncate max-w-xs">{consolidatedData.filename}</span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {entityTitle}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Reporting Period: <span className="font-semibold text-slate-700">{reportingPeriod}</span>
              <span className="text-slate-300">•</span>
              <span>Jan–{reportingMonth} Actual vs Plan Performance Analysis</span>
            </p>
          </div>

          {/* Quick Header Switcher Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {onSelectSheet && (
              <WorkbookSheetSwitcher
                dataset={dataset}
                activeSheetName={currentSheetName}
                onSelectSheet={onSelectSheet}
                onOpenExplorer={onOpenExplorer}
              />
            )}

            {onOpenExplorer && (
              <button
                type="button"
                id="header-workbook-directory-btn"
                onClick={onOpenExplorer}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                title="Open Workbook Directory"
              >
                <TableProperties className="w-3.5 h-3.5 text-slate-500" />
                Workbook Directory
              </button>
            )}

            <button
              type="button"
              id="header-view-source-data-btn"
              onClick={() => setActiveTab('data')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-colors ${
                activeTab === 'data'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
              }`}
              title="Inspect raw worksheet cells and formulas"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
              Source Data
            </button>

            </div>
        </div>

        {/* View Controls: Overview | Financial | Operational | Trends | YTD | Source Data */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
            <button
              id="dashboard-tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Executive Overview
            </button>

            <button
              id="dashboard-tab-financial"
              onClick={() => setActiveTab('financial')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'financial' || activeTab === 'current_month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Financial (Act vs Plan)
            </button>

            {operationalMetrics.length > 0 && (
              <button
                id="dashboard-tab-operational"
                onClick={() => setActiveTab('operational')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'operational'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Operational ({operationalMetrics.length} KPIs)
              </button>
            )}

            <button
              id="dashboard-tab-trend"
              onClick={() => setActiveTab('trend')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'trend'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Trends (Jan–Aug)
            </button>

            <button
              id="dashboard-tab-ytd"
              onClick={() => setActiveTab('ytd')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ytd'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              YTD Cumulative
            </button>

            <button
              id="dashboard-tab-data"
              onClick={() => setActiveTab('data')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'data'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-slate-500" />
              Source Data
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium hidden md:block">
            Scope:{' '}
            <span className="font-bold text-slate-800">
              {entityTitle} ({currentSheetName})
            </span>
          </div>
        </div>
      </div>

      {/* Honest Empty State for Sheets Without Valid Analytics */}
      {financialMetrics.length === 0 && operationalMetrics.length === 0 && activeTab !== 'data' ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-5 max-w-xl mx-auto my-8 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 mx-auto flex items-center justify-center">
            <TableProperties className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              Worksheet: {currentSheetName}
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Source Sheet
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              This worksheet has not yet been converted into an analytical dashboard.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('data')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>View Source Data</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectSheet?.('CONSOLIDATED')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Back to Consolidated
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Management Executive Insights */}
          {insights.length > 0 && activeTab !== 'data' && (
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Executive Highlights — {reportingPeriod}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {insights.map((ins, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 rounded-xl p-3 backdrop-blur-xs border border-white/10 text-xs text-slate-200 leading-relaxed"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                          ins.type === 'positive'
                            ? 'bg-emerald-400'
                            : ins.type === 'warning'
                            ? 'bg-rose-400'
                            : 'bg-amber-400'
                        }`}
                      />
                      <span>{ins.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

      {/* ========================================================================= */}
      {/* FINANCIAL PERFORMANCE (Current-Period: August 2026)                       */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'financial' || activeTab === 'current_month') && (
        <div className="space-y-6">
          {/* Financial Performance Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Financial Performance — August 2026
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                  Financial Actual vs Plan (MTZS)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                August 2026 execution against Plan targets. Values in Millions TZS (MTZS). Cost metrics evaluate lower actuals as favorable.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg w-fit">
              Period: August 2026
            </span>
          </div>

          {/* 6 Key Financial KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Revenue */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Revenue</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {formatVal(currentMonthKPIs.revenue?.actual, currentMonthKPIs.revenue?.unit)}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] space-y-0.5">
                <div className="flex justify-between text-slate-500">
                  <span>Plan:</span>
                  <span className="font-medium text-slate-700">{formatVal(currentMonthKPIs.revenue?.plan, currentMonthKPIs.revenue?.unit)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Achieve:</span>
                  <span className={`font-semibold ${getAchievementClass(currentMonthKPIs.revenue?.achievementPct, 'Revenue')}`}>
                    {formatPct(currentMonthKPIs.revenue?.achievementPct)}
                  </span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Gross Profit</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {formatVal(currentMonthKPIs.grossProfit?.actual, currentMonthKPIs.grossProfit?.unit)}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] space-y-0.5">
                <div className="flex justify-between text-slate-500">
                  <span>Plan:</span>
                  <span className="font-medium text-slate-700">{formatVal(currentMonthKPIs.grossProfit?.plan, currentMonthKPIs.grossProfit?.unit)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Achieve:</span>
                  <span className={`font-semibold ${getAchievementClass(currentMonthKPIs.grossProfit?.achievementPct, 'Gross Profit')}`}>
                    {formatPct(currentMonthKPIs.grossProfit?.achievementPct)}
                  </span>
                </div>
              </div>
            </div>

            {/* Gross Profit % */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">GP Margin %</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {currentMonthKPIs.grossProfitPct?.actual !== null && currentMonthKPIs.grossProfitPct?.actual !== undefined
                    ? formatPct(currentMonthKPIs.grossProfitPct.actual)
                    : currentMonthKPIs.revenue?.actual && currentMonthKPIs.grossProfit?.actual
                    ? formatPct((currentMonthKPIs.grossProfit.actual / currentMonthKPIs.revenue.actual) * 100)
                    : '—'}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] space-y-0.5">
                <div className="flex justify-between text-slate-500">
                  <span>Plan:</span>
                  <span className="font-medium text-slate-700">
                    {currentMonthKPIs.grossProfitPct?.plan !== null && currentMonthKPIs.grossProfitPct?.plan !== undefined
                      ? formatPct(currentMonthKPIs.grossProfitPct.plan)
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>SPLY:</span>
                  <span className="font-medium text-slate-700">
                    {currentMonthKPIs.grossProfitPct?.priorYear !== null && currentMonthKPIs.grossProfitPct?.priorYear !== undefined
                      ? formatPct(currentMonthKPIs.grossProfitPct.priorYear)
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Cash OPEX */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Cash OPEX</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {formatVal(currentMonthKPIs.opex?.actual, currentMonthKPIs.opex?.unit)}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] space-y-0.5">
                <div className="flex justify-between text-slate-500">
                  <span>Plan:</span>
                  <span className="font-medium text-slate-700">{formatVal(currentMonthKPIs.opex?.plan, currentMonthKPIs.opex?.unit)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Variance:</span>
                  <span className={`font-semibold ${getVarianceClass(currentMonthKPIs.opex?.variance, 'OPEX')}`}>
                    {formatVal(currentMonthKPIs.opex?.variance, currentMonthKPIs.opex?.unit)}
                  </span>
                </div>
              </div>
            </div>

            {/* EBITDA */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">EBITDA</p>
                <p className={`text-lg font-bold mt-1 ${
                  (currentMonthKPIs.ebitda?.actual || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}>
                  {formatVal(currentMonthKPIs.ebitda?.actual, currentMonthKPIs.ebitda?.unit)}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] space-y-0.5">
                <div className="flex justify-between text-slate-500">
                  <span>Plan:</span>
                  <span className="font-medium text-slate-700">{formatVal(currentMonthKPIs.ebitda?.plan, currentMonthKPIs.ebitda?.unit)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Achieve:</span>
                  <span className={`font-semibold ${getAchievementClass(currentMonthKPIs.ebitda?.achievementPct, 'EBITDA')}`}>
                    {formatPct(currentMonthKPIs.ebitda?.achievementPct)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Net Profit</p>
                <p className={`text-lg font-bold mt-1 ${
                  (currentMonthKPIs.netProfit?.actual || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}>
                  {formatVal(currentMonthKPIs.netProfit?.actual, currentMonthKPIs.netProfit?.unit)}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] space-y-0.5">
                <div className="flex justify-between text-slate-500">
                  <span>Plan:</span>
                  <span className="font-medium text-slate-700">{formatVal(currentMonthKPIs.netProfit?.plan, currentMonthKPIs.netProfit?.unit)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Achieve:</span>
                  <span className={`font-semibold ${getAchievementClass(currentMonthKPIs.netProfit?.achievementPct, 'Net Profit')}`}>
                    {formatPct(currentMonthKPIs.netProfit?.achievementPct)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Financial Chart: Actual vs Plan (August 2026) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  Financial Performance: Actual vs Plan — August 2026
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Values in Millions TZS (MTZS)</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-indigo-600" />
                  <span className="text-slate-600 font-medium">Actual August</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-slate-300" />
                  <span className="text-slate-600 font-medium">Plan August</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={primaryChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toLocaleString()}M`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`TZS ${Number(val).toLocaleString()}M`, '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Bar dataKey="Actual" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="Plan" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Financial Performance Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <TableIcon className="w-3.5 h-3.5 text-slate-600" />
                Financial Performance — August 2026
              </h2>
              <span className="text-xs text-slate-500 font-medium">Source: Consolidated Sheet</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/75 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Metric</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4 text-right">Actual Aug</th>
                    <th className="py-3 px-4 text-right">Plan</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4 text-right">Achievement %</th>
                    <th className="py-3 px-4 text-right">SPLY</th>
                    <th className="py-3 px-4 text-right">Growth %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financialMetrics.map((m) => {
                    const isKeyMetric = ['REVENUE', 'GROSS PROFIT', 'EBITDA', 'NET PROFIT'].some(k =>
                      m.metricName.toUpperCase().includes(k)
                    );

                    return (
                      <tr key={m.id} className={`hover:bg-slate-50/75 transition-colors ${isKeyMetric ? 'font-semibold' : ''}`}>
                        <td className="py-2.5 px-4 text-slate-900">{m.metricName}</td>
                        <td className="py-2.5 px-4 text-slate-500">{m.unit || 'MTZS'}</td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-900">
                          {formatVal(m.actual, m.unit)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-600">
                          {formatVal(m.plan, m.unit)}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-medium ${getVarianceClass(m.variance, m.metricName)}`}>
                          {formatVal(m.variance, m.unit)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold">
                          {m.achievementPct !== null ? (
                            <span className={getAchievementClass(m.achievementPct, m.metricName)}>
                              {m.achievementPct.toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500">
                          {formatVal(m.priorYear, m.unit)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium">
                          {m.growthPct !== null ? (
                            <span className={m.growthPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {m.growthPct >= 0 ? '+' : ''}{m.growthPct.toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OPERATIONAL PERFORMANCE SECTION (Current-Period Snapshot)                 */}
      {/* ========================================================================= */}
      {operationalMetrics.length > 0 && (activeTab === 'overview' || activeTab === 'operational') && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    Operational Performance — August 2026 Snapshot
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                    Current-Period Snapshot
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Evaluates operational KPIs in the reporting month (August 2026) against Plan targets in authentic physical units (e.g. Patients, Guests, SKU, TON, BAGS, ROLLS). Distinct from multi-month historical trends.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* View Switcher: Metric Snapshot vs Table */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setOpViewMode('snapshot')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      opViewMode === 'snapshot'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Metric Snapshot</span>
                  </button>
                  <button
                    onClick={() => setOpViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      opViewMode === 'table'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>All Operational KPIs ({operationalMetrics.length})</span>
                  </button>
                </div>

                {/* Metric Selector Dropdown (When in Snapshot View) */}
                {opViewMode === 'snapshot' && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                      Metric:
                    </label>
                    <select
                      value={selectedOpMetric?.id || ''}
                      onChange={(e) => setSelectedOpMetricId(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {operationalMetrics.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.metricName} {op.unit ? `(${op.unit})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* SNAPSHOT MODE */}
            {opViewMode === 'snapshot' && selectedOpMetric && (
              <div className="space-y-5">
                {/* Metric KPI Banner */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">August Actual</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {formatVal(selectedOpMetric.actual, selectedOpMetric.unit)}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">August Plan</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {formatVal(selectedOpMetric.plan, selectedOpMetric.unit)}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">Variance</p>
                    <p className={`text-base font-bold mt-0.5 ${getVarianceClass(selectedOpMetric.variance, selectedOpMetric.metricName)}`}>
                      {formatVal(selectedOpMetric.variance, selectedOpMetric.unit)}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">Achievement %</p>
                    <p className={`text-base font-bold mt-0.5 ${getAchievementClass(selectedOpMetric.achievementPct, selectedOpMetric.metricName)}`}>
                      {formatPct(selectedOpMetric.achievementPct)}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">SPLY (Prior Year)</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {formatVal(selectedOpMetric.priorYear, selectedOpMetric.unit)}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">Growth vs SPLY</p>
                    <p className={`text-base font-bold mt-0.5 ${
                      (selectedOpMetric.growthPct || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {formatPct(selectedOpMetric.growthPct)}
                    </p>
                  </div>

                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex flex-col justify-between">
                    <p className="text-[11px] font-semibold text-indigo-700">Physical Unit</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800 w-fit mt-0.5">
                      {selectedOpMetric.unit || 'Units'}
                    </span>
                  </div>
                </div>

                {/* Actual vs Plan Comparison Chart Card */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                        Current-Period Snapshot: Actual vs Plan ({selectedOpMetric.metricName})
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {sameUnitOpMetrics.length > 1
                          ? `Comparing ${sameUnitOpMetrics.length} metrics measured in physical unit "${selectedOpMetric.unit}"`
                          : `August 2026 performance compared with target in physical unit "${selectedOpMetric.unit || 'Units'}"`}
                      </p>
                    </div>

                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                      <button
                        onClick={() => setOpChartFormat('grouped')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                          opChartFormat === 'grouped'
                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Side-by-Side Bars
                      </button>
                      <button
                        onClick={() => setOpChartFormat('horizontal')}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                          opChartFormat === 'horizontal'
                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Horizontal Comparison
                      </button>
                    </div>
                  </div>

                  {/* Format A: Grouped Side-by-Side Bar Chart */}
                  {opChartFormat === 'grouped' && (
                    <div>
                      <div className="flex items-center justify-end gap-4 text-xs mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs bg-indigo-600" />
                          <span className="text-slate-600 font-medium">Actual August</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs bg-slate-300" />
                          <span className="text-slate-600 font-medium">Plan August</span>
                        </div>
                      </div>

                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={sameUnitChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                            <YAxis
                              stroke="#64748b"
                              fontSize={11}
                              tickLine={false}
                              tickFormatter={(v) => Number(v).toLocaleString()}
                            />
                            <Tooltip
                              formatter={(val: any, name: any) => [
                                `${Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${selectedOpMetric.unit || ''}`,
                                name
                              ]}
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                            />
                            <Bar dataKey="Actual" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={44} />
                            <Bar dataKey="Plan" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={44} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Format B: Horizontal Comparison Visualizer */}
                  {opChartFormat === 'horizontal' && (
                    <div className="space-y-4 pt-1">
                      {sameUnitOpMetrics.map(metric => {
                        const maxVal = Math.max(
                          metric.actual || 0,
                          metric.plan || 0,
                          metric.priorYear || 0,
                          1
                        );
                        const actualPctWidth = Math.min(100, Math.max(4, ((metric.actual || 0) / maxVal) * 100));
                        const planPctWidth = Math.min(100, Math.max(4, ((metric.plan || 0) / maxVal) * 100));
                        const splyPctWidth = metric.priorYear ? Math.min(100, Math.max(4, (metric.priorYear / maxVal) * 100)) : null;

                        return (
                          <div key={metric.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-900">{metric.metricName}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  (metric.achievementPct || 0) >= 100
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {formatPct(metric.achievementPct)} achieved
                                </span>
                                <span className="text-xs font-semibold text-slate-500">
                                  {metric.unit}
                                </span>
                              </div>
                            </div>

                            {/* Actual Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-700">Actual August</span>
                                <span className="font-bold text-indigo-700">{formatVal(metric.actual, metric.unit)}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-full rounded-full transition-all"
                                  style={{ width: `${actualPctWidth}%` }}
                                />
                              </div>
                            </div>

                            {/* Plan Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold text-slate-700">Plan August</span>
                                <span className="font-bold text-slate-700">{formatVal(metric.plan, metric.unit)}</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-slate-300 h-full rounded-full transition-all"
                                  style={{ width: `${planPctWidth}%` }}
                                />
                              </div>
                            </div>

                            {/* SPLY Bar if exists */}
                            {splyPctWidth !== null && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="font-medium text-slate-500">SPLY (Prior Year)</span>
                                  <span className="font-medium text-slate-600">{formatVal(metric.priorYear, metric.unit)}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-slate-400 h-full rounded-full transition-all"
                                    style={{ width: `${splyPctWidth}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TABLE MODE: All Operational KPIs */}
            {opViewMode === 'table' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/75 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Metric</th>
                      <th className="py-3 px-4">Physical Unit</th>
                      <th className="py-3 px-4 text-right">Actual Aug</th>
                      <th className="py-3 px-4 text-right">Plan Aug</th>
                      <th className="py-3 px-4 text-right">Variance</th>
                      <th className="py-3 px-4 text-right">Achievement %</th>
                      <th className="py-3 px-4 text-right">SPLY</th>
                      <th className="py-3 px-4 text-right">Growth %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {operationalMetrics.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{m.metricName}</td>
                        <td className="py-2.5 px-4 text-slate-500 font-medium">
                          <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            {m.unit || 'Units'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium text-slate-900">
                          {formatVal(m.actual, m.unit)}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-600">
                          {formatVal(m.plan, m.unit)}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-medium ${getVarianceClass(m.variance, m.metricName)}`}>
                          {formatVal(m.variance, m.unit)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold">
                          {m.achievementPct !== null ? (
                            <span className={getAchievementClass(m.achievementPct, m.metricName)}>
                              {m.achievementPct.toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-500">
                          {formatVal(m.priorYear, m.unit)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium">
                          {m.growthPct !== null ? (
                            <span className={m.growthPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {m.growthPct >= 0 ? '+' : ''}{m.growthPct.toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. YTD VIEW                                                               */}
      {/* ========================================================================= */}
      {activeTab === 'ytd' && (
        <div className="space-y-6">
          {/* YTD Financial Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Revenue YTD */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Revenue YTD</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatVal(currentMonthKPIs.revenue?.ytdActual, currentMonthKPIs.revenue?.unit)}
              </p>
              <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                <span>Plan YTD:</span>
                <span className="font-semibold text-slate-700">{formatVal(currentMonthKPIs.revenue?.ytdPlan, currentMonthKPIs.revenue?.unit)}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Achieve:</span>
                <span className={`font-bold ${getAchievementClass(currentMonthKPIs.revenue?.ytdAchievementPct, 'Revenue')}`}>
                  {formatPct(currentMonthKPIs.revenue?.ytdAchievementPct)}
                </span>
              </div>
            </div>

            {/* Gross Profit YTD */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Gross Profit YTD</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatVal(currentMonthKPIs.grossProfit?.ytdActual, currentMonthKPIs.grossProfit?.unit)}
              </p>
              <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                <span>Plan YTD:</span>
                <span className="font-semibold text-slate-700">{formatVal(currentMonthKPIs.grossProfit?.ytdPlan, currentMonthKPIs.grossProfit?.unit)}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Achieve:</span>
                <span className={`font-bold ${getAchievementClass(currentMonthKPIs.grossProfit?.ytdAchievementPct, 'Gross Profit')}`}>
                  {formatPct(currentMonthKPIs.grossProfit?.ytdAchievementPct)}
                </span>
              </div>
            </div>

            {/* OPEX YTD */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Cash OPEX YTD</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatVal(currentMonthKPIs.opex?.ytdActual, currentMonthKPIs.opex?.unit)}
              </p>
              <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                <span>Plan YTD:</span>
                <span className="font-semibold text-slate-700">{formatVal(currentMonthKPIs.opex?.ytdPlan, currentMonthKPIs.opex?.unit)}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Variance:</span>
                <span className={`font-bold ${getVarianceClass(currentMonthKPIs.opex?.ytdVariance, 'OPEX')}`}>
                  {formatVal(currentMonthKPIs.opex?.ytdVariance, currentMonthKPIs.opex?.unit)}
                </span>
              </div>
            </div>

            {/* EBITDA YTD */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">EBITDA YTD</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatVal(currentMonthKPIs.ebitda?.ytdActual, currentMonthKPIs.ebitda?.unit)}
              </p>
              <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                <span>Plan YTD:</span>
                <span className="font-semibold text-slate-700">{formatVal(currentMonthKPIs.ebitda?.ytdPlan, currentMonthKPIs.ebitda?.unit)}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Achieve:</span>
                <span className={`font-bold ${getAchievementClass(currentMonthKPIs.ebitda?.ytdAchievementPct, 'EBITDA')}`}>
                  {formatPct(currentMonthKPIs.ebitda?.ytdAchievementPct)}
                </span>
              </div>
            </div>

            {/* Net Profit YTD */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Net Profit YTD</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatVal(currentMonthKPIs.netProfit?.ytdActual, currentMonthKPIs.netProfit?.unit)}
              </p>
              <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                <span>Plan YTD:</span>
                <span className="font-semibold text-slate-700">{formatVal(currentMonthKPIs.netProfit?.ytdPlan, currentMonthKPIs.netProfit?.unit)}</span>
              </div>
              <div className="text-[11px] text-slate-500 flex justify-between">
                <span>Achieve:</span>
                <span className={`font-bold ${getAchievementClass(currentMonthKPIs.netProfit?.ytdAchievementPct, 'Net Profit')}`}>
                  {formatPct(currentMonthKPIs.netProfit?.ytdAchievementPct)}
                </span>
              </div>
            </div>
          </div>

          {/* Primary YTD Chart: Actual YTD vs Plan YTD (Through August 2026) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  Actual YTD vs Plan YTD — Through August 2026
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Values in Millions TZS (MTZS)</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-indigo-600" />
                  <span className="text-slate-600 font-medium">Actual YTD</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-slate-300" />
                  <span className="text-slate-600 font-medium">Plan YTD</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ytdChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) => `${v.toLocaleString()}M`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`TZS ${Number(val).toLocaleString()}M`, '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Bar dataKey="Actual YTD" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="Plan YTD" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* YTD Financial Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <TableIcon className="w-3.5 h-3.5 text-slate-600" />
                Year-to-Date (YTD) Performance — Through August 2026
              </h2>
              <span className="text-xs text-slate-500 font-medium">Source: ACT AUG YTD & YTD Targets</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/75 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Metric</th>
                    <th className="py-3 px-4">Unit</th>
                    <th className="py-3 px-4 text-right">Actual YTD</th>
                    <th className="py-3 px-4 text-right">Plan YTD</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4 text-right">Achievement %</th>
                    <th className="py-3 px-4 text-right">SPLY YTD</th>
                    <th className="py-3 px-4 text-right">Growth %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financialMetrics.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-900">{m.metricName}</td>
                      <td className="py-2.5 px-4 text-slate-500">{m.unit || 'MTZS'}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                        {formatVal(m.ytdActual, m.unit)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-600">
                        {formatVal(m.ytdPlan, m.unit)}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-medium ${getVarianceClass(m.ytdVariance, m.metricName)}`}>
                        {formatVal(m.ytdVariance, m.unit)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold">
                        {m.ytdAchievementPct !== null ? (
                          <span className={getAchievementClass(m.ytdAchievementPct, m.metricName)}>
                            {m.ytdAchievementPct.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500">
                        {formatVal(m.ytdPriorYear, m.unit)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        {m.ytdGrowthPct !== null ? (
                          <span className={m.ytdGrowthPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {m.ytdGrowthPct >= 0 ? '+' : ''}{m.ytdGrowthPct.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MONTHLY PERFORMANCE TRENDS VIEW (Jan–Aug Multi-Month Time Series)      */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'trend') && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <LineChartIcon className="w-5 h-5 text-purple-600" />
                    Monthly Performance Trends (January – August 2026)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wide">
                    Multi-Month Time-Series (Jan–Aug)
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Tracks multi-month performance trajectory over time across the 8 reported months of 2026 (Jan–Aug). Compares Actual monthly results against Plan targets.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Metric Selector Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                    Metric:
                  </label>
                  <select
                    value={selectedTrendMetric?.id || ''}
                    onChange={(e) => setSelectedTrendMetricId(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {financialTrendMetrics.length > 0 && (
                      <optgroup label="Financial Performance">
                        {financialTrendMetrics.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.metricName} {m.unit ? `(${m.unit})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {operationalTrendMetrics.length > 0 && (
                      <optgroup label="Operational Performance">
                        {operationalTrendMetrics.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.metricName} {m.unit ? `(${m.unit})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Chart Type Switcher */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setTrendChartType('line')}
                    title="Line Chart (Recommended for time progression)"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      trendChartType === 'line'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LineChartIcon className="w-3.5 h-3.5" />
                    <span>Line</span>
                  </button>
                  <button
                    onClick={() => setTrendChartType('bar')}
                    title="Bar Chart (Month-to-month comparison)"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      trendChartType === 'bar'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Bar</span>
                  </button>
                  <button
                    onClick={() => setTrendChartType('area')}
                    title="Area Chart (Volume & trend magnitude)"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      trendChartType === 'area'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Area</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Metric Summary Badges */}
            {selectedTrendMetric && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">August Actual</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {formatVal(selectedTrendMetric.actual, selectedTrendMetric.unit)}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">August Plan</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {formatVal(selectedTrendMetric.plan, selectedTrendMetric.unit)}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">Variance</p>
                    <p className={`text-base font-bold mt-0.5 ${getVarianceClass(selectedTrendMetric.variance, selectedTrendMetric.metricName)}`}>
                      {formatVal(selectedTrendMetric.variance, selectedTrendMetric.unit)}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">Achievement %</p>
                    <p className={`text-base font-bold mt-0.5 ${getAchievementClass(selectedTrendMetric.achievementPct, selectedTrendMetric.metricName)}`}>
                      {formatPct(selectedTrendMetric.achievementPct)}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                    <p className="text-[11px] font-medium text-slate-500">Actual YTD</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {formatVal(selectedTrendMetric.ytdActual, selectedTrendMetric.unit)}
                    </p>
                  </div>
                </div>

                {/* Plan Context Notice */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900">
                  <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  {hasMonthlyPlan ? (
                    <span>Monthly Plan data is available and plotted alongside Actual performance across January – August 2026.</span>
                  ) : (
                    <span>
                      Historical monthly actuals Jan–Aug 2026. Target comparison is anchored to the August Plan of{' '}
                      <strong>{formatVal(selectedTrendMetric.plan, selectedTrendMetric.unit)}</strong> (budget in workbook is recorded at annual/current level).
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Render Reusable AnalyticsChart with guaranteed minimum height */}
            <div className="w-full pt-1">
              <AnalyticsChart
                type={trendChartType}
                data={trendChartData}
                xKey="month"
                series={trendChartSeries}
                referenceLine={
                  !hasMonthlyPlan && selectedTrendMetric?.plan !== null && selectedTrendMetric?.plan !== undefined
                    ? {
                        y: selectedTrendMetric.plan,
                        label: `Aug Plan: ${formatVal(selectedTrendMetric.plan, selectedTrendMetric.unit)}`,
                        stroke: '#94a3b8',
                        strokeDasharray: '4 4'
                      }
                    : undefined
                }
                unit={selectedTrendMetric?.unit}
                metricName={selectedTrendMetric?.metricName}
                height={360}
                emptyMessage="No monthly trend data is available for this metric."
                onSelectAlternativeMetric={() => {
                  const rev = financialTrendMetrics.find(m =>
                    m.metricName.toUpperCase().includes('REVENUE') ||
                    m.metricName.toUpperCase().includes('TURNOVER')
                  );
                  if (rev) setSelectedTrendMetricId(rev.id);
                }}
                alternativeMetricLabel="View Revenue Trend"
              />
            </div>

            {/* 8-Month Monthly Trajectory Data Table */}
            {selectedTrendMetric && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <TableIcon className="w-3.5 h-3.5 text-purple-600" />
                      Monthly Trajectory (Jan – Aug 2026) — {selectedTrendMetric.metricName}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Actual vs Plan breakdown across all 8 reported months of 2026. Values in {selectedTrendMetric.unit || 'Units'}.
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                    {selectedTrendMetric.unit || 'Units'}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 min-w-[140px]">Series</th>
                        {availableMonths.map(mo => (
                          <th
                            key={mo}
                            className={`py-2.5 px-2 text-right ${
                              mo === 'Aug' ? 'bg-indigo-50/70 font-bold text-indigo-900 border-l border-r border-indigo-100' : ''
                            }`}
                          >
                            {mo}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Actual Row */}
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block shrink-0" />
                          Actual
                        </td>
                        {availableMonths.map(mo => {
                          const val = selectedTrendMetric.monthlyValues?.[mo];
                          const num = normalizeNumericValue(val);
                          return (
                            <td
                              key={mo}
                              className={`py-2.5 px-2 text-right font-medium text-slate-900 ${
                                mo === 'Aug' ? 'bg-indigo-50/40 font-bold text-indigo-900 border-l border-r border-indigo-100' : ''
                              }`}
                            >
                              {num !== null ? formatVal(num, selectedTrendMetric.unit) : '—'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Plan Row (if available) */}
                      {hasMonthlyPlan && (
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-600 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block shrink-0" />
                            Plan Target
                          </td>
                          {availableMonths.map(mo => {
                            const val = selectedTrendMetric.monthlyPlanValues?.[mo];
                            const num = normalizeNumericValue(val);
                            return (
                              <td
                                key={mo}
                                className={`py-2.5 px-2 text-right text-slate-600 ${
                                  mo === 'Aug' ? 'bg-indigo-50/40 font-semibold text-slate-700 border-l border-r border-indigo-100' : ''
                                }`}
                              >
                                {num !== null ? formatVal(num, selectedTrendMetric.unit) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      )}

                      {/* Variance Row (if Plan available) */}
                      {hasMonthlyPlan && (
                        <tr>
                          <td className="py-2.5 px-3 font-medium text-slate-600">
                            Variance (Act - Plan)
                          </td>
                          {availableMonths.map(mo => {
                            const actVal = normalizeNumericValue(selectedTrendMetric.monthlyValues?.[mo]);
                            const planVal = normalizeNumericValue(selectedTrendMetric.monthlyPlanValues?.[mo]);
                            const v = actVal !== null && planVal !== null ? actVal - planVal : null;
                            return (
                              <td
                                key={mo}
                                className={`py-2.5 px-2 text-right font-medium ${
                                  mo === 'Aug' ? 'bg-indigo-50/40 border-l border-r border-indigo-100' : ''
                                } ${getVarianceClass(v, selectedTrendMetric.metricName)}`}
                              >
                                {v !== null ? (v > 0 ? `+${formatVal(v, selectedTrendMetric.unit)}` : formatVal(v, selectedTrendMetric.unit)) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      )}

                      {/* Achievement Row (if Plan available) */}
                      {hasMonthlyPlan && (
                        <tr>
                          <td className="py-2.5 px-3 font-medium text-slate-600">
                            Achievement %
                          </td>
                          {availableMonths.map(mo => {
                            const actVal = normalizeNumericValue(selectedTrendMetric.monthlyValues?.[mo]);
                            const planVal = normalizeNumericValue(selectedTrendMetric.monthlyPlanValues?.[mo]);
                            const pct = actVal !== null && planVal !== null && planVal !== 0 ? (actVal / planVal) * 100 : null;
                            return (
                              <td
                                key={mo}
                                className={`py-2.5 px-2 text-right font-bold ${
                                  mo === 'Aug' ? 'bg-indigo-50/40 border-l border-r border-indigo-100' : ''
                                } ${getAchievementClass(pct, selectedTrendMetric.metricName)}`}
                              >
                                {pct !== null ? `${pct.toFixed(1)}%` : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 6. SOURCE DATA & WORKSHEET PREVIEW TAB                                    */}
      {/* ========================================================================= */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-sky-600" />
                    Source Worksheet Data: {currentSheetName}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wide">
                    Direct Excel Ingestion
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Inspect raw cells and formulas directly from worksheet "{currentSheetName}" in {consolidatedData.filename}.
                </p>
              </div>

              {/* View Switcher: Raw Sheet Grid vs Extracted Metrics */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSourceDataView('grid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      sourceDataView === 'grid'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TableProperties className="w-3.5 h-3.5 text-sky-600" />
                    Spreadsheet Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceDataView('metrics')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      sourceDataView === 'metrics'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                    Extracted Metrics ({financialMetrics.length + operationalMetrics.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Sub-view: RAW SPREADSHEET GRID */}
            {sourceDataView === 'grid' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={sourceDataSearch}
                      onChange={e => setSourceDataSearch(e.target.value)}
                      placeholder="Filter worksheet rows by keyword, code, or value..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    Showing {filteredRawGrid.length} of {rawGrid.length} rows
                  </span>
                </div>

                {filteredRawGrid.length > 0 ? (
                  <div className="overflow-x-auto max-h-[550px] border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-slate-700 font-semibold border-b border-slate-200 z-10">
                        <tr>
                          <th className="py-2 px-3 text-slate-400 border-r border-slate-200 w-12 text-center select-none">
                            #
                          </th>
                          {filteredRawGrid[0]?.map((_, colIdx) => (
                            <th
                              key={colIdx}
                              className="py-2 px-3 border-r border-slate-200 text-slate-700 whitespace-nowrap"
                            >
                              {String.fromCharCode(65 + (colIdx % 26))}
                              {colIdx >= 26 ? String(Math.floor(colIdx / 26)) : ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredRawGrid.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-sky-50/40 transition-colors">
                            <td className="py-1.5 px-2 text-slate-400 border-r border-slate-200 text-center select-none bg-slate-50 text-[11px]">
                              {rIdx + 1}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`py-1.5 px-3 border-r border-slate-100 whitespace-nowrap text-xs ${
                                  cell === null || cell === ''
                                    ? 'text-slate-300'
                                    : typeof cell === 'number'
                                    ? 'text-right font-semibold text-slate-800'
                                    : 'text-left text-slate-700'
                                }`}
                              >
                                {cell === null || cell === '' ? '' : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                    No rows match filter "{sourceDataSearch}".
                  </div>
                )}
              </div>
            )}

            {/* Sub-view: ALL EXTRACTED METRICS */}
            {sourceDataView === 'metrics' && (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Metric Name</th>
                        <th className="py-2.5 px-2">Type</th>
                        <th className="py-2.5 px-2">Unit</th>
                        <th className="py-2.5 px-2 text-right">Aug Actual</th>
                        <th className="py-2.5 px-2 text-right">Aug Plan</th>
                        <th className="py-2.5 px-2 text-right">Variance</th>
                        <th className="py-2.5 px-2 text-right">Achieve %</th>
                        <th className="py-2.5 px-2 text-right">SPLY</th>
                        <th className="py-2.5 px-2 text-right">YTD Actual</th>
                        <th className="py-2.5 px-2 text-right">YTD Plan</th>
                        <th className="py-2.5 px-2 text-right">YTD Achieve %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {[...financialMetrics, ...operationalMetrics].map(m => {
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {m.metricName}
                            </td>
                            <td className="py-2 px-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  m.isOperational
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {m.isOperational ? 'Operational' : 'Financial'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-slate-500 font-mono text-[11px]">
                              {m.unit || '—'}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-slate-900">
                              {formatVal(m.actual, m.unit)}
                            </td>
                            <td className="py-2 px-2 text-right text-slate-600">
                              {formatVal(m.plan, m.unit)}
                            </td>
                            <td
                              className={`py-2 px-2 text-right font-semibold ${getVarianceClass(
                                m.variance,
                                m.metricName
                              )}`}
                            >
                              {m.variance !== null ? formatVal(m.variance, m.unit) : '—'}
                            </td>
                            <td
                              className={`py-2 px-2 text-right font-bold ${getAchievementClass(
                                m.achievementPct,
                                m.metricName
                              )}`}
                            >
                              {formatPct(m.achievementPct)}
                            </td>
                            <td className="py-2 px-2 text-right text-slate-500">
                              {formatVal(m.priorYear, m.unit)}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-slate-900">
                              {formatVal(m.ytdActual, m.unit)}
                            </td>
                            <td className="py-2 px-2 text-right text-slate-600">
                              {formatVal(m.ytdPlan, m.unit)}
                            </td>
                            <td
                              className={`py-2 px-2 text-right font-bold ${getAchievementClass(
                                m.ytdAchievementPct,
                                m.metricName
                              )}`}
                            >
                              {formatPct(m.ytdAchievementPct)}
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
        </div>
      )}
    </div>
  );
};
