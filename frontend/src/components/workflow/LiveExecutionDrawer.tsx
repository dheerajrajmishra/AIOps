'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  X,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Filter,
  Copy,
  Check,
} from 'lucide-react';
import { ConsoleLogMessage, StepExecutionLog } from '@/types';

interface LiveExecutionDrawerProps {
  runId: string | null;
  status: 'IDLE' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalSteps: number;
  failedSteps: number;
  logs: ConsoleLogMessage[];
  stepResults: Record<string, StepExecutionLog>;
  isOpen: boolean;
  onClose: () => void;
}

export const LiveExecutionDrawer: React.FC<LiveExecutionDrawerProps> = ({
  runId,
  status,
  totalSteps,
  failedSteps,
  logs,
  stepResults,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'steps'>('console');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'console') {
      consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'ALL') return true;
    return log.level === filterLevel;
  });

  const toggleStepExpand = (stepKey: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

  const copyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 h-[380px] bg-slate-950/95 border-t border-slate-800 shadow-2xl backdrop-blur-xl z-40 flex flex-col font-mono text-xs">
      {/* Header Bar */}
      <div className="h-11 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-200 font-sans font-semibold">
            <Terminal className="w-4 h-4 text-primary-400" />
            <span>InfraSentinel Execution Stream</span>
          </div>

          {/* Status Badge */}
          {status !== 'IDLE' && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-sans font-medium flex items-center gap-1 border ${
                status === 'RUNNING'
                  ? 'bg-blue-950 text-blue-300 border-blue-800 animate-pulse'
                  : status === 'COMPLETED'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border-rose-800'
              }`}
            >
              {status === 'RUNNING' && <Clock className="w-3 h-3 animate-spin" />}
              {status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
              {status === 'FAILED' && <XCircle className="w-3 h-3" />}
              {status}
            </span>
          )}

          {runId && (
            <span className="text-slate-500 text-[11px] font-mono">
              Run: {runId.substring(0, 8)}...
            </span>
          )}

          <div className="flex items-center gap-2 text-[11px] font-sans text-slate-400">
            <span>Steps: <strong className="text-slate-200">{totalSteps}</strong></span>
            {failedSteps > 0 && (
              <span className="text-rose-400 font-medium">
                Failures: <strong>{failedSteps}</strong>
              </span>
            )}
          </div>
        </div>

        {/* View Switcher & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1 rounded text-[11px] font-sans font-medium transition-colors ${
                activeTab === 'console' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Live Console ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('steps')}
              className={`px-3 py-1 rounded text-[11px] font-sans font-medium transition-colors ${
                activeTab === 'steps' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Step Cards ({Object.keys(stepResults).length})
            </button>
          </div>

          {activeTab === 'console' && (
            <>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-[11px] font-sans"
              >
                <option value="ALL">All Levels</option>
                <option value="INFO">INFO</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>

              <button
                onClick={copyLogs}
                title="Copy console output"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 bg-black/60">
        {activeTab === 'console' ? (
          <div className="space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-500 italic py-8 text-center font-sans">
                Awaiting execution stream from SignalR hub...
              </div>
            ) : (
              filteredLogs.map((l) => {
                let color = 'text-slate-300';
                if (l.level === 'SUCCESS') color = 'text-emerald-400 font-semibold';
                if (l.level === 'WARN') color = 'text-amber-400';
                if (l.level === 'ERROR') color = 'text-rose-400 font-bold';

                return (
                  <div key={l.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-600 select-none shrink-0">{l.timestamp}</span>
                    <span
                      className={`text-[10px] uppercase px-1 rounded shrink-0 select-none ${
                        l.level === 'SUCCESS'
                          ? 'bg-emerald-950 text-emerald-400'
                          : l.level === 'ERROR'
                          ? 'bg-rose-950 text-rose-400'
                          : l.level === 'WARN'
                          ? 'bg-amber-950 text-amber-400'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {l.level}
                    </span>
                    <span className={`break-all ${color}`}>{l.message}</span>
                  </div>
                );
              })
            )}
            <div ref={consoleBottomRef} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-sans">
            {Object.values(stepResults).map((step) => {
              const isExpanded = !!expandedSteps[step.stepKey];
              return (
                <div
                  key={step.stepKey}
                  className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-100 flex items-center gap-1.5 font-mono">
                      <span>{step.stepKey}</span>
                      <span className="text-slate-500 font-sans text-[11px]">({step.checkType})</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                        step.status === 'PASS'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>

                  <div className="text-slate-400 text-[11px] flex items-center justify-between">
                    <span>Host: <strong className="text-slate-300 font-mono">{step.targetHost || 'localhost'}</strong></span>
                    <span>Duration: <strong className="text-slate-300">{step.durationMs}ms</strong></span>
                  </div>

                  <div className="p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-200">
                    Metric: <span className="font-semibold text-white">{step.metricValue}</span>
                  </div>

                  {step.errorMessage && (
                    <div className="text-rose-400 text-[11px] bg-rose-950/30 p-2 rounded border border-rose-900/40">
                      {step.errorMessage}
                    </div>
                  )}

                  {step.rawOutput && (
                    <div>
                      <button
                        onClick={() => toggleStepExpand(step.stepKey)}
                        className="text-[10px] text-primary-400 hover:text-primary-300 flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpanded ? 'Hide Raw Output' : 'View Raw Output'}
                      </button>
                      {isExpanded && (
                        <pre className="mt-2 p-2 bg-black rounded text-[10px] font-mono text-slate-300 max-h-36 overflow-auto border border-slate-900">
                          {step.rawOutput}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
