/**
 * Guided Upload Wizard for VIGOR Intelligence
 * "Simple on the surface. Deep when needed."
 * Step 1: Choose Company
 * Step 2: Upload Spreadsheet
 * Step 3: Proceeds directly to Review Data ("Check Your Data")
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
  Layers
} from 'lucide-react';
import { Dataset } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import { VIGOR_SECTORS, ALL_VIGOR_COMPANIES, COMPANY_BY_ID, SECTOR_BY_ID, GENERAL_SECTOR } from '../data/groupStructure';

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

export const UploadPage: React.FC<UploadPageProps> = ({
  onDatasetParsed,
  recentDatasets,
  onSelectRecent,
  initialCompanyId
}) => {
  // Wizard state: 1 = Choose Company, 2 = Upload Spreadsheet
  const [wizardStep, setWizardStep] = useState<1 | 2>(initialCompanyId ? 2 : 1);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId || 'vigor-cement');
  const [companySearch, setCompanySearch] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState<string>('August 2026');

  // File upload state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingPhase, setParsingPhase] = useState<'reading' | 'understanding' | 'preparing'>('reading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialCompanyId if changed
  useEffect(() => {
    if (initialCompanyId) {
      setSelectedCompanyId(initialCompanyId);
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

  const handleFile = async (file: File) => {
    if (!file) return;

    setSelectedFile(file);
    setErrorMessage(null);
    setIsParsing(true);
    setParsingPhase('reading');

    const lowerName = file.name.toLowerCase();
    const isValidExt = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');

    if (!isValidExt) {
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : 'unknown';
      setErrorMessage(`Unsupported file format '${ext}'. Please select an Excel workbook (.xlsx, .xls) or a CSV file (.csv).`);
      setIsParsing(false);
      return;
    }

    // Friendly progressive messaging simulation
    const phase2Timer = setTimeout(() => setParsingPhase('understanding'), 600);
    const phase3Timer = setTimeout(() => setParsingPhase('preparing'), 1400);

    try {
      // 15-second safety timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Spreadsheet processing did not complete within 15 seconds. Please verify the workbook format.'));
        }, 15000);
      });

      const parsePromise = parseExcelFile(file, {
        sectorId: selectedCompany.sectorId,
        companyId: selectedCompany.id,
        reportingPeriod
      });

      const dataset = await Promise.race([parsePromise, timeoutPromise]);

      dataset.sectorName = selectedSector.name;
      dataset.companyName = selectedCompany.name;
      dataset.reporting_period = reportingPeriod;

      clearTimeout(phase2Timer);
      clearTimeout(phase3Timer);

      // Transition to Step 3 (Review Data)
      onDatasetParsed(dataset);
    } catch (err: any) {
      clearTimeout(phase2Timer);
      clearTimeout(phase3Timer);
      const msg = err?.message || 'Spreadsheet processing did not complete. Please check the workbook format.';
      setErrorMessage(msg);
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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Wizard Progress Stepper */}
      <div className="flex items-center justify-center gap-3 select-none text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
              wizardStep === 1
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {wizardStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
          </div>
          <span className={`font-semibold ${wizardStep === 1 ? 'text-indigo-600' : 'text-slate-700'}`}>
            Choose Company
          </span>
        </div>

        <div className="w-8 h-0.5 bg-slate-200"></div>

        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
              wizardStep === 2
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            2
          </div>
          <span className={`font-semibold ${wizardStep === 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
            Upload Spreadsheet
          </span>
        </div>

        <div className="w-8 h-0.5 bg-slate-200"></div>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <span className="font-semibold text-slate-400">
            Check Your Data
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: CHOOSE COMPANY */}
      {/* ========================================================================= */}
      {wizardStep === 1 && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Which company is this data for?
            </h1>
            <p className="text-xs text-slate-500">
              Select the business entity. VIGOR will automatically apply the matching performance indicators.
            </p>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search company (e.g. Vigor Cement, Golden Tulip, Zenj...)"
              value={companySearch}
              onChange={e => setCompanySearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
              autoFocus
            />
          </div>

          {/* Company Cards List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 max-h-[380px] overflow-y-auto">
            {/* General VIGOR Option */}
            {!companySearch && (
              <div
                onClick={() => setSelectedCompanyId('general-business')}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  selectedCompanyId === 'general-business'
                    ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                    VGR
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      VIGOR Group / General Business
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Standard corporate operations or consolidated data
                    </p>
                  </div>
                </div>

                {selectedCompanyId === 'general-business' && (
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
              </div>
            )}

            {/* List of companies */}
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

          {/* Step 1 Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Selected: <strong className="text-slate-800">{selectedCompany.name}</strong> ({selectedSector.name})
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

      {/* ========================================================================= */}
      {/* STEP 2: UPLOAD SPREADSHEET */}
      {/* ========================================================================= */}
      {wizardStep === 2 && (
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{selectedCompany.name}</span>
              <button
                onClick={() => setWizardStep(1)}
                className="text-indigo-600 hover:underline text-[11px] ml-1 font-normal"
              >
                Change
              </button>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Upload your spreadsheet
            </h1>
            <p className="text-xs text-slate-500">
              We'll read the file and prepare the dashboard automatically.
            </p>
          </div>

          {/* Reporting Period input */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">Reporting Cycle:</span>
            </div>
            <input
              type="text"
              value={reportingPeriod}
              onChange={e => setReportingPeriod(e.target.value)}
              placeholder="e.g. August 2026, Q3 2026"
              className="w-48 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Could not read spreadsheet</p>
                <p className="mt-0.5 text-rose-700">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Dropzone */}
          <div
            id="upload-dropzone"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isParsing) {
                fileInputRef.current?.click();
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                : isParsing
                ? 'border-indigo-400 bg-indigo-50/20 cursor-wait'
                : 'border-slate-300 hover:border-indigo-500 bg-white hover:bg-slate-50/50 cursor-pointer shadow-2xs'
            }`}
          >
            <input
              ref={fileInputRef}
              id="spreadsheet-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onClick={e => {
                (e.target as HTMLInputElement).value = '';
              }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
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

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 text-[11px] text-slate-600 font-medium">
                  <span>Accepted:</span>
                  <span className="font-bold text-slate-800">.xlsx</span>
                  <span>•</span>
                  <span className="font-bold text-slate-800">.xls</span>
                  <span>•</span>
                  <span className="font-bold text-slate-800">.csv</span>
                </div>
              </div>
            ) : (
              /* Human-friendly parsing messages */
              <div className="py-8 space-y-4">
                <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900">
                    {parsingPhase === 'reading' && 'Reading your spreadsheet...'}
                    {parsingPhase === 'understanding' && 'Understanding your data...'}
                    {parsingPhase === 'preparing' && 'Preparing your dashboard...'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(0)} KB)` : 'Processing file'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Back button */}
          <div className="flex items-center justify-between pt-2">
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
  );
};
