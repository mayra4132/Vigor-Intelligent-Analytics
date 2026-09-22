/**
 * VIGOR Intelligent Analytics API Client
 * Connects frontend with backend MySQL REST endpoints & Secure Auth
 */

import { Dataset, AskAIResult, SavedReport, AIConversationMessage, User } from '../types';
import { AUTH_CONFIG } from '../config/authConfig';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_CONFIG.TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(AUTH_CONFIG.TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(AUTH_CONFIG.TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Always transmit cookies
  });

  if (response.status === 401 && !url.includes('/api/auth/me')) {
    setStoredToken(null);
    window.dispatchEvent(new CustomEvent('vigor:unauthorized'));
  }

  return response;
}

export const apiClient = {
  // Check health and DB connection
  async checkHealth(): Promise<{ status: string; dbConnected: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Health check failed');
      return await res.json();
    } catch {
      return { status: 'offline', dbConnected: false };
    }
  },

  // ==========================================
  // AUTHENTICATION APIs
  // ==========================================

  async getAuthConfig(): Promise<{ googleClientId: string; allowedDomain: string; isDevMode: boolean }> {
    try {
      const res = await fetch('/api/auth/config');
      if (!res.ok) throw new Error('Config failed');
      return await res.json();
    } catch {
      return { googleClientId: '', allowedDomain: AUTH_CONFIG.DEFAULT_ALLOWED_DOMAIN, isDevMode: true };
    }
  },

  async checkSession(): Promise<User | null> {
    try {
      const res = await authFetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      if (data.authenticated && data.user) {
        return data.user;
      }
      return null;
    } catch {
      return null;
    }
  },

  async loginWithGoogle(credential: string): Promise<{ success: boolean; user?: User; error?: string; message?: string }> {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential })
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'AUTH_FAILED',
          message: data.message || 'Authentication failed'
        };
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: err?.message || 'Connection error during authentication.'
      };
    }
  },

  async loginDev(email: string, name?: string): Promise<{ success: boolean; user?: User; error?: string; message?: string }> {
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, name })
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'AUTH_FAILED',
          message: data.message || 'Authentication failed'
        };
      }
      if (data.token) {
        setStoredToken(data.token);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: err?.message || 'Connection error during dev login.'
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setStoredToken(null);
    }
  },

  // ==========================================
  // WORKBOOKS & PERSISTENCE
  // ==========================================

  // Check duplicate workbook hash
  async checkDuplicate(hash: string): Promise<{ duplicate: boolean; existing?: any }> {
    try {
      const res = await authFetch('/api/workbooks/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash })
      });
      if (!res.ok) return { duplicate: false };
      return await res.json();
    } catch {
      return { duplicate: false };
    }
  },

  // Save workbook to MySQL
  async saveWorkbook(dataset: Dataset): Promise<{ success: boolean; workbookId: string; savedToDb: boolean; warning?: string }> {
    try {
      const res = await authFetch('/api/workbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataset)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || 'Failed saving workbook');
      }
      return await res.json();
    } catch (err: any) {
      console.warn('Workbook save warning:', err);
      return {
        success: false,
        workbookId: dataset.id,
        savedToDb: false,
        warning: err?.message || 'Data storage temporarily unavailable.'
      };
    }
  },

  // List all stored workbooks from MySQL
  async getWorkbooks(): Promise<any[]> {
    try {
      const res = await authFetch('/api/workbooks');
      if (!res.ok) throw new Error('Failed to fetch workbooks');
      return await res.json();
    } catch (err) {
      console.warn('API getWorkbooks failed:', err);
      return [];
    }
  },

  // Backwards compatibility alias
  async getDatasets(): Promise<any[]> {
    return this.getWorkbooks();
  },

  // Retrieve single workbook from MySQL with all sheets and normalized data
  async getWorkbook(id: string): Promise<Dataset | null> {
    try {
      const res = await authFetch(`/api/workbooks/${id}`);
      if (!res.ok) throw new Error('Workbook not found');
      return await res.json();
    } catch (err) {
      console.warn('API getWorkbook failed:', err);
      return null;
    }
  },

  async getDataset(id: string): Promise<Dataset | null> {
    return this.getWorkbook(id);
  },

  // Delete workbook from MySQL
  async deleteWorkbook(id: string): Promise<boolean> {
    try {
      const res = await authFetch(`/api/workbooks/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.warn('API deleteWorkbook failed:', err);
      return false;
    }
  },

  async deleteDataset(id: string): Promise<boolean> {
    return this.deleteWorkbook(id);
  },

  // Clear all workbooks
  async clearAllWorkbooks(): Promise<boolean> {
    try {
      const res = await authFetch('/api/workbooks', { method: 'DELETE' });
      return res.ok;
    } catch (err) {
      console.warn('API clearAllWorkbooks failed:', err);
      return false;
    }
  },

  async clearAllDatasets(): Promise<boolean> {
    return this.clearAllWorkbooks();
  },

  // Ask VIGOR AI with Scope & Normalized Metrics Grounding
  async askAI(
    workbookId: string,
    question: string,
    sheetName?: string,
    scope?: string,
    datasetPayload?: Dataset
  ): Promise<AskAIResult> {
    try {
      const res = await authFetch(`/api/workbooks/${workbookId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sheetName, scope, datasetPayload })
      });
      if (!res.ok) throw new Error('AI Query service error');
      return await res.json();
    } catch (err: any) {
      console.warn('AI Query service notice:', err);
      return {
        question,
        answer: 'AI is temporarily unavailable. Your dashboards and saved data are still available.',
        calculations: []
      };
    }
  },

  // Get AI conversation history
  async getAiHistory(workbookId: string, scope?: string): Promise<AIConversationMessage[]> {
    try {
      const query = scope ? `?scope=${encodeURIComponent(scope)}` : '';
      const res = await authFetch(`/api/workbooks/${workbookId}/ai/history${query}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  // Save generated PDF report
  async saveReport(report: SavedReport): Promise<boolean> {
    try {
      const res = await authFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      return res.ok;
    } catch (err) {
      console.warn('API saveReport failed:', err);
      return false;
    }
  },

  // List saved reports
  async getReports(workbookId?: string): Promise<SavedReport[]> {
    try {
      const query = workbookId ? `?workbookId=${encodeURIComponent(workbookId)}` : '';
      const res = await authFetch(`/api/reports${query}`);
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  // Delete report
  async deleteReport(id: string): Promise<boolean> {
    try {
      const res = await authFetch(`/api/reports/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  }
};
