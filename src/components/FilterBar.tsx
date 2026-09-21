/**
 * Compact Interactive Filter Bar for Business Analytics
 * Automatically discovers filterable dimensions (Categories, Branches, Periods)
 */

import React from 'react';
import { Filter, X, RotateCcw, Calendar, Building, Tag } from 'lucide-react';
import { ColumnMetadata, FilterState } from '../types';

interface FilterBarProps {
  columns: ColumnMetadata[];
  rows: Record<string, any>[];
  activeFilters: FilterState;
  onFilterChange: (colName: string, value: any) => void;
  onResetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  columns,
  rows,
  activeFilters,
  onFilterChange,
  onResetFilters
}) => {
  // Find categorical or date columns with <= 30 distinct values
  const filterableCols = columns.filter(c => {
    if (!c.include) return false;
    return (
      c.detectedType === 'category' ||
      c.detectedMeaning === 'Department / Branch' ||
      c.name.toLowerCase().includes('dept') ||
      c.name.toLowerCase().includes('branch') ||
      c.name.toLowerCase().includes('month') ||
      c.name.toLowerCase().includes('status') ||
      c.name.toLowerCase().includes('year')
    );
  }).slice(0, 4); // Limit to 4 compact selectors for clean header density

  const activeKeys = Object.keys(activeFilters).filter(
    k => activeFilters[k] !== undefined && activeFilters[k] !== null && activeFilters[k] !== 'ALL'
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs mb-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold uppercase tracking-wider text-[10px] mr-1">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Filters</span>
        </div>

        {filterableCols.map(col => {
          // Extract unique sorted options from actual rows
          const uniqueVals = Array.from(
            new Set(rows.map(r => r[col.name]).filter(v => v !== null && v !== undefined && v !== ''))
          ).sort();

          const selectedVal = activeFilters[col.name] || 'ALL';

          return (
            <div key={col.name} className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
              <span className="text-[11px] text-slate-400 font-medium mr-2 whitespace-nowrap">
                {col.name}:
              </span>
              <select
                value={selectedVal}
                onChange={e => onFilterChange(col.name, e.target.value === 'ALL' ? undefined : e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">
                  All {col.name}s
                </option>
                {uniqueVals.map(val => (
                  <option key={String(val)} value={String(val)} className="bg-slate-900 text-slate-200">
                    {String(val)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        {activeKeys.length > 0 && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] font-semibold"
            title="Reset all active filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ({activeKeys.length})</span>
          </button>
        )}
      </div>

      {/* Filter status indicator */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
        <span>Showing {rows.length} rows</span>
      </div>
    </div>
  );
};
