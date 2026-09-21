/**
 * Realistic Multi-Sector DEMO Datasets for VIGOR Group Intelligence
 * Clearly labeled as Sample / Demo Data
 */

import { Dataset, ColumnMetadata } from '../types';

// ==========================================
// 1. MANUFACTURING DEMO (Vigor Cement Works)
// ==========================================
export const SAMPLE_MANUFACTURING_ROWS = [
  { Month: 'January', 'Target Production': 85000, 'Actual Production': 82500, Revenue: 14850000000, 'Production Cost': 10500000000, Downtime: 18, 'Machine Hours': 680 },
  { Month: 'February', 'Target Production': 85000, 'Actual Production': 86200, Revenue: 15516000000, 'Production Cost': 10800000000, Downtime: 12, 'Machine Hours': 690 },
  { Month: 'March', 'Target Production': 90000, 'Actual Production': 78400, Revenue: 14112000000, 'Production Cost': 11200000000, Downtime: 42, 'Machine Hours': 635 },
  { Month: 'April', 'Target Production': 90000, 'Actual Production': 89100, Revenue: 16038000000, 'Production Cost': 10950000000, Downtime: 16, 'Machine Hours': 685 },
  { Month: 'May', 'Target Production': 95000, 'Actual Production': 94500, Revenue: 17010000000, 'Production Cost': 11400000000, Downtime: 14, 'Machine Hours': 700 },
  { Month: 'June', 'Target Production': 95000, 'Actual Production': 96800, Revenue: 17424000000, 'Production Cost': 11600000000, Downtime: 10, 'Machine Hours': 710 },
  { Month: 'July', 'Target Production': 100000, 'Actual Production': 98200, Revenue: 17676000000, 'Production Cost': 11900000000, Downtime: 15, 'Machine Hours': 705 },
  { Month: 'August', 'Target Production': 100000, 'Actual Production': 91600, Revenue: 16488000000, 'Production Cost': 11750000000, Downtime: 36, 'Machine Hours': 650 }
];

export const SAMPLE_MANUFACTURING_COLUMNS: ColumnMetadata[] = [
  { name: 'Month', originalName: 'Month', detectedType: 'date', detectedMeaning: 'Time Period', canonicalMetric: 'time_period', confidence: 'high', include: true, sampleValues: ['January', 'February'], nullCount: 0, distinctCount: 8 },
  { name: 'Target Production', originalName: 'Target Production', detectedType: 'number', detectedMeaning: 'Production Target', canonicalMetric: 'target_production', confidence: 'high', include: true, sampleValues: [85000, 90000], nullCount: 0, distinctCount: 4 },
  { name: 'Actual Production', originalName: 'Actual Production', detectedType: 'number', detectedMeaning: 'Production Output', canonicalMetric: 'actual_production', confidence: 'high', include: true, sampleValues: [82500, 86200], nullCount: 0, distinctCount: 8 },
  { name: 'Revenue', originalName: 'Revenue', detectedType: 'currency', detectedMeaning: 'Revenue', canonicalMetric: 'revenue', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [14850000000], nullCount: 0, distinctCount: 8 },
  { name: 'Production Cost', originalName: 'Production Cost', detectedType: 'currency', detectedMeaning: 'Cost / Expense', canonicalMetric: 'cost', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [10500000000], nullCount: 0, distinctCount: 8 },
  { name: 'Downtime', originalName: 'Downtime', detectedType: 'number', detectedMeaning: 'Downtime', canonicalMetric: 'downtime', confidence: 'high', include: true, sampleValues: [18, 12, 42], nullCount: 0, distinctCount: 8 },
  { name: 'Machine Hours', originalName: 'Machine Hours', detectedType: 'number', detectedMeaning: 'Quantity / Volume', canonicalMetric: 'unmapped', confidence: 'medium', include: true, sampleValues: [680, 690], nullCount: 0, distinctCount: 8 }
];

