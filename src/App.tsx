/**
 * VIGOR Intelligent Analytics - Main Application Component
 * "Simple on the surface. Deep when needed."
 * Executive Excel-to-Dashboard Platform
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AppView, Dataset } from './types';
import {
  DATASET_VIGOR_CEMENT,
  DATASET_GOLDEN_TULIP,
  DATASET_ZENJ_TRADING,
  DATASET_AMPOLA_HOSPITAL,
  DATASET_ZAN_FERRIES,
  SAMPLE_DATASET
} from './data/sampleDatasets';
import { COMPANY_BY_ID } from './data/groupStructure';
import { apiClient } from './services/apiClient';
import { computeGroupOverview } from './services/groupAnalytics';
import { Navigation } from './components/Navigation';
import { GlobalHeaderSwitcher } from './components/GlobalHeaderSwitcher';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CompanyEmptyState } from './components/CompanyEmptyState';
import { GroupOverviewPage } from './pages/GroupOverviewPage';
import { SectorOverviewPage } from './pages/SectorOverviewPage';
import { UploadPage } from './pages/UploadPage';
import { DataUnderstandingPage } from './pages/DataUnderstandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ExplorePage } from './pages/ExplorePage';
import { AskAIPage } from './pages/AskAIPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { ReportPage } from './pages/ReportPage';
import { SettingsPage } from './pages/SettingsPage';
import { CompanyModal } from './components/CompanyModal';

export default function App() {
  // Navigation: Starts on 'overview' (first-screen experience or group overview)
  const [currentView, setCurrentView] = useState<AppView>('overview');
  const [activeSectorId, setActiveSectorId] = useState<string | undefined>(undefined);
  const [activeCompanyId, setActiveCompanyId] = useState<string | undefined>('vigor-cement');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
  const [initialAskAIQuestion, setInitialAskAIQuestion] = useState<string>('');
  const [uploadTargetCompanyId, setUploadTargetCompanyId] = useState<string | undefined>(undefined);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);

  // Active company configuration
  const activeCompany = activeCompanyId ? COMPANY_BY_ID[activeCompanyId] : null;

  // Initial load - Preload demo datasets if workspace is empty so the user can immediately experience VIGOR
  useEffect(() => {
    async function initWorkspace() {
      try {
        let loadedDatasets: Dataset[] = [];
        try {
          const localStr = localStorage.getItem('vigor_analytics_datasets');
          if (localStr) {
            loadedDatasets = JSON.parse(localStr);
          }
        } catch {}

        if (!loadedDatasets || loadedDatasets.length === 0) {
          const stored = await apiClient.getDatasets();
          if (stored && stored.length > 0) {
            loadedDatasets = stored;
          } else {
            loadedDatasets = [DATASET_VIGOR_CEMENT, DATASET_GOLDEN_TULIP, DATASET_ZENJ_TRADING];
          }
        }

        setDatasets(loadedDatasets);
        try {
          localStorage.setItem('vigor_analytics_datasets', JSON.stringify(loadedDatasets));
        } catch {}

        // Check if there was an active company or dataset saved in localStorage
        const savedCompanyId = localStorage.getItem('vigor_active_company_id');
        const savedDatasetId = localStorage.getItem('vigor_active_dataset_id');

        if (savedCompanyId !== null && savedCompanyId !== undefined) {
          if (savedCompanyId === '' || savedCompanyId === 'group') {
            setActiveCompanyId(undefined);
            setActiveSectorId(undefined);
            setActiveDataset(null);
          } else {
            setActiveCompanyId(savedCompanyId);
            const comp = COMPANY_BY_ID[savedCompanyId];
            if (comp) setActiveSectorId(comp.sectorId);

            const matching = savedDatasetId
              ? loadedDatasets.find(d => d.id === savedDatasetId)
              : loadedDatasets.find(d => d.company_id === savedCompanyId);

            if (matching) {
              setActiveDataset(matching);
            } else {
              setActiveDataset(null);
            }
          }
        } else {
          // Default to Vigor Cement Works
          setActiveCompanyId('vigor-cement');
          setActiveSectorId('manufacturing');
          const cementDs = loadedDatasets.find(d => d.company_id === 'vigor-cement') || loadedDatasets[0] || null;
          setActiveDataset(cementDs);
        }
      } catch (err) {
        console.warn('Init note:', err);
        const sample = [DATASET_VIGOR_CEMENT, DATASET_GOLDEN_TULIP];
        setDatasets(sample);
        setActiveDataset(DATASET_VIGOR_CEMENT);
        setActiveCompanyId('vigor-cement');
        setActiveSectorId('manufacturing');
      }
    }
    initWorkspace();
  }, []);

  // Synchronize Group Overview Metrics
  const groupMetrics = useMemo(() => {
    return computeGroupOverview(datasets);
  }, [datasets]);

  // Context Switcher Handlers
  const handleSelectSector = (sectorId: string) => {
    setActiveSectorId(sectorId);
    setCurrentView('sector_overview');
  };

  const handleSelectCompany = (companyId: string, datasetId?: string) => {
    setActiveCompanyId(companyId);
    try {
      localStorage.setItem('vigor_active_company_id', companyId);
    } catch {}

    const comp = COMPANY_BY_ID[companyId];
    if (comp) {
      setActiveSectorId(comp.sectorId);
      try {
        localStorage.setItem('vigor_active_sector_id', comp.sectorId);
      } catch {}
    }

    // Look for dataset belonging to this specific company
    let targetDataset = datasetId 
      ? datasets.find(d => d.id === datasetId) 
      : datasets.find(d => d.company_id === companyId);

    // If not found as standalone dataset, check if an uploaded management workbook contains this company
    if (!targetDataset) {
      const mgmtWorkbook = datasets.find(d => d.isManagementWorkbook && d.workbookReport?.companies?.[companyId]);
      if (mgmtWorkbook) {
        targetDataset = mgmtWorkbook;
      }
    }

    if (targetDataset) {
      setActiveDataset(targetDataset);
      try {
        localStorage.setItem('vigor_active_dataset_id', targetDataset.id);
      } catch {}
    } else {
      // CLEAR active dataset when switched to a company without data!
      setActiveDataset(null);
      try {
        localStorage.removeItem('vigor_active_dataset_id');
      } catch {}
    }

    // Always go to overview so user sees either the dashboard or the company empty state
    setCurrentView('overview');
  };

  const handleSelectDataset = (dataset: Dataset) => {
    setActiveDataset(dataset);
    if (dataset.company_id) {
      setActiveCompanyId(dataset.company_id);
      try {
        localStorage.setItem('vigor_active_company_id', dataset.company_id);
        localStorage.setItem('vigor_active_dataset_id', dataset.id);
      } catch {}
    }
    if (dataset.sector_id) {
      setActiveSectorId(dataset.sector_id);
      try {
        localStorage.setItem('vigor_active_sector_id', dataset.sector_id);
      } catch {}
    }
    setCurrentView('overview');
  };

  const handleGoToGroupOverview = () => {
    setActiveCompanyId(undefined);
    setActiveSectorId(undefined);
    setActiveDataset(null);
    try {
      localStorage.setItem('vigor_active_company_id', 'group');
      localStorage.removeItem('vigor_active_dataset_id');
      localStorage.removeItem('vigor_active_sector_id');
    } catch {}
    setCurrentView('overview');
  };

  const handleNavigateToUpload = (forCompanyId?: string) => {
    setUploadTargetCompanyId(forCompanyId || activeCompanyId);
    setCurrentView('home');
  };

  // Upload workflow handlers
  const handleDatasetParsed = (newDataset: Dataset) => {
    setActiveDataset(newDataset);
    if (newDataset.company_id) setActiveCompanyId(newDataset.company_id);
    if (newDataset.sector_id) setActiveSectorId(newDataset.sector_id);

    setDatasets(prev => {
      const filtered = prev.filter(d => d.id !== newDataset.id);
      return [newDataset, ...filtered];
    });

    // If it's a consolidated workbook or executive management workbook, proceed directly to dashboard overview!
    if (newDataset.isConsolidatedWorkbook || newDataset.isManagementWorkbook) {
      setCurrentView('overview');
    } else {
      // Step 3 in wizard: "Check Your Data"
      setCurrentView('understanding');
    }
  };

  const handleConfirmMapping = (updatedDataset: Dataset) => {
    setActiveDataset(updatedDataset);
    setDatasets(prev =>
      prev.map(d => (d.id === updatedDataset.id ? updatedDataset : d))
    );

    // After "Everything Looks Good": directly generate dashboard
    setCurrentView('overview');
  };

  const handleDeleteDataset = async (id: string) => {
    await apiClient.deleteDataset(id).catch(() => {});
    setDatasets(prev => prev.filter(d => d.id !== id));
    if (activeDataset?.id === id) {
      const remaining = datasets.filter(d => d.id !== id);
      setActiveDataset(remaining[0] || null);
      if (!remaining[0]) {
        setActiveCompanyId(undefined);
        setCurrentView('overview');
      }
    }
  };

  // Clear all data to empty account
  const handleClearAllData = async () => {
    await apiClient.clearAllDatasets().catch(() => {});
    setDatasets([]);
    setActiveDataset(null);
    setActiveSectorId(undefined);
    setActiveCompanyId(undefined);
    setCurrentView('overview');
  };

  // Reload sample demo datasets
  const handleReloadSample = async () => {
    const demoDatasets = [
      DATASET_VIGOR_CEMENT,
      DATASET_GOLDEN_TULIP,
      DATASET_ZENJ_TRADING,
      DATASET_AMPOLA_HOSPITAL,
      DATASET_ZAN_FERRIES,
      SAMPLE_DATASET
    ];
    setDatasets(demoDatasets);
    setActiveDataset(DATASET_VIGOR_CEMENT);
    setActiveSectorId('manufacturing');
    setActiveCompanyId('vigor-cement');
    setCurrentView('overview');
    for (const ds of demoDatasets) {
      await apiClient.uploadDataset(ds).catch(() => {});
    }
  };

  const handleNavigateToAskAI = (initialQuestion?: string) => {
    setInitialAskAIQuestion(initialQuestion || '');
    setCurrentView('ask');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      {/* 5-Item Simplified Sidebar Navigation */}
      <Navigation
        currentView={currentView}
        onNavigate={setCurrentView}
        activeDataset={activeDataset}
        activeCompanyId={activeCompanyId}
        allDatasets={datasets}
        onSelectCompany={handleSelectCompany}
        onSelectGroup={handleGoToGroupOverview}
        onNavigateToUpload={handleNavigateToUpload}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        {/* Single Context Control Header */}
        <GlobalHeaderSwitcher
          activeSectorId={activeSectorId}
          activeCompanyId={activeCompanyId}
          activeDataset={activeDataset}
          allDatasets={datasets}
          onSelectSector={handleSelectSector}
          onSelectCompany={handleSelectCompany}
          onSelectDataset={handleSelectDataset}
          onGoToGroupOverview={handleGoToGroupOverview}
          onNavigateToUpload={handleNavigateToUpload}
        />

        {/* Scrollable View Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* ========================================================================= */}
          {/* 1. OVERVIEW VIEW */}
          {/* ========================================================================= */}
          {(currentView === 'overview' || currentView === 'dashboard') && (
            activeCompanyId && activeCompany ? (
              activeDataset ? (
                <DashboardPage
                  dataset={activeDataset}
                  onNavigateToAskAI={handleNavigateToAskAI}
                  onNavigateToExplore={() => setCurrentView('explore')}
                  onNavigateToReport={() => setCurrentView('report')}
                  onNavigateToUnderstanding={() => setCurrentView('understanding')}
                  onNavigateToGroup={handleGoToGroupOverview}
                />
              ) : (
                <CompanyEmptyState
                  company={activeCompany}
                  onNavigateToUpload={() => {
                    setUploadTargetCompanyId(activeCompanyId);
                    setCurrentView('home');
                  }}
                  onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
                />
              )
            ) : activeDataset ? (
              <DashboardPage
                dataset={activeDataset}
                activeCompanyId={activeCompanyId}
                onSelectCompany={handleSelectCompany}
                onNavigateToAskAI={handleNavigateToAskAI}
                onNavigateToExplore={() => setCurrentView('explore')}
                onNavigateToReport={() => setCurrentView('report')}
                onNavigateToUnderstanding={() => setCurrentView('understanding')}
                onNavigateToGroup={handleGoToGroupOverview}
                onNavigateToUpload={handleNavigateToUpload}
                onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
              />
            ) : datasets.length > 0 ? (
              <GroupOverviewPage
                metrics={groupMetrics}
                datasets={datasets}
                onSelectSector={handleSelectSector}
                onSelectCompany={handleSelectCompany}
                onNavigateToUpload={handleNavigateToUpload}
                onAskAI={handleNavigateToAskAI}
                onOpenCompanyDirectory={() => setIsCompanyModalOpen(true)}
              />
            ) : (
              <WelcomeScreen
                onNavigateToUpload={() => setCurrentView('home')}
                onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
                onNavigateToAskAI={() => setCurrentView('ask')}
                recentDatasets={datasets}
                onSelectDataset={handleSelectDataset}
                onReloadSample={handleReloadSample}
              />
            )
          )}

          {/* ========================================================================= */}
          {/* 2. UPLOAD DATA VIEW */}
          {/* ========================================================================= */}
          {currentView === 'home' && (
            <UploadPage
              onDatasetParsed={handleDatasetParsed}
              recentDatasets={datasets}
              onSelectRecent={handleSelectDataset}
              initialCompanyId={uploadTargetCompanyId}
            />
          )}

          {/* ========================================================================= */}
          {/* 3. MY DATA (DATASETS REPOSITORY) */}
          {/* ========================================================================= */}
          {currentView === 'datasets' && (
            <DatasetsPage
              datasets={datasets}
              activeDataset={activeDataset}
              onSelectDataset={handleSelectDataset}
              onDeleteDataset={handleDeleteDataset}
              onNavigateToUpload={() => setCurrentView('home')}
              onReloadSample={handleReloadSample}
              onClearAll={handleClearAllData}
              onNavigateToUnderstanding={ds => {
                setActiveDataset(ds);
                setCurrentView('understanding');
              }}
              onNavigateToExplore={ds => {
                setActiveDataset(ds);
                setCurrentView('explore');
              }}
            />
          )}

          {/* ========================================================================= */}
          {/* 4. ASK AI VIEW */}
          {/* ========================================================================= */}
          {currentView === 'ask' && (
            activeDataset ? (
              <AskAIPage
                dataset={activeDataset}
                initialQuestion={initialAskAIQuestion}
                onNavigateToDashboard={() => setCurrentView('overview')}
              />
            ) : activeCompanyId && activeCompany ? (
              <CompanyEmptyState
                company={activeCompany}
                onNavigateToUpload={() => {
                  setUploadTargetCompanyId(activeCompanyId);
                  setCurrentView('home');
                }}
                onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
              />
            ) : datasets.length > 0 ? (
              <AskAIPage
                dataset={datasets[0]}
                initialQuestion={initialAskAIQuestion}
                onNavigateToDashboard={() => setCurrentView('overview')}
              />
            ) : (
              <div className="max-w-xl mx-auto py-16 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-4 shadow-2xs">
                <p className="text-sm font-bold text-slate-800">No company data currently selected for questions</p>
                <p className="text-xs text-slate-500">
                  Upload an Excel spreadsheet or choose a company to begin natural language analysis.
                </p>
                <button
                  onClick={() => setCurrentView('home')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-2xs hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Upload Spreadsheet
                </button>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* 5. REPORTS VIEW */}
          {/* ========================================================================= */}
          {currentView === 'report' && (
            activeDataset ? (
              <ReportPage
                dataset={activeDataset}
                onBackToDashboard={() => setCurrentView('overview')}
              />
            ) : activeCompanyId && activeCompany ? (
              <CompanyEmptyState
                company={activeCompany}
                onNavigateToUpload={() => {
                  setUploadTargetCompanyId(activeCompanyId);
                  setCurrentView('home');
                }}
                onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
              />
            ) : datasets.length > 0 ? (
              <ReportPage
                dataset={datasets[0]}
                onBackToDashboard={() => setCurrentView('overview')}
              />
            ) : (
              <div className="max-w-xl mx-auto py-16 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-4 shadow-2xs">
                <p className="text-sm font-bold text-slate-800">No spreadsheet loaded for report preview</p>
                <p className="text-xs text-slate-500">
                  Select a business entity or upload an operating spreadsheet to generate printable executive reports.
                </p>
                <button
                  onClick={() => setCurrentView('home')}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-2xs hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Upload Spreadsheet
                </button>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* DEEP / PROGRESSIVE DISCLOSURE VIEWS */}
          {/* ========================================================================= */}
          {/* "Check Your Data" (formerly Data Understanding) */}
          {currentView === 'understanding' && (
            activeDataset ? (
              <DataUnderstandingPage
                dataset={activeDataset}
                onConfirmMapping={handleConfirmMapping}
                onBackToUpload={() => setCurrentView('home')}
              />
            ) : activeCompanyId && activeCompany ? (
              <CompanyEmptyState
                company={activeCompany}
                onNavigateToUpload={() => {
                  setUploadTargetCompanyId(activeCompanyId);
                  setCurrentView('home');
                }}
                onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
              />
            ) : (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
                <p className="text-slate-700 font-semibold">No spreadsheet currently selected for review.</p>
                <button
                  onClick={() => setCurrentView('home')}
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                >
                  Upload Spreadsheet
                </button>
              </div>
            )
          )}

          {/* Explore Data (Deep Filtering, Raw Tables, Custom Charts) */}
          {currentView === 'explore' && (
            activeDataset ? (
              <ExplorePage dataset={activeDataset} />
            ) : activeCompanyId && activeCompany ? (
              <CompanyEmptyState
                company={activeCompany}
                onNavigateToUpload={() => {
                  setUploadTargetCompanyId(activeCompanyId);
                  setCurrentView('home');
                }}
                onOpenCompanyModal={() => setIsCompanyModalOpen(true)}
              />
            ) : (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
                <p className="text-slate-700 font-semibold">No spreadsheet currently loaded for exploration.</p>
                <button
                  onClick={() => setCurrentView('home')}
                  className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold"
                >
                  Upload Spreadsheet
                </button>
              </div>
            )
          )}

          {/* Senior Executive Group Overview */}
          {currentView === 'group_overview' && (
            <GroupOverviewPage
              metrics={groupMetrics}
              datasets={datasets}
              onSelectSector={handleSelectSector}
              onSelectCompany={handleSelectCompany}
              onNavigateToUpload={handleNavigateToUpload}
              onAskAI={handleNavigateToAskAI}
              onOpenCompanyDirectory={() => setIsCompanyModalOpen(true)}
            />
          )}

          {/* Sector Overview */}
          {currentView === 'sector_overview' && (
            <SectorOverviewPage
              sectorId={activeSectorId || 'manufacturing'}
              datasets={datasets}
              onBackToGroup={handleGoToGroupOverview}
              onSelectCompany={handleSelectCompany}
              onNavigateToUpload={handleNavigateToUpload}
              onAskAI={handleNavigateToAskAI}
            />
          )}

          {/* Settings */}
          {currentView === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Global Company Modal */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        activeCompanyId={activeCompanyId}
        activeDataset={activeDataset}
        allDatasets={datasets}
        onSelectCompany={handleSelectCompany}
        onSelectGroup={handleGoToGroupOverview}
        onUploadForCompany={handleNavigateToUpload}
      />
    </div>
  );
}
