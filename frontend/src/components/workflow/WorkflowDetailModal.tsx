'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  GitBranch,
  Calendar,
  Clock,
  Settings,
  HardDrive,
  ShieldCheck,
  Database,
  Globe,
  Terminal,
  PhoneCall,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Layers,
  Sparkles,
  RefreshCw,
  Cpu,
  Server,
  FileCode,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Workflow, WorkflowRun, ToolType, WorkflowStep, StepExecutionLog } from '@/types';
import { formatCronSchedule } from '@/lib/cronUtils';
import { getAgentInventoryItem } from '@/lib/agentInventory';
import { fetchRuns, fetchRun, triggerWorkflowRun } from '@/lib/api';

interface WorkflowDetailModalProps {
  workflow: Workflow | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenBuilder: (wf: Workflow) => void;
  onEditSetup: (wf: Workflow) => void;
  onTriggerRun: (wf: Workflow) => void;
  initialRunId?: string | null;
}

const getToolIcon = (toolType: ToolType) => {
  switch (toolType) {
    case 'DISK_CHECK':
      return HardDrive;
    case 'RDP_PORT_CHECK':
      return ShieldCheck;
    case 'SQL_JOB_CHECK':
      return Database;
    case 'URL_CHECK_EXT':
      return Globe;
    case 'URL_CHECK_INT':
      return Activity;
    case 'SERVICE_ACTION':
      return Terminal;
    case 'VOICE_CALL_ACTION':
      return PhoneCall;
    default:
      return Cpu;
  }
};

