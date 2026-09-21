/**
 * Canonical Business Metric Mapping & Comparison Pair Definitions
 * Maps varied spreadsheet headers to standardized enterprise concepts
 */

export type CanonicalMetricId =
  | 'revenue'
  | 'target_revenue'
  | 'cost'
  | 'profit'
  | 'target_profit'
  | 'loss'
  | 'variance'
  | 'target_production'
  | 'actual_production'
  | 'downtime'
  | 'waste'
  | 'rooms_available'
  | 'rooms_sold'
  | 'guests'
  | 'occupancy'
  | 'adr'
  | 'patients'
  | 'admissions'
  | 'discharges'
  | 'waiting_time'
  | 'beds'
  | 'units_total'
  | 'units_sold'
  | 'amount_paid'
  | 'balance'
  | 'trips'
  | 'passengers'
  | 'capacity'
  | 'fuel_cost'
  | 'purchased_qty'
  | 'sold_qty'
  | 'stock_remaining'
  | 'customer_count'
  | 'jobs_completed'
  | 'time_period'
  | 'category'
  | 'department'
  | 'branch'
  | 'unmapped';

export interface CanonicalMetricDefinition {
  id: CanonicalMetricId;
  displayName: string;
  category: 'financial' | 'production' | 'hospitality' | 'healthcare' | 'property' | 'transport' | 'trading' | 'dimension';
  description: string;
  typicalUnit: string;
  sectorAffinity?: string[];
  aliases: string[];
}