export const DATASET_VIGOR_CEMENT: Dataset = {
  id: 'sample-mfg-vigor-cement',
  name: 'Vigor Cement Works — Monthly Production & Sales (Sample Data)',
  filename: 'VCW_Production_Report_2026.xlsx',
  fileSize: 51200,
  uploadedAt: '2026-08-31T09:00:00Z',
  lastOpenedAt: new Date().toISOString(),
  selectedSheet: 'Plant Production',
  isSample: true,
  sector_id: 'manufacturing',
  sectorName: 'Manufacturing',
  company_id: 'vigor-cement',
  companyName: 'Vigor Cement Works',
  reporting_period: 'August 2026',
  row_count: SAMPLE_MANUFACTURING_ROWS.length,
  column_count: SAMPLE_MANUFACTURING_COLUMNS.length,
  status: 'current',
  sheets: [
    {
      name: 'Plant Production',
      columns: SAMPLE_MANUFACTURING_COLUMNS,
      rows: SAMPLE_MANUFACTURING_ROWS,
      totalRows: SAMPLE_MANUFACTURING_ROWS.length,
      totalColumns: SAMPLE_MANUFACTURING_COLUMNS.length,
      missingValueCount: 0,
      duplicateRowCount: 0
    }
  ]
};

// ==========================================
// 2. HOSPITALITY DEMO (Golden Tulip City Center)
// ==========================================
export const SAMPLE_HOSPITALITY_ROWS = [
  { Month: 'January', 'Rooms Available': 4960, 'Rooms Sold': 3570, Guests: 5120, 'Room Revenue': 1071000000, 'Restaurant Revenue': 356000000, Expenses: 890000000 },
  { Month: 'February', 'Rooms Available': 4480, 'Rooms Sold': 3450, Guests: 4980, 'Room Revenue': 1035000000, 'Restaurant Revenue': 342000000, Expenses: 860000000 },
  { Month: 'March', 'Rooms Available': 4960, 'Rooms Sold': 3820, Guests: 5490, 'Room Revenue': 1146000000, 'Restaurant Revenue': 388000000, Expenses: 920000000 },
  { Month: 'April', 'Rooms Available': 4800, 'Rooms Sold': 3260, Guests: 4680, 'Room Revenue': 978000000, 'Restaurant Revenue': 310000000, Expenses: 840000000 },
  { Month: 'May', 'Rooms Available': 4960, 'Rooms Sold': 3910, Guests: 5610, 'Room Revenue': 1173000000, 'Restaurant Revenue': 395000000, Expenses: 935000000 },
  { Month: 'June', 'Rooms Available': 4800, 'Rooms Sold': 4180, Guests: 6020, 'Room Revenue': 1254000000, 'Restaurant Revenue': 430000000, Expenses: 980000000 },
  { Month: 'July', 'Rooms Available': 4960, 'Rooms Sold': 4460, Guests: 6420, 'Room Revenue': 1338000000, 'Restaurant Revenue': 465000000, Expenses: 1020000000 },
  { Month: 'August', 'Rooms Available': 4960, 'Rooms Sold': 4350, Guests: 6250, 'Room Revenue': 1305000000, 'Restaurant Revenue': 450000000, Expenses: 1010000000 }
];

export const SAMPLE_HOSPITALITY_COLUMNS: ColumnMetadata[] = [
  { name: 'Month', originalName: 'Month', detectedType: 'date', detectedMeaning: 'Time Period', canonicalMetric: 'time_period', confidence: 'high', include: true, sampleValues: ['January'], nullCount: 0, distinctCount: 8 },
  { name: 'Rooms Available', originalName: 'Rooms Available', detectedType: 'number', detectedMeaning: 'Rooms Available', canonicalMetric: 'rooms_available', confidence: 'high', include: true, sampleValues: [4960], nullCount: 0, distinctCount: 3 },
  { name: 'Rooms Sold', originalName: 'Rooms Sold', detectedType: 'number', detectedMeaning: 'Rooms Sold', canonicalMetric: 'rooms_sold', confidence: 'high', include: true, sampleValues: [3570, 4460], nullCount: 0, distinctCount: 8 },
  { name: 'Guests', originalName: 'Guests', detectedType: 'number', detectedMeaning: 'Guests', canonicalMetric: 'guests', confidence: 'high', include: true, sampleValues: [5120], nullCount: 0, distinctCount: 8 },
  { name: 'Room Revenue', originalName: 'Room Revenue', detectedType: 'currency', detectedMeaning: 'Revenue', canonicalMetric: 'revenue', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [1071000000], nullCount: 0, distinctCount: 8 },
  { name: 'Restaurant Revenue', originalName: 'Restaurant Revenue', detectedType: 'currency', detectedMeaning: 'Revenue', canonicalMetric: 'revenue', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [356000000], nullCount: 0, distinctCount: 8 },
  { name: 'Expenses', originalName: 'Expenses', detectedType: 'currency', detectedMeaning: 'Cost / Expense', canonicalMetric: 'cost', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [890000000], nullCount: 0, distinctCount: 8 }
];

