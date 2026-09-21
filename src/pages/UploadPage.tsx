/**
 * Guided Upload Wizard for VIGOR Intelligence
 * "Simple on the surface. Deep when needed."
 * 
 * Provides:
 * 1. "What are you uploading?"
 *    - VIGOR Group Consolidated Report (Priority MVP Option)
 *    - Individual Company Report
 * 2. High-reliability file handler (handleSelectedFile) for both Drag & Drop and Choose File
 * 3. Fallback sheet selector if CONSOLIDATED sheet is not found
 * 4. "Workbook ready" review screen with reporting period and section verification
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Building2,
  Calendar,
  Search,
  Check,
  ArrowLeft,
  Factory,
  Hotel,
  Activity,
  ShoppingCart,
  Ship,
  Briefcase,
  Layers,
  RotateCcw
} from 'lucide-react';
import { Dataset, NormalizedWorkbook } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import { VIGOR_SECTORS, ALL_VIGOR_COMPANIES, COMPANY_BY_ID, SECTOR_BY_ID, GENERAL_SECTOR } from '../data/groupStructure';
import { WorkbookReviewScreen } from '../components/WorkbookReviewScreen';

interface UploadPageProps {
  onDatasetParsed: (dataset: Dataset) => void;
  recentDatasets: Dataset[];
  onSelectRecent: (dataset: Dataset) => void;
  initialCompanyId?: string;
}

const SECTOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  manufacturing: Factory,
  hospitality: Hotel,
  healthcare: Activity,
  trading: ShoppingCart,
  transport: Ship,
  services: Briefcase
};

type UploadMode = 'consolidated' | 'individual';

export const UploadPage: React.FC<UploadPageProps> = ({
  onDatasetParsed,
  recentDatasets,
  onSelectRecent,
  initialCompanyId
}) => {
  // Upload mode: VIGOR Group Consolidated (Default) vs Individual Company
  const [uploadMode, setUploadMode] = useState<UploadMode>(initialCompanyId ? 'individual' : 'consolidated');

  // Wizard step for individual company mode (1 = Choose Company, 2 = Upload)
  const [wizardStep, setWizardStep] = useState<1 | 2>(initialCompanyId ? 2 : 1);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId || 'vigor-cement');
  const [companySearch, setCompanySearch] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState<string>('August 2026');

  // File upload & processing state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('Reading spreadsheet...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Consolidated sheet missing fallback state
  const [missingConsolidatedSheets, setMissingConsolidatedSheets] = useState<string[] | null>(null);
  const [manualChosenSheet, setManualChosenSheet] = useState<string>('');

  // Ready consolidated dataset (Workbook Ready screen)
  const [readyConsolidatedDataset, setReadyConsolidatedDataset] = useState<Dataset | null>(null);

  // Management workbook review state (for general multi-sheet workbooks)
  const [reviewWorkbook, setReviewWorkbook] = useState<NormalizedWorkbook | null>(null);
  const [pendingDataset, setPendingDataset] = useState<Dataset | null>(null);

  // Sync initialCompanyId if changed
  useEffect(() => {
    if (initialCompanyId) {
      setSelectedCompanyId(initialCompanyId);
      setUploadMode('individual');
      setWizardStep(2);
    }
  }, [initialCompanyId]);

  // Derived selected company and sector
  const selectedCompany = COMPANY_BY_ID[selectedCompanyId] || {
    id: 'general-business',
    name: 'VIGOR Group / General',
    code: 'VGR',
    sectorId: 'general',
    sectorName: 'Executive Group Operations',
    description: 'Corporate executive operations and consolidated group reports.',
    defaultCurrency: 'TZS',
    location: 'Dar es Salaam / Zanzibar',
    reportingStatus: 'current' as const
  };

  const selectedSector = SECTOR_BY_ID[selectedCompany.sectorId] || GENERAL_SECTOR;

  // Filter companies by search
  const filteredCompanies = useMemo(() => {
    const q = companySearch.toLowerCase().trim();
    if (!q) return ALL_VIGOR_COMPANIES;
    return ALL_VIGOR_COMPANIES.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.sectorName.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [companySearch]);

  /**
   * One reliable file handler for both Choose File and Drag & Drop
   */
  const handleSelectedFile = async (file: File, overrideSheetName?: string) => {
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setMissingConsolidatedSheets(null);
    setReadyConsolidatedDataset(null);
    setIsParsing(true);
    setProgressPercent(10);
    setProgressStatus('Reading spreadsheet...');

    const lowerName = file.name.toLowerCase();
    const isValidExt = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');

    if (!isValidExt) {
      setErrorMessage(`Unsupported file format. Please upload an Excel workbook (.xlsx, .xls) or CSV (.csv).`);
      setIsParsing(false);
      return;
    }

    try {
      // 45-second safety timeout so spinner NEVER hangs permanently
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Spreadsheet processing timed out after 45 seconds.'));
        }, 45000);
      });

      const isConsolidatedRequest = uploadMode === 'consolidated' && !overrideSheetName;

      const parsePromise = parseExcelFile(file, {
        sectorId: isConsolidatedRequest ? 'general' : selectedCompany.sectorId,
        companyId: isConsolidatedRequest ? 'vigor-group' : selectedCompany.id,
        reportingPeriod,
        targetSheetName: overrideSheetName,
        preferConsolidated: isConsolidatedRequest,
        onProgress: (pct, msg) => {
          setProgressPercent(pct);
          setProgressStatus(msg);
        }
      });

      const dataset = await Promise.race([parsePromise, timeoutPromise]);

      if (dataset.isConsolidatedWorkbook && dataset.consolidatedData) {
        // Show the Workbook ready verification screen
        setReadyConsolidatedDataset(dataset);
      } else if (dataset.isManagementWorkbook && dataset.workbookReport) {
        setReviewWorkbook(dataset.workbookReport);
        setPendingDataset(dataset);
      } else {
        dataset.sectorName = selectedSector.name;
        dataset.companyName = selectedCompany.name;
        dataset.reporting_period = reportingPeriod;
        onDatasetParsed(dataset);
      }
    } catch (err: any) {
      const rawMsg = err?.message || 'Spreadsheet processing did not complete.';
      if (rawMsg.startsWith('CONSOLIDATED_NOT_FOUND:')) {
        try {
          const sheetsList = JSON.parse(rawMsg.replace('CONSOLIDATED_NOT_FOUND:', ''));
          setMissingConsolidatedSheets(sheetsList);
          if (sheetsList.length > 0) {
            setManualChosenSheet(sheetsList[0]);
          }
        } catch {
          setErrorMessage('This workbook does not contain a worksheet named CONSOLIDATED.');
        }
      } else {
        setErrorMessage(rawMsg);
      }
    } finally {
      // Ensures spinner always stops
      setIsParsing(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // If review screen is active for management workbook
  if (reviewWorkbook && pendingDataset) {
    return (
      <WorkbookReviewScreen
        workbook={reviewWorkbook}
        onConfirmAnalysis={(customizedWb) => {
          pendingDataset.workbookReport = customizedWb;
          onDatasetParsed(pendingDataset);
        }}
        onCancel={() => {
          setReviewWorkbook(null);
          setPendingDataset(null);
          setSelectedFile(null);
        }}
      />
    );
  }

  // =========================================================================
  // WORKBOOK READY SCREEN (Requirement 18)
  // =========================================================================
  if (readyConsolidatedDataset && readyConsolidatedDataset.consolidatedData) {
    const cData = readyConsolidatedDataset.consolidatedData;

    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800">
              Analysis Ready
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Workbook ready
            </h1>
            <p className="text-xs font-mono font-medium text-slate-600 break-all">
              {readyConsolidatedDataset.filename}
            </p>
          </div>

          {/* Validation Checklist */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center gap-3 text-xs text-slate-800 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>
                <strong>Consolidated report found:</strong> Sheet "{cData.sheetName}" detected and verified.
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-800 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>
                <strong>Operational Performance found:</strong> {cData.operationalMetrics.length} volume & activity metrics extracted.
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-800 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>
                <strong>Financial Performance found:</strong> {cData.financialMetrics.length} financial P&L metrics extracted.
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-800 font-medium">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span>
                <strong>Reporting period detected:</strong> {cData.reportingPeriod}
              </span>
            </div>
          </div>

          {/* Primary and Secondary Actions */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => onDatasetParsed(readyConsolidatedDataset)}
              className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>View Consolidated Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setReadyConsolidatedDataset(null);
                setSelectedFile(null);
              }}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Upload Different File
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* 1. Clear Group Upload Option Selector (Requirements 30 & 31) */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          What are you uploading?
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Choose between the executive group consolidated workbook or an individual company report.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left">
          {/* Option A: VIGOR Group Consolidated Report (Priority / Default) */}
          <div
            onClick={() => {
              setUploadMode('consolidated');
              setErrorMessage(null);
              setMissingConsolidatedSheets(null);
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
              uploadMode === 'consolidated'
                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                VGR
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                Recommended MVP
              </span>
            </div>

            <div className="mt-3">
              <h2 className="text-sm font-bold text-slate-900">
                VIGOR Group Consolidated Report
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Analyses the <strong>CONSOLIDATED</strong> sheet from the executive workbook directly for management review.
              </p>
            </div>

            {uploadMode === 'consolidated' && (
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* Option B: Individual Company Report */}
          <div
            onClick={() => {
              setUploadMode('individual');
              setErrorMessage(null);
              setMissingConsolidatedSheets(null);
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
              uploadMode === 'individual'
                ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20 shadow-xs'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                <Building2 className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Single Entity</span>
            </div>

            <div className="mt-3">
              <h2 className="text-sm font-bold text-slate-900">
                Individual Company Report
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Upload entity-specific reporting data for Vigor Cement, Golden Tulip, Zenj, or others.
              </p>
            </div>

            {uploadMode === 'individual' && (
              <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: VIGOR GROUP CONSOLIDATED REPORT (Streamlined Direct Upload)       */}
      {/* ========================================================================= */}
      {uploadMode === 'consolidated' && (
        <div className="space-y-5">
          {/* Reporting Period input */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-semibold text-slate-700">Target Reporting Period:</span>
            </div>
            <input
              type="text"
              value={reportingPeriod}
              onChange={e => setReportingPeriod(e.target.value)}
              placeholder="e.g. August 2026"
              className="w-48 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Missing CONSOLIDATED sheet error + manual selector (Requirement 8) */}
          {missingConsolidatedSheets && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-amber-900">
                    Consolidated report not found
                  </h3>
                  <p className="mt-1 text-amber-800">
                    This workbook does not contain a worksheet named <strong>CONSOLIDATED</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <label className="text-xs font-semibold text-amber-900 whitespace-nowrap">
                  Choose Sheet Manually:
                </label>
                <select
                  value={manualChosenSheet}
                  onChange={(e) => setManualChosenSheet(e.target.value)}
                  className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {missingConsolidatedSheets.map((sh) => (
                    <option key={sh} value={sh}>{sh}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedFile && manualChosenSheet) {
                      handleSelectedFile(selectedFile, manualChosenSheet);
                    }
                  }}
                  className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Parse Selected Sheet
                </button>
              </div>
            </div>
          )}

          {/* Standard error banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Could not process workbook</p>
                <p className="mt-0.5 text-rose-700">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Unified Dropzone & Choose File (Requirement 5) */}
          <div
            id="consolidated-dropzone"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isParsing) {
                fileInputRef.current?.click();
              }
            }}
            className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                : isParsing
                ? 'border-indigo-400 bg-indigo-50/20 cursor-wait'
                : 'border-slate-300 hover:border-indigo-500 bg-white hover:bg-slate-50/50 cursor-pointer shadow-xs'
            }`}
          >
            <input
              ref={fileInputRef}
              id="consolidated-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onClick={e => {
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleSelectedFile(e.target.files[0]);
                }
              }}
            />

            {!isParsing ? (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 mx-auto flex items-center justify-center">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Upload VIGOR Excel Workbook
                  </h3>
                  <p className="text-xs text-slate-500 mb-3 max-w-sm mx-auto">
                    Drag and drop <strong>Performance Review Aug 2026 Consolidated Rebuilt.xlsx</strong> or choose from your files
                  </p>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Choose File</span>
                  </button>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-lg bg-slate-100 text-[11px] text-slate-600 font-medium">
                  <span>Fast client-side parse</span>
                  <span>•</span>
                  <span>Targeting: <strong>CONSOLIDATED</strong> sheet</span>
                  <span>•</span>
                  <span>Up to 25 MB</span>
                </div>
              </div>
            ) : (
              <div className="py-8 space-y-4 max-w-sm mx-auto">
                <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="space-y-1.5 text-center">
                  <p className="text-sm font-bold text-slate-900">
                    {progressStatus}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedFile ? `${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)` : 'Processing file'}
                  </p>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, progressPercent)}%` }}
                  ></div>
                </div>
                <div className="text-[11px] text-slate-400 text-center font-mono">
                  {progressPercent}% completed
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: INDIVIDUAL COMPANY REPORT (Two-Step Guided Flow)                  */}
      {/* ========================================================================= */}
      {uploadMode === 'individual' && (
        <div className="space-y-6">
          {wizardStep === 1 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Which company is this report for?
                </h2>
                <p className="text-xs text-slate-500">
                  Select the entity to apply matching sector key performance indicators.
                </p>
              </div>

              {/* Company search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search entity (Cement, Golden Tulip, Zenj...)"
                  value={companySearch}
                  onChange={e => setCompanySearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              {/* Companies list */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs space-y-2 max-h-[340px] overflow-y-auto">
                {filteredCompanies.map(comp => {
                  const isSelected = selectedCompanyId === comp.id;
                  const Icon = SECTOR_ICONS[comp.sectorId] || Building2;

                  return (
                    <div
                      key={comp.id}
                      onClick={() => setSelectedCompanyId(comp.id)}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {comp.code}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {comp.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              {comp.sectorName}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {comp.location} • {comp.defaultCurrency}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-500">
                  Selected: <strong className="text-slate-800">{selectedCompany.name}</strong>
                </div>

                <button
                  onClick={() => setWizardStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Upload</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-slate-100 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Target Entity: <strong>{selectedCompany.name}</strong></span>
                </div>
                <button
                  onClick={() => setWizardStep(1)}
                  className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Standard error banner */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">Could not read spreadsheet</p>
                    <p className="mt-0.5 text-rose-700">{errorMessage}</p>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Dropzone */}
              <div
                id="individual-dropzone"
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  if (!isParsing) {
                    fileInputRef.current?.click();
                  }
                }}
                className="border-2 border-dashed rounded-3xl p-10 text-center transition-all border-slate-300 hover:border-indigo-500 bg-white hover:bg-slate-50/50 cursor-pointer shadow-xs"
              >
                <input
                  ref={fileInputRef}
                  id="individual-file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onClick={e => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleSelectedFile(e.target.files[0]);
                    }
                  }}
                />

                {!isParsing ? (
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 mx-auto flex items-center justify-center">
                      <UploadCloud className="w-7 h-7" />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 mb-1">
                        Drag Excel or CSV here
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">
                        or click to choose a file from your computer
                      </p>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Choose File</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 space-y-4 max-w-sm mx-auto">
                    <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-sm font-bold text-slate-900">{progressStatus}</p>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Company Selection</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