export const CANONICAL_METRICS: Record<CanonicalMetricId, CanonicalMetricDefinition> = {
  revenue: {
    id: 'revenue',
    displayName: 'Revenue / Sales',
    category: 'financial',
    description: 'Gross or operating revenue generated from sales and services.',
    typicalUnit: 'Currency',
    aliases: [
      'revenue', 'rev', 'sales', 'total sales', 'turnover', 'income', 'sales revenue',
      'net sales', 'total revenue', 'gross revenue', 'operating revenue', 'receipts',
      'tot rev', 'tot_sales'
    ]
  },
  target_revenue: {
    id: 'target_revenue',
    displayName: 'Target Revenue / Budget',
    category: 'financial',
    description: 'Budgeted, projected, or target revenue for the period.',
    typicalUnit: 'Currency',
    aliases: [
      'estimated revenue', 'est revenue', 'budget revenue', 'target revenue', 'forecast revenue',
      'planned revenue', 'target sales', 'budgeted sales', 'budget sales', 'proj rev'
    ]
  },
  cost: {
    id: 'cost',
    displayName: 'Expenses / Operating Cost',
    category: 'financial',
    description: 'Operating expenses, cost of goods, or operational expenditures.',
    typicalUnit: 'Currency',
    aliases: [
      'expenses', 'expense', 'operating cost', 'costs', 'cost', 'expenditure', 'opex',
      'total expenses', 'operating expenses', 'production cost', 'cost of sales', 'cogs',
      'tot exp', 'op cost'
    ]
  },
  profit: {
    id: 'profit',
    displayName: 'Actual Profit / Margin',
    category: 'financial',
    description: 'Net or operating profit realized during the reporting cycle.',
    typicalUnit: 'Currency',
    aliases: [
      'actual profit', 'profit', 'net profit', 'act profit', 'act prof', 'actual margin',
      'operating profit', 'gross profit', 'ebitda', 'net income', 'realised profit'
    ]
  },
  target_profit: {
    id: 'target_profit',
    displayName: 'Estimated Profit / Budget',
    category: 'financial',
    description: 'Target, estimated, or budgeted profit projection.',
    typicalUnit: 'Currency',
    aliases: [
      'estimated profit', 'est profit', 'est prof', 'budget profit', 'target profit',
      'projected profit', 'planned profit', 'budgeted profit', 'forecast profit'
    ]
  },
  loss: {
    id: 'loss',
    displayName: 'Recorded Loss / Deficit',
    category: 'financial',
    description: 'Recorded net loss, shortfall, or deficit in operations.',
    typicalUnit: 'Currency',
    aliases: ['loss', 'losses', 'deficit', 'operating loss', 'loss amount', 'net loss']
  },
  variance: {
    id: 'variance',
    displayName: 'Variance / Difference',
    category: 'financial',
    description: 'Difference between actual results and budgeted/estimated targets.',
    typicalUnit: 'Currency',
    aliases: ['variance', 'var', 'diff', 'difference', 'budget variance', 'target variance', 'p/l var']
  },
  target_production: {
    id: 'target_production',
    displayName: 'Target Production',
    category: 'production',
    description: 'Planned production output target in units, tonnes, or bags.',
    typicalUnit: 'Units / Tonnes',
    sectorAffinity: ['manufacturing'],
    aliases: [
      'target production', 'planned production', 'plan tonnes', 'target output', 'target bags',
      'budget production', 'production plan', 'target volume', 'tgt prod'
    ]
  },
  actual_production: {
    id: 'actual_production',
    displayName: 'Actual Production Output',
    category: 'production',
    description: 'Actual manufactured output quantity achieved in tonnes, bags, or units.',
    typicalUnit: 'Units / Tonnes',
    sectorAffinity: ['manufacturing'],
    aliases: [
      'actual production', 'produced quantity', 'output', 'production volume', 'units produced',
      'bags produced', 'tonnes produced', 'actual output', 'act prod', 'production'
    ]
  },
  downtime: {
    id: 'downtime',
    displayName: 'Machine Downtime',
    category: 'production',
    description: 'Machine or plant stoppage time in hours.',
    typicalUnit: 'Hours',
    sectorAffinity: ['manufacturing'],
    aliases: ['downtime', 'machine downtime', 'idle time', 'stoppage hours', 'breakdown hours', 'downtime hours', 'idle hours']
  },
  waste: {
    id: 'waste',
    displayName: 'Waste / Rejected Units',
    category: 'production',
    description: 'Defective units, scrap, or production waste.',
    typicalUnit: 'Units / %',
    sectorAffinity: ['manufacturing'],
    aliases: ['waste', 'rejected units', 'defects', 'scrap', 'rejections', 'defect rate', 'rejects']
  },
  rooms_available: {
    id: 'rooms_available',
    displayName: 'Rooms Available',
    category: 'hospitality',
    description: 'Total hotel rooms available for sale in the period.',
    typicalUnit: 'Room Nights',
    sectorAffinity: ['hospitality'],
    aliases: ['rooms available', 'available rooms', 'total rooms', 'room supply', 'available room nights']
  },
  rooms_sold: {
    id: 'rooms_sold',
    displayName: 'Rooms Sold / Occupied',
    category: 'hospitality',
    description: 'Total hotel rooms sold or occupied.',
    typicalUnit: 'Room Nights',
    sectorAffinity: ['hospitality'],
    aliases: ['rooms sold', 'occupied rooms', 'room nights sold', 'rooms occupied', 'sold rooms']
  },
  guests: {
    id: 'guests',
    displayName: 'Guests / Visitors',
    category: 'hospitality',
    description: 'Total headcount of guests, patrons, or covers served.',
    typicalUnit: 'Headcount',
    sectorAffinity: ['hospitality'],
    aliases: ['guests', 'guest count', 'pax count', 'visitors', 'covers', 'hotel guests']
  },
  occupancy: {
    id: 'occupancy',
    displayName: 'Occupancy Rate %',
    category: 'hospitality',
    description: 'Percentage of available rooms occupied.',
    typicalUnit: '%',
    sectorAffinity: ['hospitality'],
    aliases: ['occupancy', 'occupancy rate', 'occ %', 'occ rate', 'room occupancy']
  },
  adr: {
    id: 'adr',
    displayName: 'Average Daily Rate (ADR)',
    category: 'hospitality',
    description: 'Average room revenue per occupied room.',
    typicalUnit: 'Currency',
    sectorAffinity: ['hospitality'],
    aliases: ['adr', 'average daily rate', 'avg room rate', 'average room rate']
  },
  patients: {
    id: 'patients',
    displayName: 'Patients Served',
    category: 'healthcare',
    description: 'Total patients treated or outpatient visits registered.',
    typicalUnit: 'Patients',
    sectorAffinity: ['healthcare'],
    aliases: ['patients', 'patient count', 'patients served', 'visits', 'patient visits', 'outpatients', 'consultations']
  },
  admissions: {
    id: 'admissions',
    displayName: 'Patient Admissions',
    category: 'healthcare',
    description: 'Total inpatient admissions to hospital wards.',
    typicalUnit: 'Admissions',
    sectorAffinity: ['healthcare'],
    aliases: ['admissions', 'inpatients', 'patient admissions', 'admitted patients']
  },
  discharges: {
    id: 'discharges',
    displayName: 'Patient Discharges',
    category: 'healthcare',
    description: 'Total patients discharged following medical care.',
    typicalUnit: 'Discharges',
    sectorAffinity: ['healthcare'],
    aliases: ['discharges', 'patient discharges', 'discharged']
  },
  waiting_time: {
    id: 'waiting_time',
    displayName: 'Average Waiting Time',
    category: 'healthcare',
    description: 'Average time from registration to doctor consultation.',
    typicalUnit: 'Minutes',
    sectorAffinity: ['healthcare'],
    aliases: ['waiting time', 'avg waiting time', 'average wait', 'wait time', 'turnaround time']
  },
  beds: {
    id: 'beds',
    displayName: 'Beds Occupancy',
    category: 'healthcare',
    description: 'Total or occupied inpatient hospital beds.',
    typicalUnit: 'Beds',
    sectorAffinity: ['healthcare'],
    aliases: ['beds', 'occupied beds', 'bed occupancy', 'total beds', 'available beds']
  },
  units_total: {
    id: 'units_total',
    displayName: 'Total Units / Properties',
    category: 'property',
    description: 'Total property inventory units under development or management.',
    typicalUnit: 'Units',
    sectorAffinity: ['real_estate'],
    aliases: ['total units', 'units', 'properties', 'apartments', 'villas', 'commercial units', 'project units']
  },
  units_sold: {
    id: 'units_sold',
    displayName: 'Units Sold / Reserved',
    category: 'property',
    description: 'Units with confirmed purchase contracts or reservations.',
    typicalUnit: 'Units',
    sectorAffinity: ['real_estate'],
    aliases: ['units sold', 'sold units', 'sold', 'reserved units', 'sales count', 'reservations']
  },
  amount_paid: {
    id: 'amount_paid',
    displayName: 'Amount Collected / Paid',
    category: 'property',
    description: 'Cash received or installment payments collected from clients.',
    typicalUnit: 'Currency',
    sectorAffinity: ['real_estate'],
    aliases: ['amount paid', 'paid amount', 'collections', 'amount collected', 'collected', 'receipts']
  },
  balance: {
    id: 'balance',
    displayName: 'Outstanding Balance',
    category: 'property',
    description: 'Pending receivables or uncollected client balances.',
    typicalUnit: 'Currency',
    sectorAffinity: ['real_estate'],
    aliases: ['balance', 'outstanding', 'outstanding balance', 'pending balance', 'receivables', 'due balance']
  },
  trips: {
    id: 'trips',
    displayName: 'Trips / Sailings',
    category: 'transport',
    description: 'Completed ferry sailings or transport departures.',
    typicalUnit: 'Trips',
    sectorAffinity: ['transportation'],
    aliases: ['trips', 'total trips', 'sailings', 'voyages', 'departures', 'completed trips']
  },
  passengers: {
    id: 'passengers',
    displayName: 'Passenger Volume',
    category: 'transport',
    description: 'Total passenger ferry travelers or tickets validated.',
    typicalUnit: 'Passengers',
    sectorAffinity: ['transportation'],
    aliases: ['passengers', 'total passengers', 'pax', 'travelers', 'tickets sold', 'passenger count']
  },
  capacity: {
    id: 'capacity',
    displayName: 'Available Capacity',
    category: 'transport',
    description: 'Licensed seat or cargo capacity across scheduled trips.',
    typicalUnit: 'Seats',
    sectorAffinity: ['transportation'],
    aliases: ['capacity', 'total capacity', 'available seats', 'passenger capacity', 'vessel capacity']
  },
  fuel_cost: {
    id: 'fuel_cost',
    displayName: 'Marine Fuel Cost',
    category: 'transport',
    description: 'Fuel expenditure for vessel or fleet operations.',
    typicalUnit: 'Currency',
    sectorAffinity: ['transportation'],
    aliases: ['fuel cost', 'fuel', 'marine gasoil', 'bunker cost', 'diesel cost', 'fuel expenses']
  },
  purchased_qty: {
    id: 'purchased_qty',
    displayName: 'Purchased Quantity',
    category: 'trading',
    description: 'Quantity of items or wholesale goods purchased from suppliers.',
    typicalUnit: 'Units',
    sectorAffinity: ['trading'],
    aliases: ['purchased qty', 'purchase quantity', 'bought qty', 'procured qty', 'units purchased']
  },
  sold_qty: {
    id: 'sold_qty',
    displayName: 'Sold Quantity',
    category: 'trading',
    description: 'Quantity of wholesale items sold to retailers and customers.',
    typicalUnit: 'Units',
    sectorAffinity: ['trading'],
    aliases: ['sold qty', 'sales quantity', 'units sold', 'qty sold', 'sales volume']
  },
  stock_remaining: {
    id: 'stock_remaining',
    displayName: 'Remaining Stock / Inventory',
    category: 'trading',
    description: 'Warehouse on-hand stock or inventory balance.',
    typicalUnit: 'Units',
    sectorAffinity: ['trading'],
    aliases: ['stock', 'stock remaining', 'inventory', 'on hand', 'remaining stock', 'stock qty']
  },
  customer_count: {
    id: 'customer_count',
    displayName: 'Customers Served',
    category: 'dimension',
    description: 'Total unique client accounts or customers attended to.',
    typicalUnit: 'Customers',
    aliases: ['customers', 'customer count', 'clients', 'clients served', 'accounts']
  },
  jobs_completed: {
    id: 'jobs_completed',
    displayName: 'Jobs / Services Completed',
    category: 'dimension',
    description: 'Total completed inspection jobs, cleaning orders, or repairs.',
    typicalUnit: 'Jobs',
    sectorAffinity: ['services'],
    aliases: ['jobs completed', 'completed jobs', 'inspections completed', 'orders completed', 'tickets closed']
  },
  time_period: {
    id: 'time_period',
    displayName: 'Time Period',
    category: 'dimension',
    description: 'Temporal index such as month, date, quarter, or year.',
    typicalUnit: 'Date',
    aliases: ['month', 'period', 'date', 'quarter', 'year', 'reporting month', 'reporting period', 'day', 'week']
  },
  category: {
    id: 'category',
    displayName: 'Category / Product',
    category: 'dimension',
    description: 'Product line, service classification, or SKU category.',
    typicalUnit: 'Text',
    aliases: ['category', 'product', 'product line', 'item', 'type', 'service type', 'property type', 'route']
  },
  department: {
    id: 'department',
    displayName: 'Department / Division',
    category: 'dimension',
    description: 'Organizational unit or operational division.',
    typicalUnit: 'Text',
    aliases: ['department', 'dept', 'division', 'business unit', 'section']
  },
  branch: {
    id: 'branch',
    displayName: 'Branch / Location',
    category: 'dimension',
    description: 'Geographic branch, terminal, or operating site.',
    typicalUnit: 'Text',
    aliases: ['branch', 'location', 'site', 'plant', 'city', 'terminal', 'hospital']
  },
  unmapped: {
    id: 'unmapped',
    displayName: 'General Data Column',
    category: 'dimension',
    description: 'General text or numeric column without a specific canonical role.',
    typicalUnit: 'Text / Number',
    aliases: []
  }
};

