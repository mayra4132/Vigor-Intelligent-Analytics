/**
 * VIGOR Intelligent Analytics - Server Database Service
 * Provides production-grade MySQL persistence via mysql2/promise
 * Normalized Workbooks, Sheets, Metrics, Metric Values, AI & Reports
 */

import mysql from 'mysql2/promise';
import crypto from 'crypto';
import { Dataset, ConsolidatedPerformanceData, NormalizedMetric } from '../src/types';

interface DBConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean;
}

function getDbConfig(): DBConfig {
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'vigor_user',
    password: process.env.MYSQL_PASSWORD || 'vigor_pass123',
    database: process.env.MYSQL_DATABASE || 'vigor_analytics',
    ssl: process.env.MYSQL_SSL === 'true'
  };
}

let pool: mysql.Pool | null = null;
let isDbAvailable = false;

export async function initDbPool(): Promise<boolean> {
  const cfg = getDbConfig();
  try {
    pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 2000,
      ssl: cfg.ssl ? { rejectUnauthorized: false } : undefined
    });

    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    isDbAvailable = true;
    console.log(`[DB] Connected to MySQL (${cfg.host}:${cfg.port}/${cfg.database})`);
    return true;
  } catch (err: any) {
    console.warn(`[DB] MySQL connection notice (${cfg.host}:${cfg.port}):`, err?.message);
    isDbAvailable = false;
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return isDbAvailable && pool !== null;
}

export async function getPool(): Promise<mysql.Pool> {
  if (!pool || !isDbAvailable) {
    await initDbPool();
  }
  if (!pool) {
    throw new Error('Database connection pool is not available.');
  }
  return pool;
}

/**
 * Saves workbook with transaction safety.
 * Normalizes workbook metadata, sheets, metric definitions, and monthly/period values.
 */