export const DATASET_GOLDEN_TULIP: Dataset = {
  id: 'sample-hosp-golden-tulip',
  name: 'Golden Tulip Dar es Salaam — Rooms & F&B Performance (Sample Data)',
  filename: 'GoldenTulip_Executive_2026.xlsx',
  fileSize: 45000,
  uploadedAt: '2026-08-30T18:15:00Z',
  lastOpenedAt: new Date().toISOString(),
  selectedSheet: 'Monthly Rooms & F&B',
  isSample: true,
  sector_id: 'hospitality',
  sectorName: 'Hospitality',
  company_id: 'golden-tulip-city',
  companyName: 'Golden Tulip Dar es Salaam City Center',
  reporting_period: 'August 2026',
  row_count: SAMPLE_HOSPITALITY_ROWS.length,
  column_count: SAMPLE_HOSPITALITY_COLUMNS.length,
  status: 'current',
  sheets: [
    {
      name: 'Monthly Rooms & F&B',
      columns: SAMPLE_HOSPITALITY_COLUMNS,
      rows: SAMPLE_HOSPITALITY_ROWS,
      totalRows: SAMPLE_HOSPITALITY_ROWS.length,
      totalColumns: SAMPLE_HOSPITALITY_COLUMNS.length,
      missingValueCount: 0,
      duplicateRowCount: 0
    }
  ]
};

// ==========================================
// 3. TRADING DEMO (Zenj General Merchandise)
// ==========================================
export const SAMPLE_TRADING_ROWS = [
  { Product: 'Basmati Rice 25kg', Category: 'Grains & Rice', 'Purchased Qty': 8000, 'Sold Qty': 7450, 'Buying Price': 62000, 'Selling Price': 74000, Revenue: 551300000, Cost: 461900000, Stock: 550 },
  { Product: 'Sunflower Oil 20L', Category: 'Cooking Oils', 'Purchased Qty': 4500, 'Sold Qty': 4200, 'Buying Price': 78000, 'Selling Price': 92000, Revenue: 386400000, Cost: 327600000, Stock: 300 },
  { Product: 'Granulated Sugar 50kg', Category: 'Sweeteners', 'Purchased Qty': 6000, 'Sold Qty': 5900, 'Buying Price': 120000, 'Selling Price': 136000, Revenue: 802400000, Cost: 708000000, Stock: 100 },
  { Product: 'Wheat Flour 25kg', Category: 'Grains & Rice', 'Purchased Qty': 5000, 'Sold Qty': 4600, 'Buying Price': 45000, 'Selling Price': 53000, Revenue: 243800000, Cost: 207000000, Stock: 400 },
  { Product: 'Condensed Milk Carton', Category: 'Dairy Essentials', 'Purchased Qty': 3000, 'Sold Qty': 2850, 'Buying Price': 48000, 'Selling Price': 58000, Revenue: 165300000, Cost: 136800000, Stock: 150 },
  { Product: 'Tea Leaves Master Pack', Category: 'Beverages', 'Purchased Qty': 2500, 'Sold Qty': 2100, 'Buying Price': 32000, 'Selling Price': 41000, Revenue: 86100000, Cost: 67200000, Stock: 400 }
];

