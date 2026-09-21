/**
 * Explore Data Page
 * Simple, beginner-friendly ad-hoc visual builder
 * Lets managers select X Axis, Y Axis, Aggregation, Chart Type, and Filters
 */

import React, { useState, useMemo } from 'react';
import {
  Compass,
  BarChart2,
  Table as TableIcon,
  Filter,
  CheckCircle2,
  Download
} from 'lucide-react';
import { Dataset, ChartType } from '../types';
import { ChartWidget } from '../components/ChartWidget';
import { formatCompactNumber } from '../services/analyticsEngine';

interface ExplorePageProps {
  dataset: Dataset;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({ dataset }) => {
  const activeSheet = dataset.sheets.find(s => s.name === dataset.selectedSheet) || dataset.sheets[0];
  const activeCols = activeSheet.columns.filter(c => c.include);

  const numericCols = activeCols.filter(c => c.detectedType === 'number' || c.detectedType === 'currency');
  const dimCols = activeCols.filter(c => c.detectedType !== 'number' && c.detectedType !== 'currency');

  // Builder configuration state
  const [xAxis, setXAxis] = useState<string>(dimCols[0]?.name || activeCols[0]?.name || '');
  const [yAxis, setYAxis] = useState<string>(numericCols[0]?.name || activeCols[1]?.name || '');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [aggregation, setAggregation] = useState<'sum' | 'avg' | 'count' | 'min' | 'max'>('sum');
  const [filterCol, setFilterCol] = useState<string>('');
  const [filterVal, setFilterVal] = useState<string>('ALL');

  // Compute aggregated data
  const aggregatedData = useMemo(() => {
    let rows = activeSheet.rows;

    if (filterCol && filterVal !== 'ALL') {
      rows = rows.filter(r => String(r[filterCol]) === String(filterVal));
    }

    const groups: Record<string, { count: number; sum: number; min: number; max: number }> = {};

    rows.forEach(r => {
      const key = String(r[xAxis] || 'Unassigned');
      const val = typeof r[yAxis] === 'number' ? r[yAxis] : parseFloat(r[yAxis]) || 0;

      if (!groups[key]) {
        groups[key] = { count: 0, sum: 0, min: val, max: val };
      }

      groups[key].count += 1;
      groups[key].sum += val;
      if (val < groups[key].min) groups[key].min = val;
      if (val > groups[key].max) groups[key].max = val;
    });

    return Object.entries(groups).map(([groupKey, stats]) => {
      let finalVal = 0;
      if (aggregation === 'sum') finalVal = stats.sum;
      else if (aggregation === 'avg') finalVal = stats.sum / (stats.count || 1);
      else if (aggregation === 'count') finalVal = stats.count;
      else if (aggregation === 'min') finalVal = stats.min;
      else if (aggregation === 'max') finalVal = stats.max;

      return {
        [xAxis]: groupKey,
        [yAxis]: Math.round(finalVal * 100) / 100,
        _count: stats.count
      };
    });
  }, [activeSheet.rows, xAxis, yAxis, aggregation, filterCol, filterVal]);

  const customChartConfig = useMemo(() => {
    return {
      id: 'custom-explore-chart',
      title: `${aggregation.toUpperCase()} of ${yAxis} by ${xAxis}`,
      type: chartType,
      xAxisKey: xAxis,
      yAxisKeys: [yAxis],
      data: aggregatedData,
      description: `Custom ad-hoc view aggregated by ${aggregation} from ${activeSheet.name}.`
    };
  }, [xAxis, yAxis, aggregation, chartType, aggregatedData, activeSheet.name]);

  // Available filter options for selected filter column
  const filterOptions = useMemo(() => {
    if (!filterCol) return [];
    return Array.from(new Set(activeSheet.rows.map(r => String(r[filterCol] || '')))).sort();
  }, [activeSheet.rows, filterCol]);

  // Overall quick stats for this view
  const totalMetric = aggregatedData.reduce((acc, item) => acc + (Number(item[yAxis]) || 0), 0);
  const avgMetric = totalMetric / (aggregatedData.length || 1);

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5" />
            <span>Ad-Hoc Business Exploration</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
            Explore Data: {dataset.name}
          </h1>
          <p className="text-xs text-slate-400">
            Build custom perspectives without complex formula writing.
          </p>
        </div>
      </div>

      {/* Control Panel / Visual Configurator */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-cyan-400" />
          <span>Visual Configurator</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* X Axis Dimension */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              X Axis (Dimension)
            </label>
            <select
              value={xAxis}
              onChange={e => setXAxis(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-semibold focus:border-cyan-500 focus:outline-none"
            >
              {activeCols.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.detectedType})
                </option>
              ))}
            </select>
          </div>

          {/* Y Axis Metric */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Y Axis (Metric)
            </label>
            <select
              value={yAxis}
              onChange={e => setYAxis(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-semibold focus:border-cyan-500 focus:outline-none"
            >
              {activeCols.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.detectedType})
                </option>
              ))}
            </select>
          </div>

          {/* Aggregation Function */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Aggregation
            </label>
            <select
              value={aggregation}
              onChange={e => setAggregation(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-semibold focus:border-cyan-500 focus:outline-none"
            >
              <option value="sum">Sum (Total)</option>
              <option value="avg">Average (Mean)</option>
              <option value="count">Count of Rows</option>
              <option value="max">Maximum</option>
              <option value="min">Minimum</option>
            </select>
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Chart Type
            </label>
            <select
              value={chartType}
              onChange={e => setChartType(e.target.value as ChartType)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-semibold focus:border-cyan-500 focus:outline-none"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="donut">Donut Chart</option>
              <option value="table">Data Table</option>
            </select>
          </div>

          {/* Optional Filter Dimension */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Filter Dimension
            </label>
            <div className="flex items-center gap-1">
              <select
                value={filterCol}
                onChange={e => {
                  setFilterCol(e.target.value);
                  setFilterVal('ALL');
                }}
                className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-semibold focus:border-cyan-500 focus:outline-none"
              >
                <option value="">None</option>
                {activeCols.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {filterCol ? (
                <select
                  value={filterVal}
                  onChange={e => setFilterVal(e.target.value)}
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-semibold focus:border-cyan-500 focus:outline-none"
                >
                  <option value="ALL">All</option>
                  {filterOptions.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-1/2 text-[10px] text-slate-400 italic p-2">Select dimension</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Aggregated ({aggregation.toUpperCase()})</p>
          <p className="text-xl font-extrabold text-slate-100 font-mono mt-1">
            {formatCompactNumber(totalMetric)}
          </p>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Average per Group</p>
          <p className="text-xl font-extrabold text-cyan-400 font-mono mt-1">
            {formatCompactNumber(avgMetric)}
          </p>
        </div>

        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Grouped Categories</p>
          <p className="text-xl font-extrabold text-indigo-400 font-mono mt-1">
            {aggregatedData.length}
          </p>
        </div>
      </div>

      {/* Resulting Chart Widget */}
      <div>
        <ChartWidget
          chart={customChartConfig}
          data={aggregatedData}
          currencySymbol=""
        />
      </div>
    </div>
  );
};
