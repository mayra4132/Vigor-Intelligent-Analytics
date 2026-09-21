/**
 * VIGOR Group Business Structure, Companies, and Canonical Metric Definitions
 * "One Group. Multiple Businesses. One Intelligence Platform."
 */

export interface CompanyConfig {
  id: string;
  name: string;
  code: string;
  sectorId: string;
  sectorName: string;
  description: string;
  defaultCurrency: string;
  location: string;
  reportingStatus: 'current' | 'outdated' | 'no_data' | 'processing' | 'error';
  lastReportingPeriod?: string;
  lastUploadedAt?: string;
}

export interface SectorConfig {
  id: string;
  name: string;
  code: string;
  description: string;
  iconName: string;
  companies: CompanyConfig[];
  primaryMetrics: string[];
}

export const VIGOR_SECTORS: SectorConfig[] = [
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    code: 'MFG',
    description: 'Cement, building materials, packaging, bottling, and energy terminals.',
    iconName: 'Factory',
    primaryMetrics: ['Production Target', 'Actual Output', 'Achievement %', 'Downtime', 'Production Cost', 'Revenue'],
    companies: [
      {
        id: 'vigor-cement',
        name: 'Vigor Cement Works',
        code: 'VCW',
        sectorId: 'manufacturing',
        sectorName: 'Manufacturing',
        description: 'Portland cement and clinker manufacturing plant.',
        defaultCurrency: 'TZS',
        location: 'Tanga / Dar es Salaam',
        reportingStatus: 'current',
        lastReportingPeriod: 'August 2026',
        lastUploadedAt: '2026-08-31T09:00:00Z'
      },
      {
        id: 'kisarawe-cement',
        name: 'Kisarawe Cement Company',
        code: 'KCC',
        sectorId: 'manufacturing',
        sectorName: 'Manufacturing',
        description: 'Specialised regional cement and aggregate producer.',
        defaultCurrency: 'TZS',
        location: 'Coast Region',
        reportingStatus: 'no_data'
      },
      {
        id: 'turkys-mifuko',
        name: "Turky's Mifuko",
        code: 'TMF',
        sectorId: 'manufacturing',
        sectorName: 'Manufacturing',
        description: 'Industrial woven polypropylene bag manufacturing for cement and agriculture.',
        defaultCurrency: 'TZS',
        location: 'Zanzibar',
        reportingStatus: 'outdated',
        lastReportingPeriod: 'June 2026',
        lastUploadedAt: '2026-06-30T14:30:00Z'
      },
      {
        id: 'zainab-bottlers',
        name: 'Zainab Bottlers Company',
        code: 'ZBC',
        sectorId: 'manufacturing',
        sectorName: 'Manufacturing',
        description: 'Purified drinking water and beverage bottling plant.',
        defaultCurrency: 'TZS',
        location: 'Zanzibar / Dar es Salaam',
        reportingStatus: 'no_data'
      },
      {
        id: 'v-gas-lpg',
        name: 'V-Gas & LPG Terminal',
        code: 'VGAS',
        sectorId: 'manufacturing',
        sectorName: 'Manufacturing',
        description: 'Liquefied petroleum gas storage, bulk cylinder distribution, and port terminal.',
        defaultCurrency: 'TZS',
        location: 'Dar es Salaam Port',
        reportingStatus: 'no_data'
      }
    ]
  },
  {
    id: 'hospitality',
    name: 'Hospitality',
    code: 'HOSP',
    description: 'Luxury business and heritage boutique hotels in urban and coastal destinations.',
    iconName: 'Hotel',
    primaryMetrics: ['Occupancy Rate', 'Rooms Sold', 'ADR', 'RevPAR', 'Room Revenue', 'F&B Revenue'],
    companies: [
      {
        id: 'golden-tulip-city',
        name: 'Golden Tulip Dar es Salaam City Center',
        code: 'GTD',
        sectorId: 'hospitality',
        sectorName: 'Hospitality',
        description: 'High-rise 4-star executive business hotel in downtown Dar es Salaam.',
        defaultCurrency: 'TZS',
        location: 'Dar es Salaam City Center',
        reportingStatus: 'current',
        lastReportingPeriod: 'August 2026',
        lastUploadedAt: '2026-08-30T18:15:00Z'
      },
      {
        id: 'golden-tulip-stonetown',
        name: 'Golden Tulip Stonetown Boutique',
        code: 'GTS',
        sectorId: 'hospitality',
        sectorName: 'Hospitality',
        description: 'UNESCO World Heritage boutique hotel with rooftop ocean dining.',
        defaultCurrency: 'TZS',
        location: 'Stone Town, Zanzibar',
        reportingStatus: 'no_data'
      }
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    code: 'HLTH',
    description: 'Multi-specialty hospitals and executive outpatient diagnostic facilities.',
    iconName: 'Activity',
    primaryMetrics: ['Patients Served', 'Admissions', 'Average Waiting Time', 'Bed Occupancy', 'Revenue', 'Operating Cost'],
    companies: [
      {
        id: 'ampola-regency',
        name: 'Ampola Regency Hospital',
        code: 'ARH',
        sectorId: 'healthcare',
        sectorName: 'Healthcare',
        description: 'Full-service tertiary care general hospital and surgical centre.',
        defaultCurrency: 'TZS',
        location: 'Dar es Salaam',
        reportingStatus: 'current',
        lastReportingPeriod: 'August 2026',
        lastUploadedAt: '2026-08-29T11:20:00Z'
      },
      {
        id: 'ampola-tasakhtaa',
        name: 'Ampola Tasakhtaa Hospital',
        code: 'ATH',
        sectorId: 'healthcare',
        sectorName: 'Healthcare',
        description: 'Advanced specialty hospital and cardiac diagnostic clinic.',
        defaultCurrency: 'TZS',
        location: 'Zanzibar',
        reportingStatus: 'no_data'
      }
    ]
  },
  {
    id: 'real_estate',
    name: 'Real Estate',
    code: 'PROP',
    description: 'Commercial towers, residential gated communities, and waterfront developments.',
    iconName: 'Building',
    primaryMetrics: ['Total Units', 'Units Sold', 'Collections', 'Outstanding Receivables', 'Completion %'],
    companies: [
      {
        id: 'turkys-real-estate',
        name: "Turky's Real Estate",
        code: 'TRE',
        sectorId: 'real_estate',
        sectorName: 'Real Estate',
        description: 'Commercial office complexes, warehouse logistics parks, and urban retail malls.',
        defaultCurrency: 'TZS',
        location: 'Tanzania & Zanzibar',
        reportingStatus: 'no_data'
      },
      {
        id: 'the-waterfront',
        name: 'The Waterfront Residence',
        code: 'WFR',
        sectorId: 'real_estate',
        sectorName: 'Real Estate',
        description: 'Exclusive seaside luxury condominiums and private marina residences.',
        defaultCurrency: 'USD',
        location: 'Msasani Peninsula, Dar es Salaam',
        reportingStatus: 'no_data'
      }
    ]
  },
  {
    id: 'transportation',
    name: 'Transportation',
    code: 'LOG',
    description: 'High-speed marine passenger catamarans and coastal cargo services.',
    iconName: 'Ship',
    primaryMetrics: ['Total Passengers', 'Trips Completed', 'Capacity Utilisation', 'Fuel Cost', 'Passenger Revenue'],
    companies: [
      {
        id: 'zan-fast-ferries',
        name: 'Zan Fast Ferries',
        code: 'ZFF',
        sectorId: 'transportation',
        sectorName: 'Transportation',
        description: 'Modern high-speed passenger catamaran fleet linking Dar es Salaam, Zanzibar, and Pemba.',
        defaultCurrency: 'TZS',
        location: 'Dar es Salaam & Zanzibar Ports',
        reportingStatus: 'current',
        lastReportingPeriod: 'August 2026',
        lastUploadedAt: '2026-08-31T07:45:00Z'
      }
    ]
  },
  {
    id: 'services',
    name: 'Services',
    code: 'SERV',
    description: 'Motor vehicle compliance testing, fleet fueling, commercial facility sanitation, and risk insurance.',
    iconName: 'ShieldCheck',
    primaryMetrics: ['Jobs Completed', 'Customers Served', 'Average Turnaround', 'Service Revenue', 'Margin %'],
    companies: [
      {
        id: 'kwasilva-inspection',
        name: 'KwaSilva Vehicle Inspection',
        code: 'KSV',
        sectorId: 'services',
        sectorName: 'Services',
        description: 'Automated vehicle roadworthiness testing and emissions compliance centre.',
        defaultCurrency: 'TZS',
        location: 'Dar es Salaam',
        reportingStatus: 'no_data'
      },
      {
        id: 'v-diesel',
        name: 'V-Diesel',
        code: 'VDSL',
        sectorId: 'services',
        sectorName: 'Services',
        description: 'Commercial fleet bulk fueling and industrial diesel depot operations.',
        defaultCurrency: 'TZS',
        location: 'Pugu Road, Dar es Salaam',
        reportingStatus: 'no_data'
      },
      {
        id: 'v-clean',
        name: 'V Clean',
        code: 'VCLN',
        sectorId: 'services',
        sectorName: 'Services',
        description: 'Corporate commercial cleaning, industrial hygiene, and waste management services.',
        defaultCurrency: 'TZS',
        location: 'Dar es Salaam & Arusha',
        reportingStatus: 'no_data'
      },
      {
        id: 'ampola-insurance',
        name: 'Ampola Insurance Agency',
        code: 'AIA',
        sectorId: 'services',
        sectorName: 'Services',
        description: 'Corporate underwriting, asset protection, marine cargo, and healthcare insurance brokerage.',
        defaultCurrency: 'TZS',
        location: 'Dar es Salaam',
        reportingStatus: 'no_data'
      }
    ]
  },
  {
    id: 'trading',
    name: 'Trading',
    code: 'TRD',
    description: 'Import, bulk distribution, and wholesale merchandising of consumer and industrial goods.',
    iconName: 'ShoppingCart',
    primaryMetrics: ['Sales Revenue', 'Cost of Goods', 'Gross Margin', 'Units Sold', 'Inventory Stock Value'],
    companies: [
      {
        id: 'zenj-merchandise',
        name: 'Zenj General Merchandise',
        code: 'ZGM',
        sectorId: 'trading',
        sectorName: 'Trading',
        description: 'Wholesale distributor of FMCG essentials, foodstuffs, and general merchandise across East Africa.',
        defaultCurrency: 'TZS',
        location: 'Malindi / Dar es Salaam',
        reportingStatus: 'current',
        lastReportingPeriod: 'August 2026',
        lastUploadedAt: '2026-08-30T16:00:00Z'
      }
    ]
  }
];