export const SAMPLE_TRADING_COLUMNS: ColumnMetadata[] = [
  { name: 'Product', originalName: 'Product', detectedType: 'category', detectedMeaning: 'Category / Dimension', canonicalMetric: 'category', confidence: 'high', include: true, sampleValues: ['Basmati Rice 25kg'], nullCount: 0, distinctCount: 6 },
  { name: 'Category', originalName: 'Category', detectedType: 'category', detectedMeaning: 'Category / Dimension', canonicalMetric: 'category', confidence: 'high', include: true, sampleValues: ['Grains & Rice'], nullCount: 0, distinctCount: 4 },
  { name: 'Purchased Qty', originalName: 'Purchased Qty', detectedType: 'number', detectedMeaning: 'Quantity / Volume', canonicalMetric: 'purchased_qty', confidence: 'high', include: true, sampleValues: [8000], nullCount: 0, distinctCount: 6 },
  { name: 'Sold Qty', originalName: 'Sold Qty', detectedType: 'number', detectedMeaning: 'Quantity / Volume', canonicalMetric: 'sold_qty', confidence: 'high', include: true, sampleValues: [7450], nullCount: 0, distinctCount: 6 },
  { name: 'Buying Price', originalName: 'Buying Price', detectedType: 'currency', detectedMeaning: 'Cost / Expense', canonicalMetric: 'cost', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [62000], nullCount: 0, distinctCount: 6 },
  { name: 'Selling Price', originalName: 'Selling Price', detectedType: 'currency', detectedMeaning: 'Revenue', canonicalMetric: 'revenue', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [74000], nullCount: 0, distinctCount: 6 },
  { name: 'Revenue', originalName: 'Revenue', detectedType: 'currency', detectedMeaning: 'Revenue', canonicalMetric: 'revenue', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [551300000], nullCount: 0, distinctCount: 6 },
  { name: 'Cost', originalName: 'Cost', detectedType: 'currency', detectedMeaning: 'Cost / Expense', canonicalMetric: 'cost', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [461900000], nullCount: 0, distinctCount: 6 },
  { name: 'Stock', originalName: 'Stock', detectedType: 'number', detectedMeaning: 'Quantity / Volume', canonicalMetric: 'stock_remaining', confidence: 'high', include: true, sampleValues: [550, 300], nullCount: 0, distinctCount: 6 }
];

export const DATASET_ZENJ_TRADING: Dataset = {
  id: 'sample-trading-zenj',
  name: 'Zenj General Merchandise — Wholesale Inventory & Margin (Sample Data)',
  filename: 'Zenj_Merchandise_Stock_Aug2026.xlsx',
  fileSize: 41000,
  uploadedAt: '2026-08-30T16:00:00Z',
  lastOpenedAt: new Date().toISOString(),
  selectedSheet: 'Wholesale Sales',
  isSample: true,
  sector_id: 'trading',
  sectorName: 'Trading',
  company_id: 'zenj-merchandise',
  companyName: 'Zenj General Merchandise',
  reporting_period: 'August 2026',
  row_count: SAMPLE_TRADING_ROWS.length,
  column_count: SAMPLE_TRADING_COLUMNS.length,
  status: 'current',
  sheets: [
    {
      name: 'Wholesale Sales',
      columns: SAMPLE_TRADING_COLUMNS,
      rows: SAMPLE_TRADING_ROWS,
      totalRows: SAMPLE_TRADING_ROWS.length,
      totalColumns: SAMPLE_TRADING_COLUMNS.length,
      missingValueCount: 0,
      duplicateRowCount: 0
    }
  ]
};

// ==========================================
// 4. HEALTHCARE DEMO (Ampola Regency Hospital)
// ==========================================
export const SAMPLE_HEALTHCARE_ROWS = [
  { Month: 'January', 'Patients Served': 4200, Admissions: 380, Discharges: 365, 'Average Waiting Time': 28, Revenue: 714000000, 'Operating Expenses': 520000000 },
  { Month: 'February', 'Patients Served': 4450, Admissions: 410, Discharges: 395, 'Average Waiting Time': 25, Revenue: 756000000, 'Operating Expenses': 535000000 },
  { Month: 'March', 'Patients Served': 4800, Admissions: 460, Discharges: 440, 'Average Waiting Time': 34, Revenue: 816000000, 'Operating Expenses': 580000000 },
  { Month: 'April', 'Patients Served': 4620, Admissions: 430, Discharges: 425, 'Average Waiting Time': 26, Revenue: 785000000, 'Operating Expenses': 545000000 },
  { Month: 'May', 'Patients Served': 4950, Admissions: 475, Discharges: 460, 'Average Waiting Time': 29, Revenue: 841000000, 'Operating Expenses': 590000000 },
  { Month: 'June', 'Patients Served': 5120, Admissions: 490, Discharges: 480, 'Average Waiting Time': 24, Revenue: 870000000, 'Operating Expenses': 605000000 },
  { Month: 'July', 'Patients Served': 5300, Admissions: 520, Discharges: 505, 'Average Waiting Time': 31, Revenue: 901000000, 'Operating Expenses': 625000000 },
  { Month: 'August', 'Patients Served': 5250, Admissions: 510, Discharges: 498, 'Average Waiting Time': 27, Revenue: 892000000, 'Operating Expenses': 615000000 }
];

