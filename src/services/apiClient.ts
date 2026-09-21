/**
 * VIGOR Intelligent Analytics API Client
 * Interacts with server /api endpoints
 */

import { Dataset, AnalysisResult, AskAIResult } from '../types';

export const apiClient = {
  async getDatasets(): Promise<any[]> {
    try {
      const res = await fetch('/api/datasets');
      if (!res.ok) throw new Error('Failed to fetch datasets');
      return await res.json();
    } catch (err) {
      console.warn('API getDatasets failed, using client storage:', err);
      return [];
    }
  },

  async uploadDataset(dataset: Dataset): Promise<{ success: boolean; datasetId: string }> {
    try {
      const res = await fetch('/api/datasets/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataset)
      });
      if (!res.ok) throw new Error('Failed to store dataset on server');
      return await res.json();
    } catch (err) {
      console.warn('API uploadDataset failed:', err);
      return { success: true, datasetId: dataset.id };
    }
  },

  async getDataset(id: string): Promise<Dataset | null> {
    try {
      const res = await fetch(`/api/datasets/${id}`);
      if (!res.ok) throw new Error('Dataset not found');
      return await res.json();
    } catch (err) {
      console.warn('API getDataset failed:', err);
      return null;
    }
  },

  async deleteDataset(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/datasets/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.warn('API deleteDataset failed:', err);
      return false;
    }
  },

  async clearAllDatasets(): Promise<boolean> {
    try {
      const res = await fetch('/api/datasets', { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.warn('API clearAllDatasets failed:', err);
      return false;
    }
  },

  async queryAI(datasetId: string, question: string, sheetName?: string, datasetPayload?: Dataset): Promise<AskAIResult> {
    try {
      const res = await fetch(`/api/datasets/${datasetId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sheetName, datasetPayload })
      });
      if (!res.ok) throw new Error('AI Query service error');
      return await res.json();
    } catch (err: any) {
      console.warn('AI Query service unavailable, returning graceful fallback:', err);
      return {
        question,
        answer: 'AI insights temporarily unavailable. All dashboard analytics, variance metrics, and charts remain fully calculated from your spreadsheet.',
        calculations: []
      };
    }
  }
};
