'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Send,
  RefreshCw,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  Clock,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react';
import {
  AI_PROMPT_TEMPLATES,
  generateWorkflowFromNaturalLanguage,
  GeneratedWorkflowResult,
  PromptTemplate,
} from '@/lib/aiWorkflowGenerator';
import { formatCronSchedule } from '@/lib/cronUtils';

interface AiWorkflowPromptBarProps {
  onWorkflowGenerated: (result: GeneratedWorkflowResult) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AiWorkflowPromptBar: React.FC<AiWorkflowPromptBarProps> = ({
  onWorkflowGenerated,
  isOpen = true,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<GeneratedWorkflowResult | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setGenerating(true);
    setLastResult(null);

    // Simulate subtle LLM inference delay for rich UX
    await new Promise((r) => setTimeout(r, 900));

    try {
      const result = generateWorkflowFromNaturalLanguage(prompt.trim());
      setLastResult(result);
      onWorkflowGenerated(result);
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyTemplate = (tmpl: PromptTemplate) => {
    setPrompt(tmpl.prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-gradient-to-r from-primary-950/40 via-slate-900/90 to-primary-950/30 border-b border-primary-500/30 dark:border-primary-500/30 border-slate-200 dark:bg-slate-900 p-4 relative z-20 backdrop-blur-xl shadow-lg transition-all duration-300">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-md shadow-primary-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>AI / LLM Runbook Architect</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700">
                  Natural Language ➔ DAG Generator
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Type your infrastructure requirements in plain English to automatically construct multi-step branching DAG workflows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded transition-colors text-xs flex items-center gap-1"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="space-y-3 pt-1">
            {/* Prompt Input Form */}
            <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <textarea
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Check disk space on C: every hour. If free space is below 15%, call on-call PIC (+15550192834). If healthy, audit SQL Server master database and verify port 3389."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/40 transition-all resize-none shadow-sm"
                />
              </div>

              <button
                type="submit"
                disabled={generating || !prompt.trim()}
                className="sm:w-48 py-2.5 px-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate DAG</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Prompt Template Pills */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1 text-[10px] uppercase tracking-wider mr-1">
                <Lightbulb className="w-3 h-3 text-amber-500" /> Examples:
              </span>
              {AI_PROMPT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.title}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span className="font-medium">{tmpl.title}</span>
                  <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
                    ({tmpl.badge})
                  </span>
                </button>
              ))}
            </div>

            {/* Generation Success Feedback Banner */}
            {lastResult && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                      <span>Generated: {lastResult.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                        {lastResult.steps.length} Steps in DAG
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                        Cadence: {formatCronSchedule(lastResult.cronExpression)}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-400/90 mt-0.5">
                      {lastResult.explanation}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 px-2 py-1 rounded-lg shrink-0">
                  DAG Applied to Canvas ✓
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