export const SAMPLE_HEALTHCARE_COLUMNS: ColumnMetadata[] = [
  { name: 'Month', originalName: 'Month', detectedType: 'date', detectedMeaning: 'Time Period', canonicalMetric: 'time_period', confidence: 'high', include: true, sampleValues: ['January'], nullCount: 0, distinctCount: 8 },
  { name: 'Patients Served', originalName: 'Patients Served', detectedType: 'number', detectedMeaning: 'Patients', canonicalMetric: 'patients', confidence: 'high', include: true, sampleValues: [4200], nullCount: 0, distinctCount: 8 },
  { name: 'Admissions', originalName: 'Admissions', detectedType: 'number', detectedMeaning: 'Admissions', canonicalMetric: 'admissions', confidence: 'high', include: true, sampleValues: [380], nullCount: 0, distinctCount: 8 },
  { name: 'Discharges', originalName: 'Discharges', detectedType: 'number', detectedMeaning: 'General Text', canonicalMetric: 'discharges', confidence: 'high', include: true, sampleValues: [365], nullCount: 0, distinctCount: 8 },
  { name: 'Average Waiting Time', originalName: 'Average Waiting Time', detectedType: 'number', detectedMeaning: 'General Text', canonicalMetric: 'waiting_time', confidence: 'high', include: true, sampleValues: [28], nullCount: 0, distinctCount: 8 },
  { name: 'Revenue', originalName: 'Revenue', detectedType: 'currency', detectedMeaning: 'Revenue', canonicalMetric: 'revenue', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [714000000], nullCount: 0, distinctCount: 8 },
  { name: 'Operating Expenses', originalName: 'Operating Expenses', detectedType: 'currency', detectedMeaning: 'Cost / Expense', canonicalMetric: 'cost', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [520000000], nullCount: 0, distinctCount: 8 }
];

export const DATASET_AMPOLA_HOSPITAL: Dataset = {
  id: 'sample-hlth-ampola-regency',
  name: 'Ampola Regency Hospital — Management Patient & Finance (Sample Data)',
  filename: 'AmpolaRegency_Operations_2026.xlsx',
  fileSize: 42000,
  uploadedAt: '2026-08-29T11:20:00Z',
  lastOpenedAt: new Date().toISOString(),
  selectedSheet: 'Clinical & Management',
  isSample: true,
  sector_id: 'healthcare',
  sectorName: 'Healthcare',
  company_id: 'ampola-regency',
  companyName: 'Ampola Regency Hospital',
  reporting_period: 'August 2026',
  row_count: SAMPLE_HEALTHCARE_ROWS.length,
  column_count: SAMPLE_HEALTHCARE_COLUMNS.length,
  status: 'current',
  sheets: [
    {
      name: 'Clinical & Management',
      columns: SAMPLE_HEALTHCARE_COLUMNS,
      rows: SAMPLE_HEALTHCARE_ROWS,
      totalRows: SAMPLE_HEALTHCARE_ROWS.length,
      totalColumns: SAMPLE_HEALTHCARE_COLUMNS.length,
      missingValueCount: 0,
      duplicateRowCount: 0
    }
  ]
};

