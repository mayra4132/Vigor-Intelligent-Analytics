/**
 * Ask VIGOR AI
 * Grounded in current workbook metrics, deterministic calculations,
 * scope selector (Consolidated vs Sheet), source attribution, and MySQL conversation history.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Building2,
  Calendar,
  Bot,
  User,
  CheckCircle2,
  Layers,
  ArrowRight,
  Database,
  BarChart2,
  FileSpreadsheet
} from 'lucide-react';
import { Dataset, AskAIResult, AppView } from '../types';
import { apiClient } from '../services/apiClient';
import { ChartWidget } from '../components/ChartWidget';

interface AskAIPageProps {
  dataset: Dataset | null;
  onNavigate: (view: AppView) => void;
  onSelectSheet?: (sheetName: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  result?: AskAIResult;
  isLoading?: boolean;
}

export const AskAIPage: React.FC<AskAIPageProps> = ({
  dataset,
  onNavigate,
  onSelectSheet
}) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedScope, setSelectedScope] = useState<string>('Consolidated');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Determine available sheets and scopes
  const availableSheets = dataset?.parsedWorkbook?.sheets || [];
  const currentSheetName = dataset?.activeSheetName || dataset?.selectedSheet || 'CONSOLIDATED';
  const reportingPeriod =
    dataset?.consolidatedData?.reportingPeriod ||
    dataset?.reportingPeriod ||
    dataset?.reporting_period ||
    'August 2026';

  // Load conversation history or initial greeting
  useEffect(() => {
    if (!dataset) return;

    let isMounted = true;
    async function loadHistory() {
      const history = await apiClient.getAiHistory(dataset!.id, selectedScope);
      if (!isMounted) return;

      if (history && history.length > 0) {
        const mapped: ChatMessage[] = history.map(h => ({
          id: h.id,
          sender: h.role,
          timestamp: new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: h.content,
          result: h.calculations || h.chart ? {
            question: '',
            answer: h.content,
            calculations: h.calculations || [],
            chart: h.chart,
            sourceContext: h.source_context
          } : undefined
        }));
        setMessages(mapped);
      } else {
        setMessages([
          {
            id: 'welcome',
            sender: 'assistant',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `Hello! I am VIGOR Executive AI, grounded directly in ${dataset!.companyName || dataset!.name} (${reportingPeriod}). All calculations are computed from your verified workbook metrics. What would you like to ask about Revenue, Net Profit, Variances, or monthly trends?`
          }
        ]);
      }
    }

    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [dataset?.id, selectedScope]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isQuerying]);

  if (!dataset) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Select a workbook first</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Choose an existing workbook from My Data or upload a new performance workbook before asking questions.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('datasets')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Go to My Data</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Upload Workbook</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const suggestedQuestions = [
    'How did we perform in August?',
    'Did Revenue meet Plan?',
    'What is our Net Profit and variance?',
    'Compare Actual Revenue and Plan.',
    'Show me the Revenue trend.',
    'Which metric is furthest below Plan?',
    'What should management pay attention to?'
  ];

  const handleSend = async (qToSend?: string) => {
    const q = (qToSend || question).trim();
    if (!q || isQuerying) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: q
    };

    const loadingMsgId = `ai_load_${Date.now()}`;
    const loadingMsg: ChatMessage = {
      id: loadingMsgId,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: 'Calculating verified metrics and consulting executive AI...',
      isLoading: true
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setQuestion('');
    setIsQuerying(true);

    try {
      const activeSheet = selectedScope === 'Consolidated' ? 'CONSOLIDATED' : selectedScope;
      const result = await apiClient.askAI(
        dataset.id,
        q,
        activeSheet,
        selectedScope,
        dataset
      );

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsgId
            ? {
                ...m,
                text: result.answer,
                result,
                isLoading: false
              }
            : m
        )
      );
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsgId
            ? {
                ...m,
                text: 'AI is temporarily unavailable. Your dashboards and saved data are still available.',
                isLoading: false
              }
            : m
        )
      );
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-4 flex flex-col h-[calc(100vh-4rem)]">
      {/* Scope & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask VIGOR AI</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Executive Data Intelligence
          </h1>
          <p className="text-xs text-slate-500">
            Grounded in {dataset.companyName || dataset.name} ({reportingPeriod}).
          </p>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 pl-2">Scope:</span>
          <select
            value={selectedScope}
            onChange={e => setSelectedScope(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value="Consolidated">Consolidated Group</option>
            {availableSheets
              .filter(s => !s.sheetName.toUpperCase().includes('CONSOLIDAT'))
              .map(s => (
                <option key={s.sheetName} value={s.sheetName}>
                  {s.displayName || s.sheetName}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 text-xs no-scrollbar">
        <span className="text-slate-400 font-semibold text-[11px] shrink-0">Try asking:</span>
        {suggestedQuestions.map((sq, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSend(sq)}
            className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 text-xs whitespace-nowrap transition-all shadow-2xs cursor-pointer"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-4 space-y-2.5 text-xs shadow-2xs ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-white border border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-4 text-[10px] opacity-75">
                <span className="font-semibold uppercase tracking-wider">
                  {msg.sender === 'user' ? 'You' : 'VIGOR AI'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              {msg.isLoading ? (
                <div className="flex items-center gap-2 text-indigo-600 font-medium py-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                  <span>Computing formulas and preparing response...</span>
                </div>
              ) : (
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              )}

              {/* Calculations Breakdown */}
              {msg.result?.calculations && msg.result.calculations.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                  {msg.result.calculations.map((calc, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px]"
                    >
                      <span className="text-slate-500">{calc.label}: </span>
                      <span className="font-bold text-slate-900">{calc.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Render AI Chart if applicable */}
              {msg.result?.chart && (
                <div className="pt-2">
                  <ChartWidget chart={msg.result.chart} />
                </div>
              )}

              {/* Subtle Source Attribution */}
              {msg.result?.sourceContext && (
                <div className="pt-2 text-[10px] text-slate-400 font-mono border-t border-slate-100">
                  {msg.result.sourceContext}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-2xs shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            disabled={isQuerying}
            placeholder={`Ask about ${selectedScope} performance, variances, trends...`}
            className="flex-1 px-4 py-2 text-xs bg-transparent border-0 focus:outline-hidden text-slate-900 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={!question.trim() || isQuerying}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
