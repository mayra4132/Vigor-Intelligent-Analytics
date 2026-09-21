/**
 * Executive KPI Card Component
 * Formatted with readable business metrics, variance badges, and corporate light styling
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { KPICard } from '../types';

interface KPICardViewProps {
  kpi: KPICard;
}

export const KPICardView: React.FC<KPICardViewProps> = ({ kpi }) => {
  const isPositive = kpi.status === 'positive';
  const isNegative = kpi.status === 'negative';

  const badgeBg = isPositive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : isNegative
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-slate-100 text-slate-600 border-slate-200';

  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      id={kpi.id}
      className={`relative p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between bg-white shadow-2xs ${
        kpi.type === 'primary'
          ? 'border-indigo-500/40 ring-1 ring-indigo-500/10'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate" title={kpi.title}>
          {kpi.title}
        </h4>
        {kpi.tooltip && (
          <span title={kpi.tooltip} className="text-slate-400 hover:text-slate-600 cursor-help">
            <Info className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 my-1">
        <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
          {kpi.formattedValue}
        </div>

        {kpi.change !== undefined && (
          <div
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}
          >
            <TrendIcon className="w-3 h-3" />
            <span>
              {kpi.change > 0 ? `+${kpi.change.toFixed(1)}%` : `${kpi.change.toFixed(1)}%`}
            </span>
          </div>
        )}
      </div>

      {kpi.subtitle && (
        <div className="text-[11px] font-medium text-slate-500 truncate mt-1">
          {kpi.subtitle}
        </div>
      )}
    </div>
  );
};
