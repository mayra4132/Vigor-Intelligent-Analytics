/**
 * VIGOR Group Intelligence - Group & Sector Aggregation Engine
 * Normalizes metrics across varied business models and flags executive exceptions
 */

import { Dataset, GroupOverviewMetrics, SectorSummary, AttentionItem, KPICard } from '../types';
import { VIGOR_SECTORS, ALL_VIGOR_COMPANIES } from '../data/groupStructure';
import { formatCompactNumber, formatPercent } from './analyticsEngine';

export function computeGroupOverview(allDatasets: Dataset[]): GroupOverviewMetrics {
  const reportingPeriod = 'August 2026';
  const totalCompanies = ALL_VIGOR_COMPANIES.length;

  // Map of dataset per company
  const companyDatasetMap = new Map<string, Dataset>();
  allDatasets.forEach(ds => {
    if (ds.company_id) {
      companyDatasetMap.set(ds.company_id, ds);
    }
  });

  const companiesReporting = companyDatasetMap.size;

  let totalGroupRevenue = 0;
  let totalGroupExpenses = 0;
  let totalGroupProfit = 0;
  let totalGroupTarget = 0;

  const sectorRevenueMap: Record<string, number> = {};
  const sectorVarianceMap: Record<string, { name: string; variance: number }> = {};
  const attentionItems: AttentionItem[] = [];

  const sectorSummaries: SectorSummary[] = VIGOR_SECTORS.map(sec => {
    const secCompanies = sec.companies;
    let secRevenue = 0;
    let secExpenses = 0;
    let secProfit = 0;
    let secTarget = 0;
    let reportingCount = 0;

    secCompanies.forEach(comp => {
      const ds = companyDatasetMap.get(comp.id);
      if (ds && ds.sheets.length > 0) {
        reportingCount++;
        const sheet = ds.sheets[0];
        const rows = sheet.rows;

        // Find relevant columns
        const revCol = sheet.columns.find(c => c.canonicalMetric === 'revenue' || c.name.toLowerCase().includes('revenue'));
        const expCol = sheet.columns.find(c => c.canonicalMetric === 'cost' || c.name.toLowerCase().includes('cost') || c.name.toLowerCase().includes('expense'));
        const profCol = sheet.columns.find(c => c.canonicalMetric === 'profit' || c.name.toLowerCase().includes('profit'));
        const tgtProfCol = sheet.columns.find(c => c.canonicalMetric === 'target_profit' || c.name.toLowerCase().includes('estimated profit'));
        const tgtProdCol = sheet.columns.find(c => c.canonicalMetric === 'target_production');
        const actProdCol = sheet.columns.find(c => c.canonicalMetric === 'actual_production');
        const downtimeCol = sheet.columns.find(c => c.canonicalMetric === 'downtime');

        let compRev = 0;
        let compExp = 0;
        let compProf = 0;
        let compTgt = 0;

        rows.forEach(r => {
          if (revCol && typeof r[revCol.name] === 'number') compRev += r[revCol.name];
          if (expCol && typeof r[expCol.name] === 'number') compExp += r[expCol.name];
          if (profCol && typeof r[profCol.name] === 'number') compProf += r[profCol.name];
          if (tgtProfCol && typeof r[tgtProfCol.name] === 'number') compTgt += r[tgtProfCol.name];
        });

        // If profit column wasn't explicit, derive from revenue - expenses
        if (!profCol && compRev > 0 && compExp > 0) {
          compProf = compRev - compExp;
        }

        secRevenue += compRev;
        secExpenses += compExp;
        secProfit += compProf;
        secTarget += compTgt;

        // Check for company-level attention items
        // 1. Target vs Actual Production deficit in Manufacturing
        if (tgtProdCol && actProdCol) {
          let totTgtProd = 0;
          let totActProd = 0;
          rows.forEach(r => {
            if (typeof r[tgtProdCol.name] === 'number') totTgtProd += r[tgtProdCol.name];
            if (typeof r[actProdCol.name] === 'number') totActProd += r[actProdCol.name];
          });
          if (totTgtProd > 0) {
            const achPct = (totActProd / totTgtProd) * 100;
            if (achPct < 92) {
              attentionItems.push({
                id: `att-${comp.id}-prod`,
                severity: 'warning',
                title: `${comp.name}: Production Under Target`,
                description: `Actual production reached ${formatCompactNumber(totActProd)} tonnes (${achPct.toFixed(1)}% of planned target of ${formatCompactNumber(totTgtProd)} tonnes). Machine downtime coincided with lower output.`,
                sectorId: sec.id,
                sectorName: sec.name,
                companyId: comp.id,
                companyName: comp.name,
                datasetId: ds.id,
                variancePct: achPct - 100
              });
            }
          }
        }

        // 2. High Downtime
        if (downtimeCol) {
          let totalDowntime = 0;
          rows.forEach(r => {
            if (typeof r[downtimeCol.name] === 'number') totalDowntime += r[downtimeCol.name];
          });
          if (totalDowntime > 100) {
            attentionItems.push({
              id: `att-${comp.id}-down`,
              severity: 'info',
              title: `${comp.name}: Elevated Stoppage Hours`,
              description: `Recorded cumulative plant downtime of ${totalDowntime} hours across the active operating schedule.`,
              sectorId: sec.id,
              sectorName: sec.name,
              companyId: comp.id,
              companyName: comp.name,
              datasetId: ds.id
            });
          }
        }

        // 3. Negative profit variance
        if (compTgt > 0 && compProf < compTgt) {
          const varPct = ((compProf - compTgt) / compTgt) * 100;
          if (varPct < -10) {
            attentionItems.push({
              id: `att-${comp.id}-prof`,
              severity: 'critical',
              title: `${comp.name}: Profit Margin Variance Alert`,
              description: `Actual profit lagged projected target by ${Math.abs(varPct).toFixed(1)}% (${formatCompactNumber(compTgt - compProf, 'TZS')} shortfall).`,
              sectorId: sec.id,
              sectorName: sec.name,
              companyId: comp.id,
              companyName: comp.name,
              datasetId: ds.id,
              variancePct: varPct
            });
          }
        }
      } else {
        // Missing report attention item
        if (comp.reportingStatus === 'outdated') {
          attentionItems.push({
            id: `att-${comp.id}-outdated`,
            severity: 'warning',
            title: `${comp.name}: Data Submission Overdue`,
            description: `Last submission was for ${comp.lastReportingPeriod || 'prior quarter'}. Current August 2026 data file has not been provided.`,
            sectorId: sec.id,
            sectorName: sec.name,
            companyId: comp.id,
            companyName: comp.name
          });
        }
      }
    });

    totalGroupRevenue += secRevenue;
    totalGroupExpenses += secExpenses;
    totalGroupProfit += secProfit;
    totalGroupTarget += secTarget;

    sectorRevenueMap[sec.name] = secRevenue;
    const secVariance = secTarget > 0 ? secProfit - secTarget : 0;
    sectorVarianceMap[sec.name] = { name: sec.name, variance: secVariance };

    const status: 'complete' | 'partial' | 'none' =
      reportingCount === secCompanies.length
        ? 'complete'
        : reportingCount > 0
        ? 'partial'
        : 'none';

    return {
      sectorId: sec.id,
      sectorName: sec.name,
      companiesCount: secCompanies.length,
      companiesReportingCount: reportingCount,
      reportingStatus: status,
      totalRevenue: secRevenue,
      totalExpenses: secExpenses,
      totalProfit: secProfit,
      targetAchievementPct: secTarget > 0 ? (secProfit / secTarget) * 100 : undefined,
      variance: secVariance
    };
  });

  // Sector with highest revenue
  let highestRevenueSector: { name: string; value: number } | undefined;
  for (const [name, val] of Object.entries(sectorRevenueMap)) {
    if (val > 0 && (!highestRevenueSector || val > highestRevenueSector.value)) {
      highestRevenueSector = { name, value: val };
    }
  }

  // Sector with largest negative variance
  let worstVarianceSector: { name: string; value: number } | undefined;
  for (const item of Object.values(sectorVarianceMap)) {
    if (item.variance < 0 && (!worstVarianceSector || item.variance < worstVarianceSector.value)) {
      worstVarianceSector = { name: item.name, value: item.variance };
    }
  }

  const overallVariance = totalGroupTarget > 0 ? totalGroupProfit - totalGroupTarget : 0;
  const variancePct = totalGroupTarget > 0 ? (overallVariance / totalGroupTarget) * 100 : 0;

  const reportingCoverageText = `Based on ${companiesReporting} of ${totalCompanies} VIGOR Group companies reporting for ${reportingPeriod}.`;

  return {
    companiesReporting,
    totalCompanies,
    totalGroupRevenue,
    totalGroupExpenses,
    totalGroupProfit,
    overallVariance,
    variancePct,
    sectorWithHighestRevenue: highestRevenueSector,
    sectorWithLargestNegativeVariance: worstVarianceSector,
    attentionItems,
    sectorSummaries,
    reportingCoverageText,
    reportingPeriod
  };
}
