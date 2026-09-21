/**
 * Recharts Interactive Visualisation Component
 * Supports Line, Bar, Stacked Bar, Donut, Area, and Data Table
 * Allows chart type switching, filtering on click, and clean tooltips
 */

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  LineChart as LineIcon,
  BarChart3,
  Layers,
  PieChart as PieIcon,
  Table as TableIcon,
  Maximize2,
  Trash2,
  Edit2,
  Check
} from 'lucide-react';
import { ChartConfig, ChartType } from '../types';
import { formatCompactNumber } from '../services/analyticsEngine';

interface ChartWidgetProps {
  chart: ChartConfig;
  data: Record<string, any>[];
  currencySymbol?: string;
  onPointClick?: (key: string, value: any) => void;
  onRemoveChart?: (id: string) => void;
  onUpdateTitle?: (id: string, newTitle: string) => void;
}

const PALETTE = ['#06b6d4', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  chart,
  data,
  currencySymbol = 'TZS',
  onPointClick,
  onRemoveChart,
  onUpdateTitle
}) => {
  const [currentType, setCurrentType] = useState<ChartType>(chart.type);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(chart.title);

  // Determine chart dataset (aggregated or raw)
  const chartData = chart.data || data;

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    if (onUpdateTitle && titleInput.trim()) {
      onUpdateTitle(chart.id, titleInput.trim());
    }
  };

  const handlePointClick = (state: any) => {
    if (!onPointClick) return;
    if (state && state.activePayload && state.activePayload.length > 0) {
      const payload = state.activePayload[0].payload;
      const xVal = payload[chart.xAxisKey];
      if (xVal) {
        onPointClick(chart.xAxisKey, xVal);
      }
    }
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-lg shadow-xl text-xs z-50 min-w-[160px]">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-2 font-mono">
            {label || payload[0]?.name}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => {
              const val = entry.value;
              const formatted = typeof val === 'number' ? formatCompactNumber(val, currencySymbol) : val;
              return (
                <div key={`tooltip-${index}`} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color || entry.fill }}
                    />
                    <span className="text-slate-400 truncate">{entry.name}:</span>
                  </div>
                  <span className="font-mono font-bold text-slate-100">{formatted}</span>
                </div>
              );
            })}
          </div>
          {onPointClick && (
            <p className="text-[10px] text-cyan-400/80 mt-2 pt-1 border-t border-slate-800">
              Click to filter by this value
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id={`chart-container-${chart.id}`}
      className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-xs"
    >
      {/* Header with Title & Action Controls */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                className="bg-slate-800 border border-cyan-500/50 rounded px-2 py-0.5 text-xs text-slate-100 font-semibold focus:outline-none w-full max-w-xs"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 rounded text-cyan-400 hover:bg-slate-800"
                title="Save Title"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 truncate group">
              <h3 className="text-xs font-bold text-slate-200 tracking-wide truncate">
                {chart.title}
              </h3>
              <button
                onClick={() => setIsEditingTitle(true)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-500 hover:text-slate-300 transition-opacity"
                title="Rename Chart"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Chart Type Selector & Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setCurrentType('line')}
              title="Line Chart"
              className={`p-1 rounded text-[11px] transition-colors ${
                currentType === 'line' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <LineIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentType('bar')}
              title="Bar Chart"
              className={`p-1 rounded text-[11px] transition-colors ${
                currentType === 'bar' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentType('area')}
              title="Area Chart"
              className={`p-1 rounded text-[11px] transition-colors ${
                currentType === 'area' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentType('donut')}
              title="Donut Chart"
              className={`p-1 rounded text-[11px] transition-colors ${
                currentType === 'donut' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentType('table')}
              title="Data Table"
              className={`p-1 rounded text-[11px] transition-colors ${
                currentType === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {onRemoveChart && (
            <button
              onClick={() => onRemoveChart(chart.id)}
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors ml-1"
              title="Remove Chart"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Description caption if available */}
      {chart.description && (
        <p className="text-[10px] text-slate-500 mb-2 truncate">{chart.description}</p>
      )}

      {/* Chart Canvas / Table View */}
      <div className="w-full h-64 min-h-[256px]">
        {currentType === 'table' ? (
          <div className="w-full h-full overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="p-2.5 font-semibold">{chart.xAxisKey}</th>
                  {chart.yAxisKeys.map(k => (
                    <th key={k} className="p-2.5 font-semibold text-right">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {chartData.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onPointClick && onPointClick(chart.xAxisKey, row[chart.xAxisKey])}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="p-2.5 text-slate-300">{row[chart.xAxisKey]}</td>
                    {chart.yAxisKeys.map(k => {
                      const val = row[k];
                      return (
                        <td key={k} className="p-2.5 text-right font-medium text-slate-200">
                          {typeof val === 'number' ? formatCompactNumber(val, currencySymbol) : val || '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : currentType === 'donut' ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
              />
              <Pie
                data={chartData}
                dataKey={chart.yAxisKeys[0]}
                nameKey={chart.xAxisKey}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                onClick={handlePointClick}
                cursor="pointer"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : currentType === 'bar' || currentType === 'stacked_bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} onClick={handlePointClick} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey={chart.xAxisKey}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={false}
                tickFormatter={v => formatCompactNumber(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }} />
              {chart.yAxisKeys.map((yKey, index) => {
                const color = chart.seriesColors?.[yKey] || PALETTE[index % PALETTE.length];
                return (
                  <Bar
                    key={yKey}
                    dataKey={yKey}
                    fill={color}
                    stackId={currentType === 'stacked_bar' ? 'stack' : undefined}
                    radius={currentType === 'stacked_bar' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                    cursor="pointer"
                  />
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        ) : currentType === 'area' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} onClick={handlePointClick} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {chart.yAxisKeys.map((yKey, index) => {
                  const color = chart.seriesColors?.[yKey] || PALETTE[index % PALETTE.length];
                  return (
                    <linearGradient key={`grad-${yKey}`} id={`grad-${yKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey={chart.xAxisKey}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={false}
                tickFormatter={v => formatCompactNumber(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }} />
              {chart.yAxisKeys.map((yKey, index) => {
                const color = chart.seriesColors?.[yKey] || PALETTE[index % PALETTE.length];
                return (
                  <Area
                    key={yKey}
                    type="monotone"
                    dataKey={yKey}
                    stroke={color}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={`url(#grad-${yKey})`}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* Default Line Chart */
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} onClick={handlePointClick} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis
                dataKey={chart.xAxisKey}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={{ stroke: '#475569' }}
                tickLine={false}
                tickFormatter={v => formatCompactNumber(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }} />
              {chart.yAxisKeys.map((yKey, index) => {
                const color = chart.seriesColors?.[yKey] || PALETTE[index % PALETTE.length];
                return (
                  <Line
                    key={yKey}
                    type="monotone"
                    dataKey={yKey}
                    stroke={color}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: color }}
                    activeDot={{ r: 6, fill: '#ffffff', stroke: color, strokeWidth: 2 }}
                    cursor="pointer"
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
