/**
 * Executive AI Insights Panel
 * Clear written business observations, variance explanations, and quick queries
 */

import React from 'react';
import { Sparkles, AlertTriangle, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { AIInsight } from '../types';

interface AIInsightsPanelProps {
  summary: string;
  insights: AIInsight[];
  onAskQuestion?: (q: string) => void;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  summary,
  insights,
  onAskQuestion
}) => {
  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-4 shadow-xs relative overflow-hidden">
      {/* Subtle top indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-transparent"></div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            AI Executive Insights & Analysis
          </h3>
        </div>

        <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
          Auto-Generated from verified metrics
        </span>
      </div>

      {/* Main Executive Summary Paragraph */}
      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 mb-3 text-xs leading-relaxed text-slate-200">
        <p className="font-medium">{summary}</p>
      </div>

      {/* 3-5 Specific Observation Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {insights.map(item => {
          const isWarning = item.type === 'variance' || item.type === 'anomaly';
          const isTrend = item.type === 'trend';

          const Icon = isWarning ? AlertTriangle : isTrend ? TrendingUp : CheckCircle2;
          const iconColor = isWarning ? 'text-amber-400' : isTrend ? 'text-cyan-400' : 'text-emerald-400';
          const borderColor = isWarning ? 'border-amber-500/20' : 'border-slate-800';

          return (
            <div
              key={item.id}
              className={`p-2.5 rounded-lg bg-slate-950/40 border ${borderColor} flex items-start gap-2.5 hover:bg-slate-950/70 transition-colors`}
            >
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h5 className="text-[11px] font-bold text-slate-200 truncate">{item.title}</h5>
                  {item.metricHighlight && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-900 text-cyan-300 border border-slate-800 shrink-0">
                      {item.metricHighlight}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">{item.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Prompts to Ask AI */}
      {onAskQuestion && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Questions:
          </span>
          <button
            onClick={() => onAskQuestion('What was our worst month and what caused the deficit?')}
            className="text-[11px] px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-700/50 transition-colors flex items-center gap-1"
          >
            <span>Worst Month Analysis</span>
            <ArrowRight className="w-3 h-3 text-cyan-400" />
          </button>
          <button
            onClick={() => onAskQuestion('Compare estimated versus actual profit performance.')}
            className="text-[11px] px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-700/50 transition-colors flex items-center gap-1"
          >
            <span>Budget vs Actual Variance</span>
            <ArrowRight className="w-3 h-3 text-cyan-400" />
          </button>
          <button
            onClick={() => onAskQuestion('Show the loss trend and affected branches.')}
            className="text-[11px] px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 border border-slate-700/50 transition-colors flex items-center gap-1"
          >
            <span>Loss Concentration</span>
            <ArrowRight className="w-3 h-3 text-cyan-400" />
          </button>
        </div>
      )}
    </div>
  );
};
