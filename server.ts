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
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import {
  AUTH_CONFIG,
  getAllowedEmailDomain,
  isAllowedCompanyEmail
} from './src/config/authConfig';
import {
  Dataset,
  AskAIResult,
  ChartConfig,
  NormalizedMetric,
  ConsolidatedPerformanceData,
  User
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
  deleteReportFromDb,
  upsertUserInDb,
  getUserByIdFromDb,
  createSessionInDb,
  getSessionUserFromDb,
  deleteSessionFromDb
} from './server/db';
import { formatCompactNumber, formatPercent } from './src/services/analyticsEngine';

dotenv.config();

const currentFilename = typeof __filename !== 'undefined' ? __filename : (typeof import.meta !== 'undefined' && (import.meta as any).url ? fileURLToPath((import.meta as any).url) : '');
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(currentFilename || process.cwd());

// In-Memory Fallback Caches for resilient offline/degraded operations
const memoryDatasetsStore = new Map<string, Dataset>();
const memoryReportsStore = new Map<string, any>();
const memoryAiMessagesStore = new Map<string, any[]>();

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

  app.use(cookieParser());
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // Initialize DB pool if available
  await initDbPool().catch(err => {
    console.warn('[DB] MySQL init warning:', err?.message);
  });

  // ==========================================
  // AUTHENTICATION MIDDLEWARE & STRICT SECURITY
  // ==========================================

  async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const cookieToken = req.cookies?.[AUTH_CONFIG.SESSION_COOKIE_NAME];
      const token = cookieToken || bearerToken;

      if (!token) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in with an authorised VIGOR account.'
        });
      }

      const user = await getSessionUserFromDb(token);
      if (!user || !user.is_active) {
        return res.status(401).json({
          error: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please sign in again.'
        });
      }

      if (!isAllowedCompanyEmail(user.email)) {
        return res.status(403).json({
          error: 'ACCESS_RESTRICTED',
          message: `Access is restricted to authorised VIGOR accounts (@${getAllowedEmailDomain()}).`
        });
      }

      (req as any).user = user;
      next();
    } catch {
      return res.status(401).json({
        error: 'AUTH_ERROR',
        message: 'Authentication check failed.'
      });
    }
  }

  // ==========================================
  // REST API: SYSTEM & HEALTH (PUBLIC)
  // ==========================================

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      dbConnected: isDatabaseConnected(),
      timestamp: new Date().toISOString()
    });
  });

  // ==========================================
  // REST API: AUTHENTICATION (PUBLIC)
  // ==========================================

  // GET /api/auth/config - Public configuration for client OAuth initialization
  app.get('/api/auth/config', (req, res) => {
    res.json({
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      allowedDomain: getAllowedEmailDomain(),
      isDevMode: process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_AUTH === 'true'
    });
  });

  // GET /api/auth/me - Current user session check
  app.get('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const cookieToken = req.cookies?.[AUTH_CONFIG.SESSION_COOKIE_NAME];
      const token = cookieToken || bearerToken;

      if (!token) {
        return res.json({ authenticated: false, user: null });
      }

      const user = await getSessionUserFromDb(token);
      if (!user || !user.is_active || !isAllowedCompanyEmail(user.email)) {
        return res.json({ authenticated: false, user: null });
      }

      res.json({ authenticated: true, user });
    } catch {
      res.json({ authenticated: false, user: null });
    }
  });

  // POST /api/auth/google - Authenticate using verified Google ID token
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { credential } = req.body;
      if (!credential || typeof credential !== 'string') {
        return res.status(400).json({ error: 'MISSING_CREDENTIAL', message: 'Google credential token is required.' });
      }

      // Verify Google ID Token server-side via Google's official tokeninfo endpoint
      const verifyResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (!verifyResp.ok) {
        return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Failed to verify Google identity token.' });
      }

      const googlePayload: any = await verifyResp.json();
      const email = (googlePayload.email || '').toLowerCase().trim();
      const isEmailVerified = googlePayload.email_verified === 'true' || googlePayload.email_verified === true;

      if (!isEmailVerified) {
        return res.status(403).json({
          error: 'EMAIL_UNVERIFIED',
          message: 'The Google email address is not verified by Google.'
        });
      }

      // Strict server-side domain verification: @turkysgroup.co.tz
      if (!isAllowedCompanyEmail(email)) {
        console.warn(`[AUTH] Rejected non-company login attempt: ${email}`);
        return res.status(403).json({
          error: 'ACCESS_RESTRICTED',
          message: `This application is available only to authorised VIGOR accounts (@${getAllowedEmailDomain()}).`
        });
      }

      // Provision or update user record automatically on first login
      const user = await upsertUserInDb({
        email,
        name: googlePayload.name || email.split('@')[0],
        google_subject_id: googlePayload.sub,
        avatar_url: googlePayload.picture
      });

      // Generate cryptographically secure session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + AUTH_CONFIG.SESSION_MAX_AGE_MS);
      await createSessionInDb(user.id, sessionToken, expiresAt);

      res.cookie(AUTH_CONFIG.SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: AUTH_CONFIG.SESSION_MAX_AGE_MS,
        path: '/'
      });

      console.log(`[AUTH] Verified VIGOR user login: ${email} (${user.role})`);
      res.json({
        success: true,
        token: sessionToken,
        user
      });
    } catch (err: any) {
      console.error('[AUTH] Google auth verification failed:', err);
      res.status(500).json({ error: 'AUTH_FAILED', message: err?.message || 'Authentication failed' });
    }
  });

  // POST /api/auth/dev-login - Development testing access for domain validation
  app.post('/api/auth/dev-login', async (req, res) => {
    try {
      const isDev = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_AUTH === 'true';
      if (!isDev) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Development auth is disabled in production.' });
      }

      const { email, name } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();

      if (!cleanEmail) {
        return res.status(400).json({ error: 'EMAIL_REQUIRED', message: 'Email address is required.' });
      }

      // Strict server-side corporate domain check (same exact check as production)
      if (!isAllowedCompanyEmail(cleanEmail)) {
        return res.status(403).json({
          error: 'ACCESS_RESTRICTED',
          message: `This application is available only to authorised VIGOR accounts (@${getAllowedEmailDomain()}).`
        });
      }

      const user = await upsertUserInDb({
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0]
      });

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + AUTH_CONFIG.SESSION_MAX_AGE_MS);
      await createSessionInDb(user.id, sessionToken, expiresAt);

      res.cookie(AUTH_CONFIG.SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: AUTH_CONFIG.SESSION_MAX_AGE_MS,
        path: '/'
      });

      res.json({
        success: true,
        token: sessionToken,
        user
      });
    } catch (err: any) {
      res.status(500).json({ error: 'AUTH_FAILED', message: err?.message || 'Dev login failed' });
    }
  });

  // POST /api/auth/logout - Terminate session & clear cookies
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const cookieToken = req.cookies?.[AUTH_CONFIG.SESSION_COOKIE_NAME];
      const token = cookieToken || bearerToken;

      if (token) {
        await deleteSessionFromDb(token);
      }
      res.clearCookie(AUTH_CONFIG.SESSION_COOKIE_NAME, { path: '/' });
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err: any) {
      res.status(500).json({ error: 'LOGOUT_FAILED', message: err?.message || 'Logout failed' });
    }
  });

  // ==========================================
  // REST API: WORKBOOKS & PERSISTENCE (PROTECTED)
  // ==========================================

  // Check for duplicate upload
  app.post('/api/workbooks/check-duplicate', requireAuth, async (req, res) => {
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
  app.post('/api/workbooks', requireAuth, async (req, res) => {
    try {
      const dataset: Dataset = req.body;
      if (!dataset || !dataset.id) {
        return res.status(400).json({ error: 'Invalid workbook payload.' });
      }

      const currentUser: User = (req as any).user;
      dataset.uploadedAt = dataset.uploadedAt || new Date().toISOString();
      dataset.lastOpenedAt = new Date().toISOString();
      dataset.uploadedBy = currentUser?.name || 'VIGOR Member';
      dataset.uploadedByUserId = currentUser?.id;

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
  app.get('/api/workbooks', requireAuth, async (req, res) => {
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
  app.get('/api/workbooks/:id', requireAuth, async (req, res) => {
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
  app.delete('/api/workbooks/:id', requireAuth, async (req, res) => {
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
  app.delete('/api/workbooks', requireAuth, async (req, res) => {
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
  app.get('/api/datasets', requireAuth, (req, res) => res.redirect(307, '/api/workbooks'));
  app.post('/api/datasets/upload', requireAuth, (req, res) => res.redirect(307, '/api/workbooks'));
  app.get('/api/datasets/:id', requireAuth, (req, res) => res.redirect(307, `/api/workbooks/${req.params.id}`));
  app.delete('/api/datasets/:id', requireAuth, (req, res) => res.redirect(307, `/api/workbooks/${req.params.id}`));
  app.delete('/api/datasets', requireAuth, (req, res) => res.redirect(307, '/api/workbooks'));

  // ==========================================
  // REST API: ASK VIGOR AI (GROUNDED IN WORKBOOK)
  // ==========================================

  app.post('/api/workbooks/:id/query', requireAuth, async (req, res) => {
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

      // Cache conversation in memory
      const convKey = `${workbookId}_${activeScope}`;
      const existingMsgs = memoryAiMessagesStore.get(convKey) || [];
      const userMsg = {
        id: `msg_${Date.now() - 1}_u`,
        role: 'user',
        content: question,
        created_at: new Date().toISOString()
      };
      const aiMsg = {
        id: `msg_${Date.now()}_a`,
        role: 'assistant',
        content: answerText,
        calculations,
        chart,
        source_context: sourceContext,
        created_at: new Date().toISOString()
      };
      existingMsgs.push(userMsg, aiMsg);
      memoryAiMessagesStore.set(convKey, existingMsgs);

      // Persist conversation to MySQL if connected
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
  app.get('/api/workbooks/:id/ai/history', requireAuth, async (req, res) => {
    try {
      const scope = (req.query.scope as string) || 'Consolidated';
      if (isDatabaseConnected()) {
        const messages = await getAiMessagesFromDb(req.params.id, scope);
        if (messages && messages.length > 0) {
          return res.json(messages);
        }
      }
      const convKey = `${req.params.id}_${scope}`;
      const memMessages = memoryAiMessagesStore.get(convKey) || [];
      res.json(memMessages);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed retrieving history' });
    }
  });

  // ==========================================
  // REST API: REPORTS & PDF MANAGEMENT
  // ==========================================

  // POST /api/reports - Save generated report record in MySQL
  app.post('/api/reports', requireAuth, async (req, res) => {
    try {
      const report = req.body;
      if (!report || !report.id || !report.workbook_id) {
        return res.status(400).json({ error: 'Invalid report structure.' });
      }
      report.created_at = report.created_at || new Date().toISOString();
      memoryReportsStore.set(report.id, report);

      if (isDatabaseConnected()) {
        await saveReportToDb(report);
      }
      res.status(201).json({ success: true, reportId: report.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed saving report' });
    }
  });

  // GET /api/reports - List stored reports from MySQL
  app.get('/api/reports', requireAuth, async (req, res) => {
    try {
      const workbookId = req.query.workbookId as string | undefined;
      if (isDatabaseConnected()) {
        const reports = await listReportsFromDb(workbookId);
        if (reports && reports.length > 0) {
          return res.json(reports);
        }
      }
      let reports = Array.from(memoryReportsStore.values());
      if (workbookId) {
        reports = reports.filter(r => r.workbook_id === workbookId);
      }
      reports.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed listing reports' });
    }
  });

  // DELETE /api/reports/:id - Delete a report
  app.delete('/api/reports/:id', requireAuth, async (req, res) => {
    try {
      memoryReportsStore.delete(req.params.id);
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