// ==========================================
// 5. TRANSPORTATION DEMO (Zan Fast Ferries)
// ==========================================
export const SAMPLE_TRANSPORT_ROWS = [
  { Month: 'January', Route: 'Dar - Zanzibar', Trips: 186, Passengers: 94800, Capacity: 111600, Revenue: 3318000000, 'Fuel Cost': 1120000000 },
  { Month: 'February', Route: 'Dar - Zanzibar', Trips: 168, Passengers: 87400, Capacity: 100800, Revenue: 3059000000, 'Fuel Cost': 1050000000 },
  { Month: 'March', Route: 'Dar - Zanzibar', Trips: 186, Passengers: 89200, Capacity: 111600, Revenue: 3122000000, 'Fuel Cost': 1140000000 },
  { Month: 'April', Route: 'Dar - Zanzibar', Trips: 180, Passengers: 82500, Capacity: 108000, Revenue: 2887500000, 'Fuel Cost': 1110000000 },
  { Month: 'May', Route: 'Dar - Zanzibar', Trips: 186, Passengers: 91000, Capacity: 111600, Revenue: 3185000000, 'Fuel Cost': 1150000000 },
  { Month: 'June', Route: 'Dar - Zanzibar', Trips: 180, Passengers: 96400, Capacity: 108000, Revenue: 3374000000, 'Fuel Cost': 1160000000 },
  { Month: 'July', Route: 'Dar - Zanzibar', Trips: 186, Passengers: 104200, Capacity: 111600, Revenue: 3647000000, 'Fuel Cost': 1210000000 },
  { Month: 'August', Route: 'Dar - Zanzibar', Trips: 186, Passengers: 102500, Capacity: 111600, Revenue: 3587500000, 'Fuel Cost': 1195000000 }
];

export const SAMPLE_TRANSPORT_COLUMNS: ColumnMetadata[] = [
  { name: 'Month', originalName: 'Month', detectedType: 'date', detectedMeaning: 'Time Period', canonicalMetric: 'time_period', confidence: 'high', include: true, sampleValues: ['January'], nullCount: 0, distinctCount: 8 },
  { name: 'Route', originalName: 'Route', detectedType: 'category', detectedMeaning: 'Category / Dimension', canonicalMetric: 'category', confidence: 'high', include: true, sampleValues: ['Dar - Zanzibar'], nullCount: 0, distinctCount: 1 },
  { name: 'Trips', originalName: 'Trips', detectedType: 'number', detectedMeaning: 'Trips', canonicalMetric: 'trips', confidence: 'high', include: true, sampleValues: [186], nullCount: 0, distinctCount: 3 },
  { name: 'Passengers', originalName: 'Passengers', detectedType: 'number', detectedMeaning: 'Passengers', canonicalMetric: 'passengers', confidence: 'high', include: true, sampleValues: [94800], nullCount: 0, distinctCount: 8 },
  { name: 'Capacity', originalName: 'Capacity', detectedType: 'number', detectedMeaning: 'Quantity / Volume', canonicalMetric: 'capacity', confidence: 'high', include: true, sampleValues: [111600], nullCount: 0, distinctCount: 3 },
  { name: 'Revenue', originalName: 'Revenue', detectedType: 'currency', detectedMeaning: 'Revenue', canonicalMetric: 'revenue', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [3318000000], nullCount: 0, distinctCount: 8 },
  { name: 'Fuel Cost', originalName: 'Fuel Cost', detectedType: 'currency', detectedMeaning: 'Cost / Expense', canonicalMetric: 'cost', confidence: 'high', isCurrency: true, currencySymbol: 'TZS', include: true, sampleValues: [1120000000], nullCount: 0, distinctCount: 8 }
];

export const DATASET_ZAN_FERRIES: Dataset = {
  id: 'sample-trans-zan-ferries',
  name: 'Zan Fast Ferries — Marine Fleet Passenger & Fuel Stats (Sample Data)',
  filename: 'ZFF_Fleet_Operations_Aug2026.xlsx',
  fileSize: 44000,
  uploadedAt: '2026-08-31T07:45:00Z',
  lastOpenedAt: new Date().toISOString(),
  selectedSheet: 'Catamaran Operations',
  isSample: true,
  sector_id: 'transportation',
  sectorName: 'Transportation',
  company_id: 'zan-fast-ferries',
  companyName: 'Zan Fast Ferries',
  reporting_period: 'August 2026',
  row_count: SAMPLE_TRANSPORT_ROWS.length,
  column_count: SAMPLE_TRANSPORT_COLUMNS.length,
  status: 'current',
  sheets: [
    {
      name: 'Catamaran Operations',
      columns: SAMPLE_TRANSPORT_COLUMNS,
      rows: SAMPLE_TRANSPORT_ROWS,
      totalRows: SAMPLE_TRANSPORT_ROWS.length,
      totalColumns: SAMPLE_TRANSPORT_COLUMNS.length,
      missingValueCount: 0,
      duplicateRowCount: 0
    }
  ]
};

