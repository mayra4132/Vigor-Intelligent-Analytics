/**
 * Natural Language Executive Data Assistant
 * "ChatGPT simplicity + company-aware context"
 * Clean, natural query interface with sector-adaptive prompt chips.
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Building2,
  Calendar,
  ArrowRight,
  Bot,
  User,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Dataset, AskAIResult } from '../types';
import { apiClient } from '../services/apiClient';
import { ChartWidget } from '../components/ChartWidget';

interface AskAIPageProps {
  dataset: Dataset;
  initialQuestion?: string;
  onNavigateToDashboard: () => void;
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
  initialQuestion = '',
  onNavigateToDashboard
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Hello! I have analyzed the operational records for ${dataset.companyName || dataset.name} (${dataset.reporting_period || 'current period'}). What would you like to know about your performance, targets, or variances?`
    }
  ]);
  const [isQuerying, setIsQuerying] = useState(false);

  const companyName = dataset.companyName || dataset.name;
  const reportingPeriod = dataset.reporting_period || 'August 2026';
  const sectorId = dataset.sector_id || 'general';

  // Sector-adaptive suggestions as specified in Section 18
  const sectorSuggestions = React.useMemo(() => {
    switch (sectorId) {
      case 'manufacturing':
        return [
          'How are we performing against target?',
          'What caused the biggest variance?',
          'Show the production trend.',
          'What needs management attention?'
        ];
      case 'hospitality':
        return [
          'How is occupancy performing?',
          'Which period generated the most revenue?',
          'Are cancellations increasing?',
          'What needs management attention?'
        ];
      case 'trading':
        return [
          'What are our best-selling items?',
          'How is gross margin trending?',
          'Compare sales with last month.',
          'What needs management attention?'
        ];
      default:
        return [
          'What was our worst month and why?',
          'Compare estimated and actual performance.',
          'Summarise overall financial health.',
          'What needs management attention?'
        ];
    }
  }, [sectorId]);

  // Auto-send if initialQuestion provided
  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      handleSend(initialQuestion);
    }
  }, []);

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
      text: 'Analyzing dataset calculations and formulating management answer...',
      isLoading: true
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setQuestion('');
    setIsQuerying(true);

    try {
      const result = await apiClient.queryAI(dataset.id, q, dataset.selectedSheet, dataset);

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
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsgId
            ? {
                ...m,
                text: 'Could not process query. Please check your question or verify dataset columns.',
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
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-4 flex flex-col h-[calc(100vh-5rem)]">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Asking about:</span>
            <span className="text-xs font-bold text-slate-900">{companyName}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {reportingPeriod}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Responses are grounded directly in your uploaded spreadsheet facts.
          </p>
        </div>

        <button
          onClick={onNavigateToDashboard}
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>Return to Dashboard</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 no-scrollbar">
        <span className="text-xs text-slate-400 font-semibold shrink-0">Suggestions:</span>
        {sectorSuggestions.map(prompt => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            disabled={isQuerying}
            className="px-3 py-1.5 rounded-full bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 text-xs font-medium transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? 'bg-slate-900 text-white'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                  isUser
                    ? 'bg-slate-900 text-white font-medium'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] opacity-70 pb-1 border-b border-black/5">
                  <span className="font-bold">{isUser ? 'You' : 'VIGOR AI'}</span>
                  <span>{msg.timestamp}</span>
                </div>

                {msg.isLoading ? (
                  <div className="flex items-center gap-2 text-slate-500 py-1">
                    <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>{msg.text}</span>
                  </div>
                ) : (
                  <p className="whitespace-pre-line">{msg.text}</p>
                )}

                {/* Generated Chart if query returned one */}
                {msg.result?.chart && (
                  <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 text-slate-900">
                    <ChartWidget
                      chart={msg.result.chart}
                      data={dataset.sheets[0]?.rows || []}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Box */}
      <div className="shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500"
        >
          <input
            type="text"
            placeholder="Ask anything about this company's performance, metrics, or trends..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            disabled={isQuerying}
            className="flex-1 bg-transparent px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!question.trim() || isQuerying}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