/**
 * Automatic Comparison Pair Definition
 */
export interface ComparisonPair {
  type: 'target_vs_actual' | 'capacity_vs_utilized' | 'due_vs_paid' | 'revenue_vs_cost';
  primaryKey: string;
  comparisonKey: string;
  primaryCanonical: CanonicalMetricId;
  comparisonCanonical: CanonicalMetricId;
  label: string;
  varianceFormula: 'actual_minus_target' | 'paid_minus_due' | 'revenue_minus_cost';
  achievementMetricName: string;
}

export function detectComparisonPairs(
  columnMappings: { name: string; canonical: CanonicalMetricId }[]
): ComparisonPair[] {
  const pairs: ComparisonPair[] = [];
  const map = new Map<CanonicalMetricId, string>();
  columnMappings.forEach(c => map.set(c.canonical, c.name));

  // 1. Target vs Actual Production
  if (map.has('actual_production') && map.has('target_production')) {
    pairs.push({
      type: 'target_vs_actual',
      primaryKey: map.get('actual_production')!,
      comparisonKey: map.get('target_production')!,
      primaryCanonical: 'actual_production',
      comparisonCanonical: 'target_production',
      label: 'Actual vs Target Production',
      varianceFormula: 'actual_minus_target',
      achievementMetricName: 'Production Achievement %'
    });
  }

  // 2. Estimated vs Actual Profit
  if (map.has('profit') && map.has('target_profit')) {
    pairs.push({
      type: 'target_vs_actual',
      primaryKey: map.get('profit')!,
      comparisonKey: map.get('target_profit')!,
      primaryCanonical: 'profit',
      comparisonCanonical: 'target_profit',
      label: 'Actual vs Estimated Profit',
      varianceFormula: 'actual_minus_target',
      achievementMetricName: 'Profit Target Achievement %'
    });
  }

  // 3. Target vs Actual Revenue
  if (map.has('revenue') && map.has('target_revenue')) {
    pairs.push({
      type: 'target_vs_actual',
      primaryKey: map.get('revenue')!,
      comparisonKey: map.get('target_revenue')!,
      primaryCanonical: 'revenue',
      comparisonCanonical: 'target_revenue',
      label: 'Actual vs Budget Revenue',
      varianceFormula: 'actual_minus_target',
      achievementMetricName: 'Revenue Target Achievement %'
    });
  }

  // 4. Available Rooms vs Rooms Sold
  if (map.has('rooms_available') && map.has('rooms_sold')) {
    pairs.push({
      type: 'capacity_vs_utilized',
      primaryKey: map.get('rooms_sold')!,
      comparisonKey: map.get('rooms_available')!,
      primaryCanonical: 'rooms_sold',
      comparisonCanonical: 'rooms_available',
      label: 'Rooms Sold vs Available Rooms',
      varianceFormula: 'actual_minus_target',
      achievementMetricName: 'Occupancy Rate %'
    });
  }

  // 5. Total Units vs Units Sold
  if (map.has('units_total') && map.has('units_sold')) {
    pairs.push({
      type: 'capacity_vs_utilized',
      primaryKey: map.get('units_sold')!,
      comparisonKey: map.get('units_total')!,
      primaryCanonical: 'units_sold',
      comparisonCanonical: 'units_total',
      label: 'Units Sold vs Total Units',
      varianceFormula: 'actual_minus_target',
      achievementMetricName: 'Sales Absorption Rate %'
    });
  }

  // 6. Capacity vs Passengers (Ferry)
  if (map.has('capacity') && map.has('passengers')) {
    pairs.push({
      type: 'capacity_vs_utilized',
      primaryKey: map.get('passengers')!,
      comparisonKey: map.get('capacity')!,
      primaryCanonical: 'passengers',
      comparisonCanonical: 'capacity',
      label: 'Passengers vs Vessel Capacity',
      varianceFormula: 'actual_minus_target',
      achievementMetricName: 'Capacity Utilisation %'
    });
  }

  // 7. Revenue vs Expenses
  if (map.has('revenue') && map.has('cost')) {
    pairs.push({
      type: 'revenue_vs_cost',
      primaryKey: map.get('revenue')!,
      comparisonKey: map.get('cost')!,
      primaryCanonical: 'revenue',
      comparisonCanonical: 'cost',
      label: 'Revenue vs Operating Expenses',
      varianceFormula: 'revenue_minus_cost',
      achievementMetricName: 'Operating Margin %'
    });
  }

  return pairs;
}
