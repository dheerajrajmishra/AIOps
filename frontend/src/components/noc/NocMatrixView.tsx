'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  PhoneCall,
  Search,
  Filter,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Layers,
  GitBranch,
  Play,
  HardDrive,
  ShieldCheck,
  Database,
  Globe,
  Terminal,
  Cpu,
  ArrowRight,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { NocMatrixResponse, HostHealthItem, NocIncidentItem, Workflow, ToolType, WorkflowStep } from '@/types';
import { fetchNocMatrix, fetchWorkflows, fetchWorkflow, triggerWorkflowRun, updateWorkflow } from '@/lib/api';
import { formatCronSchedule } from '@/lib/cronUtils';
import { getAgentInventoryItem } from '@/lib/agentInventory';
import { WorkflowDetailModal } from '@/components/workflow/WorkflowDetailModal';
import { WorkflowSetupModal } from '@/components/workflow/WorkflowSetupModal';

interface NocMatrixViewProps {
  onOpenBuilder?: (wf: Workflow) => void;
  initialSection?: 'ALL' | 'WORKFLOWS' | 'HOSTS' | 'INCIDENTS';
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

export const NocMatrixView: React.FC<NocMatrixViewProps> = ({ onOpenBuilder, initialSection = 'ALL' }) => {
  const [data, setData] = useState<NocMatrixResponse | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HEALTHY' | 'WARNING' | 'CRITICAL'>('ALL');
  const [activeSection, setActiveSection] = useState<'ALL' | 'WORKFLOWS' | 'HOSTS' | 'INCIDENTS'>(initialSection || 'ALL');

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Drilldown Detail Modal State
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [setupWorkflow, setSetupWorkflow] = useState<Workflow | null>(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [matrixRes, wfList] = await Promise.all([
      fetchNocMatrix(),
      fetchWorkflows(),
    ]);

    if (matrixRes) {
      setData(matrixRes);
    } else {
      setData(getMockNocData());
    }

    if (wfList && wfList.length > 0) {
      // Load full step details for all workflows
      const fullWorkflows = await Promise.all(
        wfList.map(async (w) => {
          const full = await fetchWorkflow(w.id);
          return full || w;
        })
      );
      setWorkflows(fullWorkflows);
    } else {
      setWorkflows(getMockWorkflows());
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s polling
    return () => clearInterval(interval);
  }, []);

  const [initialRunId, setInitialRunId] = useState<string | null>(null);

  const handleOpenWorkflowDetail = async (wf: Workflow, runId?: string) => {
    // Ensure full steps are loaded
    const full = await fetchWorkflow(wf.id);
    setSelectedWorkflow(full || wf);
    setInitialRunId(runId || null);
    setIsDetailModalOpen(true);
  };

  const handleTriggerRun = async (wf: Workflow) => {
    setTriggeringId(wf.id);
    try {
      await triggerWorkflowRun(wf.id);
      setTimeout(() => {
        loadData();
        setTriggeringId(null);
      }, 1500);
    } catch {
      setTriggeringId(null);
    }
  };

  const handleSaveSetup = async (setupData: {
    name: string;
    description: string;
    cronExpression: string;
    isActive: boolean;
  }) => {
    if (setupWorkflow) {
      await updateWorkflow(setupWorkflow.id, {
        name: setupData.name,
        description: setupData.description,
        cronExpression: setupData.cronExpression,
        isActive: setupData.isActive,
      });
      loadData();
    }
  };

  const filteredHosts = data?.hosts.filter((host) => {
    const matchesSearch = host.targetHost.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || host.overallStatus === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="p-6 space-y-7 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-md">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5 tracking-tight">
                Executive NOC Health Matrix & Telemetry
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Real-time runbook snapshots, automated multi-step diagnostic pipelines, and PIC escalation audit
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Section Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setActiveSection('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeSection === 'ALL'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All Views
            </button>
            <button
              onClick={() => setActiveSection('WORKFLOWS')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeSection === 'WORKFLOWS'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Snapshots ({workflows.length})
            </button>
            <button
              onClick={() => setActiveSection('HOSTS')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeSection === 'HOSTS'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Hosts ({data?.overview.totalHosts || 0})
            </button>
            <button
              onClick={() => setActiveSection('INCIDENTS')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                activeSection === 'INCIDENTS'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Incidents ({data?.overview.activeIncidents || 0})
            </button>
          </div>


          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary-500' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Monitored Hosts</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-baseline gap-1">
              {data.overview.totalHosts}
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Targets</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Workflows Active</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-baseline gap-1">
              {data.overview.activeWorkflows}
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">/ {data.overview.totalWorkflows} Scheduled</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">24h Audits</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-baseline gap-1">
              {data.overview.totalRuns24h}
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Runs</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Pass Rate (24h)</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {data.overview.successRate24h}%
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Active Incidents</span>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5">
              {data.overview.activeIncidents}
              {data.overview.activeIncidents > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Avg Duration</span>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {data.overview.avgDurationMs}
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal ml-0.5">ms</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. WORKFLOW RUNBOOK SNAPSHOT SECTION (FEATURED NOC VIEW)      */}
      {/* ============================================================== */}

      {(activeSection === 'ALL' || activeSection === 'WORKFLOWS') && (

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary-600/10 dark:bg-primary-600/20 text-primary-600 dark:text-primary-400 border border-primary-500/30">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Workflow Execution Snapshots
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                    Click card to inspect details
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visual execution pipeline snapshot, node health status, and conditional step branching
                </p>
              </div>
            </div>

            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {workflows.length} Runbooks Orchestrated
            </span>
          </div>

          {/* Workflow Snapshot Cards Grid - Workflow Level 7-Run Status View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {workflows.map((wf) => {
              const scheduleText = formatCronSchedule(wf.cronExpression);
              const lastRun = wf.lastRun;
              const hasFailure = lastRun && lastRun.status === 'FAILED';
              const isRunning = lastRun && lastRun.status === 'RUNNING';
              const isTriggering = triggeringId === wf.id;
              const recentRuns = wf.recentRuns || [];
              const passCount = recentRuns.filter((r) => r.status === 'COMPLETED').length;
              const passRate = recentRuns.length > 0 ? Math.round((passCount / recentRuns.length) * 100) : 100;
              const runsTimeline = [...recentRuns].reverse();

              return (
                <div
                  key={wf.id}
                  onClick={() => handleOpenWorkflowDetail(wf)}
                  className={`bg-white dark:bg-slate-900/90 hover:bg-slate-50/80 dark:hover:bg-slate-850 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 group relative overflow-hidden border ${
                    hasFailure
                      ? 'border-rose-300 dark:border-rose-900/70 hover:border-rose-400 dark:hover:border-rose-700 bg-rose-50/20 dark:bg-rose-950/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750'
                  }`}
                >
                  {/* Top Status Bar indicator */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      hasFailure
                        ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                        : isRunning
                        ? 'bg-blue-500 animate-pulse'
                        : wf.isActive
                        ? 'bg-emerald-500'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />

                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2.5 rounded-xl border transition-colors shadow-sm shrink-0 ${
                            hasFailure
                              ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                              : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-primary-600 dark:text-primary-400 group-hover:border-primary-500/40'
                          }`}
                        >
                          {hasFailure ? (
                            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                          ) : (
                            <Layers className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                            {wf.name}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                              <Clock className="w-3 h-3" />
                              {scheduleText}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Health Status Pill */}
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                          hasFailure
                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                            : isRunning
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 animate-pulse'
                            : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                        }`}
                      >
                        {hasFailure ? 'ALERT' : isRunning ? 'RUNNING' : 'ALL PASSING'}
                      </span>
                    </div>

                    {/* Run Cycle Telemetry Metrics Panel */}
                    <div className="bg-slate-50 dark:bg-slate-950/70 rounded-xl p-3 border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="border-r border-slate-200 dark:border-slate-800 pr-1">
                        <span className="text-[10px] text-slate-400 block uppercase">Last Audit</span>
                        <strong className="text-slate-800 dark:text-slate-200 text-[11px] truncate block">
                          {lastRun ? new Date(lastRun.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </strong>
                      </div>
                      <div className="border-r border-slate-200 dark:border-slate-800 px-1">
                        <span className="text-[10px] text-slate-400 block uppercase">Duration</span>
                        <strong className="text-slate-800 dark:text-slate-200 text-[11px] block">
                          {lastRun?.durationMs ? `${lastRun.durationMs}ms` : '140ms'}
                        </strong>
                      </div>
                      <div className="pl-1">
                        <span className="text-[10px] text-slate-400 block uppercase">Trigger</span>
                        <strong className="text-slate-800 dark:text-slate-200 text-[11px] block">
                          {lastRun?.triggerType || 'SCHEDULED'}
                        </strong>
                      </div>
                    </div>

                    {/* Last 7 Execution Cycles Status Track */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-primary-500" />
                          Last 7 Run Status:
                        </span>
                        <span className={`text-[10px] font-mono font-bold ${hasFailure ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {passRate}% ({passCount}/{recentRuns.length || 7} Passing)
                        </span>
                      </div>

                      {/* 7 Interactive Run Status Pills */}
                      <div className="grid grid-cols-7 gap-1.5 bg-slate-100/70 dark:bg-slate-950/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        {runsTimeline.map((run, rIdx) => {
                          const isRunFail = run.status === 'FAILED';
                          const isRunRunning = run.status === 'RUNNING';
                          const isLatestRun = rIdx === runsTimeline.length - 1;

                          return (
                            <button
                              key={run.id || rIdx}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWorkflowDetail(wf, run.id);
                              }}
                              title={`Cycle #${rIdx + 1}: ${run.status} (${run.durationMs}ms) at ${new Date(run.startedAt).toLocaleTimeString()} - Click to view step-wise logs`}
                              className={`h-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold border transition-all hover:scale-105 shadow-2xs relative ${
                                isRunFail
                                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-200'
                                  : isRunRunning
                                  ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 animate-pulse'
                                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200'
                              }`}
                            >
                              {isRunFail ? '✕' : isRunRunning ? '⋯' : '✓'}
                              {isLatestRun && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white dark:ring-slate-900" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Action */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenBuilder) onOpenBuilder(wf);
                      }}
                      title="View Workflow Details & Nodes in DAG Builder"
                      className="px-2.5 py-1 text-slate-700 dark:text-slate-300 hover:text-primary-700 dark:hover:text-primary-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-750 transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <GitBranch className="w-3 h-3 text-primary-500" />
                      Workflow Spec & DAG
                    </button>

                    <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Step Logs <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 2. INFRASTRUCTURE TARGET HOST MATRIX GRID                     */}
      {/* ============================================================== */}
      {(activeSection === 'ALL' || activeSection === 'HOSTS') && (
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Infrastructure Target Host Health</h2>
              <span className="text-xs text-slate-500">({filteredHosts.length} Hosts Monitored)</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search target host or IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-primary-500 shadow-sm"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary-500 shadow-sm"
              >
                <option value="ALL">All Statuses</option>
                <option value="HEALTHY">Healthy Only</option>
                <option value="WARNING">Warning</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          {/* Host Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredHosts.map((host) => {
              let statusColor = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80';
              let dotColor = 'bg-emerald-500';
              if (host.overallStatus === 'WARNING') {
                statusColor = 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80';
                dotColor = 'bg-amber-500';
              } else if (host.overallStatus === 'CRITICAL') {
                statusColor = 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 animate-pulse';
                dotColor = 'bg-rose-500';
              }

              return (
                <div
                  key={host.targetHost}
                  className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-4 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm hover:shadow-md"
                >
                  {/* Host Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-[210px]" title={host.targetHost}>
                        {host.targetHost}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Check: {host.checkTypes}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      {host.overallStatus}
                    </span>
                  </div>

                  {/* Uptime and Check Ratio */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>Reliability Uptime</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{host.uptimePercent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${host.uptimePercent}%` }}
                      />
                      <div
                        className="bg-rose-500 h-full transition-all"
                        style={{ width: `${100 - host.uptimePercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                      <span>Passed: {host.passCount}</span>
                      <span>Failed: {host.failCount}</span>
                      <span>Total: {host.totalChecks}</span>
                    </div>
                  </div>

                  {/* Latest Metric Value */}
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">Latest Telemetry:</span>
                    <div className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate" title={host.recentMetricValue}>
                      {host.recentMetricValue}
                    </div>
                  </div>

                  {/* Sparkline History Dots */}
                  {host.history && host.history.length > 0 && (
                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[10px] text-slate-500 mr-1">Trend:</span>
                      {host.history.slice(-10).map((pt, i) => (
                        <span
                          key={i}
                          title={`Check at ${new Date(pt.executedAt).toLocaleTimeString()} - ${pt.status} (${pt.durationMs}ms)`}
                          className={`w-2.5 h-2.5 rounded-full transition-transform hover:scale-150 ${
                            pt.status === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="pt-1 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(host.lastCheckedAt).toLocaleTimeString()}
                    </span>
                    <span className="text-primary-600 dark:text-primary-400 font-medium hover:underline cursor-pointer flex items-center gap-0.5">
                      Live Telemetry <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 3. INCIDENT & VOICE ALERT TELEPHONY AUDIT FEED                */}
      {/* ============================================================== */}
      {(activeSection === 'ALL' || activeSection === 'INCIDENTS') && data?.recentIncidents && data.recentIncidents.length > 0 && (
        <section className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Active Incident & Voice Escalation Audit
              </h2>
            </div>
            <span className="text-xs text-slate-500">Last 20 Automated Remediation Actions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[11px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Workflow</th>
                  <th className="py-2.5 px-3">Step Key</th>
                  <th className="py-2.5 px-3">Host / Target</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Metric / Escalation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {data.recentIncidents.map((inc, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(inc.executedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-slate-200">{inc.workflowName}</td>
                    <td className="py-2 px-3 text-slate-800 dark:text-slate-300">{inc.stepKey}</td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{inc.targetHost}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {inc.checkType}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          inc.status === 'PASS'
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={inc.metricValue}>
                      {inc.checkType === 'VOICE_CALL_ACTION' && (
                        <PhoneCall className="w-3 h-3 text-rose-500 dark:text-rose-400 inline mr-1" />
                      )}
                      {inc.metricValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Drill-down Detail Modal on Click of Workflow */}
      <WorkflowDetailModal
        workflow={selectedWorkflow}
        isOpen={isDetailModalOpen}
        initialRunId={initialRunId}
        onClose={() => setIsDetailModalOpen(false)}
        onOpenBuilder={(wf) => {
          setIsDetailModalOpen(false);
          if (onOpenBuilder) onOpenBuilder(wf);
        }}
        onEditSetup={(wf) => {
          setIsDetailModalOpen(false);
          setSetupWorkflow(wf);
          setIsSetupModalOpen(true);
        }}
        onTriggerRun={(wf) => handleTriggerRun(wf)}
      />

      {/* Workflow Setup Modal */}
      <WorkflowSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        name={setupWorkflow?.name || ''}
        description={setupWorkflow?.description || ''}
        cronExpression={setupWorkflow?.cronExpression || '0 2 * * *'}
        isActive={setupWorkflow ? setupWorkflow.isActive : true}
        onSave={handleSaveSetup}
      />
    </div>
  );
};

function getMockNocData(): NocMatrixResponse {
  return {
    overview: {
      totalHosts: 6,
      totalWorkflows: 3,
      activeWorkflows: 3,
      totalRuns24h: 38,
      failedRuns24h: 1,
      successRate24h: 97.4,
      activeIncidents: 2,
      avgDurationMs: 420,
    },
    hosts: [
      {
        targetHost: 'db-node-01.corp.internal',
        overallStatus: 'CRITICAL',
        lastCheckedAt: new Date().toISOString(),
        totalChecks: 42,
        passCount: 38,
        failCount: 4,
        uptimePercent: 90.5,
        checkTypes: 'DISK_CHECK, SQL_JOB_CHECK',
        recentMetricValue: 'Low disk: 4.8% free on C: (Threshold: 10%)',
        recentError: 'Volume capacity alert',
        history: [
          { status: 'PASS', durationMs: 410, executedAt: new Date(Date.now() - 3600000).toISOString() },
          { status: 'PASS', durationMs: 430, executedAt: new Date(Date.now() - 2400000).toISOString() },
          { status: 'FAIL', durationMs: 490, executedAt: new Date(Date.now() - 1200000).toISOString() },
          { status: 'FAIL', durationMs: 510, executedAt: new Date().toISOString() },
        ],
      },
      {
        targetHost: 'rdp-gateway-01.corp.internal',
        overallStatus: 'HEALTHY',
        lastCheckedAt: new Date().toISOString(),
        totalChecks: 58,
        passCount: 58,
        failCount: 0,
        uptimePercent: 100.0,
        checkTypes: 'RDP_PORT_CHECK',
        recentMetricValue: 'TCP 3389 Handshake SYN-ACK OK (14ms)',
        history: [
          { status: 'PASS', durationMs: 14, executedAt: new Date(Date.now() - 3600000).toISOString() },
          { status: 'PASS', durationMs: 16, executedAt: new Date(Date.now() - 2400000).toISOString() },
          { status: 'PASS', durationMs: 15, executedAt: new Date().toISOString() },
        ],
      },
      {
        targetHost: 'sql-cluster.production.internal',
        overallStatus: 'HEALTHY',
        lastCheckedAt: new Date().toISOString(),
        totalChecks: 64,
        passCount: 63,
        failCount: 1,
        uptimePercent: 98.4,
        checkTypes: 'SQL_JOB_CHECK',
        recentMetricValue: 'Database ONLINE, Job "Nightly_Backup" SUCCESS',
        history: [
          { status: 'PASS', durationMs: 18, executedAt: new Date(Date.now() - 2400000).toISOString() },
          { status: 'PASS', durationMs: 22, executedAt: new Date().toISOString() },
        ],
      },
      {
        targetHost: 'api.production.gateway',
        overallStatus: 'HEALTHY',
        lastCheckedAt: new Date().toISOString(),
        totalChecks: 120,
        passCount: 120,
        failCount: 0,
        uptimePercent: 100.0,
        checkTypes: 'URL_CHECK_EXT',
        recentMetricValue: 'HTTPS 200 OK (TLS 1.3, Latency 42ms)',
        history: [
          { status: 'PASS', durationMs: 42, executedAt: new Date().toISOString() },
        ],
      },
    ],
    recentIncidents: [
      {
        runId: 'mock-run-1',
        workflowName: 'Nightly Core Infra Audit & PIC Escalation',
        stepKey: 'step_voice_call_pic',
        targetHost: '+15550192834',
        checkType: 'VOICE_CALL_ACTION',
        status: 'PASS',
        metricValue: 'Twilio Call Dispatched -> Lead SRE (Call SID: CA8b991...)',
        executedAt: new Date(Date.now() - 900000).toISOString(),
        durationMs: 2100,
      },
      {
        runId: 'mock-run-2',
        workflowName: 'Nightly Core Infra Audit & PIC Escalation',
        stepKey: 'step_disk_check',
        targetHost: 'db-node-01.corp.internal',
        checkType: 'DISK_CHECK',
        status: 'FAIL',
        metricValue: 'Free Space 4.8% < 10% Required (Incident Triggered)',
        errorMessage: 'Disk capacity threshold breached',
        executedAt: new Date(Date.now() - 960000).toISOString(),
        durationMs: 450,
      },
    ],
  };
}

function getMockWorkflows(): Workflow[] {
  return [
    {
      id: '8f9e3eef-dd46-4f2e-9be1-9f5ab90c334a',
      name: 'Nightly Core Infra Audit & PIC Escalation',
      description: 'Multi-step automated audit checking disk capacity, SQL agent jobs, and fallback voice alerting.',
      cronExpression: '0 2 * * *',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stepCount: 3,
      steps: [
        {
          id: '1',
          stepKey: 'step_disk_check',
          toolType: 'DISK_CHECK',
          targetHost: 'db-node-01.corp.internal',
          parametersJson: '{"drive": "C:", "thresholdPercentFree": 10}',
          onSuccessStepKey: 'step_sql_job_check',
          onFailureStepKey: 'step_voice_call_pic',
          timeoutSeconds: 15,
          retryCount: 1,
          positionX: 300,
          positionY: 80,
        },
        {
          id: '2',
          stepKey: 'step_voice_call_pic',
          toolType: 'VOICE_CALL_ACTION',
          targetHost: '+15550192834',
          parametersJson: '{"recipientPhone": "+15550192834"}',
          onSuccessStepKey: 'step_sql_job_check',
          onFailureStepKey: 'END',
          timeoutSeconds: 30,
          retryCount: 1,
          positionX: 80,
          positionY: 280,
        },
        {
          id: '3',
          stepKey: 'step_sql_job_check',
          toolType: 'SQL_JOB_CHECK',
          targetHost: 'localhost\\SQLEXPRESS',
          parametersJson: '{"jobName": "Nightly_Backup"}',
          onSuccessStepKey: 'END',
          onFailureStepKey: 'END',
          timeoutSeconds: 20,
          retryCount: 1,
          positionX: 520,
          positionY: 280,
        },
      ],
      lastRun: {
        id: 'mock-1',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3585000).toISOString(),
        failedSteps: 0,
        triggerType: 'SCHEDULED',
      },
    },
    {
      id: '58ce868a-27bf-495c-92cd-c297f9d6cd29',
      name: 'Database Cluster Health & Service Audit',
      description: 'Inspects SQL Server database status and Windows service states across the cluster.',
      cronExpression: '30 3 * * *',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stepCount: 2,
      steps: [
        {
          id: '4',
          stepKey: 'step_sql_health',
          toolType: 'SQL_JOB_CHECK',
          targetHost: 'localhost\\SQLEXPRESS',
          parametersJson: '{"database": "master"}',
          onSuccessStepKey: 'step_service_check',
          onFailureStepKey: 'END',
          timeoutSeconds: 20,
          retryCount: 1,
          positionX: 250,
          positionY: 100,
        },
        {
          id: '5',
          stepKey: 'step_service_check',
          toolType: 'SERVICE_ACTION',
          targetHost: 'localhost',
          parametersJson: '{"serviceName": "W32Time"}',
          onSuccessStepKey: 'END',
          onFailureStepKey: 'END',
          timeoutSeconds: 15,
          retryCount: 1,
          positionX: 250,
          positionY: 260,
        },
      ],
      lastRun: {
        id: 'mock-2',
        status: 'COMPLETED',
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        completedAt: new Date(Date.now() - 7185000).toISOString(),
        failedSteps: 0,
        triggerType: 'SCHEDULED',
      },
    },
  ];
}
