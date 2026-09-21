/**
 * VIGOR System Architecture, Schema & RBAC Configuration
 * Documents the enterprise canonical data model, security permissions, and database architecture
 */

import React from 'react';
import {
  Server,
  Shield,
  Database,
  Lock,
  CheckCircle2,
  Users,
  Code2,
  Layers
} from 'lucide-react';
import { VIGOR_SECTORS } from '../data/groupStructure';
import { CANONICAL_METRICS } from '../data/canonicalMetrics';

export const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white">
            Enterprise Architecture
          </span>
          <span className="text-xs text-slate-500 font-medium">
            PostgreSQL / Cloud SQL & Multi-Tenant RBAC
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          System Architecture & Database Schema
        </h1>
        <p className="text-xs text-slate-600 mt-1 max-w-3xl">
          Specification for persistent multi-company data rollups, role-based access control, canonical mapping indexes, and audit logs.
        </p>
      </div>

      {/* 4 Roles Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">
            Role-Based Access Control (RBAC) Hierarchy
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-700 uppercase">Executive Tier</span>
              <Shield className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Group CEO & Board</h3>
            <p className="text-xs text-slate-600 mt-1">
              Full read/write visibility across all 7 sectors, 17 subsidiary companies, consolidated group metrics, and executive AI queries.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
              Group Wide Access
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700 uppercase">Division Tier</span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Sector Managing Director</h3>
            <p className="text-xs text-slate-600 mt-1">
              Scoped access to all companies within assigned sector (e.g. Manufacturing or Hospitality), sector summaries, and comparisons.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
              Sector Scoped
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-700 uppercase">Operating Tier</span>
              <Server className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Company General Manager</h3>
            <p className="text-xs text-slate-600 mt-1">
              Single-company access (e.g. Vigor Cement Works). Can upload monthly Excel files, confirm column mappings, and view internal dashboard.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">
              Single Company
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Analysis Tier</span>
              <Code2 className="w-4 h-4 text-slate-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Financial Analyst</h3>
            <p className="text-xs text-slate-600 mt-1">
              Read-only and export permissions across assigned sectors, data pivot exploration, and PDF/Excel management report generation.
            </p>
            <div className="mt-3 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block">
              Read & Export
            </div>
          </div>
        </div>
      </div>

      {/* Relational Database Schema */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Relational Database Entities (PostgreSQL / Cloud SQL)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">schema.sql</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-950 text-slate-200 overflow-x-auto">
            <div className="text-indigo-400 font-bold mb-2">// 1. Sectors & Companies</div>
            <pre className="text-[11px] leading-relaxed">
{`CREATE TABLE vigor_sectors (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  code VARCHAR(16) NOT NULL,
  description TEXT
);

CREATE TABLE vigor_companies (
  id VARCHAR(64) PRIMARY KEY,
  sector_id VARCHAR(64) REFERENCES vigor_sectors(id),
  name VARCHAR(128) NOT NULL,
  code VARCHAR(16) NOT NULL,
  location VARCHAR(128),
  default_currency VARCHAR(8) DEFAULT 'TZS',
  reporting_status VARCHAR(32) DEFAULT 'current'
);`}
            </pre>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 text-slate-200 overflow-x-auto">
            <div className="text-indigo-400 font-bold mb-2">// 2. Datasets & Canonical Mappings</div>
            <pre className="text-[11px] leading-relaxed">
{`CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR(64) REFERENCES vigor_companies(id),
  sector_id VARCHAR(64) REFERENCES vigor_sectors(id),
  filename VARCHAR(256) NOT NULL,
  reporting_period VARCHAR(64) NOT NULL,
  file_size BIGINT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE canonical_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID REFERENCES datasets(id),
  raw_column_name VARCHAR(128) NOT NULL,
  canonical_metric_id VARCHAR(64) NOT NULL,
  detected_type VARCHAR(32) NOT NULL,
  detected_meaning VARCHAR(64) NOT NULL,
  is_included BOOLEAN DEFAULT TRUE
);`}
            </pre>
          </div>
        </div>
      </div>

      {/* Canonical Metric Registry Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Active Canonical Metric Registry ({Object.keys(CANONICAL_METRICS).length} concepts)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Standardized enterprise ontology ensuring data from diverse spreadsheets aggregates cleanly into Group Intelligence
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Canonical ID</th>
                <th className="py-2.5 px-3">Display Concept</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Sample Aliases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {Object.values(CANONICAL_METRICS).slice(0, 10).map(cm => (
                <tr key={cm.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-indigo-700">{cm.id}</td>
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{cm.displayName}</td>
                  <td className="py-2.5 px-3 font-sans capitalize">{cm.category}</td>
                  <td className="py-2.5 px-3 font-sans text-slate-500">{cm.typicalUnit}</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-500 truncate max-w-xs font-sans">
                    {cm.aliases.slice(0, 4).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