// Flat list of all companies
export const ALL_VIGOR_COMPANIES: CompanyConfig[] = VIGOR_SECTORS.flatMap(s => s.companies);

// Lookup map for fast retrieval
export const SECTOR_BY_ID: Record<string, SectorConfig> = Object.fromEntries(
  VIGOR_SECTORS.map(s => [s.id, s])
);

export const COMPANY_BY_ID: Record<string, CompanyConfig> = Object.fromEntries(
  ALL_VIGOR_COMPANIES.map(c => [c.id, c])
);

// General fallback configuration
export const GENERAL_SECTOR: SectorConfig = {
  id: 'general',
  name: 'General / Unclassified',
  code: 'GEN',
  description: 'Standard business financial or operational spreadsheet with automatic column detection.',
  iconName: 'Layers',
  companies: [
    {
      id: 'general-company',
      name: 'VIGOR Corporate Division',
      code: 'VCD',
      sectorId: 'general',
      sectorName: 'General / Unclassified',
      description: 'Group-level corporate division or standalone business unit.',
      defaultCurrency: 'TZS',
      location: 'Dar es Salaam Headquarters',
      reportingStatus: 'current',
      lastReportingPeriod: 'FY 2025/2026'
    }
  ],
  primaryMetrics: ['Estimated Metric', 'Actual Metric', 'Variance', 'Revenue', 'Profit', 'Expenses']
};

export function getSector(sectorId?: string): SectorConfig {
  if (!sectorId || sectorId === 'general') return GENERAL_SECTOR;
  return SECTOR_BY_ID[sectorId] || GENERAL_SECTOR;
}

export function getCompany(companyId?: string): CompanyConfig | undefined {
  if (!companyId) return undefined;
  if (companyId === 'general-company') return GENERAL_SECTOR.companies[0];
  return COMPANY_BY_ID[companyId];
}