// ==========================================
// 6. ORIGINAL GENERAL EXECUTIVE P&L DATASET
// ==========================================
export const SAMPLE_MONTHLY_FINANCIAL_ROWS = [
  { Month: 'January', 'Estimated Revenue': 120000000, 'Actual Revenue': 115000000, 'Estimated Profit': 50000000, 'Actual Profit': 45000000, Expenses: 70000000, Loss: 5000000, Department: 'Commercial', Branch: 'Dar es Salaam' },
  { Month: 'February', 'Estimated Revenue': 130000000, 'Actual Revenue': 138000000, 'Estimated Profit': 55000000, 'Actual Profit': 58000000, Expenses: 80000000, Loss: 0, Department: 'Commercial', Branch: 'Dar es Salaam' },
  { Month: 'March', 'Estimated Revenue': 140000000, 'Actual Revenue': 122000000, 'Estimated Profit': 60000000, 'Actual Profit': 48000000, Expenses: 74000000, Loss: 12000000, Department: 'Operations', Branch: 'Arusha' },
  { Month: 'April', 'Estimated Revenue': 125000000, 'Actual Revenue': 129000000, 'Estimated Profit': 52000000, 'Actual Profit': 54000000, Expenses: 75000000, Loss: 0, Department: 'Operations', Branch: 'Mwanza' },
  { Month: 'May', 'Estimated Revenue': 135000000, 'Actual Revenue': 142000000, 'Estimated Profit': 58000000, 'Actual Profit': 62000000, Expenses: 80000000, Loss: 0, Department: 'Commercial', Branch: 'Dar es Salaam' },
  { Month: 'June', 'Estimated Revenue': 145000000, 'Actual Revenue': 156000000, 'Estimated Profit': 65000000, 'Actual Profit': 72000000, Expenses: 84000000, Loss: 0, Department: 'Commercial', Branch: 'Dar es Salaam' },
  { Month: 'July', 'Estimated Revenue': 150000000, 'Actual Revenue': 154000000, 'Estimated Profit': 68000000, 'Actual Profit': 69000000, Expenses: 85000000, Loss: 0, Department: 'Logistics', Branch: 'Zanzibar' },
  { Month: 'August', 'Estimated Revenue': 140000000, 'Actual Revenue': 136000000, 'Estimated Profit': 60000000, 'Actual Profit': 57000000, Expenses: 79000000, Loss: 3000000, Department: 'Operations', Branch: 'Arusha' },
  { Month: 'September', 'Estimated Revenue': 130000000, 'Actual Revenue': 133000000, 'Estimated Profit': 55000000, 'Actual Profit': 56000000, Expenses: 77000000, Loss: 0, Department: 'Commercial', Branch: 'Dar es Salaam' },
  { Month: 'October', 'Estimated Revenue': 145000000, 'Actual Revenue': 148000000, 'Estimated Profit': 62000000, 'Actual Profit': 64000000, Expenses: 84000000, Loss: 0, Department: 'Commercial', Branch: 'Dar es Salaam' },
  { Month: 'November', 'Estimated Revenue': 155000000, 'Actual Revenue': 150000000, 'Estimated Profit': 70000000, 'Actual Profit': 66000000, Expenses: 84000000, Loss: 4000000, Department: 'Operations', Branch: 'Mwanza' },
  { Month: 'December', 'Estimated Revenue': 160000000, 'Actual Revenue': 169000000, 'Estimated Profit': 75000000, 'Actual Profit': 81000000, Expenses: 88000000, Loss: 0, Department: 'Commercial', Branch: 'Dar es Salaam' }
];

