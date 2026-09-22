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
  // Management Workbook fields
  isManagementWorkbook?: boolean;
  workbookReport?: NormalizedWorkbook;
  // Dedicated Consolidated Sheet data for MVP
  isConsolidatedWorkbook?: boolean;
  consolidatedData?: ConsolidatedPerformanceData;
  // Multi-Sheet Navigation & Workbook Explorer
  parsedWorkbook?: ParsedWorkbook;
  activeSheetName?: string;
}

export type SheetRole =
  | 'group'
  | 'sector'
  | 'company'
  | 'sector_summary'
  | 'group_consolidated'
  | 'helper'
  | 'chart'
  | 'unknown';

export interface ParsedSheet {
  sheetName: string;
  displayName: string;
  role: SheetRole;
  sectorId?: string;
  sectorName?: string;
  companyId?: string;
  companyName?: string;
  companyCode?: string;
  reportingPeriod?: string;
  isAnalysable: boolean;
  performanceData?: ConsolidatedPerformanceData;
  rawPreview?: (string | number | null)[][];
  cellCount?: number;
  rowCount?: number;
  colCount?: number;
  dataQualityIssues?: string[];
  hasFormulas?: boolean;
  hasErrors?: boolean;
}

export interface ParsedWorkbook {
  filename: string;
  fileSize: number;
  reportingPeriod: string;
  totalSheets: number;
  sheets: ParsedSheet[];
  groupSheets: ParsedSheet[];
  sectorSheets: ParsedSheet[];
  companySheets: ParsedSheet[];
  helperSheets: ParsedSheet[];
  chartSheets: ParsedSheet[];
  unknownSheets: ParsedSheet[];
}

export interface SheetClassification {
  sheetName: string;
  role: SheetRole;
  companyId?: string;
  companyName?: string;
  sectorId?: string;
  sectorName?: string;
  isAggregate: boolean;
  aggregationLevel: 'company' | 'sector' | 'group' | 'none';
  includeInGroupRollup: boolean;
  isHidden?: boolean;
  isDuplicate?: boolean;
  duplicateOf?: string;
  confidence: 'high' | 'medium' | 'low';
  cellCount?: number;
  sectionsCount?: number;
  metricsCount?: number;
}

export interface AnalysisSection {
  name: string;
  type: 'operational' | 'financial' | 'other';
  headerRow: number;
  startRow: number;
  endRow: number;
  metrics: NormalizedMetric[];
}

export interface NormalizedMetric {
  id: string;
  companyId: string | null;
  companyName: string;
  sectorId: string | null;
  section: 'operational' | 'financial' | 'other';
  metricName: string;
  unit: string | null;
  periodType: 'monthly' | 'current_period' | 'ytd';
  period: string | null;
  actual: number | null;
  plan: number | null;
  variance: number | null;
  achievementPct: number | null;
  priorYear: number | null;
  growthPct: number | null;
  // YTD fields
  ytdActual?: number | null;
  ytdPlan?: number | null;
  ytdVariance?: number | null;
  ytdAchievementPct?: number | null;
  ytdPriorYear?: number | null;
  ytdGrowthPct?: number | null;
  monthlyValues?: Record<string, number | null>; // e.g. { 'Jan': 120, 'Feb': 140, ... }
  monthlyPlanValues?: Record<string, number | null>; // e.g. { 'Jan': 110, 'Feb': 130, ... } if monthly budget exists
  ytdMonthlyValues?: Record<string, number | null>;
  sourceSheet: string;
  sourceCell?: string;
  isMTZS?: boolean;
  hasFormulaError?: boolean;
}

export interface ConsolidatedPerformanceData {
  filename: string;
  sheetName: string;
  reportingPeriod: string; // e.g. "August 2026"
  reportingMonth: string; // e.g. "August"
  reportingMonthNum: number; // 8 for August
  availableMonths: string[]; // e.g. ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
  hasOperationalSection: boolean;
  hasFinancialSection: boolean;
  financialMetrics: NormalizedMetric[];
  operationalMetrics: NormalizedMetric[];
  currentMonthKPIs: {
    revenue?: NormalizedMetric;
    grossProfit?: NormalizedMetric;
    grossProfitPct?: NormalizedMetric;
    opex?: NormalizedMetric;
    ebitda?: NormalizedMetric;
    netProfit?: NormalizedMetric;
    netProfitPct?: NormalizedMetric;
    debtors?: NormalizedMetric;
    collection?: NormalizedMetric;
  };
  insights: {
    type: 'positive' | 'warning' | 'neutral';
    text: string;
  }[];
  dataQualityIssues: string[];
}

export interface NormalizedCompanyReport {
  companyId: string;
  companyName: string;
  companyCode: string;
  sectorId: string;
  sectorName: string;
  sheetName: string;
  reportingPeriod: string;
  sections: AnalysisSection[];
  operationalMetrics: NormalizedMetric[];
  financialMetrics: NormalizedMetric[];
  monthlyTrendMetrics: NormalizedMetric[];
  headlineKPIs: {
    revenue?: { actual: number | null; plan: number | null; achievementPct: number | null; variance: number | null; priorYear: number | null; growthPct: number | null };
    grossProfit?: { actual: number | null; plan: number | null; achievementPct: number | null; variance: number | null };
    grossProfitPct?: number | null;
    opex?: { actual: number | null; plan: number | null; achievementPct: number | null };
    ebitda?: { actual: number | null; plan: number | null; achievementPct: number | null };
    netProfit?: { actual: number | null; plan: number | null; achievementPct: number | null; variance: number | null };
    netProfitPct?: number | null;
    debtors?: number | null;
    collection?: number | null;
    occupancyOrVolume?: { label: string; value: number | null; unit: string | null };
  };
  dataQualityIssues: string[];
}

export interface NormalizedWorkbook {
  filename: string;
  fileSize: number;
  reportingPeriod: string;
  lastReportedMonth: string; // e.g. "August"
  totalSheets: number;
  operatingCompanyCount: number;
  sectorSummaryCount: number;
  consolidatedCount: number;
  helperOrChartCount: number;
  sheetClassifications: SheetClassification[];
  companies: Record<string, NormalizedCompanyReport>; // key: companyId
  sectorReports: Record<string, NormalizedCompanyReport>; // key: sectorId
  consolidatedReport?: NormalizedCompanyReport;
  groupSummary: {
    totalRevenue: number;
    totalPlanRevenue: number;
    revenueAchievementPct: number;
    totalGrossProfit: number;
    totalOpex: number;
    totalEbitda: number;
    totalNetProfit: number;
    totalNetProfitPlan: number;
    netProfitAchievementPct: number;
    totalDebtors: number;
    companiesReporting: number;
    companiesMissingPlan: string[];
    companiesNegativeProfit: string[];
    topRevenueCompany?: { name: string; value: number };
    topProfitCompany?: { name: string; value: number };
    highestDebtorsCompany?: { name: string; value: number };
  };
  dataQualityWarnings: string[];
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
  | 'workbook'
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

export interface SavedReport {
  id: string;
  workbook_id: string;
  workbook_name?: string;
  sheet_id?: string;
  scope: string;
  report_type: string;
  title: string;
  reporting_period?: string;
  generated_by?: string;
  created_at: string;
  snapshot_json?: any;
}

export interface AIConversationMessage {
  id: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  calculations?: { label: string; value: string | number }[];
  chart?: ChartConfig;
  source_context?: string;
  created_at: string;
}

export interface SaveStatus {
  state: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
  lastSavedAt?: string;
}