export async function saveWorkbookToDb(
  dataset: Dataset,
  rawFileBuffer?: Buffer | null
): Promise<{ success: boolean; workbookId: string; duplicate?: boolean }> {
  const p = await getPool();
  const conn = await p.getConnection();

  try {
    await conn.beginTransaction();

    const workbookId = dataset.id;
    const name = dataset.name || dataset.companyName || dataset.filename;
    const originalFilename = dataset.filename || 'workbook.xlsx';
    const fileSize = dataset.fileSize || 0;
    const reportingPeriod =
      dataset.consolidatedData?.reportingPeriod ||
      dataset.reporting_period ||
      dataset.reportingPeriod ||
      'Current Period';
    const sheetCount =
      dataset.parsedWorkbook?.totalSheets ||
      dataset.sheets?.length ||
      1;
    const primarySheet =
      dataset.activeSheetName ||
      dataset.selectedSheet ||
      dataset.consolidatedData?.sheetName ||
      'CONSOLIDATED';

    // Compute simple file hash
    const fileHash = crypto
      .createHash('sha256')
      .update(`${originalFilename}-${fileSize}-${sheetCount}-${reportingPeriod}`)
      .digest('hex');

    // 1. Insert/Update Workbook Record
    const [existing]: any = await conn.query(
      'SELECT id FROM workbooks WHERE id = ? LIMIT 1',
      [workbookId]
    );

    const metadataJson = JSON.stringify({
      companyName: dataset.companyName,
      sectorName: dataset.sectorName,
      reportingPeriod,
      activeSheetName: dataset.activeSheetName,
      isConsolidatedWorkbook: dataset.isConsolidatedWorkbook,
      consolidatedData: dataset.consolidatedData,
      parsedWorkbook: dataset.parsedWorkbook
        ? {
            reportingPeriod: dataset.parsedWorkbook.reportingPeriod,
            totalSheets: dataset.parsedWorkbook.totalSheets,
            sheets: dataset.parsedWorkbook.sheets.map(s => ({
              sheetName: s.sheetName,
              displayName: s.displayName,
              role: s.role,
              companyName: s.companyName,
              sectorName: s.sectorName,
              reportingPeriod: s.reportingPeriod,
              isAnalysable: s.isAnalysable,
              cellCount: s.cellCount,
              rowCount: s.rowCount,
              colCount: s.colCount
            }))
          }
        : undefined
    });

    if (existing.length > 0) {
      // Clean previous child records before re-inserting
      await conn.query('DELETE FROM workbook_sheets WHERE workbook_id = ?', [workbookId]);
      await conn.query('DELETE FROM metrics WHERE workbook_id = ?', [workbookId]);
      await conn.query('DELETE FROM metric_values WHERE workbook_id = ?', [workbookId]);

      await conn.query(
        `UPDATE workbooks SET 
          name = ?, 
          original_filename = ?, 
          file_size = ?, 
          file_hash = ?, 
          reporting_period = ?, 
          sheet_count = ?, 
          status = 'ready', 
          primary_sheet = ?, 
          metadata_json = ?, 
          updated_at = NOW() 
        WHERE id = ?`,
        [name, originalFilename, fileSize, fileHash, reportingPeriod, sheetCount, primarySheet, metadataJson, workbookId]
      );
    } else {
      await conn.query(
        `INSERT INTO workbooks (
          id, name, original_filename, file_size, file_hash, uploaded_at, 
          reporting_period, sheet_count, status, primary_sheet, metadata_json, raw_file
        ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, 'ready', ?, ?, ?)`,
        [
          workbookId,
          name,
          originalFilename,
          fileSize,
          fileHash,
          reportingPeriod,
          sheetCount,
          primarySheet,
          metadataJson,
          rawFileBuffer || null
        ]
      );
    }

    // 2. Insert Workbook Sheets
    const sheetsList = dataset.parsedWorkbook?.sheets || [];
    if (sheetsList.length > 0) {
      for (let i = 0; i < sheetsList.length; i++) {
        const s = sheetsList[i];
        const sheetId = `${workbookId}_sheet_${i}_${s.sheetName.replace(/[^a-zA-Z0-9]/g, '_')}`;

        await conn.query(
          `INSERT INTO workbook_sheets (
            id, workbook_id, sheet_name, display_name, sheet_index, sheet_role, 
            company_name, sector_name, reporting_period, has_financial_data, 
            has_operational_data, parsed_successfully, summary_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sheetId,
            workbookId,
            s.sheetName,
            s.displayName || s.sheetName,
            i,
            s.role || 'unknown',
            s.companyName || null,
            s.sectorName || null,
            s.reportingPeriod || reportingPeriod,
            s.performanceData?.hasFinancialSection ? 1 : 0,
            s.performanceData?.hasOperationalSection ? 1 : 0,
            s.isAnalysable ? 1 : 0,
            s.performanceData ? JSON.stringify(s.performanceData) : null
          ]
        );
      }
    } else if (dataset.sheets && dataset.sheets.length > 0) {
      // Basic flat sheets fallback
      for (let i = 0; i < dataset.sheets.length; i++) {
        const s = dataset.sheets[i];
        const sheetId = `${workbookId}_sheet_${i}_${s.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        await conn.query(
          `INSERT INTO workbook_sheets (
            id, workbook_id, sheet_name, display_name, sheet_index, sheet_role, 
            parsed_successfully
          ) VALUES (?, ?, ?, ?, ?, 'unknown', 1)`,
          [sheetId, workbookId, s.name, s.name, i]
        );
      }
    }

    // 3. Insert Normalized Metrics & Monthly / Period Metric Values
    const primaryPerf = dataset.consolidatedData;
    if (primaryPerf) {
      const primarySheetId = `${workbookId}_sheet_0_${primaryPerf.sheetName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const allMetrics: NormalizedMetric[] = [
        ...(primaryPerf.financialMetrics || []),
        ...(primaryPerf.operationalMetrics || [])
      ];

      for (let mIdx = 0; mIdx < allMetrics.length; mIdx++) {
        const m = allMetrics[mIdx];
        const metricId = `${workbookId}_metric_${mIdx}_${m.metricName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const normName = m.metricName.toLowerCase().replace(/[^a-z0-9]/g, '_');

        await conn.query(
          `INSERT INTO metrics (
            id, sheet_id, workbook_id, metric_name, normalized_name, section, unit, direction
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            metricId,
            primarySheetId,
            workbookId,
            m.metricName,
            normName,
            m.section || 'financial',
            m.unit || 'TZS',
            m.metricName.toLowerCase().includes('cost') || m.metricName.toLowerCase().includes('expense')
              ? 'lower_is_better'
              : 'higher_is_better'
          ]
        );

        // Insert Current Period Metric Value
        await conn.query(
          `INSERT INTO metric_values (
            id, metric_id, workbook_id, period, period_type, actual, plan, sply, variance, achievement_pct, growth_pct
          ) VALUES (?, ?, ?, ?, 'current_period', ?, ?, ?, ?, ?, ?)`,
          [
            `${metricId}_cp`,
            metricId,
            workbookId,
            primaryPerf.reportingPeriod,
            m.actual,
            m.plan,
            m.priorYear,
            m.variance,
            m.achievementPct,
            m.growthPct
          ]
        );

        // Insert YTD Metric Value if available
        if (m.ytdActual !== undefined && m.ytdActual !== null) {
          await conn.query(
            `INSERT INTO metric_values (
              id, metric_id, workbook_id, period, period_type, actual, plan, sply, variance, achievement_pct, growth_pct
            ) VALUES (?, ?, ?, ?, 'ytd', ?, ?, ?, ?, ?, ?)`,
            [
              `${metricId}_ytd`,
              metricId,
              workbookId,
              `YTD ${primaryPerf.reportingPeriod}`,
              m.ytdActual,
              m.ytdPlan || null,
              m.ytdPriorYear || null,
              m.ytdVariance || null,
              m.ytdAchievementPct || null,
              m.ytdGrowthPct || null
            ]
          );
        }

        // Insert Normalized Monthly Values (Jan, Feb, Mar, etc.)
        if (m.monthlyValues && typeof m.monthlyValues === 'object') {
          for (const [monthKey, actualVal] of Object.entries(m.monthlyValues)) {
            if (actualVal !== null && actualVal !== undefined) {
              const planVal = m.monthlyPlanValues?.[monthKey] ?? null;
              await conn.query(
                `INSERT INTO metric_values (
                  id, metric_id, workbook_id, period, period_type, actual, plan
                ) VALUES (?, ?, ?, ?, 'monthly', ?, ?)`,
                [
                  `${metricId}_m_${monthKey}`,
                  metricId,
                  workbookId,
                  monthKey,
                  actualVal,
                  planVal
                ]
              );
            }
          }
        }
      }
    }

    await conn.commit();
    return { success: true, workbookId };
  } catch (err: any) {
    await conn.rollback();
    console.error('[DB] Failed to save workbook transaction:', err);
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Checks for existing workbook with the same hash or filename.
 */
export async function findExistingWorkbookByHash(hash: string): Promise<any | null> {
  const p = await getPool();
  const [rows]: any = await p.query(
    'SELECT id, name, original_filename, reporting_period, uploaded_at FROM workbooks WHERE file_hash = ? LIMIT 1',
    [hash]
  );
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Lists all stored workbooks with metadata.
 */
export async function listWorkbooksFromDb(): Promise<any[]> {
  const p = await getPool();
  const [rows]: any = await p.query(`
    SELECT 
      w.id, 
      w.name, 
      w.original_filename as filename, 
      w.file_size as fileSize, 
      w.uploaded_at as uploadedAt, 
      w.reporting_period as reportingPeriod, 
      w.sheet_count as sheetCount, 
      w.status, 
      w.primary_sheet as primarySheet,
      (w.raw_file IS NOT NULL) as hasRawFile
    FROM workbooks w 
    ORDER BY w.uploaded_at DESC
  `);
  return rows;
}

/**
 * Loads complete Dataset from MySQL for instant dashboard restoration.
 */
export async function getWorkbookByIdFromDb(id: string): Promise<Dataset | null> {
  const p = await getPool();
  const [rows]: any = await p.query(
    'SELECT id, name, original_filename, file_size, uploaded_at, reporting_period, sheet_count, status, primary_sheet, metadata_json FROM workbooks WHERE id = ? LIMIT 1',
    [id]
  );

  if (rows.length === 0) return null;
  const row = rows[0];

  let meta: any = {};
  if (row.metadata_json) {
    meta = typeof row.metadata_json === 'string' ? JSON.parse(row.metadata_json) : row.metadata_json;
  }

  // Retrieve sheets from workbook_sheets
  const [sheetRows]: any = await p.query(
    'SELECT id, sheet_name, display_name, sheet_index, sheet_role, company_name, sector_name, reporting_period, has_financial_data, has_operational_data, summary_json FROM workbook_sheets WHERE workbook_id = ? ORDER BY sheet_index ASC',
    [id]
  );

  const parsedSheets = sheetRows.map((s: any) => {
    let perf: any = undefined;
    if (s.summary_json) {
      perf = typeof s.summary_json === 'string' ? JSON.parse(s.summary_json) : s.summary_json;
    }
    return {
      sheetName: s.sheet_name,
      displayName: s.display_name,
      role: s.sheet_role,
      companyName: s.company_name,
      sectorName: s.sector_name,
      reportingPeriod: s.reporting_period,
      isAnalysable: true,
      performanceData: perf
    };
  });

  const dataset: Dataset = {
    id: row.id,
    name: row.name,
    filename: row.original_filename,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
    lastOpenedAt: new Date().toISOString(),
    reporting_period: row.reporting_period,
    reportingPeriod: row.reporting_period,
    selectedSheet: row.primary_sheet || 'CONSOLIDATED',
    activeSheetName: row.primary_sheet || 'CONSOLIDATED',
    companyName: meta.companyName,
    sectorName: meta.sectorName,
    isConsolidatedWorkbook: meta.isConsolidatedWorkbook !== false,
    consolidatedData: meta.consolidatedData || (parsedSheets.find((s: any) => s.performanceData)?.performanceData),
    parsedWorkbook: meta.parsedWorkbook
      ? {
          ...meta.parsedWorkbook,
          sheets: parsedSheets
        }
      : undefined,
    sheets: []
  };

  return dataset;
}

/**
 * Deletes workbook with cascade removal of sheets, metrics, values, conversations, and reports.
 */
export async function deleteWorkbookFromDb(id: string): Promise<boolean> {
  const p = await getPool();
  const [res]: any = await p.query('DELETE FROM workbooks WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

/**
 * Clears all workbooks from the database.
 */
export async function clearAllWorkbooksFromDb(): Promise<void> {
  const p = await getPool();
  await p.query('DELETE FROM workbooks');
}

/**
 * AI Conversation Persistence
 */
export async function saveAiMessageToDb(
  workbookId: string,
  scope: string,
  userQuestion: string,
  assistantAnswer: string,
  calculations?: any[],
  chart?: any,
  sourceContext?: string
): Promise<void> {
  const p = await getPool();
  const convId = `conv_${workbookId}_${scope.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Find or create conversation
  await p.query(
    `INSERT INTO ai_conversations (id, workbook_id, scope, title, updated_at) 
     VALUES (?, ?, ?, ?, NOW()) 
     ON DUPLICATE KEY UPDATE updated_at = NOW()`,
    [convId, workbookId, scope, `${scope} Analytics Q&A`]
  );

  // Insert user message
  const userMsgId = `msg_${Date.now()}_u`;
  await p.query(
    'INSERT INTO ai_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
    [userMsgId, convId, 'user', userQuestion]
  );

  // Insert assistant message
  const aiMsgId = `msg_${Date.now() + 1}_a`;
  await p.query(
    `INSERT INTO ai_messages (
      id, conversation_id, role, content, calculations_json, chart_json, source_context
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      aiMsgId,
      convId,
      'assistant',
      assistantAnswer,
      calculations ? JSON.stringify(calculations) : null,
      chart ? JSON.stringify(chart) : null,
      sourceContext || null
    ]
  );
}

export async function getAiMessagesFromDb(
  workbookId: string,
  scope: string
): Promise<any[]> {
  const p = await getPool();
  const convId = `conv_${workbookId}_${scope.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const [rows]: any = await p.query(
    'SELECT id, role, content, calculations_json, chart_json, source_context, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [convId]
  );

  return rows.map((r: any) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    calculations: r.calculations_json ? (typeof r.calculations_json === 'string' ? JSON.parse(r.calculations_json) : r.calculations_json) : undefined,
    chart: r.chart_json ? (typeof r.chart_json === 'string' ? JSON.parse(r.chart_json) : r.chart_json) : undefined,
    source_context: r.source_context,
    created_at: r.created_at
  }));
}

/**
 * Report Storage
 */
export async function saveReportToDb(report: {
  id: string;
  workbook_id: string;
  sheet_id?: string;
  scope: string;
  report_type: string;
  title: string;
  reporting_period?: string;
  generated_by?: string;
  snapshot_json?: any;
}): Promise<void> {
  const p = await getPool();
  await p.query(
    `INSERT INTO reports (
      id, workbook_id, sheet_id, scope, report_type, title, reporting_period, generated_by, snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.id,
      report.workbook_id,
      report.sheet_id || null,
      report.scope || 'Consolidated',
      report.report_type || 'executive_summary',
      report.title,
      report.reporting_period || null,
      report.generated_by || 'Executive User',
      report.snapshot_json ? JSON.stringify(report.snapshot_json) : null
    ]
  );
}

export async function listReportsFromDb(workbookId?: string): Promise<any[]> {
  const p = await getPool();
  let sql = `
    SELECT 
      r.id, 
      r.workbook_id, 
      w.name as workbook_name,
      r.scope, 
      r.report_type, 
      r.title, 
      r.reporting_period, 
      r.generated_by, 
      r.created_at, 
      r.snapshot_json
    FROM reports r
    LEFT JOIN workbooks w ON r.workbook_id = w.id
  `;
  const params: any[] = [];
  if (workbookId) {
    sql += ' WHERE r.workbook_id = ?';
    params.push(workbookId);
  }
  sql += ' ORDER BY r.created_at DESC';

  const [rows]: any = await p.query(sql, params);
  return rows.map((r: any) => ({
    ...r,
    snapshot_json: r.snapshot_json ? (typeof r.snapshot_json === 'string' ? JSON.parse(r.snapshot_json) : r.snapshot_json) : null
  }));
}

export async function deleteReportFromDb(reportId: string): Promise<boolean> {
  const p = await getPool();
  const [res]: any = await p.query('DELETE FROM reports WHERE id = ?', [reportId]);
  return res.affectedRows > 0;
}

// ==========================================
// USER & SESSION MANAGEMENT (AUTH)
// ==========================================

import { User, UserRole } from '../src/types';

// In-Memory fallback stores for auth
export const memoryUsersStore = new Map<string, User>();
export const memorySessionsStore = new Map<string, { userId: string; expiresAt: number }>();

function determineUserRole(email: string): UserRole {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.includes(email.trim().toLowerCase())) {
    return 'admin';
  }
  return 'viewer';
}

export async function upsertUserInDb(userData: {
  email: string;
  name: string;
  google_subject_id?: string;
  avatar_url?: string;
}): Promise<User> {
  const email = userData.email.trim().toLowerCase();
  const name = userData.name.trim() || email.split('@')[0];
  const role = determineUserRole(email);
  const now = new Date().toISOString();

  // In-memory update
  let existingUser = Array.from(memoryUsersStore.values()).find(u => u.email.toLowerCase() === email);
  if (existingUser) {
    existingUser.name = name;
    if (userData.google_subject_id) existingUser.google_subject_id = userData.google_subject_id;
    if (userData.avatar_url) existingUser.avatar_url = userData.avatar_url;
    existingUser.last_login_at = now;
    existingUser.updated_at = now;
    if (determineUserRole(email) === 'admin') existingUser.role = 'admin';
  } else {
    existingUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      name,
      google_subject_id: userData.google_subject_id,
      avatar_url: userData.avatar_url,
      role,
      is_active: true,
      last_login_at: now,
      created_at: now,
      updated_at: now
    };
    memoryUsersStore.set(existingUser.id, existingUser);
  }

  // DB update if connected
  if (isDatabaseConnected()) {
    try {
      const p = await getPool();
      await p.query(
        `INSERT INTO users (id, email, name, google_subject_id, avatar_url, role, is_active, last_login_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           google_subject_id = COALESCE(VALUES(google_subject_id), google_subject_id),
           avatar_url = COALESCE(VALUES(avatar_url), avatar_url),
           last_login_at = NOW(),
           updated_at = NOW()`,
        [
          existingUser.id,
          email,
          name,
          userData.google_subject_id || null,
          userData.avatar_url || null,
          role
        ]
      );
    } catch (err: any) {
      console.warn('[DB] Failed upserting user in DB:', err?.message);
    }
  }

  return existingUser;
}

export async function getUserByIdFromDb(userId: string): Promise<User | null> {
  const memUser = memoryUsersStore.get(userId);
  if (memUser) return memUser;

  if (isDatabaseConnected()) {
    try {
      const p = await getPool();
      const [rows]: any = await p.query('SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1', [userId]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        const user: User = {
          id: r.id,
          email: r.email,
          name: r.name,
          google_subject_id: r.google_subject_id,
          avatar_url: r.avatar_url,
          role: r.role || 'viewer',
          is_active: Boolean(r.is_active),
          last_login_at: r.last_login_at ? new Date(r.last_login_at).toISOString() : undefined,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
          updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined
        };
        memoryUsersStore.set(user.id, user);
        return user;
      }
    } catch (err: any) {
      console.warn('[DB] Failed getting user by ID:', err?.message);
    }
  }
  return null;
}

export async function createSessionInDb(userId: string, token: string, expiresAt: Date): Promise<void> {
  // In-memory
  memorySessionsStore.set(token, {
    userId,
    expiresAt: expiresAt.getTime()
  });

  // DB if connected
  if (isDatabaseConnected()) {
    try {
      const p = await getPool();
      const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await p.query(
        'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
        [sessionId, userId, token, expiresAt]
      );
    } catch (err: any) {
      console.warn('[DB] Failed saving session to DB:', err?.message);
    }
  }
}

export async function getSessionUserFromDb(token: string): Promise<User | null> {
  if (!token) return null;

  // Check in-memory session
  const memSession = memorySessionsStore.get(token);
  if (memSession) {
    if (Date.now() > memSession.expiresAt) {
      memorySessionsStore.delete(token);
      return null;
    }
    return getUserByIdFromDb(memSession.userId);
  }

  // Check DB if connected
  if (isDatabaseConnected()) {
    try {
      const p = await getPool();
      const [rows]: any = await p.query(
        `SELECT u.* FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1
         LIMIT 1`,
        [token]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        const user: User = {
          id: r.id,
          email: r.email,
          name: r.name,
          google_subject_id: r.google_subject_id,
          avatar_url: r.avatar_url,
          role: r.role || 'viewer',
          is_active: Boolean(r.is_active),
          last_login_at: r.last_login_at ? new Date(r.last_login_at).toISOString() : undefined,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : undefined,
          updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : undefined
        };
        // cache in memory
        memoryUsersStore.set(user.id, user);
        memorySessionsStore.set(token, {
          userId: user.id,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        });
        return user;
      }
    } catch (err: any) {
      console.warn('[DB] Failed querying session from DB:', err?.message);
    }
  }

  return null;
}

export async function deleteSessionFromDb(token: string): Promise<void> {
  memorySessionsStore.delete(token);
  if (isDatabaseConnected()) {
    try {
      const p = await getPool();
      await p.query('DELETE FROM sessions WHERE token_hash = ?', [token]);
    } catch (err: any) {
      console.warn('[DB] Failed deleting session from DB:', err?.message);
    }
  }
}
