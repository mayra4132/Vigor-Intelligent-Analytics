/**
 * VIGOR Sector Overview - Division-Level Intelligence
 * Intermediate executive view between Group Overview and individual Company Dashboards
 */

import React from 'react';
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { Dataset } from '../types';
import { VIGOR_SECTORS, SECTOR_BY_ID, CompanyConfig } from '../data/groupStructure';
import { formatCompactNumber } from '../services/analyticsEngine';

interface SectorOverviewPageProps {
  sectorId: string;
  datasets: Dataset[];
  onBackToGroup: () => void;
  onSelectCompany: (companyId: string, datasetId?: string) => void;
  onNavigateToUpload: () => void;
  onAskAI: (initialQuestion?: string) => void;
}

export const SectorOverviewPage: React.FC<SectorOverviewPageProps> = ({
  sectorId,
  datasets,
  onBackToGroup,
  onSelectCompany,
  onNavigateToUpload,
  onAskAI
}) => {
  const sector = SECTOR_BY_ID[sectorId] || VIGOR_SECTORS[0];
  const companies = sector.companies;

  // Filter datasets belonging to this sector
  const sectorDatasets = datasets.filter(d => d.sector_id === sectorId);

  // Compute aggregated sector metrics
  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalProfit = 0;
  let reportingCount = 0;

  const companyStats: {
    company: CompanyConfig;
    dataset?: Dataset;
    revenue?: number;
    expenses?: number;
    profit?: number;
    customMetric?: string;
  }[] = companies.map(comp => {
    const ds = sectorDatasets.find(d => d.company_id === comp.id);
    if (!ds || ds.sheets.length === 0) {
      return { company: comp };
    }

    reportingCount++;
    const sheet = ds.sheets[0];
    const revCol = sheet.columns.find(c => c.canonicalMetric === 'revenue' || c.name.toLowerCase().includes('revenue'));
    const expCol = sheet.columns.find(c => c.canonicalMetric === 'cost' || c.name.toLowerCase().includes('cost') || c.name.toLowerCase().includes('expense'));
    const profCol = sheet.columns.find(c => c.canonicalMetric === 'profit' || c.name.toLowerCase().includes('profit'));
    const prodCol = sheet.columns.find(c => c.canonicalMetric === 'actual_production');

    let compRev = 0;
    let compExp = 0;
    let compProf = 0;
    let compProd = 0;

    sheet.rows.forEach(r => {
      if (revCol && typeof r[revCol.name] === 'number') compRev += r[revCol.name];
      if (expCol && typeof r[expCol.name] === 'number') compExp += r[expCol.name];
      if (profCol && typeof r[profCol.name] === 'number') compProf += r[profCol.name];
      if (prodCol && typeof r[prodCol.name] === 'number') compProd += r[prodCol.name];
    });

    if (!profCol && compRev > 0 && compExp > 0) {
      compProf = compRev - compExp;
    }

    totalRevenue += compRev;
    totalExpenses += compExp;
    totalProfit += compProf;

    let customMetric: string | undefined;
    if (compProd > 0) {
      customMetric = `${formatCompactNumber(compProd)} Tonnes Output`;
    }

    return {
      company: comp,
      dataset: ds,
      revenue: compRev > 0 ? compRev : undefined,
      expenses: compExp > 0 ? compExp : undefined,
      profit: compProf !== 0 ? compProf : undefined,
      customMetric
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToGroup}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Group Overview
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-semibold text-slate-900">{sector.name} Division</span>
      </div>

      {/* Sector Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white">
              {sector.code}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {companies.length} Subsidiaries
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {sector.name} Sector Intelligence
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {sector.description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onAskAI(`What is the operational performance of companies in the ${sector.name} sector?`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Sector AI Analysis
          </button>
          <button
            onClick={onNavigateToUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Upload {sector.name} Data
          </button>
        </div>
      </div>

      {/* Aggregated Sector KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Sector Coverage
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {reportingCount} of {companies.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Companies submitted
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Aggregated Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {totalRevenue > 0 ? formatCompactNumber(totalRevenue, 'TZS') : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Combined sector turnover
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Operating Profit</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {totalProfit !== 0 ? formatCompactNumber(totalProfit, 'TZS') : '—'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% operating margin` : 'Net earnings'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Core Sector Metrics
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {sector.primaryMetrics.slice(0, 3).map((m, i) => (
              <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                {m}
              </span>
            ))}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Sector-specific benchmarks
          </div>
        </div>
      </div>

      {/* Companies in Sector Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {sector.name} Operating Companies
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any company to drill into its detailed production, revenue, and KPI dashboard
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companyStats.map(({ company, dataset, revenue, profit, customMetric }) => {
            const hasData = !!dataset;
            return (
              <div
                key={company.id}
                onClick={() => onSelectCompany(company.id, dataset?.id)}
                className="border border-slate-200 hover:border-slate-300 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer bg-white group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                        {company.name}
                        <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {company.description}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0 ${
                        hasData
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : company.reportingStatus === 'outdated'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {hasData ? 'Active Data' : company.reportingStatus === 'outdated' ? 'Overdue' : 'No Data'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-4 pt-3 border-t border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500">Revenue</div>
                      <div className="text-sm font-semibold text-slate-900">
                        {revenue ? formatCompactNumber(revenue, company.defaultCurrency) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Profit / Margin</div>
                      <div className="text-sm font-semibold text-slate-900">
                        {profit ? formatCompactNumber(profit, company.defaultCurrency) : '—'}
                      </div>
                    </div>
                  </div>

                  {customMetric && (
                    <div className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 inline-block font-medium">
                      {customMetric}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Location: {company.location}</span>
                  <span className="text-indigo-600 font-medium group-hover:underline">
                    {hasData ? 'Open Dashboard →' : 'Upload Data →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
