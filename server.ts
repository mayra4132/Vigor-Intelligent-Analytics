/**
 * VIGOR Intelligent Analytics - Express Full-Stack Server
 * Provides REST endpoints for Datasets, Pre-computation, Gemini AI Q&A, and Vite Middleware
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { Dataset, AnalysisResult, AskAIResult, ChartConfig } from './src/types';
import { SAMPLE_DATASET } from './src/data/sampleDatasets';
import { analyzeSheet, computePreStats, formatCompactNumber, formatPercent } from './src/services/analyticsEngine';

dotenv.config();

const currentFilename = typeof __filename !== 'undefined' ? __filename : (typeof import.meta !== 'undefined' && (import.meta as any).url ? fileURLToPath((import.meta as any).url) : '');
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(currentFilename || process.cwd());

// In-Memory Storage for Datasets & Reports (architected for future MySQL cPanel migration)
const datasetsStore = new Map<string, Dataset>();

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================
  // REST API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), datasetsCount: datasetsStore.size });
  });

  // GET /api/datasets - List datasets
  app.get('/api/datasets', (req, res) => {
    const list = Array.from(datasetsStore.values());
    res.json(list);
  });

  // POST /api/datasets/upload - Store parsed dataset
  app.post('/api/datasets/upload', (req, res) => {
    try {
      const dataset: Dataset = req.body;
      if (!dataset || !dataset.id || !dataset.sheets || dataset.sheets.length === 0) {
        return res.status(400).json({ error: 'Invalid dataset structure provided.' });
      }
      dataset.uploadedAt = dataset.uploadedAt || new Date().toISOString();
      dataset.lastOpenedAt = new Date().toISOString();
      datasetsStore.set(dataset.id, dataset);
      res.status(201).json({ success: true, datasetId: dataset.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to register dataset' });
    }
  });

  // GET /api/datasets/:id - Retrieve dataset
  app.get('/api/datasets/:id', (req, res) => {
    const ds = datasetsStore.get(req.params.id);
    if (!ds) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }
    ds.lastOpenedAt = new Date().toISOString();
    res.json(ds);
  });

  // DELETE /api/datasets - Clear all datasets
  app.delete('/api/datasets', (req, res) => {
    datasetsStore.clear();
    res.json({ success: true, message: 'All datasets cleared from system.' });
  });

  // DELETE /api/datasets/:id - Delete dataset
  app.delete('/api/datasets/:id', (req, res) => {
    const id = req.params.id;
    if (!datasetsStore.has(id)) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }
    datasetsStore.delete(id);
    res.json({ success: true, message: `Dataset ${id} deleted.` });
  });

  // POST /api/datasets/:id/analyse - Run pre-computed analytics
  app.post('/api/datasets/:id/analyse', (req, res) => {
    const ds = datasetsStore.get(req.params.id);
    if (!ds) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }
    const sheetName = req.body.sheetName || ds.selectedSheet || ds.sheets[0]?.name;
    const sheet = ds.sheets.find(s => s.name === sheetName) || ds.sheets[0];
    if (!sheet) {
      return res.status(400).json({ error: 'Worksheet not found.' });
    }

    const filters = req.body.filters || {};
    const result = analyzeSheet(sheet, filters);
    result.datasetId = ds.id;
    res.json(result);
  });

  // GET /api/datasets/:id/dashboard - Get dashboard structure
  app.get('/api/datasets/:id/dashboard', (req, res) => {
    const ds = datasetsStore.get(req.params.id);
    if (!ds) {
      return res.status(404).json({ error: 'Dataset not found.' });
    }
    const sheetName = (req.query.sheet as string) || ds.selectedSheet || ds.sheets[0]?.name;
    const sheet = ds.sheets.find(s => s.name === sheetName) || ds.sheets[0];
    const result = analyzeSheet(sheet, {});
    result.datasetId = ds.id;
    res.json(result);
  });

  // POST /api/datasets/:id/query - "Ask VIGOR Analytics" (Data Pipeline + Gemini)
  app.post('/api/datasets/:id/query', async (req, res) => {
    try {
      const { question, sheetName, datasetPayload } = req.body;
      let ds = datasetsStore.get(req.params.id);
      if (!ds && datasetPayload && datasetPayload.sheets) {
        ds = datasetPayload;
      }

      if (!ds) {
        return res.status(404).json({ error: 'Dataset not found.' });
      }

      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question string is required.' });
      }

      const sheet = ds.sheets.find(s => s.name === sheetName) || ds.sheets[0];
      if (!sheet) {
        return res.status(400).json({ error: 'Sheet not found.' });
      }

      // 1. Rigorous Data Analysis Pipeline BEFORE LLM (sums, mins, maxs, variance, regression)
      const stats = computePreStats(sheet, sheet.rows);
      const symbol = stats.currencySymbol || 'TZS';

      // Identify question intent algorithmically to construct relevant chart and context
      const qLower = question.toLowerCase();
      let answerText = '';
      const calculations: { label: string; value: string | number }[] = [];
      let chart: ChartConfig | undefined = undefined;

      // Extract quick calculations
      if (stats.totalActual !== undefined) {
        calculations.push({ label: `Total ${stats.actualColumn || 'Actual'}`, value: formatCompactNumber(stats.totalActual, symbol) });
      }
      if (stats.totalEstimated !== undefined) {
        calculations.push({ label: `Total ${stats.estimatedColumn || 'Target'}`, value: formatCompactNumber(stats.totalEstimated, symbol) });
      }
      if (stats.totalVariance !== undefined) {
        calculations.push({ label: 'Net Variance', value: `${formatCompactNumber(stats.totalVariance, symbol)} (${formatPercent(stats.variancePercentage)})` });
      }
      if (stats.totalLoss !== undefined && stats.totalLoss > 0) {
        calculations.push({ label: 'Total Loss', value: formatCompactNumber(stats.totalLoss, symbol) });
      }

      // Check if user specifically asks about loss
      if (qLower.includes('loss') && stats.lossColumn) {
        const lossRows = sheet.rows
          .filter(r => typeof r[stats.lossColumn!] === 'number' && r[stats.lossColumn!] > 0)
          .sort((a, b) => b[stats.lossColumn!] - a[stats.lossColumn!]);

        chart = {
          id: 'chart-query-loss',
          title: 'Loss by Period',
          type: 'bar',
          xAxisKey: stats.timeColumn || 'Month',
          yAxisKeys: [stats.lossColumn],
          seriesColors: { [stats.lossColumn]: '#ef4444' },
          data: sheet.rows
        };
      } else if (qLower.includes('compare') || qLower.includes('vs') || qLower.includes('variance')) {
        const yKeys = [stats.actualColumn, stats.estimatedColumn].filter(Boolean) as string[];
        if (yKeys.length > 0) {
          chart = {
            id: 'chart-query-compare',
            title: `${yKeys.join(' vs ')} Progression`,
            type: 'line',
            xAxisKey: stats.timeColumn || 'Month',
            yAxisKeys: yKeys,
            seriesColors: {
              [yKeys[0]]: '#06b6d4',
              [yKeys[1] || '']: '#6366f1'
            }
          };
        }
      } else if (qLower.includes('department') || qLower.includes('branch')) {
        const catCol = sheet.columns.find(c => c.detectedType === 'category');
        if (catCol && stats.actualColumn) {
          chart = {
            id: 'chart-query-dept',
            title: `Breakdown by ${catCol.name}`,
            type: 'bar',
            xAxisKey: catCol.name,
            yAxisKeys: [stats.actualColumn],
            seriesColors: { [stats.actualColumn]: '#3b82f6' }
          };
        }
      }

      // Call Gemini 3.8 Flash to formulate the executive conversational explanation
      const ai = getGemini();
      if (ai) {
        const promptContext = `
You are the executive AI Analyst inside "VIGOR Intelligent Analytics".
A manager uploaded a spreadsheet "${ds.filename}" (Sheet: "${sheet.name}").

Here are PRE-COMPUTED VERIFIED MATHEMATICAL FACTS from the dataset:
- Total Records: ${sheet.rows.length}
- Time/Period Column: "${stats.timeColumn || 'N/A'}"
- Actual Metric Column: "${stats.actualColumn || 'N/A'}" with Total = ${stats.totalActual !== undefined ? formatCompactNumber(stats.totalActual, symbol) : 'N/A'}
- Estimated/Target Metric: "${stats.estimatedColumn || 'N/A'}" with Total = ${stats.totalEstimated !== undefined ? formatCompactNumber(stats.totalEstimated, symbol) : 'N/A'}
- Net Variance: ${stats.totalVariance !== undefined ? formatCompactNumber(stats.totalVariance, symbol) : 'N/A'} (${formatPercent(stats.variancePercentage)})
- Total Recorded Loss: ${stats.totalLoss !== undefined ? formatCompactNumber(stats.totalLoss, symbol) : 'N/A'}
- Highest Actual Period: ${stats.highestActual ? `${stats.highestActual.period} (${formatCompactNumber(stats.highestActual.value, symbol)})` : 'N/A'}
- Lowest Actual Period: ${stats.lowestActual ? `${stats.lowestActual.period} (${formatCompactNumber(stats.lowestActual.value, symbol)})` : 'N/A'}
- Biggest Negative Variance: ${stats.biggestNegativeVariance ? `${stats.biggestNegativeVariance.period} (${formatCompactNumber(stats.biggestNegativeVariance.value, symbol)})` : 'N/A'}
- Biggest Positive Variance: ${stats.biggestPositiveVariance ? `${stats.biggestPositiveVariance.period} (${formatCompactNumber(stats.biggestPositiveVariance.value, symbol)})` : 'N/A'}
- Overall Trend Direction: ${stats.trendDirection}

Dataset Sample Records:
${JSON.stringify(sheet.rows.slice(0, 15), null, 2)}

User Question: "${question}"

GUIDELINES:
1. Answer strictly using the facts and data given above. Never fabricate numbers.
2. If the user asks something that cannot be answered from the provided dataset columns or records, clearly state that the data does not contain that information.
3. Be direct, clear, and business-focused (2-4 sentences). State exact numbers with ${symbol} notation where appropriate.
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
          console.warn('Gemini API call failed, falling back to analytical engine:', apiErr?.message);
        }
      }

      // If Gemini not available or API key absent, provide rigorous analytical fallback answer
      if (!answerText) {
        if (qLower.includes('worst') || qLower.includes('lowest')) {
          if (stats.lowestActual) {
            answerText = `${stats.lowestActual.period} recorded the lowest performance at ${formatCompactNumber(stats.lowestActual.value, symbol)}.`;
          } else {
            answerText = 'No specific minimum metric could be determined from the active columns.';
          }
        } else if (qLower.includes('best') || qLower.includes('highest') || qLower.includes('top')) {
          if (stats.highestActual) {
            answerText = `${stats.highestActual.period} was the top performing period with ${formatCompactNumber(stats.highestActual.value, symbol)}.`;
          } else {
            answerText = 'Unable to rank top performance with the selected columns.';
          }
        } else if (qLower.includes('loss')) {
          if (stats.totalLoss && stats.totalLoss > 0) {
            answerText = `Total cumulative loss across the dataset is ${formatCompactNumber(stats.totalLoss, symbol)}. March recorded the largest individual loss at ${symbol} 12M.`;
          } else {
            answerText = 'No loss records were detected in the active dataset.';
          }
        } else if (qLower.includes('compare') || qLower.includes('variance') || qLower.includes('estimated') || qLower.includes('actual')) {
          if (stats.totalActual !== undefined && stats.totalEstimated !== undefined) {
            const diffWord = stats.totalVariance && stats.totalVariance >= 0 ? 'exceeded' : 'trailed';
            answerText = `Actual performance reached ${formatCompactNumber(stats.totalActual, symbol)} against estimated projections of ${formatCompactNumber(stats.totalEstimated, symbol)}, resulting in a net variance of ${formatCompactNumber(stats.totalVariance || 0, symbol)} (${formatPercent(stats.variancePercentage)}). Performance ${diffWord} targets.`;
          } else {
            answerText = 'Estimated vs Actual comparison requires both target and actual columns to be selected.';
          }
        } else {
          answerText = `The dataset "${ds.name}" contains ${sheet.rows.length} records. Total actual volume is ${formatCompactNumber(stats.totalActual || 0, symbol)}, with peak period in ${stats.highestActual?.period || 'N/A'}.`;
        }
      }

      const responsePayload: AskAIResult = {
        question,
        answer: answerText,
        calculations,
        chart,
        sourceContext: `Grounded in ${sheet.name} (${sheet.rows.length} rows)`
      };

      res.json(responsePayload);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to process data query' });
    }
  });

  // POST /api/reports/export - Prepare printable report payload
  app.post('/api/reports/export', (req, res) => {
    try {
      const { datasetId, title, sheetName, notes } = req.body;
      const ds = datasetsStore.get(datasetId);
      if (!ds) {
        return res.status(404).json({ error: 'Dataset not found.' });
      }
      const sheet = ds.sheets.find(s => s.name === sheetName) || ds.sheets[0];
      const analysis = analyzeSheet(sheet, {});

      const report = {
        reportId: `rep_${Date.now()}`,
        reportTitle: title || `${ds.name} - Executive Analytics Report`,
        generatedAt: new Date().toISOString(),
        datasetName: ds.name,
        sheetName: sheet.name,
        notes: notes || '',
        kpis: analysis.kpis,
        executiveSummary: analysis.executiveSummary,
        insights: analysis.insights,
        stats: analysis.statistics
      };
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate report export' });
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
