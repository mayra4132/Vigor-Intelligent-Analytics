/**
 * Reusable Analytics Chart Component for VIGOR Intelligent Analytics
 * Supports Line, Bar, and Area chart types for time-series and operational trends.
 * Handles compact large-number formatting, tooltips, responsive height, and empty states.
 */

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { AlertCircle, ArrowUpRight } from 'lucide-react';

export type AnalyticsChartType = 'line' | 'bar' | 'area';

export interface ChartSeries {
  key: string;
  name?: string;
  color?: string;
  fill?: string;
  strokeDasharray?: string;
}

export interface AnalyticsChartProps {
  type: AnalyticsChartType;
  data: Record<string, any>[];
  xKey: string;
  series: ChartSeries[];
  unit?: string | null;
  metricName?: string;
  height?: number;
  emptyMessage?: string;
  onSelectAlternativeMetric?: () => void;
  alternativeMetricLabel?: string;
  referenceLine?: {
    y: number;
    label?: string;
    stroke?: string;
    strokeDasharray?: string;
  };
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  type = 'line',
  data,
  xKey = 'month',
  series,
  unit,
  metricName,
  height = 320,
  emptyMessage = 'No monthly trend data is available for this metric.',
  onSelectAlternativeMetric,
  alternativeMetricLabel = 'View Revenue Trend',
  referenceLine
}) => {
  // Check if data is genuinely empty or has no numeric points
  const hasData = React.useMemo(() => {
    if (!data || data.length === 0) return false;
    return data.some(row => {
      return series.some(s => {
        const val = row[s.key];
        return val !== null && val !== undefined && typeof val === 'number' && !isNaN(val);
      });
    });
  }, [data, series]);

  // Format tick labels for Y-Axis
  const formatYAxisTick = (val: any) => {
    if (val === null || val === undefined) return '';
    const num = Number(val);
    if (isNaN(num)) return String(val);

    if (unit && unit.trim() === '%') {
      return `${num.toFixed(0)}%`;
    }

    const abs = Math.abs(num);
    if (abs >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(1)}B`;
    }
    if (abs >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(0)}M`;
    }
    if (abs >= 1_000) {
      return `${(num / 1_000).toFixed(0)}k`;
    }
    return `${num}`;
  };

  // Format single numeric value
  const formatNum = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return '—';
    if (unit && unit.trim() === '%') {
      return `${num.toFixed(1)}%`;
    }
    const isCurrency = !unit || unit.toUpperCase() === 'MTZS' || unit.toUpperCase() === 'TZS';
    if (isCurrency) {
      const abs = Math.abs(num);
      if (abs >= 1_000_000_000) {
        return `TZS ${(num / 1_000_000_000).toFixed(2)}B`;
      }
      if (abs >= 1_000_000) {
        return `TZS ${(num / 1_000_000).toFixed(1)}M`;
      }
      return `TZS ${num.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
    }
    return `${num.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit || ''}`;
  };

  // Custom Comparison Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const rowData = payload[0]?.payload || {};
    // Check if both actual and plan exist in rowData or payload
    const actualVal = rowData.actual ?? rowData.Actual ?? payload.find((p: any) => p.dataKey === 'actual' || p.dataKey === 'Actual')?.value;
    const planVal = rowData.plan ?? rowData.Plan ?? payload.find((p: any) => p.dataKey === 'plan' || p.dataKey === 'Plan')?.value;

    const hasBoth =
      actualVal !== undefined &&
      actualVal !== null &&
      !isNaN(actualVal) &&
      planVal !== undefined &&
      planVal !== null &&
      !isNaN(planVal);

    const variance = hasBoth ? Number(actualVal) - Number(planVal) : null;
    const achievementPct = hasBoth && Number(planVal) !== 0 ? (Number(actualVal) / Number(planVal)) * 100 : null;

    return (
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs text-slate-100 min-w-[190px]">
        <p className="font-semibold text-slate-300 border-b border-slate-800 pb-1.5 mb-2">
          {label} {metricName ? `· ${metricName}` : ''}
        </p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            const seriesConfig = series.find(s => s.key === entry.dataKey);
            const name = seriesConfig?.name || entry.name || entry.dataKey;
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: entry.color || entry.stroke || entry.fill || '#4f46e5' }}
                  />
                  <span>{name}:</span>
                </span>
                <span className="font-semibold text-slate-100">{formatNum(entry.value)}</span>
              </div>
            );
          })}
        </div>

        {hasBoth && (
          <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span>Variance:</span>
              <span className={`font-semibold ${variance !== null && variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {variance !== null && variance > 0 ? '+' : ''}{formatNum(variance)}
              </span>
            </div>
            {achievementPct !== null && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Achievement:</span>
                <span className={`font-semibold ${achievementPct >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {achievementPct.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!hasData) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center p-8 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center"
        style={{ minHeight: `${height}px`, height: `${height}px` }}
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <AlertCircle className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-slate-700">{emptyMessage}</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          The uploaded workbook does not contain monthly reporting values for {metricName ? `"${metricName}"` : 'this metric'}.
        </p>
        {onSelectAlternativeMetric && (
          <button
            onClick={onSelectAlternativeMetric}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>{alternativeMetricLabel}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full" style={{ minHeight: `${height}px`, height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 12, right: 24, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={formatYAxisTick}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            {series.length > 1 && <Legend verticalAlign="top" height={32} />}
            {referenceLine && (
              <ReferenceLine
                y={referenceLine.y}
                stroke={referenceLine.stroke || '#94a3b8'}
                strokeDasharray={referenceLine.strokeDasharray || '4 4'}
                label={{ value: referenceLine.label, fill: '#64748b', fontSize: 11, position: 'top' }}
              />
            )}
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name || s.key}
                fill={s.color || '#4f46e5'}
                radius={[4, 4, 0, 0]}
                maxBarSize={38}
              />
            ))}
          </BarChart>
        ) : type === 'area' ? (
          <AreaChart data={data} margin={{ top: 12, right: 24, left: 10, bottom: 20 }}>
            <defs>
              {series.map((s, idx) => {
                const color = s.color || '#4f46e5';
                const gradId = `grad-area-${s.key.replace(/\s+/g, '')}-${idx}`;
                return (
                  <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={formatYAxisTick}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            {series.length > 1 && <Legend verticalAlign="top" height={32} />}
            {referenceLine && (
              <ReferenceLine
                y={referenceLine.y}
                stroke={referenceLine.stroke || '#94a3b8'}
                strokeDasharray={referenceLine.strokeDasharray || '4 4'}
                label={{ value: referenceLine.label, fill: '#64748b', fontSize: 11, position: 'top' }}
              />
            )}
            {series.map((s, idx) => {
              const color = s.color || '#4f46e5';
              const gradId = `grad-area-${s.key.replace(/\s+/g, '')}-${idx}`;
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name || s.key}
                  stroke={color}
                  strokeWidth={2.5}
                  strokeDasharray={s.strokeDasharray}
                  fill={`url(#${gradId})`}
                  dot={{ r: 3, stroke: color, strokeWidth: 1.5, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              );
            })}
          </AreaChart>
        ) : (
          /* Default: Line Chart */
          <LineChart data={data} margin={{ top: 12, right: 24, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={xKey} stroke="#64748b" fontSize={12} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={formatYAxisTick}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            {series.length > 1 && <Legend verticalAlign="top" height={32} />}
            {referenceLine && (
              <ReferenceLine
                y={referenceLine.y}
                stroke={referenceLine.stroke || '#94a3b8'}
                strokeDasharray={referenceLine.strokeDasharray || '4 4'}
                label={{ value: referenceLine.label, fill: '#64748b', fontSize: 11, position: 'top' }}
              />
            )}
            {series.map((s) => {
              const color = s.color || '#4f46e5';
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name || s.key}
                  stroke={color}
                  strokeWidth={2.5}
                  strokeDasharray={s.strokeDasharray}
                  dot={{ r: 4, stroke: color, strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              );
            })}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