export const WorkflowDetailModal: React.FC<WorkflowDetailModalProps> = ({
  workflow,
  isOpen,
  onClose,
  onOpenBuilder,
  onEditSetup,
  onTriggerRun,
  initialRunId,
}) => {
  // Default tab is 'runs' to emphasize the Run Cycle and step-wise execution
  const [activeTab, setActiveTab] = useState<'runs' | 'spec'>('runs');
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRunDetail, setSelectedRunDetail] = useState<WorkflowRun | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    if (workflow && isOpen) {
      loadRuns(workflow.id);
    }
  }, [workflow, isOpen]);

  const loadRuns = async (wfId: string) => {
    setLoadingRuns(true);
    const result = await fetchRuns(wfId);
    setRuns(result);
    setLoadingRuns(false);

    // Pick active run: either initialRunId, or latest run
    const targetId = initialRunId || (result.length > 0 ? result[0].id : null);
    if (targetId) {
      setSelectedRunId(targetId);
      loadRunDetail(targetId);
    }
  };

  const loadRunDetail = async (runId: string) => {
    setLoadingDetail(true);
    const detail = await fetchRun(runId);
    setSelectedRunDetail(detail);
    setLoadingDetail(false);
  };

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    loadRunDetail(runId);
  };

  const handleRunNow = async () => {
    if (!workflow) return;
    setTriggering(true);
    onTriggerRun(workflow);
    setTimeout(async () => {
      await loadRuns(workflow.id);
      setTriggering(false);
    }, 1200);
  };

  if (!isOpen || !workflow) return null;

  const steps: WorkflowStep[] = workflow.steps || [];
  const scheduleText = formatCronSchedule(workflow.cronExpression);
  const isLatestFailed = workflow.lastRun?.status === 'FAILED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`p-3 rounded-xl border shrink-0 ${
                isLatestFailed
                  ? 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                  : 'bg-primary-600/10 dark:bg-primary-600/20 border-primary-500/30 text-primary-600 dark:text-primary-400'
              }`}
            >
              {isLatestFailed ? <AlertTriangle className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">
                  {workflow.name}
                </h2>
                {isLatestFailed ? (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    ALERT: LAST CYCLE FAILED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    CYCLE PASSING
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                  <Clock className="w-3.5 h-3.5" />
                  Cadence: {scheduleText}
                </span>
                <span className="hidden sm:inline font-mono text-slate-400">•</span>
                <span className="hidden sm:inline font-mono text-[11px] text-slate-500">
                  Cron: {workflow.cronExpression || 'No Cron'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRunNow}
              disabled={triggering}
              className="px-3.5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-600/30 flex items-center gap-1.5 transition-all hover:scale-102"
            >
              <Play className={`w-3.5 h-3.5 fill-white ${triggering ? 'animate-spin' : ''}`} />
              <span>{triggering ? 'Executing...' : 'Run Cycle Now'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation: Emphasize Run Cycle vs Workflow Details */}
        <div className="px-6 pt-3 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('runs')}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'runs'
                  ? 'border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Run Cycle & Step Details ({runs.length} Runs)</span>
            </button>

            <button
              onClick={() => setActiveTab('spec')}
              className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'spec'
                  ? 'border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Workflow Spec & Agents ({steps.length} Nodes)</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 pb-2">
            <button
              onClick={() => onEditSetup(workflow)}
              className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Edit Schedule</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenBuilder(workflow);
              }}
              className="px-2.5 py-1 text-primary-700 dark:text-primary-300 hover:text-primary-900 dark:hover:text-white text-xs font-semibold rounded-lg bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 transition-colors flex items-center gap-1.5"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Open in DAG Builder</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: RUN CYCLES & STEP-WISE EXECUTION DETAILS */}
          {activeTab === 'runs' && (
            <div className="space-y-6">
              {/* Historical Run Selector (Timeline of Last 7+ Runs) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary-500" />
                    Select Execution Cycle to Inspect Step-Wise Details:
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Showing latest {runs.length} cycles (Chronological order)
                  </span>
                </div>

                {loadingRuns ? (
                  <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
                    Loading execution history...
                  </div>
                ) : runs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    No run cycles recorded yet. Trigger a run to begin.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {runs.slice(0, 7).map((r, idx) => {
                      const isSelected = selectedRunId === r.id;
                      const isFailed = r.status === 'FAILED';
                      const isLatest = idx === 0;

                      return (
                        <button
                          key={r.id}
                          onClick={() => handleSelectRun(r.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? isFailed
                                ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-400 dark:border-rose-600 ring-2 ring-rose-400/40 shadow-sm'
                                : 'bg-primary-50 dark:bg-primary-950/70 border-primary-400 dark:border-primary-600 ring-2 ring-primary-500/40 shadow-sm'
                              : isFailed
                              ? 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/50 hover:border-rose-300 dark:hover:border-rose-800'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                              Cycle #{runs.length - idx} {isLatest && <span className="text-primary-600 dark:text-primary-400 font-sans font-normal">(Now)</span>}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isFailed ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                            />
                          </div>

                          <div className="text-[11px] font-mono font-semibold flex items-center gap-1 mt-0.5">
                            {isFailed ? (
                              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                                <XCircle className="w-3 h-3 shrink-0" /> FAILED
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3 shrink-0" /> PASS
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                            <span>{new Date(r.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>{r.durationMs ? `${r.durationMs}ms` : '120ms'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Active Run Overview Banner */}
              {selectedRunDetail && (
                <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl border ${
                          selectedRunDetail.status === 'FAILED'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 border-rose-300 dark:border-rose-800'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 border-emerald-300 dark:border-emerald-800'
                        }`}
                      >
                        {selectedRunDetail.status === 'FAILED' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            Cycle Execution #{selectedRunId?.slice(0, 8)}
                          </h4>
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                              selectedRunDetail.status === 'FAILED'
                                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                            }`}
                          >
                            {selectedRunDetail.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          Started at {new Date(selectedRunDetail.startedAt).toLocaleString()} • Trigger: {selectedRunDetail.triggerType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Duration</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {selectedRunDetail.durationMs ? `${selectedRunDetail.durationMs}ms` : '120ms'}
                        </strong>
                      </div>
                      <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
                        <span className="text-slate-500 block text-[10px] uppercase">Total Steps</span>
                        <strong className="text-slate-800 dark:text-slate-200">{selectedRunDetail.totalSteps} Steps</strong>
                      </div>
                      <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
                        <span className="text-slate-500 block text-[10px] uppercase">Step Alerts</span>
                        <strong className={selectedRunDetail.failedSteps > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-semibold'}>
                          {selectedRunDetail.failedSteps} Failed
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Step-Wise Execution Table */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 px-1">
                      <span className="flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-primary-500" />
                        Step-Wise Diagnostics & Real-Time Output:
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 font-normal">
                        Click step to expand raw execution telemetry
                      </span>
                    </div>

                    {loadingDetail ? (
                      <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-primary-500" />
                        Loading step-wise telemetry logs...
                      </div>
                    ) : !selectedRunDetail.logs || selectedRunDetail.logs.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        No individual step telemetry logs recorded for this cycle.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedRunDetail.logs.map((log: StepExecutionLog, index: number) => {
                          const meta = getAgentInventoryItem(log.checkType as ToolType);
                          const Icon = getToolIcon(log.checkType as ToolType);
                          const isFailed = log.status === 'FAIL' || log.status === 'ERROR';
                          const isExpanded = expandedLogId === log.id;

                          return (
                            <div
                              key={log.id}
                              className={`rounded-xl border transition-all overflow-hidden ${
                                isFailed
                                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {/* Step Row Header */}
                              <div
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                                    {index + 1}
                                  </span>

                                  <div className={`p-1.5 rounded-lg ${meta.colorTheme.bg} ${meta.colorTheme.text} shrink-0`}>
                                    <Icon className="w-4 h-4" />
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {log.stepKey}
                                      </span>
                                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${meta.colorTheme.badgeBg}`}>
                                        {meta.shortLabel}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                                      <span>Host: <strong className="text-slate-700 dark:text-slate-300">{log.targetHost || 'localhost'}</strong></span>
                                      <span>•</span>
                                      <span>Latency: <strong className="text-slate-700 dark:text-slate-300">{log.durationMs}ms</strong></span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {/* Diagnostic Metric */}
                                  <div className="hidden sm:block text-right">
                                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Telemetry Result</span>
                                    <span
                                      className={`text-xs font-mono font-semibold ${
                                        isFailed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
                                      }`}
                                    >
                                      {log.metricValue}
                                    </span>
                                  </div>

                                  {/* Status Pill */}
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border ${
                                      isFailed
                                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                    }`}
                                  >
                                    {isFailed ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {isFailed ? 'FAIL' : 'PASS'}
                                  </span>

                                  <div className="text-slate-400">
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </div>
                                </div>
                              </div>

                              {/* Expanded Diagnostics Details */}
                              {isExpanded && (
                                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 text-xs font-mono space-y-2">
                                  {isFailed && log.errorMessage && (
                                    <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 flex items-start gap-2">
                                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                                      <div>
                                        <strong>Diagnostic Failure Reason:</strong>
                                        <p className="mt-0.5">{log.errorMessage}</p>
                                      </div>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                      <span className="text-slate-400 block mb-1">Execution Telemetry:</span>
                                      <span className="text-slate-800 dark:text-slate-200">{log.metricValue}</span>
                                    </div>
                                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                      <span className="text-slate-400 block mb-1">Timestamp:</span>
                                      <span className="text-slate-800 dark:text-slate-200">{new Date(log.executedAt).toISOString()}</span>
                                    </div>
                                  </div>

                                  {log.rawOutput && (
                                    <div>
                                      <span className="text-slate-400 block mb-1 text-[11px]">Raw JSON Payload / Log Stream:</span>
                                      <pre className="p-2 rounded bg-slate-900 text-slate-200 text-[10px] overflow-x-auto border border-slate-800">
                                        {log.rawOutput}
                                      </pre>
                                    </div>
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
              )}
            </div>
          )}

          {/* TAB 2: WORKFLOW SPEC & DEFINITION */}
          {activeTab === 'spec' && (
            <div className="space-y-6">
              {/* Description Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Workflow Runbook Purpose
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {workflow.description || 'Automated orchestrated runbook with multi-step diagnostic & remediation steps.'}
                </p>
              </div>

              {/* Steps Inventory */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-primary-500" />
                    Assigned Agent Nodes in DAG ({steps.length} Steps)
                  </h4>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenBuilder(workflow);
                    }}
                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    Edit Nodes in Visual Canvas <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {steps.map((step, idx) => {
                    const meta = getAgentInventoryItem(step.toolType);
                    const Icon = getToolIcon(step.toolType);

                    return (
                      <div
                        key={step.id || step.stepKey}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-lg ${meta.colorTheme.bg} ${meta.colorTheme.text}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white block">
                                {step.stepKey}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Host: {step.targetHost || 'localhost'}
                              </span>
                            </div>
                          </div>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${meta.colorTheme.badgeBg}`}>
                            {meta.name}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-mono flex items-center justify-between">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            On PASS ➔ <strong>{step.onSuccessStepKey || 'END'}</strong>
                          </span>
                          <span className="text-rose-600 dark:text-rose-400">
                            On FAIL ➔ <strong>{step.onFailureStepKey || 'END'}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Workflow ID: {workflow.id} • Last Updated: {new Date(workflow.updatedAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenBuilder(workflow);
              }}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-600/30 flex items-center gap-1.5 transition-all"
            >
              <GitBranch className="w-4 h-4" />
              Open Visual DAG Canvas
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-xl text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
