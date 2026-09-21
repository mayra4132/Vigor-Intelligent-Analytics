/**
 * First Screen Experience for VIGOR Intelligence
 * "Upload. Understand. Decide."
 * Provides immediate clarity in 5-10 seconds.
 */

import React from 'react';
import {
  UploadCloud,
  Building2,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Database
} from 'lucide-react';
import { Dataset } from '../types';

interface WelcomeScreenProps {
  onNavigateToUpload: () => void;
  onOpenCompanyModal: () => void;
  onNavigateToAskAI: () => void;
  recentDatasets: Dataset[];
  onSelectDataset: (dataset: Dataset) => void;
  onReloadSample: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onNavigateToUpload,
  onOpenCompanyModal,
  onNavigateToAskAI,
  recentDatasets,
  onSelectDataset,
  onReloadSample
}) => {
  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 space-y-10">
      {/* Hero Intro */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>VIGOR Intelligence</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Understand your business data without building dashboards manually.
        </h1>

        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
          Upload any company operating spreadsheet to automatically discover performance metrics, track variances against targets, and answer questions.
        </p>
      </div>

      {/* The 3 Primary Choices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Choice 1: Upload New Data */}
        <div className="bg-white border border-slate-200 hover:border-indigo-500/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload New Data</h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Upload an Excel or CSV file and let VIGOR analyse it automatically.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToUpload}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Upload Spreadsheet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Choice 2: View Existing Company */}
        <div className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">View Existing Company</h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Open previously analysed company information or browse group entities.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenCompanyModal}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Choose Company</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Choice 3: Ask VIGOR */}
        <div className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Ask VIGOR</h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Ask questions and receive instant answers using already available data.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToAskAI}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Ask a Question</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recent Activity or Sample Data Option */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {recentDatasets.length > 0 ? 'Recent Activity' : 'Quick Start Demo'}
            </h3>
          </div>
          {recentDatasets.length === 0 && (
            <button
              onClick={onReloadSample}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
            >
              Load Sample Data
            </button>
          )}
        </div>

        {recentDatasets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentDatasets.slice(0, 4).map(ds => (
              <div
                key={ds.id}
                onClick={() => onSelectDataset(ds)}
                className="p-4 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl transition-all flex items-center justify-between gap-3 shadow-xs cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                      {ds.companyName || ds.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {ds.reporting_period || 'Operating Report'} • {ds.sectorName || 'Business'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Don't have a spreadsheet right now?</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Load pre-configured sample datasets (Vigor Cement, Golden Tulip Hotel, Zenj Trading, Ampola Hospital) to explore the system.
                </p>
              </div>
            </div>

            <button
              onClick={onReloadSample}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
            >
              Load Sample Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