export const SAMPLE_FINANCIAL_COLUMNS: ColumnMetadata[] = [
  { name: 'Month', originalName: 'Month', detectedType: 'date', detectedMeaning: 'Time Period', canonicalMetric: 'time_period', confidence: 'high', include: true, sampleValues: ['January', 'February', 'March'], nullCount: 0, distinctCount: 12 },
  { name: 'Estimated Revenue', originalName: 'Estimated Revenue', detectedType: 'currency', detectedMeaning: 'Revenue', canonicalMetric: 'target_revenue', confidence: 'high', include: true, sampleValues: [120000000, 130000000], nullCount: 0, distinctCount: 9, isCurrency: true, currencySymbol: 'TZS' },
  { name: 'Actual Revenue', originalName: 'Actual Revenue', detectedType: 'currency', detectedMeaning: 'Revenue', canonicalMetric: 'revenue', confidence: 'high', include: true, sampleValues: [115000000, 138000000], nullCount: 0, distinctCount: 12, isCurrency: true, currencySymbol: 'TZS' },
  { name: 'Estimated Profit', originalName: 'Estimated Profit', detectedType: 'currency', detectedMeaning: 'Estimated Metric', canonicalMetric: 'target_profit', confidence: 'high', include: true, sampleValues: [50000000, 55000000], nullCount: 0, distinctCount: 9, isCurrency: true, currencySymbol: 'TZS' },
  { name: 'Actual Profit', originalName: 'Actual Profit', detectedType: 'currency', detectedMeaning: 'Actual Metric', canonicalMetric: 'profit', confidence: 'high', include: true, sampleValues: [45000000, 58000000], nullCount: 0, distinctCount: 12, isCurrency: true, currencySymbol: 'TZS' },
  { name: 'Expenses', originalName: 'Expenses', detectedType: 'currency', detectedMeaning: 'Cost / Expense', canonicalMetric: 'cost', confidence: 'high', include: true, sampleValues: [70000000, 80000000], nullCount: 0, distinctCount: 12, isCurrency: true, currencySymbol: 'TZS' },
  { name: 'Loss', originalName: 'Loss', detectedType: 'currency', detectedMeaning: 'Loss', canonicalMetric: 'loss', confidence: 'high', include: true, sampleValues: [5000000, 0, 12000000], nullCount: 0, distinctCount: 3, isCurrency: true, currencySymbol: 'TZS' },
  { name: 'Department', originalName: 'Department', detectedType: 'category', detectedMeaning: 'Department / Branch', canonicalMetric: 'department', confidence: 'high', include: true, sampleValues: ['Commercial', 'Operations', 'Logistics'], nullCount: 0, distinctCount: 3 },
  { name: 'Branch', originalName: 'Branch', detectedType: 'category', detectedMeaning: 'Department / Branch', canonicalMetric: 'branch', confidence: 'high', include: true, sampleValues: ['Dar es Salaam', 'Arusha', 'Mwanza', 'Zanzibar'], nullCount: 0, distinctCount: 4 }
];

export const SAMPLE_DATASET: Dataset = {
  id: 'sample-pnl-2025',
  name: 'VIGOR Corporate — FY 2025 Executive P&L (Sample Data)',
  filename: 'Corporate_PnL_FY2025.xlsx',
  fileSize: 42560,
  uploadedAt: '2026-08-31T12:00:00Z',
  lastOpenedAt: new Date().toISOString(),
  selectedSheet: 'Monthly Performance',
  isSample: true,
  sector_id: 'general',
  sectorName: 'General / Unclassified',
  company_id: 'general-company',
  companyName: 'VIGOR Corporate Division',
  reporting_period: 'FY 2025/2026',
  row_count: SAMPLE_MONTHLY_FINANCIAL_ROWS.length,
  column_count: SAMPLE_FINANCIAL_COLUMNS.length,
  status: 'current',
  sheets: [
    {
      name: 'Monthly Performance',
      columns: SAMPLE_FINANCIAL_COLUMNS,
      rows: SAMPLE_MONTHLY_FINANCIAL_ROWS,
      totalRows: SAMPLE_MONTHLY_FINANCIAL_ROWS.length,
      totalColumns: SAMPLE_FINANCIAL_COLUMNS.length,
      missingValueCount: 0,
      duplicateRowCount: 0
    }
  ]
};

// All available initial sample datasets
export const ALL_SAMPLE_DATASETS: Dataset[] = [
  DATASET_VIGOR_CEMENT,
  DATASET_GOLDEN_TULIP,
  DATASET_ZENJ_TRADING,
  DATASET_AMPOLA_HOSPITAL,
  DATASET_ZAN_FERRIES,
  SAMPLE_DATASET
];
