/**
 * VIGOR Intelligent Analytics - Main Application Component
 * Clean, stable production architecture.
 * Real data only. No demo injection or fake fallback.
 */

import React, { useState, useEffect } from 'react';
import { AppView, Dataset } from './types';
import { apiClient } from './services/apiClient';
import { Navigation } from './components/Navigation';
import { GlobalHeaderSwitcher } from './components/GlobalHeaderSwitcher';
import { WelcomeScreen } from './components/WelcomeScreen';
import { UploadPage } from './pages/UploadPage';
import { DashboardPage } from './pages/DashboardPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { WorkbookExplorerPage } from './pages/WorkbookExplorerPage';
import { getOrParseSheetPerformance } from './utils/excelParser';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('overview');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);

  // Initialize workspace: Real data only from localStorage / backend.
  // Never inject fake companies or demo files.
  useEffect(() => {
    async function initWorkspace() {
      try {
        let loadedDatasets: Dataset[] = [];
        try {
          const localStr = localStorage.getItem('vigor_analytics_datasets');
          if (localStr) {
            const parsed = JSON.parse(localStr);
            if (Array.isArray(parsed)) {
              // Strictly filter out any legacy demo or sample datasets
              loadedDatasets = parsed.filter(
                (d: any) =>
                  d &&
                  !d.isSample &&
                  !String(d.id || '').startsWith('sample-') &&
                  !String(d.id || '').startsWith('demo-')
              );
            }
          }
        } catch (e) {
          console.error('Failed reading local datasets:', e);
        }

        // If local storage is empty, check backend store
        if (loadedDatasets.length === 0) {
          try {
            const stored = await apiClient.getDatasets();
            if (Array.isArray(stored) && stored.length > 0) {
              loadedDatasets = stored.filter(
                (d: any) =>
                  d &&
                  !d.isSample &&
                  !String(d.id || '').startsWith('sample-') &&
                  !String(d.id || '').startsWith('demo-')
              );
            }
          } catch {}
        }

        // Clean up localStorage if only demo data was present
        if (loadedDatasets.length === 0) {
          setDatasets([]);
          setActiveDataset(null);
          try {
            localStorage.removeItem('vigor_analytics_datasets');
            localStorage.removeItem('vigor_active_dataset_id');
            localStorage.removeItem('vigor_active_company_id');
            localStorage.removeItem('vigor_active_sector_id');
          } catch {}
          return;
        }

        setDatasets(loadedDatasets);
        try {
          localStorage.setItem('vigor_analytics_datasets', JSON.stringify(loadedDatasets));
        } catch {}

        const savedDatasetId = localStorage.getItem('vigor_active_dataset_id');
        const active = (savedDatasetId && loadedDatasets.find(d => d.id === savedDatasetId)) || loadedDatasets[0] || null;
        setActiveDataset(active);
      } catch (err) {
        console.error('Workspace initialization error:', err);
        setDatasets([]);
        setActiveDataset(null);
      }
    }

    initWorkspace();
  }, []);

  // When a new workbook is uploaded, overwrite previous data cleanly
  const handleDatasetParsed = (newDataset: Dataset) => {
    setActiveDataset(newDataset);
    setDatasets([newDataset]);

    try {
      localStorage.setItem('vigor_analytics_datasets', JSON.stringify([newDataset]));
      localStorage.setItem('vigor_active_dataset_id', newDataset.id);
    } catch {}

    // Multi-sheet workbooks open directly into the Executive Overview
    setCurrentView('overview');
  };

  // Workbook sheet switching handler (instant zero-latency cache retrieval)
  const handleSelectWorkbookSheet = (sheetName: string) => {
    if (!activeDataset) return;
    const newPerf = getOrParseSheetPerformance(activeDataset, sheetName);
    const updatedDataset: Dataset = {
      ...activeDataset,
      activeSheetName: sheetName,
      selectedSheet: sheetName,
      consolidatedData: newPerf || undefined,
    };

    setActiveDataset(updatedDataset);
    setDatasets(prev =>
      prev.map(d => (d.id === updatedDataset.id ? updatedDataset : d))
    );

    try {
      localStorage.setItem(
        'vigor_analytics_datasets',
        JSON.stringify(datasets.map(d => (d.id === updatedDataset.id ? updatedDataset : d)))
      );
    } catch {}

    setCurrentView('overview');
  };

  const handleSelectDataset = (dataset: Dataset) => {
    setActiveDataset(dataset);
    try {
      localStorage.setItem('vigor_active_dataset_id', dataset.id);
    } catch {}
    setCurrentView('overview');
  };

  const handleDeleteDataset = async (id: string) => {
    await apiClient.deleteDataset(id).catch(() => {});
    const updated = datasets.filter(d => d.id !== id);
    setDatasets(updated);

    if (activeDataset?.id === id) {
      const nextActive = updated[0] || null;
      setActiveDataset(nextActive);
      if (nextActive) {
        try {
          localStorage.setItem('vigor_active_dataset_id', nextActive.id);
        } catch {}
      } else {
        try {
          localStorage.removeItem('vigor_active_dataset_id');
        } catch {}
      }
    }

    try {
      localStorage.setItem('vigor_analytics_datasets', JSON.stringify(updated));
    } catch {}
  };

  const handleClearAllData = async () => {
    await apiClient.clearAllDatasets().catch(() => {});
    setDatasets([]);
    setActiveDataset(null);
    try {
      localStorage.removeItem('vigor_analytics_datasets');
      localStorage.removeItem('vigor_active_dataset_id');
      localStorage.removeItem('vigor_active_company_id');
      localStorage.removeItem('vigor_active_sector_id');
    } catch {}
    setCurrentView('overview');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Navigation
        currentView={currentView}
        onNavigate={setCurrentView}
        activeDataset={activeDataset}
        allDatasets={datasets}
        onNavigateToUpload={() => setCurrentView('home')}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        {/* Single Context Control Header */}
        <GlobalHeaderSwitcher
          activeDataset={activeDataset}
          allDatasets={datasets}
          onSelectSector={() => {}}
          onSelectCompany={() => {}}
          onSelectDataset={handleSelectDataset}
          onGoToGroupOverview={() => setCurrentView('overview')}
          onNavigateToUpload={() => setCurrentView('home')}
          onSelectSheet={handleSelectWorkbookSheet}
          onOpenExplorer={() => setCurrentView('workbook')}
        />

        {/* Scrollable View Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* 1. OVERVIEW VIEW */}
          {(currentView === 'overview' || currentView === 'dashboard') && (
            activeDataset ? (
              <DashboardPage
                dataset={activeDataset}
                onSelectSheet={handleSelectWorkbookSheet}
                onOpenExplorer={() => setCurrentView('workbook')}
                onNavigateToUpload={() => setCurrentView('home')}
              />
            ) : (
              <WelcomeScreen
                onNavigateToUpload={() => setCurrentView('home')}
              />
            )
          )}

          {/* 2. WORKBOOK EXPLORER VIEW */}
          {currentView === 'workbook' && (
            activeDataset ? (
              <WorkbookExplorerPage
                dataset={activeDataset}
                onSelectSheet={handleSelectWorkbookSheet}
                onNavigateToDashboard={() => setCurrentView('overview')}
                onUploadDifferent={() => setCurrentView('home')}
              />
            ) : (
              <WelcomeScreen
                onNavigateToUpload={() => setCurrentView('home')}
              />
            )
          )}

          {/* 3. UPLOAD DATA VIEW */}
          {currentView === 'home' && (
            <UploadPage
              onDatasetParsed={handleDatasetParsed}
              recentDatasets={datasets}
              onSelectRecent={handleSelectDataset}
            />
          )}

          {/* 4. MY DATA VIEW */}
          {currentView === 'datasets' && (
            <DatasetsPage
              datasets={datasets}
              activeDataset={activeDataset}
              onSelectDataset={handleSelectDataset}
              onDeleteDataset={handleDeleteDataset}
              onNavigateToUpload={() => setCurrentView('home')}
              onClearAll={handleClearAllData}
            />
          )}
        </main>
      </div>
    </div>
  );
}
