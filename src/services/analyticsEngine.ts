/**
 * VIGOR Intelligent Analytics - Core Analytical Engine
 * Dataset-first analytics, automatic comparison pair detection, and executive KPI synthesis
 */

import {
  SheetData,
  ColumnMetadata,
  KPICard,
  ChartConfig,
  AIInsight,
  AnalysisResult,
  FilterState,
  PreComputedStats
} from '../types';
import { detectComparisonPairs, ComparisonPair } from '../data/canonicalMetrics';

export function formatCompactNumber(
  val: number | null | undefined,
  currencySymbol = ''
): string {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  if (val === 0) return currencySymbol ? `${currencySymbol} 0` : '0';

  const isNeg = val < 0;
  const abs = Math.abs(val);

  let formatted = '';
  if (abs >= 1_000_000_000) {
    formatted = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  } else if (abs >= 1_000_000) {
    formatted = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (abs >= 1_000) {
    formatted = (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    formatted = abs.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }

  const sign = isNeg ? '-' : '';
  return currencySymbol ? `${sign}${currencySymbol} ${formatted}` : `${sign}${formatted}`;
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.0%';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
}

/**
 * Filter dataset rows based on active filter state
 */
export function filterRows(
  rows: Record<string, any>[],
  filters: FilterState
): Record<string, any>[] {
  const filterKeys = Object.keys(filters).filter(
    k => filters[k] !== undefined && filters[k] !== null && filters[k] !== 'ALL'
  );

  if (filterKeys.length === 0) return rows;

  return rows.filter(row => {
    for (const key of filterKeys) {
      const filterVal = filters[key];
      const rowVal = row[key];

      if (Array.isArray(filterVal)) {
        if (!filterVal.includes(rowVal)) return false;
      } else if (filterVal !== null && filterVal !== undefined) {
        if (String(rowVal) !== String(filterVal)) return false;
      }
    }
    return true;
  });
}

/**
 * Pre-computes rigorous business statistics
 */
export function computePreStats(
  sheet: SheetData,
  filteredRows: Record<string, any>[]
): PreComputedStats {
  if (!sheet || !sheet.columns) {
    return {
      rowNumbers: 0,
      currencySymbol: 'TZS',
      categoryBreakdowns: {}
    };
  }

  const activeCols = sheet.columns.filter(c => c.include);

  // Match columns by canonical metric or fallback to semantic name matching
  const timeCol = activeCols.find(c => c.canonicalMetric === 'time_period' || c.detectedType === 'date' || c.detectedMeaning === 'Time Period');
  const actProdCol = activeCols.find(c => c.canonicalMetric === 'actual_production');
  const tgtProdCol = activeCols.find(c => c.canonicalMetric === 'target_production');
  const downtimeCol = activeCols.find(c => c.canonicalMetric === 'downtime');
  const roomsAvailCol = activeCols.find(c => c.canonicalMetric === 'rooms_available');
  const roomsSoldCol = activeCols.find(c => c.canonicalMetric === 'rooms_sold');
  const revCol = activeCols.find(c => c.canonicalMetric === 'revenue');
  const costCol = activeCols.find(c => c.canonicalMetric === 'cost');

  const actualCol = activeCols.find(
    c => c.canonicalMetric === 'profit' || c.detectedMeaning === 'Actual Metric' || c.name.toLowerCase().includes('actual')
  ) || revCol || actProdCol || activeCols.find(c => c.detectedType === 'currency' || c.detectedType === 'number');

  const estimatedCol = activeCols.find(
    c => c.canonicalMetric === 'target_profit' || c.canonicalMetric === 'target_revenue' || c.detectedMeaning === 'Estimated Metric' || c.name.toLowerCase().includes('est')
  ) || tgtProdCol;

  const lossCol = activeCols.find(
    c => c.canonicalMetric === 'loss' || c.detectedMeaning === 'Loss' || c.name.toLowerCase().includes('loss')
  );

  const currencySymbol = activeCols.find(c => c.isCurrency && c.currencySymbol)?.currencySymbol || 'TZS';

  const rows = filteredRows;
  const timeKey = timeCol?.name || 'Period';
  const actKey = actualCol?.name;
  const estKey = estimatedCol?.name;
  const lossKey = lossCol?.name;

  let totalActual = 0;
  let totalEstimated = 0;
  let totalLoss = 0;
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProduction = 0;
  let totalTargetProduction = 0;
  let totalDowntime = 0;
  let totalRoomsAvailable = 0;
  let totalRoomsSold = 0;

  let highestActual: { period: string; value: number } | undefined;
  let lowestActual: { period: string; value: number } | undefined;
  let biggestPositiveVariance: { period: string; value: number; percent: number } | undefined;
  let biggestNegativeVariance: { period: string; value: number; percent: number } | undefined;

  const actualSeries: number[] = [];

  rows.forEach((r, idx) => {
    const period = String(r[timeKey] || `Row ${idx + 1}`);

    // Track specialized totals
    if (revCol && typeof r[revCol.name] === 'number') totalRevenue += r[revCol.name];
    if (costCol && typeof r[costCol.name] === 'number') totalCost += r[costCol.name];
    if (actProdCol && typeof r[actProdCol.name] === 'number') totalProduction += r[actProdCol.name];
    if (tgtProdCol && typeof r[tgtProdCol.name] === 'number') totalTargetProduction += r[tgtProdCol.name];
    if (downtimeCol && typeof r[downtimeCol.name] === 'number') totalDowntime += r[downtimeCol.name];
    if (roomsAvailCol && typeof r[roomsAvailCol.name] === 'number') totalRoomsAvailable += r[roomsAvailCol.name];
    if (roomsSoldCol && typeof r[roomsSoldCol.name] === 'number') totalRoomsSold += r[roomsSoldCol.name];

    // Primary Actual metric
    if (actKey && typeof r[actKey] === 'number') {
      const actVal = r[actKey];
      totalActual += actVal;
      actualSeries.push(actVal);

      if (!highestActual || actVal > highestActual.value) {
        highestActual = { period, value: actVal };
      }
      if (!lowestActual || actVal < lowestActual.value) {
        lowestActual = { period, value: actVal };
      }

      // Variance if estimated metric exists
      if (estKey && typeof r[estKey] === 'number') {
        const estVal = r[estKey];
        totalEstimated += estVal;
        const diff = actVal - estVal;
        const pct = estVal !== 0 ? (diff / Math.abs(estVal)) * 100 : (diff > 0 ? 100 : -100);

        if (!biggestPositiveVariance || diff > biggestPositiveVariance.value) {
          biggestPositiveVariance = { period, value: diff, percent: pct };
        }
        if (!biggestNegativeVariance || diff < biggestNegativeVariance.value) {
          biggestNegativeVariance = { period, value: diff, percent: pct };
        }
      }
    } else if (estKey && typeof r[estKey] === 'number') {
      totalEstimated += r[estKey];
    }

    if (lossKey && typeof r[lossKey] === 'number') {
      totalLoss += r[lossKey];
    }
  });

  const totalVariance = estKey && actKey ? totalActual - totalEstimated : undefined;
  const variancePercentage =
    totalEstimated && totalEstimated !== 0 && totalVariance !== undefined
      ? (totalVariance / Math.abs(totalEstimated)) * 100
      : undefined;

  const achievementPercentage =
    totalEstimated && totalEstimated !== 0 && totalActual !== undefined
      ? (totalActual / totalEstimated) * 100
      : undefined;

  const occupancyRate =
    totalRoomsAvailable > 0 ? (totalRoomsSold / totalRoomsAvailable) * 100 : undefined;

  // Linear trend slope calculation
  let trendSlope = 0;
  let trendDirection: 'improving' | 'declining' | 'stable' = 'stable';

  if (actualSeries.length >= 3) {
    const n = actualSeries.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += actualSeries[i];
      sumXY += i * actualSeries[i];
      sumXX += i * i;
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom !== 0) {
      trendSlope = (n * sumXY - sumX * sumY) / denom;
      const normalizedSlope = trendSlope / (Math.abs(sumY / n) || 1);
      if (normalizedSlope > 0.02) trendDirection = 'improving';
      else if (normalizedSlope < -0.02) trendDirection = 'declining';
      else trendDirection = 'stable';
    }
  }

  // Category breakdown aggregation
  const categoryCols = activeCols.filter(c => c.detectedType === 'category');
  const categoryBreakdowns: Record<string, Record<string, number>> = {};

  categoryCols.forEach(catCol => {
    const map: Record<string, number> = {};
    rows.forEach(r => {
      const catVal = String(r[catCol.name] || 'Unassigned');
      const val = actKey && typeof r[actKey] === 'number' ? r[actKey] : 1;
      map[catVal] = (map[catVal] || 0) + val;
    });
    categoryBreakdowns[catCol.name] = map;
  });

  return {
    rowNumbers: rows.length,
    timeColumn: timeKey,
    actualColumn: actKey,
    estimatedColumn: estKey,
    lossColumn: lossKey,
    productionTargetCol: tgtProdCol?.name,
    productionActualCol: actProdCol?.name,
    downtimeCol: downtimeCol?.name,
    roomsAvailableCol: roomsAvailCol?.name,
    roomsSoldCol: roomsSoldCol?.name,
    totalActual,
    totalEstimated,
    totalVariance,
    variancePercentage,
    achievementPercentage,
    totalLoss,
    totalRevenue: totalRevenue > 0 ? totalRevenue : undefined,
    totalCost: totalCost > 0 ? totalCost : undefined,
    totalProduction: totalProduction > 0 ? totalProduction : undefined,
    totalTargetProduction: totalTargetProduction > 0 ? totalTargetProduction : undefined,
    totalDowntime: totalDowntime > 0 ? totalDowntime : undefined,
    occupancyRate,
    highestActual,
    lowestActual,
    biggestPositiveVariance,
    biggestNegativeVariance,
    trendDirection,
    trendSlope,
    categoryBreakdowns,
    currencySymbol
  };
}

/**
 * Generate 4-6 focused, meaningful KPI cards strictly adhering to:
 * "Dataset first. Sector context second. Template third. Never invent missing values."
 */
export function generateKPICards(
  stats: PreComputedStats,
  sheet: SheetData,
  pairs: ComparisonPair[] = []
): KPICard[] {
  const kpis: KPICard[] = [];
  const symbol = stats.currencySymbol || 'TZS';
  const activeCols = sheet.columns.filter(c => c.include);

  // 1. Check if Manufacturing Production columns exist
  if (stats.totalProduction !== undefined && stats.productionActualCol) {
    kpis.push({
      id: 'kpi-actual-prod',
      title: 'Actual Output',
      value: stats.totalProduction,
      formattedValue: `${formatCompactNumber(stats.totalProduction)} Tonnes`,
      subtitle: `${stats.rowNumbers} periods reported`,
      status: 'neutral',
      type: 'primary'
    });

    if (stats.totalTargetProduction !== undefined && stats.productionTargetCol) {
      kpis.push({
        id: 'kpi-target-prod',
        title: 'Production Plan Target',
        value: stats.totalTargetProduction,
        formattedValue: `${formatCompactNumber(stats.totalTargetProduction)} Tonnes`,
        subtitle: 'Target Budget',
        status: 'neutral'
      });

      const prodVariance = stats.totalProduction - stats.totalTargetProduction;
      const achPct = (stats.totalProduction / stats.totalTargetProduction) * 100;
      const isPositive = prodVariance >= 0;

      kpis.push({
        id: 'kpi-prod-achieve',
        title: 'Target Achievement',
        value: achPct,
        formattedValue: `${achPct.toFixed(1)}%`,
        subtitle: `${formatCompactNumber(Math.abs(prodVariance))} tonnes ${isPositive ? 'ahead' : 'deficit'}`,
        change: achPct - 100,
        trend: isPositive ? 'up' : 'down',
        status: isPositive ? 'positive' : 'negative',
        type: 'highlight'
      });
    }

    if (stats.totalDowntime !== undefined && stats.downtimeCol) {
      kpis.push({
        id: 'kpi-downtime',
        title: 'Total Stoppage / Downtime',
        value: stats.totalDowntime,
        formattedValue: `${stats.totalDowntime} Hours`,
        subtitle: stats.totalDowntime > 50 ? 'Coincided with output slowdown' : 'Normal operating limits',
        status: stats.totalDowntime > 50 ? 'negative' : 'positive'
      });
    }

    if (stats.totalRevenue) {
      kpis.push({
        id: 'kpi-revenue',
        title: 'Sales Revenue',
        value: stats.totalRevenue,
        formattedValue: formatCompactNumber(stats.totalRevenue, symbol),
        subtitle: 'Realized Gross Revenue',
        status: 'neutral'
      });
    }

    if (stats.totalCost) {
      kpis.push({
        id: 'kpi-cost',
        title: 'Operating Cost',
        value: stats.totalCost,
        formattedValue: formatCompactNumber(stats.totalCost, symbol),
        subtitle: 'Direct Production OPEX',
        status: 'neutral'
      });
    }

    return kpis.slice(0, 6);
  }

  // 2. Check if Hospitality columns exist (Rooms Available & Sold)
  if (stats.occupancyRate !== undefined && stats.roomsSoldCol && stats.roomsAvailableCol) {
    const actRoomsCol = sheet.columns.find(c => c.name === stats.roomsSoldCol);
    const totSold = sheet.rows.reduce((acc, r) => acc + (typeof r[stats.roomsSoldCol!] === 'number' ? r[stats.roomsSoldCol!] : 0), 0);
    const totAvail = sheet.rows.reduce((acc, r) => acc + (typeof r[stats.roomsAvailableCol!] === 'number' ? r[stats.roomsAvailableCol!] : 0), 0);

    kpis.push({
      id: 'kpi-occupancy',
      title: 'Average Occupancy Rate',
      value: stats.occupancyRate,
      formattedValue: `${stats.occupancyRate.toFixed(1)}%`,
      subtitle: `${formatCompactNumber(totSold)} of ${formatCompactNumber(totAvail)} room nights`,
      status: stats.occupancyRate >= 75 ? 'positive' : 'neutral',
      type: 'primary'
    });

    kpis.push({
      id: 'kpi-rooms-sold',
      title: 'Room Nights Sold',
      value: totSold,
      formattedValue: formatCompactNumber(totSold),
      subtitle: 'Occupied Capacity',
      status: 'neutral'
    });

    if (stats.totalRevenue) {
      kpis.push({
        id: 'kpi-hosp-rev',
        title: 'Combined Hotel Revenue',
        value: stats.totalRevenue,
        formattedValue: formatCompactNumber(stats.totalRevenue, symbol),
        subtitle: 'Rooms, Suites & F&B',
        status: 'neutral'
      });
    }

    if (stats.totalCost) {
      kpis.push({
        id: 'kpi-hosp-exp',
        title: 'Hotel Operating Expenses',
        value: stats.totalCost,
        formattedValue: formatCompactNumber(stats.totalCost, symbol),
        subtitle: 'Property & Staff Costs',
        status: 'neutral'
      });
    }

    // Operating margin if both revenue & cost present
    if (stats.totalRevenue && stats.totalCost) {
      const margin = stats.totalRevenue - stats.totalCost;
      const marginPct = (margin / stats.totalRevenue) * 100;
      kpis.push({
        id: 'kpi-hosp-margin',
        title: 'Hotel Operating Margin',
        value: margin,
        formattedValue: formatCompactNumber(margin, symbol),
        subtitle: `${marginPct.toFixed(1)}% Gross Margin`,
        status: margin > 0 ? 'positive' : 'negative',
        type: 'highlight'
      });
    }

    return kpis.slice(0, 6);
  }

  // 3. Check for Transportation metrics (Passengers, Trips, Fuel)
  const paxCol = activeCols.find(c => c.canonicalMetric === 'passengers');
  const tripCol = activeCols.find(c => c.canonicalMetric === 'trips');
  const capCol = activeCols.find(c => c.canonicalMetric === 'capacity');
  const fuelCol = activeCols.find(c => c.canonicalMetric === 'fuel_cost' || c.name.toLowerCase().includes('fuel'));

  if (paxCol) {
    const totPax = sheet.rows.reduce((acc, r) => acc + (typeof r[paxCol.name] === 'number' ? r[paxCol.name] : 0), 0);
    kpis.push({
      id: 'kpi-pax',
      title: 'Total Passenger Volume',
      value: totPax,
      formattedValue: `${formatCompactNumber(totPax)} Pax`,
      subtitle: 'Fleet validated journeys',
      status: 'neutral',
      type: 'primary'
    });

    if (capCol) {
      const totCap = sheet.rows.reduce((acc, r) => acc + (typeof r[capCol.name] === 'number' ? r[capCol.name] : 0), 0);
      if (totCap > 0) {
        const utilPct = (totPax / totCap) * 100;
        kpis.push({
          id: 'kpi-capacity-util',
          title: 'Capacity Utilisation',
          value: utilPct,
          formattedValue: `${utilPct.toFixed(1)}%`,
          subtitle: `Across ${formatCompactNumber(totCap)} scheduled seats`,
          status: utilPct >= 80 ? 'positive' : 'neutral',
          type: 'highlight'
        });
      }
    }

    if (tripCol) {
      const totTrips = sheet.rows.reduce((acc, r) => acc + (typeof r[tripCol.name] === 'number' ? r[tripCol.name] : 0), 0);
      kpis.push({
        id: 'kpi-trips',
        title: 'Scheduled Sailings Completed',
        value: totTrips,
        formattedValue: `${totTrips} Trips`,
        subtitle: 'Fleet departures',
        status: 'neutral'
      });
    }

    if (stats.totalRevenue) {
      kpis.push({
        id: 'kpi-ferry-rev',
        title: 'Passenger Ticket Revenue',
        value: stats.totalRevenue,
        formattedValue: formatCompactNumber(stats.totalRevenue, symbol),
        subtitle: 'Commercial ticket bookings',
        status: 'neutral'
      });
    }

    if (fuelCol) {
      const totFuel = sheet.rows.reduce((acc, r) => acc + (typeof r[fuelCol.name] === 'number' ? r[fuelCol.name] : 0), 0);
      kpis.push({
        id: 'kpi-fuel',
        title: 'Marine Bunker Fuel Cost',
        value: totFuel,
        formattedValue: formatCompactNumber(totFuel, symbol),
        subtitle: 'Primary voyage OPEX',
        status: 'neutral'
      });
    }

    return kpis.slice(0, 6);
  }

  // 4. Check for Healthcare metrics (Patients, Admissions, Waiting Time)
  const patientCol = activeCols.find(c => c.canonicalMetric === 'patients');
  const admitCol = activeCols.find(c => c.canonicalMetric === 'admissions');
  const waitCol = activeCols.find(c => c.canonicalMetric === 'waiting_time');

  if (patientCol) {
    const totPatients = sheet.rows.reduce((acc, r) => acc + (typeof r[patientCol.name] === 'number' ? r[patientCol.name] : 0), 0);
    kpis.push({
      id: 'kpi-patients',
      title: 'Total Patients Served',
      value: totPatients,
      formattedValue: `${formatCompactNumber(totPatients)} Patients`,
      subtitle: `${stats.rowNumbers} periods tracked`,
      status: 'neutral',
      type: 'primary'
    });

    if (admitCol) {
      const totAdmit = sheet.rows.reduce((acc, r) => acc + (typeof r[admitCol.name] === 'number' ? r[admitCol.name] : 0), 0);
      kpis.push({
        id: 'kpi-admissions',
        title: 'Inpatient Admissions',
        value: totAdmit,
        formattedValue: `${formatCompactNumber(totAdmit)} Admitted`,
        subtitle: 'Hospital ward admissions',
        status: 'neutral'
      });
    }

    if (waitCol) {
      const avgWait = sheet.rows.reduce((acc, r) => acc + (typeof r[waitCol.name] === 'number' ? r[waitCol.name] : 0), 0) / (sheet.rows.length || 1);
      kpis.push({
        id: 'kpi-wait',
        title: 'Average Patient Wait Time',
        value: avgWait,
        formattedValue: `${avgWait.toFixed(0)} Mins`,
        subtitle: avgWait > 30 ? 'High registration queue' : 'Optimal patient flow',
        status: avgWait > 30 ? 'negative' : 'positive'
      });
    }

    if (stats.totalRevenue) {
      kpis.push({
        id: 'kpi-health-rev',
        title: 'Hospital Clinical Revenue',
        value: stats.totalRevenue,
        formattedValue: formatCompactNumber(stats.totalRevenue, symbol),
        subtitle: 'Inpatient & Pharmacy billing',
        status: 'neutral'
      });
    }

    if (stats.totalCost) {
      kpis.push({
        id: 'kpi-health-cost',
        title: 'Clinical Operating OPEX',
        value: stats.totalCost,
        formattedValue: formatCompactNumber(stats.totalCost, symbol),
        subtitle: 'Staff & Medical consumables',
        status: 'neutral'
      });
    }

    return kpis.slice(0, 6);
  }

  // 5. Standard Financial & P&L fallback
  if (stats.actualColumn && stats.totalActual !== undefined) {
    const actCol = sheet.columns.find(c => c.name === stats.actualColumn);
    kpis.push({
      id: 'kpi-actual',
      title: actCol?.name || 'Actual Metric',
      value: stats.totalActual,
      formattedValue: formatCompactNumber(stats.totalActual, actCol?.isCurrency ? symbol : ''),
      subtitle: `${stats.rowNumbers} periods tracked`,
      status: 'neutral',
      type: 'primary'
    });
  }

  if (stats.estimatedColumn && stats.totalEstimated !== undefined) {
    const estCol = sheet.columns.find(c => c.name === stats.estimatedColumn);
    kpis.push({
      id: 'kpi-estimated',
      title: estCol?.name || 'Target / Budget',
      value: stats.totalEstimated,
      formattedValue: formatCompactNumber(stats.totalEstimated, estCol?.isCurrency ? symbol : ''),
      subtitle: 'Target Benchmark',
      status: 'neutral'
    });
  }

  if (stats.totalVariance !== undefined && stats.variancePercentage !== undefined) {
    const isPositive = stats.totalVariance >= 0;
    kpis.push({
      id: 'kpi-variance',
      title: 'Net Variance',
      value: stats.totalVariance,
      formattedValue: formatCompactNumber(stats.totalVariance, symbol),
      subtitle: `${formatPercent(stats.variancePercentage)} vs Target`,
      change: stats.variancePercentage,
      varianceRaw: stats.totalVariance,
      trend: isPositive ? 'up' : 'down',
      status: isPositive ? 'positive' : 'negative',
      type: 'highlight',
      tooltip: isPositive ? 'Exceeded target projections' : 'Fell short of target projections'
    });
  }

  if (stats.totalLoss && stats.totalLoss > 0) {
    kpis.push({
      id: 'kpi-loss',
      title: 'Recorded Loss',
      value: stats.totalLoss,
      formattedValue: formatCompactNumber(stats.totalLoss, symbol),
      subtitle: 'Requires operational review',
      status: 'negative'
    });
  }

  if (stats.highestActual) {
    kpis.push({
      id: 'kpi-highest',
      title: 'Peak Period',
      value: stats.highestActual.value,
      formattedValue: formatCompactNumber(stats.highestActual.value, symbol),
      subtitle: `Recorded in ${stats.highestActual.period}`,
      status: 'positive',
      trend: 'up'
    });
  }

  return kpis.slice(0, 6);
}

/**
 * Automatically select and configure appropriate visualizations based strictly on available data
 */
export function generateRecommendedCharts(
  sheet: SheetData,
  filteredRows: Record<string, any>[],
  stats: PreComputedStats,
  pairs: ComparisonPair[] = []
): ChartConfig[] {
  const charts: ChartConfig[] = [];
  const activeCols = sheet.columns.filter(c => c.include);
  const timeCol = activeCols.find(c => c.canonicalMetric === 'time_period' || c.detectedType === 'date' || c.detectedMeaning === 'Time Period');
  const numericCols = activeCols.filter(c => c.detectedType === 'number' || c.detectedType === 'currency');
  const categoryCols = activeCols.filter(c => c.detectedType === 'category');

  const xKey = timeCol?.name || categoryCols[0]?.name || activeCols[0]?.name || 'Index';

  // 1. Primary Comparison Line / Bar Chart (if a paired target vs actual exists)
  if (pairs.length > 0 && timeCol) {
    const pair = pairs[0];
    charts.push({
      id: 'chart-paired-comparison',
      title: `${pair.label} Over Time`,
      type: 'line',
      xAxisKey: timeCol.name,
      yAxisKeys: [pair.comparisonKey, pair.primaryKey],
      seriesColors: {
        [pair.comparisonKey]: '#94a3b8', // Gray for target
        [pair.primaryKey]: '#0284c7' // Blue for actual
      },
      description: `Period-by-period progression comparing ${pair.label}.`
    });
  } else if (timeCol && numericCols.length > 0) {
    const targetYKeys: string[] = [];
    if (stats.actualColumn) targetYKeys.push(stats.actualColumn);
    if (stats.estimatedColumn) targetYKeys.push(stats.estimatedColumn);

    numericCols.forEach(col => {
      if (!targetYKeys.includes(col.name) && targetYKeys.length < 3) {
        targetYKeys.push(col.name);
      }
    });

    charts.push({
      id: 'chart-trend-line',
      title: targetYKeys.length > 1 ? `${targetYKeys[0]} vs ${targetYKeys[1]} Trend` : `${targetYKeys[0]} Progression`,
      type: 'line',
      xAxisKey: timeCol.name,
      yAxisKeys: targetYKeys,
      seriesColors: {
        [targetYKeys[0]]: '#0284c7',
        [targetYKeys[1]]: '#6366f1',
        [targetYKeys[2] || '']: '#10b981'
      },
      description: 'Timeline progression tracking changes across consecutive reporting periods.'
    });
  }

  // 2. Specialized Downtime / Loss / Expenses Bar Chart
  const downtimeCol = activeCols.find(c => c.canonicalMetric === 'downtime');
  if (downtimeCol && timeCol) {
    charts.push({
      id: 'chart-downtime-bar',
      title: `${downtimeCol.name} by ${timeCol.name}`,
      type: 'bar',
      xAxisKey: timeCol.name,
      yAxisKeys: [downtimeCol.name],
      seriesColors: { [downtimeCol.name]: '#f97316' },
      description: 'Monthly plant stoppage hours affecting operational output.'
    });
  }

  // 3. Category Comparison Bar Chart
  if (categoryCols.length > 0 && numericCols.length > 0) {
    const catCol = categoryCols[0];
    const metricCol = stats.actualColumn ? stats.actualColumn : numericCols[0].name;

    const catAgg: Record<string, any> = {};
    filteredRows.forEach(r => {
      const key = String(r[catCol.name] || 'Unknown');
      if (!catAgg[key]) {
        catAgg[key] = { [catCol.name]: key };
        numericCols.slice(0, 2).forEach(numCol => {
          catAgg[key][numCol.name] = 0;
        });
      }
      numericCols.slice(0, 2).forEach(numCol => {
        const val = typeof r[numCol.name] === 'number' ? r[numCol.name] : 0;
        catAgg[key][numCol.name] += val;
      });
    });

    const barData = Object.values(catAgg);

    charts.push({
      id: 'chart-category-bar',
      title: `Contribution by ${catCol.name}`,
      type: 'bar',
      xAxisKey: catCol.name,
      yAxisKeys: [metricCol],
      seriesColors: { [metricCol]: '#2563eb' },
      data: barData,
      description: `Comparative volume distribution across ${catCol.name} classifications.`
    });

    // Donut Chart if distinct values <= 6
    if (barData.length <= 6 && barData.length > 1) {
      charts.push({
        id: 'chart-category-donut',
        title: `${catCol.name} Proportion`,
        type: 'donut',
        xAxisKey: catCol.name,
        yAxisKeys: [metricCol],
        data: barData,
        description: `Percentage share distribution among ${catCol.name} segments.`
      });
    }
  }

  // 4. Stacked Component Structure (e.g. Revenue vs Cost)
  if (numericCols.length >= 2 && charts.length < 4) {
    const metric1 = numericCols[0].name;
    const metric2 = numericCols[1].name;
    charts.push({
      id: 'chart-stacked-breakdown',
      title: `${metric1} & ${metric2} Allocation`,
      type: 'stacked_bar',
      xAxisKey: xKey,
      yAxisKeys: [metric1, metric2],
      seriesColors: {
        [metric1]: '#0284c7',
        [metric2]: '#eab308'
      },
      description: 'Side-by-side component structure showing relative weights.'
    });
  }

  return charts;
}

/**
 * Generate grounded written business observations & insights
 * Uses correlation phrasing ("coincided with") rather than unverified causality
 */
export function generateWrittenInsights(
  stats: PreComputedStats,
  sheet: SheetData,
  datasetMeta?: { sectorName?: string; companyName?: string }
): { executiveSummary: string; insights: AIInsight[] } {
  const symbol = stats.currencySymbol || 'TZS';
  const insights: AIInsight[] = [];
  const prefix = datasetMeta?.companyName ? `${datasetMeta.companyName}: ` : '';

  // Executive summary paragraph
  let summary = '';
  if (stats.totalProduction !== undefined && stats.totalTargetProduction !== undefined) {
    const achPct = (stats.totalProduction / stats.totalTargetProduction) * 100;
    summary = `${prefix}Cumulative plant production reached ${formatCompactNumber(stats.totalProduction)} tonnes against a plan of ${formatCompactNumber(stats.totalTargetProduction)} tonnes (${achPct.toFixed(1)}% target achievement). `;
    if (stats.totalDowntime && stats.totalDowntime > 0) {
      summary += `Plant recorded ${stats.totalDowntime} hours of cumulative stoppage. Downtime spikes coincided with production dips. `;
    }
  } else if (stats.totalActual !== undefined && stats.totalEstimated !== undefined && stats.totalVariance !== undefined) {
    const actStr = formatCompactNumber(stats.totalActual, symbol);
    const estStr = formatCompactNumber(stats.totalEstimated, symbol);
    const varStr = formatCompactNumber(Math.abs(stats.totalVariance), symbol);
    const directionWord = stats.totalVariance >= 0 ? 'a positive variance' : 'a negative variance';

    summary = `${prefix}Performance reached ${actStr} compared with estimated targets of ${estStr}, resulting in ${directionWord} of ${varStr} (${formatPercent(stats.variancePercentage)}). `;

    if (stats.biggestNegativeVariance) {
      summary += `${stats.biggestNegativeVariance.period} experienced the largest negative variance (${formatCompactNumber(stats.biggestNegativeVariance.value, symbol)}). `;
    }
  } else if (stats.totalActual !== undefined) {
    summary = `${prefix}Total aggregate volume across ${stats.rowNumbers} reporting records reached ${formatCompactNumber(stats.totalActual, symbol)}. Benchmark peak period was ${stats.highestActual?.period} at ${formatCompactNumber(stats.highestActual?.value, symbol)}.`;
  } else {
    summary = `Dataset contains ${stats.rowNumbers} records across ${sheet.columns.length} columns ready for exploration.`;
  }

  // Insight 1: Target Variance
  if (stats.totalVariance !== undefined && stats.variancePercentage !== undefined) {
    const isUnder = stats.totalVariance < 0;
    insights.push({
      id: 'ins-var',
      type: 'variance',
      title: isUnder ? 'Budget Variance Warning' : 'Target Outperformance',
      content: isUnder
        ? `Actual figures lagged target forecasts by ${formatCompactNumber(Math.abs(stats.totalVariance), symbol)} (${formatPercent(stats.variancePercentage)}). Executive operational adjustments are recommended.`
        : `Operations exceeded target forecasts by ${formatCompactNumber(stats.totalVariance, symbol)} (${formatPercent(stats.variancePercentage)}), demonstrating sound delivery discipline.`,
      importance: isUnder ? 'high' : 'medium',
      metricHighlight: formatPercent(stats.variancePercentage)
    });
  }

  // Insight 2: Peak Period Performance
  if (stats.highestActual) {
    insights.push({
      id: 'ins-peak',
      type: 'executive',
      title: 'Peak Operational Period',
      content: `${stats.highestActual.period} delivered the highest recorded actual result of ${formatCompactNumber(stats.highestActual.value, symbol)}, setting the operational benchmark for the cycle.`,
      importance: 'medium',
      metricHighlight: stats.highestActual.period
    });
  }

  // Insight 3: Downtime or Loss
  if (stats.totalDowntime && stats.totalDowntime > 30) {
    insights.push({
      id: 'ins-downtime',
      type: 'anomaly',
      title: 'Elevated Machine Downtime',
      content: `Total downtime of ${stats.totalDowntime} hours coincided with lower monthly output. Maintenance schedule auditing is recommended.`,
      importance: 'high',
      metricHighlight: `${stats.totalDowntime} Hours`
    });
  } else if (stats.totalLoss && stats.totalLoss > 0) {
    insights.push({
      id: 'ins-loss',
      type: 'anomaly',
      title: 'Loss Concentration Detected',
      content: `A cumulative loss of ${formatCompactNumber(stats.totalLoss, symbol)} was recorded during the period. Executive review of cost overruns is advised.`,
      importance: 'high',
      metricHighlight: formatCompactNumber(stats.totalLoss, symbol)
    });
  }

  // Insight 4: Trend Direction
  if (stats.trendDirection) {
    insights.push({
      id: 'ins-trend',
      type: 'trend',
      title: stats.trendDirection === 'improving' ? 'Positive Momentum' : stats.trendDirection === 'declining' ? 'Decelerating Trajectory' : 'Stable Cadence',
      content: stats.trendDirection === 'improving'
        ? 'Sequential regression indicates an improving trend over recent periods with steady month-over-month expansion.'
        : stats.trendDirection === 'declining'
        ? 'Sequential regression shows downward pressure across recent cycles. Operational review is recommended.'
        : 'Performance maintains a balanced distribution across the observed timeline.',
      importance: 'info'
    });
  }

  return { executiveSummary: summary, insights };
}

/**
 * Execute full analytical pipeline on a sheet with context
 */
export function analyzeSheet(
  sheet: SheetData,
  filters: FilterState = {},
  datasetMeta?: { sectorId?: string; sectorName?: string; companyId?: string; companyName?: string }
): AnalysisResult {
  if (!sheet || !sheet.columns) {
    return {
      datasetId: '',
      sheetName: sheet?.name || 'No Data',
      kpis: [],
      charts: [],
      insights: [],
      executiveSummary: 'No worksheet data available.',
      statistics: { rowNumbers: 0, categoryBreakdowns: {} },
      appliedFilters: filters,
      detectedPairs: []
    };
  }

  const filteredRows = filterRows(sheet.rows || [], filters);
  const stats = computePreStats(sheet, filteredRows);

  // Detect comparison pairs
  const columnPairsInput = sheet.columns
    .filter(c => c.canonicalMetric && c.canonicalMetric !== 'unmapped')
    .map(c => ({ name: c.name, canonical: c.canonicalMetric! }));
  const detectedPairs = detectComparisonPairs(columnPairsInput);

  const kpis = generateKPICards(stats, sheet, detectedPairs);
  const charts = generateRecommendedCharts(sheet, filteredRows, stats, detectedPairs);
  const { executiveSummary, insights } = generateWrittenInsights(stats, sheet, datasetMeta);

  return {
    datasetId: '',
    sheetName: sheet.name,
    kpis,
    charts,
    insights,
    executiveSummary,
    statistics: stats,
    appliedFilters: filters,
    detectedPairs
  };
}
