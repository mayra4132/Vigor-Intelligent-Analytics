/**
 * VIGOR Intelligent Analytics - Express Full-Stack Server
 * Production MySQL backend, Normalized Workbooks, Sheet Navigation,
 * Deterministic Financial Calculations, Grounded Gemini AI Q&A, and PDF Reports
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import {
  Dataset,
  AskAIResult,
  ChartConfig,
  NormalizedMetric,
  ConsolidatedPerformanceData
} from './src/types';
import {
  initDbPool,
  isDatabaseConnected,
  saveWorkbookToDb,
  listWorkbooksFromDb,
  getWorkbookByIdFromDb,
  deleteWorkbookFromDb,
  clearAllWorkbooksFromDb,
  findExistingWorkbookByHash,
  saveAiMessageToDb,
  getAiMessagesFromDb,
  saveReportToDb,
  listReportsFromDb,
  deleteReportFromDb
} from './server/db';
import { formatCompactNumber, formatPercent } from './src/services/analyticsEngine';

dotenv.config();

const currentFilename = typeof __filename !== 'undefined' ? __filename : (typeof import.meta !== 'undefined' && (import.meta as any).url ? fileURLToPath((import.meta as any).url) : '');
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(currentFilename || process.cwd());

// In-Memory Fallback Cache for resilient offline/degraded operations
const memoryDatasetsStore = new Map<string, Dataset>();

// Lazy Gemini AI Client initialization
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Ensure MariaDB daemon is active in container
function ensureMariaDBRunning(): Promise<void> {
  return new Promise(resolve => {
    exec('mariadb -e "SELECT 1;" 2>/dev/null', (err) => {
      if (!err) {
        return resolve();
      }
      // Attempt start if stopped
      exec('mkdir -p /run/mysqld && chown -R mysql:mysql /run/mysqld /var/lib/mysql && su -s /bin/bash mysql -c "mariadbd &"', () => {
        setTimeout(resolve, 2000);
      });
    });
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // Ensure DB ready
  await ensureMariaDBRunning();
  await initDbPool().catch(err => {
    console.warn('[DB] MySQL init warning:', err?.message);
  });

  // ==========================================
  // REST API: SYSTEM & HEALTH
  // ==========================================

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      dbConnected: isDatabaseConnected(),
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // REST API: WORKBOOKS & PERSISTENCE (MYSQL)
  // ==========================================

  // Check for duplicate upload
  app.post('/api/workbooks/check-duplicate', async (req, res) => {
    try {
      const { hash } = req.body;
      if (!hash) {
        return res.json({ duplicate: false });
      }
      if (isDatabaseConnected()) {
        const existing = await findExistingWorkbookByHash(hash);
        if (existing) {
          return res.json({ duplicate: true, existing });
        }
      }
      res.json({ duplicate: false });
    } catch {
      res.json({ duplicate: false });
    }
  });

  // POST /api/workbooks - Auto-save workbook with transaction
  app.post('/api/workbooks', async (req, res) => {
    try {
      const dataset: Dataset = req.body;
      if (!dataset || !dataset.id) {
        return res.status(400).json({ error: 'Invalid workbook payload.' });
      }

      dataset.uploadedAt = dataset.uploadedAt || new Date().toISOString();
      dataset.lastOpenedAt = new Date().toISOString();

      // Always maintain in-memory cache as resilient backup
      memoryDatasetsStore.set(dataset.id, dataset);

      // Save to MySQL with transaction
      if (isDatabaseConnected()) {
        const dbResult = await saveWorkbookToDb(dataset);
        return res.status(201).json({
          success: true,
          workbookId: dbResult.workbookId,
          savedToDb: true,
          message: 'Saved to My Data ✓'
        });
      } else {
        // DB not connected
        return res.status(200).json({
          success: true,
          workbookId: dataset.id,
          savedToDb: false,
          warning: 'Data storage is temporarily unavailable. Dashboard is running in local memory.'
        });
      }
    } catch (err: any) {
      console.error('Error saving workbook to MySQL:', err);
      // Resilient: dataset is in memory, report DB issue clearly
      res.status(500).json({
        error: 'Database save failed.',
        details: err?.message,
        savedToDb: false
      });
    }
  });

  // GET /api/workbooks - List stored workbooks for My Data
  app.get('/api/workbooks', async (req, res) => {
    try {
      if (isDatabaseConnected()) {
        const workbooks = await listWorkbooksFromDb();
        return res.json(workbooks);
      }
      // Fallback to in-memory store
      const list = Array.from(memoryDatasetsStore.values()).map(d => ({
        id: d.id,
        name: d.name || d.companyName || d.filename,
        filename: d.filename,
        fileSize: d.fileSize || 0,
        uploadedAt: d.uploadedAt,
        reportingPeriod: d.reportingPeriod || d.reporting_period || 'Current Period',
        sheetCount: d.parsedWorkbook?.totalSheets || d.sheets?.length || 1,
        status: 'ready',
        primarySheet: d.activeSheetName || d.selectedSheet || 'CONSOLIDATED'
      }));
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed listing workbooks' });
    }
  });

  // GET /api/workbooks/:id - Load stored parsed workbook from MySQL
  app.get('/api/workbooks/:id', async (req, res) => {
    try {
      const id = req.params.id;
      if (isDatabaseConnected()) {
        const wb = await getWorkbookByIdFromDb(id);
        if (wb) {
          memoryDatasetsStore.set(wb.id, wb);
          return res.json(wb);
        }
      }

      // Fallback to in-memory
      const mem = memoryDatasetsStore.get(id);
      if (mem) {
        return res.json(mem);
      }

      res.status(404).json({ error: 'Workbook not found in database.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed retrieving workbook' });
    }
  });

  // DELETE /api/workbooks/:id - Cascading delete workbook
  app.delete('/api/workbooks/:id', async (req, res) => {
    try {
      const id = req.params.id;
      memoryDatasetsStore.delete(id);
      if (isDatabaseConnected()) {
        await deleteWorkbookFromDb(id);
      }
      res.json({ success: true, message: `Workbook ${id} removed.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed deleting workbook' });
    }
  });

  // DELETE /api/workbooks - Clear all
  app.delete('/api/workbooks', async (req, res) => {
    try {
      memoryDatasetsStore.clear();
      if (isDatabaseConnected()) {
        await clearAllWorkbooksFromDb();
      }
      res.json({ success: true, message: 'All workbooks cleared.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed clearing workbooks' });
    }
  });

  // Backward compatibility aliases for existing client code
  app.get('/api/datasets', (req, res) => res.redirect(307, '/api/workbooks'));
  app.post('/api/datasets/upload', (req, res) => res.redirect(307, '/api/workbooks'));
  app.get('/api/datasets/:id', (req, res) => res.redirect(307, `/api/workbooks/${req.params.id}`));
  app.delete('/api/datasets/:id', (req, res) => res.redirect(307, `/api/workbooks/${req.params.id}`));
  app.delete('/api/datasets', (req, res) => res.redirect(307, '/api/workbooks'));

  // ==========================================
  // REST API: ASK VIGOR AI (GROUNDED IN WORKBOOK)
  // ==========================================

  app.post('/api/workbooks/:id/query', async (req, res) => {
    try {
      const { question, sheetName, scope, datasetPayload } = req.body;
      const workbookId = req.params.id;

      let ds: Dataset | null = null;
      if (isDatabaseConnected()) {
        ds = await getWorkbookByIdFromDb(workbookId);
      }
      if (!ds) {
        ds = memoryDatasetsStore.get(workbookId) || datasetPayload || null;
      }

      if (!ds) {
        return res.status(404).json({ error: 'Workbook not found. Please upload or select a workbook.' });
      }

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question string is required.' });
      }

      // Determine active sheet and scope
      const targetSheetName = sheetName || ds.activeSheetName || ds.selectedSheet || 'CONSOLIDATED';
      const activeScope = scope || (targetSheetName.toUpperCase().includes('CONSOLIDAT') ? 'VIGOR Group / Consolidated' : targetSheetName);

      // Find performance data for active sheet
      let perf: ConsolidatedPerformanceData | undefined = undefined;
      if (ds.parsedWorkbook?.sheets) {
        const found = ds.parsedWorkbook.sheets.find(s => s.sheetName.toLowerCase() === targetSheetName.toLowerCase());
        if (found?.performanceData) {
          perf = found.performanceData;
        }
      }
      if (!perf && ds.consolidatedData) {
        perf = ds.consolidatedData;
      }

      const qLower = question.toLowerCase();
      const calculations: { label: string; value: string | number }[] = [];
      let chart: ChartConfig | undefined = undefined;
      let verifiedFacts: string[] = [];
      let sourceContext = `Source: ${ds.name || ds.filename} → ${targetSheetName} → ${perf?.reportingPeriod || 'Current Period'}`;

      if (perf) {
        const fin = perf.financialMetrics || [];
        const op = perf.operationalMetrics || [];
        const allM = [...fin, ...op];

        // 1. Deterministic Math & Metric Lookups
        const rev = fin.find(m => m.metricName.toLowerCase().includes('revenue'));
        const gp = fin.find(m => m.metricName.toLowerCase().includes('gross profit') && !m.metricName.includes('%'));
        const ebitda = fin.find(m => m.metricName.toLowerCase().includes('ebitda'));
        const np = fin.find(m => m.metricName.toLowerCase().includes('net profit') && !m.metricName.includes('%'));
        const opex = fin.find(m => m.metricName.toLowerCase().includes('opex') || m.metricName.toLowerCase().includes('operating cost'));

        if (rev) {
          calculations.push({ label: 'Revenue Actual', value: formatCompactNumber(rev.actual || 0) });
          if (rev.plan) calculations.push({ label: 'Revenue Plan', value: formatCompactNumber(rev.plan) });
          if (rev.variance) calculations.push({ label: 'Revenue Variance', value: formatCompactNumber(rev.variance) });
          if (rev.achievementPct) calculations.push({ label: 'Revenue Achievement', value: formatPercent(rev.achievementPct) });
          verifiedFacts.push(`Revenue: Actual ${formatCompactNumber(rev.actual || 0)}, Plan ${formatCompactNumber(rev.plan || 0)}, Variance ${formatCompactNumber(rev.variance || 0)} (${formatPercent(rev.achievementPct || 0)})`);
        }

        if (np) {
          calculations.push({ label: 'Net Profit Actual', value: formatCompactNumber(np.actual || 0) });
          if (np.plan) calculations.push({ label: 'Net Profit Plan', value: formatCompactNumber(np.plan) });
          verifiedFacts.push(`Net Profit: Actual ${formatCompactNumber(np.actual || 0)}, Plan ${formatCompactNumber(np.plan || 0)}, Variance ${formatCompactNumber(np.variance || 0)}`);
        }

        if (ebitda) {
          calculations.push({ label: 'EBITDA', value: formatCompactNumber(ebitda.actual || 0) });
          verifiedFacts.push(`EBITDA: Actual ${formatCompactNumber(ebitda.actual || 0)}, Plan ${formatCompactNumber(ebitda.plan || 0)}`);
        }

        // Check if question asks for Trend
        const isTrendQ = qLower.includes('trend') || qLower.includes('history') || qLower.includes('monthly') || qLower.includes('jan');
        const isRevenueQ = qLower.includes('revenue') || qLower.includes('sales');
        const isProfitQ = qLower.includes('profit') || qLower.includes('ebitda') || qLower.includes('loss');

        let targetMetricForTrend: NormalizedMetric | undefined = undefined;
        if (isProfitQ && np) targetMetricForTrend = np;
        else if (isProfitQ && ebitda) targetMetricForTrend = ebitda;
        else if (isRevenueQ && rev) targetMetricForTrend = rev;
        else targetMetricForTrend = rev || np || fin[0];

        if (isTrendQ && targetMetricForTrend && targetMetricForTrend.monthlyValues) {
          const mKeys = perf.availableMonths || Object.keys(targetMetricForTrend.monthlyValues);
          const trendData = mKeys.map(mKey => ({
            month: mKey,
            Actual: targetMetricForTrend!.monthlyValues?.[mKey] ?? 0,
            Plan: targetMetricForTrend!.monthlyPlanValues?.[mKey] ?? null
          }));

          chart = {
            id: `chart_trend_${Date.now()}`,
            title: `${targetMetricForTrend.metricName} Monthly Progression (${perf.reportingPeriod})`,
            type: 'line',
            xAxisKey: 'month',
            yAxisKeys: ['Actual', 'Plan'].filter(k => trendData.some(d => d[k as keyof typeof d] !== null)),
            seriesColors: { Actual: '#4f46e5', Plan: '#94a3b8' },
            data: trendData
          };

          verifiedFacts.push(`Monthly ${targetMetricForTrend.metricName} trend values: ${mKeys.map(k => `${k}: ${targetMetricForTrend!.monthlyValues?.[k]}`).join(', ')}`);
        } else if (qLower.includes('compare') || qLower.includes('actual vs plan') || qLower.includes('vs plan') || qLower.includes('plan')) {
          // Actual vs Plan bar comparison
          const topMetrics = fin.slice(0, 5).filter(m => m.actual !== null && m.plan !== null);
          if (topMetrics.length > 0) {
            chart = {
              id: `chart_plan_${Date.now()}`,
              title: 'Actual vs Plan Comparison',
              type: 'bar',
              xAxisKey: 'metric',
              yAxisKeys: ['Actual', 'Plan'],
              seriesColors: { Actual: '#4f46e5', Plan: '#94a3b8' },
              data: topMetrics.map(m => ({
                metric: m.metricName,
                Actual: m.actual,
                Plan: m.plan
              }))
            };
          }
        }

        // Find metrics furthest below plan
        const belowPlan = fin
          .filter(m => m.actual !== null && m.plan !== null && (m.variance || 0) < 0)
          .sort((a, b) => (a.variance || 0) - (b.variance || 0));

        if (belowPlan.length > 0) {
          verifiedFacts.push(`Metrics furthest below Plan: ${belowPlan.slice(0, 3).map(m => `${m.metricName} (Variance: ${formatCompactNumber(m.variance || 0)}, ${formatPercent(m.achievementPct || 0)} achievement)`).join('; ')}`);
        }
      }

      // Formulate Grounded Answer via Gemini
      const ai = getGemini();
      let answerText = '';

      if (ai && verifiedFacts.length > 0) {
        const promptContext = `
You are the executive AI analyst for VIGOR Intelligent Analytics.
Current Scope: "${activeScope}" (Workbook: "${ds.name || ds.filename}", Sheet: "${targetSheetName}").
Reporting Period: "${perf?.reportingPeriod || 'Current Period'}".

STRICT BUSINESS FACTS & CALCULATIONS (Calculated deterministically by the application):
${verifiedFacts.map(f => `- ${f}`).join('\n')}

User Question: "${question}"

MANDATORY RULES:
1. Ground your answer strictly in the facts above.
2. Never make up numbers or guess missing metrics.
3. Keep the tone concise, professional, and management-ready (2 to 4 sentences).
4. Clearly state exact currency amounts and variance percentages.
5. If the metric is not present in the data, state that clearly without guessing.
`;
        try {
          const geminiRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: promptContext,
            config: {
              systemInstruction: 'You are VIGOR Intelligent Analytics executive AI assistant. Provide concise, strictly factual business intelligence answers.'
            }
          });
          answerText = geminiRes.text?.trim() || '';
        } catch (apiErr: any) {
          console.warn('[Gemini] API error:', apiErr?.message);
        }
      }

      // Deterministic analytical fallback if Gemini is offline
      if (!answerText) {
        if (perf) {
          const rev = perf.financialMetrics?.find(m => m.metricName.toLowerCase().includes('revenue'));
          const np = perf.financialMetrics?.find(m => m.metricName.toLowerCase().includes('net profit') && !m.metricName.includes('%'));
          if (qLower.includes('revenue')) {
            if (rev) {
              const diffText = (rev.variance || 0) >= 0 ? 'exceeded plan by' : 'trailed plan by';
              answerText = `In ${perf.reportingPeriod}, Revenue recorded at ${formatCompactNumber(rev.actual || 0)}, which ${diffText} ${formatCompactNumber(Math.abs(rev.variance || 0))} (${formatPercent(rev.achievementPct || 0)} achievement).`;
            } else {
              answerText = `Revenue data is not specified in the current sheet (${targetSheetName}).`;
            }
          } else if (qLower.includes('net profit') || qLower.includes('profit')) {
            if (np) {
              answerText = `Net Profit for ${perf.reportingPeriod} stood at ${formatCompactNumber(np.actual || 0)} against a target plan of ${formatCompactNumber(np.plan || 0)}, with a variance of ${formatCompactNumber(np.variance || 0)}.`;
            } else {
              answerText = `Net Profit data is not available in the active sheet.`;
            }
          } else if (qLower.includes('perform') || qLower.includes('how did we')) {
            answerText = `For ${perf.reportingPeriod} (${activeScope}), Revenue reached ${formatCompactNumber(rev?.actual || 0)} (${formatPercent(rev?.achievementPct || 0)} of Plan), while Net Profit stood at ${formatCompactNumber(np?.actual || 0)}.`;
          } else {
            answerText = `Analysis for ${activeScope} (${perf.reportingPeriod}): Revenue is ${formatCompactNumber(rev?.actual || 0)} and Net Profit is ${formatCompactNumber(np?.actual || 0)}.`;
          }
        } else {
          answerText = `No structured financial metrics were detected for ${activeScope}.`;
        }
      }

      // Persist conversation to MySQL
      if (isDatabaseConnected()) {
        await saveAiMessageToDb(
          workbookId,
          activeScope,
          question,
          answerText,
          calculations,
          chart,
          sourceContext
        ).catch(err => console.warn('[DB] Failed saving AI message:', err?.message));
      }

      const responsePayload: AskAIResult = {
        question,
        answer: answerText,
        calculations,
        chart,
        sourceContext,
        scope: activeScope
      };

      res.json(responsePayload);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed processing query' });
    }
  });

  // GET /api/workbooks/:id/ai/history - Retrieve conversation history
  app.get('/api/workbooks/:id/ai/history', async (req, res) => {
    try {
      const scope = (req.query.scope as string) || 'Consolidated';
      if (isDatabaseConnected()) {
        const messages = await getAiMessagesFromDb(req.params.id, scope);
        return res.json(messages);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed retrieving history' });
    }
  });

  // ==========================================
  // REST API: REPORTS & PDF MANAGEMENT
  // ==========================================

  // POST /api/reports - Save generated report record in MySQL
  app.post('/api/reports', async (req, res) => {
    try {
      const report = req.body;
      if (!report || !report.id || !report.workbook_id) {
        return res.status(400).json({ error: 'Invalid report structure.' });
      }
      if (isDatabaseConnected()) {
        await saveReportToDb(report);
      }
      res.status(201).json({ success: true, reportId: report.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed saving report' });
    }
  });

  // GET /api/reports - List stored reports from MySQL
  app.get('/api/reports', async (req, res) => {
    try {
      const workbookId = req.query.workbookId as string | undefined;
      if (isDatabaseConnected()) {
        const reports = await listReportsFromDb(workbookId);
        return res.json(reports);
      }
      res.json([]);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed listing reports' });
    }
  });

  // DELETE /api/reports/:id - Delete a report
  app.delete('/api/reports/:id', async (req, res) => {
    try {
      if (isDatabaseConnected()) {
        await deleteReportFromDb(req.params.id);
      }
      res.json({ success: true, message: 'Report removed' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed deleting report' });
    }
  });

  // ==========================================
  // VITE / STATIC MIDDLEWARE
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VIGOR Intelligent Analytics server running on port ${PORT}`);
  });
}

startServer();
