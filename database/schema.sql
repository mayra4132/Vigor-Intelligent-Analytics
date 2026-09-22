-- =========================================================================
-- VIGOR Intelligent Analytics - Production Database Schema (MySQL / MariaDB)
-- Normalized architecture for Workbooks, Sheets, Metrics, AI & Reports
-- =========================================================================

CREATE DATABASE IF NOT EXISTS vigor_analytics;
USE vigor_analytics;

-- 1. Workbooks
CREATE TABLE IF NOT EXISTS workbooks (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_hash VARCHAR(64) NULL,
  uploaded_at DATETIME NOT NULL,
  reporting_period VARCHAR(64) NULL,
  sheet_count INT DEFAULT 1,
  status VARCHAR(32) DEFAULT 'ready',
  uploaded_by VARCHAR(64) NULL,
  primary_sheet VARCHAR(128) NULL,
  raw_file LONGBLOB NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_workbooks_reporting_period (reporting_period),
  INDEX idx_workbooks_created_at (created_at),
  INDEX idx_workbooks_file_hash (file_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Workbook Sheets
CREATE TABLE IF NOT EXISTS workbook_sheets (
  id VARCHAR(128) PRIMARY KEY,
  workbook_id VARCHAR(64) NOT NULL,
  sheet_name VARCHAR(128) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  sheet_index INT DEFAULT 0,
  sheet_role VARCHAR(32) DEFAULT 'unknown',
  company_name VARCHAR(128) NULL,
  sector_name VARCHAR(128) NULL,
  reporting_period VARCHAR(64) NULL,
  has_financial_data TINYINT(1) DEFAULT 0,
  has_operational_data TINYINT(1) DEFAULT 0,
  is_hidden TINYINT(1) DEFAULT 0,
  parsed_successfully TINYINT(1) DEFAULT 1,
  summary_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workbook_id) REFERENCES workbooks(id) ON DELETE CASCADE,
  INDEX idx_sheets_workbook_id (workbook_id),
  INDEX idx_sheets_role (sheet_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Normalized Metrics Definitions
CREATE TABLE IF NOT EXISTS metrics (
  id VARCHAR(128) PRIMARY KEY,
  sheet_id VARCHAR(128) NOT NULL,
  workbook_id VARCHAR(64) NOT NULL,
  metric_name VARCHAR(128) NOT NULL,
  normalized_name VARCHAR(128) NOT NULL,
  section VARCHAR(64) DEFAULT 'financial',
  unit VARCHAR(32) DEFAULT 'TZS',
  direction VARCHAR(32) DEFAULT 'higher_is_better',
  source_row INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sheet_id) REFERENCES workbook_sheets(id) ON DELETE CASCADE,
  FOREIGN KEY (workbook_id) REFERENCES workbooks(id) ON DELETE CASCADE,
  INDEX idx_metrics_sheet (sheet_id),
  INDEX idx_metrics_workbook (workbook_id),
  INDEX idx_metrics_norm_name (normalized_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Metric Values (Normalized Monthly, Current Period, and YTD)
CREATE TABLE IF NOT EXISTS metric_values (
  id VARCHAR(128) PRIMARY KEY,
  metric_id VARCHAR(128) NOT NULL,
  workbook_id VARCHAR(64) NOT NULL,
  period VARCHAR(32) NOT NULL,
  period_type VARCHAR(32) NOT NULL,
  actual DOUBLE NULL,
  plan DOUBLE NULL,
  sply DOUBLE NULL,
  variance DOUBLE NULL,
  achievement_pct DOUBLE NULL,
  growth_pct DOUBLE NULL,
  source_header VARCHAR(128) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE,
  FOREIGN KEY (workbook_id) REFERENCES workbooks(id) ON DELETE CASCADE,
  INDEX idx_metric_values_metric (metric_id),
  INDEX idx_metric_values_workbook (workbook_id),
  INDEX idx_metric_values_period (period, period_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. AI Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR(64) PRIMARY KEY,
  workbook_id VARCHAR(64) NOT NULL,
  sheet_id VARCHAR(128) NULL,
  scope VARCHAR(128) DEFAULT 'Consolidated',
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workbook_id) REFERENCES workbooks(id) ON DELETE CASCADE,
  INDEX idx_conv_workbook (workbook_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. AI Messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  calculations_json JSON NULL,
  chart_json JSON NULL,
  source_context VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
  INDEX idx_messages_conversation (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Generated Reports
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) PRIMARY KEY,
  workbook_id VARCHAR(64) NOT NULL,
  sheet_id VARCHAR(128) NULL,
  scope VARCHAR(128) DEFAULT 'Consolidated',
  report_type VARCHAR(64) DEFAULT 'executive_summary',
  title VARCHAR(255) NOT NULL,
  reporting_period VARCHAR(64) NULL,
  generated_by VARCHAR(64) NULL,
  snapshot_json LONGTEXT NULL,
  pdf_binary LONGBLOB NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workbook_id) REFERENCES workbooks(id) ON DELETE CASCADE,
  INDEX idx_reports_workbook (workbook_id),
  INDEX idx_reports_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
