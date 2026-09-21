/**
 * VIGOR Group Intelligence - Core Type Definitions
 * "One Group. Multiple Businesses. One Intelligence Platform."
 */

import { CanonicalMetricId } from './data/canonicalMetrics';

export type ColumnType =
  | 'date'
  | 'currency'
  | 'number'
  | 'percentage'
  | 'category'
  | 'text'
  | 'identifier';

export type ColumnMeaning =
  | 'Time Period'
  | 'Estimated Metric'
  | 'Actual Metric'
  | 'Revenue'
  | 'Profit'
  | 'Loss'
  | 'Cost / Expense'
  | 'Production Target'
  | 'Production Output'
  | 'Downtime'
  | 'Waste / Defects'
  | 'Rooms Available'
  | 'Rooms Sold'
  | 'Guests'
  | 'Patients'
  | 'Admissions'
  | 'Units Total'
  | 'Units Sold'
  | 'Passengers'
  | 'Trips'
  | 'Quantity / Volume'
  | 'Target / Budget'
  | 'Variance'
  | 'Category / Dimension'
  | 'Department / Branch'
  | 'Identifier / ID'
  | 'General Text';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ColumnMetadata {
  name: string;
  originalName: string;
  detectedType: ColumnType;
  detectedMeaning: string;
  canonicalMetric?: CanonicalMetricId;
  confidence?: ConfidenceLevel;
  confidenceReason?: string;
  include: boolean;
  sampleValues: any[];
  nullCount: number;
  distinctCount: number;
  isCurrency?: boolean;
  currencySymbol?: string;
}

export interface SheetData {
  name: string;
  columns: ColumnMetadata[];
  rows: Record<string, any>[];
  totalRows: number;
  totalColumns: number;
  missingValueCount: number;
  duplicateRowCount: number;
}

export type ReportingStatus = 'current' | 'outdated' | 'no_data' | 'processing' | 'error';

export interface Dataset {
  id: string;
  name: string;
  filename: string;
  original_file_name?: string;
  fileSize: number;
  uploadedAt: string;
  uploaded_by?: string;
  lastOpenedAt: string;
  sheets: SheetData[];
  selectedSheet: string;
  sheetName?: string;
  sheetNames?: string[];
  headers?: string[];
  rows?: Record<string, any>[];
  rowCount?: number;
  columnCount?: number;
  detectedTypes?: Record<string, string>;
  isSample?: boolean;
  sector?: string;
  sector_id?: string;
  sectorName?: string;
  company?: string;
  company_id?: string;
  companyName?: string;
  reportingPeriod?: string;
  reporting_period?: string;
  row_count?: number;
  column_count?: number;
  status?: ReportingStatus;
}

export interface KPICard {
  id: string;
  title: string;
  value: number | string;
  formattedValue: string;
  subtitle?: string;
  change?: number; // percentage variance
  varianceRaw?: number;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'positive' | 'negative' | 'neutral';
  tooltip?: string;
  type?: 'primary' | 'secondary' | 'highlight';
}

export type ChartType = 'line' | 'bar' | 'stacked_bar' | 'donut' | 'area' | 'table';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xAxisKey: string;
  yAxisKeys: string[];
  seriesLabels?: Record<string, string>;
  seriesColors?: Record<string, string>;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  description?: string;
  data?: any[];
}

export interface AIInsight {
  id: string;
  type: 'executive' | 'variance' | 'trend' | 'anomaly' | 'recommendation';
  title: string;
  content: string;
  importance: 'high' | 'medium' | 'info';
  metricHighlight?: string;
}

export interface AskAIResult {
  question: string;
  answer: string;
  calculations: { label: string; value: string | number }[];
  chart?: ChartConfig;
  filterSuggestion?: Record<string, any>;
  sourceContext?: string;
  scope?: string;
  dataCoverageText?: string;
}

export interface FilterState {
  [columnName: string]: string | number | string[] | null | undefined;
}

export interface PreComputedStats {
  rowNumbers: number;
  timeColumn?: string;
  actualColumn?: string;
  estimatedColumn?: string;
  lossColumn?: string;
  productionTargetCol?: string;
  productionActualCol?: string;
  downtimeCol?: string;
  roomsAvailableCol?: string;
  roomsSoldCol?: string;
  totalActual?: number;
  totalEstimated?: number;
  totalVariance?: number;
  variancePercentage?: number;
  achievementPercentage?: number;
  totalLoss?: number;
  totalRevenue?: number;
  totalCost?: number;
  totalProduction?: number;
  totalTargetProduction?: number;
  totalDowntime?: number;
  occupancyRate?: number;
  highestActual?: { period: string; value: number };
  lowestActual?: { period: string; value: number };
  biggestPositiveVariance?: { period: string; value: number; percent: number };
  biggestNegativeVariance?: { period: string; value: number; percent: number };
  trendDirection?: 'improving' | 'declining' | 'stable';
  trendSlope?: number;
  categoryBreakdowns?: Record<string, Record<string, number>>;
  currencySymbol?: string;
  detectedSector?: string;
}

export interface AnalysisResult {
  datasetId: string;
  sheetName: string;
  kpis: KPICard[];
  charts: ChartConfig[];
  insights: AIInsight[];
  executiveSummary: string;
  statistics: PreComputedStats;
  appliedFilters: FilterState;
  detectedPairs?: any[];
}

// Group Overview & Executive Intelligence Types
export interface AttentionItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  sectorId?: string;
  sectorName?: string;
  companyId?: string;
  companyName?: string;
  datasetId?: string;
  metric?: string;
  variancePct?: number;
}

export interface SectorSummary {
  sectorId: string;
  sectorName: string;
  companiesCount: number;
  companiesReportingCount: number;
  reportingStatus: 'complete' | 'partial' | 'none';
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  targetAchievementPct?: number;
  variance: number;
}

export interface GroupOverviewMetrics {
  companiesReporting: number;
  totalCompanies: number;
  totalGroupRevenue: number;
  totalGroupExpenses: number;
  totalGroupProfit: number;
  overallVariance: number;
  variancePct: number;
  sectorWithHighestRevenue?: { name: string; value: number };
  sectorWithLargestNegativeVariance?: { name: string; value: number };
  attentionItems: AttentionItem[];
  sectorSummaries: SectorSummary[];
  reportingCoverageText: string;
  reportingPeriod: string;
}

export type AskAIScope = 'group' | 'sector' | 'company';

export type AppView =
  | 'overview'
  | 'group_overview'
  | 'sector_overview'
  | 'dashboard'
  | 'home'
  | 'understanding'
  | 'explore'
  | 'ask'
  | 'datasets'
  | 'report'
  | 'settings';
