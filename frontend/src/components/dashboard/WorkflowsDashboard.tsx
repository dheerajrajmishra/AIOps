'use client';

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Play,
  Clock,
  Calendar,
  GitBranch,
  ShieldCheck,
  HardDrive,
  Database,
  Globe,
  Terminal,
  PhoneCall,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Cpu,
  BarChart3,
  ExternalLink,
  Brain,
} from 'lucide-react';
import { Workflow, ToolType } from '@/types';
import { formatCronSchedule } from '@/lib/cronUtils';
import { AGENT_INVENTORY, getAgentInventoryItem } from '@/lib/agentInventory';
import { WorkflowDetailModal } from '@/components/workflow/WorkflowDetailModal';
import { WorkflowSetupModal } from '@/components/workflow/WorkflowSetupModal';
import { triggerWorkflowRun, createWorkflow, updateWorkflow } from '@/lib/api';

interface WorkflowsDashboardProps {
  workflows: Workflow[];
  onSelectWorkflow: (wf: Workflow) => void;
  onOpenBuilder: (wf: Workflow) => void;
  onNewWorkflow: () => void;
  onRefreshWorkflows: () => void;
  onSwitchToNocMatrix?: () => void;
  onSwitchToAgentInventory?: () => void;
  onSwitchToAiInference?: () => void;
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

export const WorkflowsDashboard: React.FC<WorkflowsDashboardProps> = ({
  workflows,
  onSelectWorkflow,
  onOpenBuilder,
  onNewWorkflow,
  onRefreshWorkflows,
  onSwitchToNocMatrix,
  onSwitchToAgentInventory,
  onSwitchToAiInference,
}) => {
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'FAILED' | 'PAUSED'>('ALL');
  const [detailWorkflow, setDetailWorkflow] = useState<Workflow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [setupWorkflow, setSetupWorkflow] = useState<Workflow | null>(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  const filteredWorkflows = workflows.filter((wf) => {
    const matchesSearch =
      wf.name.toLowerCase().includes(search.toLowerCase()) ||
      (wf.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (wf.cronExpression || '').toLowerCase().includes(search.toLowerCase());

    const matchesActive =
      filterActive === 'ALL' ||
      (filterActive === 'ACTIVE' && wf.lastRun?.status !== 'FAILED' && wf.isActive) ||
      (filterActive === 'FAILED' && wf.lastRun?.status === 'FAILED') ||
      (filterActive === 'PAUSED' && !wf.isActive);

    return matchesSearch && matchesActive;
  });

  const activeCount = workflows.filter((w) => w.isActive).length;
  const failedCount = workflows.filter((w) => w.lastRun?.status === 'FAILED').length;
  const healthyCount = workflows.filter((w) => w.lastRun?.status !== 'FAILED' && w.isActive).length;
  const totalAgentsDeployed = workflows.reduce((acc, w) => acc + (w.stepCount ?? w.steps?.length ?? 0), 0);

  const [initialRunId, setInitialRunId] = useState<string | null>(null);

  const handleOpenDetail = (wf: Workflow, runId?: string) => {
    setDetailWorkflow(wf);
    setInitialRunId(runId || null);
    setIsDetailOpen(true);
  };

  const handleOpenSetup = (wf: Workflow) => {
    setSetupWorkflow(wf);
    setIsCreatingNew(false);
    setIsSetupOpen(true);
  };

  const handleStartCreateNew = () => {
    setSetupWorkflow(null);
    setIsCreatingNew(true);
    setIsSetupOpen(true);
  };

  const handleSaveSetup = async (setupData: {
    name: string;
    description: string;
    cronExpression: string;
    isActive: boolean;
  }) => {
    if (isCreatingNew) {
      const created = await createWorkflow({
        name: setupData.name,
        description: setupData.description,
        cronExpression: setupData.cronExpression,
        isActive: setupData.isActive,
        steps: [],
      });
      onRefreshWorkflows();
      if (created) {
        onOpenBuilder(created);
      }
    } else if (setupWorkflow) {
      await updateWorkflow(setupWorkflow.id, {
        name: setupData.name,
        description: setupData.description,
        cronExpression: setupData.cronExpression,
        isActive: setupData.isActive,
      });
      onRefreshWorkflows();
    }
  };

  const handleTriggerRun = async (wf: Workflow) => {
    setTriggeringId(wf.id);
    try {
      await triggerWorkflowRun(wf.id);
      setTimeout(() => {
        onRefreshWorkflows();
        setTriggeringId(null);
      }, 1500);
    } catch {
      setTriggeringId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 border border-primary-500/30 text-primary-600 dark:text-primary-400 shadow-md">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5 tracking-tight">
                Workflows & Orchestration Center
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Manage automated infrastructure runbooks, schedules, and agent inventory deployments
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {onSwitchToAgentInventory && (
            <button
              onClick={onSwitchToAgentInventory}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Cpu className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
              <span>Agent Inventory</span>
            </button>
          )}

          {onSwitchToNocMatrix && (
            <button
              onClick={onSwitchToNocMatrix}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>NOC Host Matrix</span>
            </button>
          )}

          {onSwitchToAiInference && (
            <button
              onClick={onSwitchToAiInference}
              className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>AI Inference</span>
            </button>
          )}

          <button
            onClick={onRefreshWorkflows}
            className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors shadow-sm"
            title="Refresh workflows"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleStartCreateNew}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-primary-600/30 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Workflow</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[11px]">Total Workflows</span>
            <Layers className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2 flex items-baseline gap-1.5">
            {workflows.length}
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Runbooks</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[11px]">Passing (Healthy)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-baseline gap-1.5">
            {healthyCount}
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">/ {workflows.length} Passing</span>
          </div>
        </div>

        <div
          onClick={() => setFilterActive(filterActive === 'FAILED' ? 'ALL' : 'FAILED')}
          className={`bg-white dark:bg-slate-900/80 border p-4 rounded-2xl shadow-sm cursor-pointer transition-all group ${
            failedCount > 0
              ? 'border-rose-300 dark:border-rose-800/80 hover:border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
              : 'border-slate-200 dark:border-slate-800/80'
          }`}
          title="Click to filter failing runbooks"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[11px] group-hover:text-rose-600 dark:group-hover:text-rose-400">
              Alerts (Failed)
            </span>
            <div className="p-1 rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/60">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2 flex items-baseline gap-1.5">
            {failedCount}
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Failing Runs →</span>
          </div>
        </div>

        <div
          onClick={onSwitchToAgentInventory}
          className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm cursor-pointer hover:border-cyan-400 dark:hover:border-cyan-600 transition-all group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[11px] group-hover:text-cyan-700 dark:group-hover:text-cyan-300">
              Agent Inventory
            </span>
            <div className="p-1 rounded-md bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-700/50 shadow-sm">
              <Cpu className="w-3.5 h-3.5 text-cyan-700 dark:text-cyan-300" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300 mt-2 flex items-baseline gap-1.5">
            {AGENT_INVENTORY.length}
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Classes →</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[11px]">Deployed Steps</span>
            <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/50 shadow-sm">
              <GitBranch className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-2 flex items-baseline gap-1.5">
            {totalAgentsDeployed}
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">DAG Nodes</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search workflows by name or schedule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end text-xs">
          <button
            onClick={() => setFilterActive('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterActive === 'ALL'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All ({workflows.length})
          </button>
          <button
            onClick={() => setFilterActive('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterActive === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Healthy ({healthyCount})
          </button>
          <button
            onClick={() => setFilterActive('FAILED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              filterActive === 'FAILED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Failed ({failedCount})
          </button>
          <button
            onClick={() => setFilterActive('PAUSED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterActive === 'PAUSED'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Paused ({workflows.length - activeCount})
          </button>
        </div>
      </div>

      {/* Workflows Grid - Primary First View */}
      {filteredWorkflows.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <Layers className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-300">No workflows found</h3>
          <p className="text-xs text-slate-500">Create a new automated runbook to begin orchestrating agents.</p>
          <button
            onClick={handleStartCreateNew}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-md shadow-primary-600/30"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkflows.map((wf) => {
            const scheduleDesc = formatCronSchedule(wf.cronExpression);
            const stepCount = wf.stepCount ?? wf.steps?.length ?? 0;
            const lastRun = wf.lastRun;
            const hasFailure = lastRun && lastRun.status === 'FAILED';
            const isRunning = lastRun && lastRun.status === 'RUNNING';
            const isTriggering = triggeringId === wf.id;

            return (
              <div
                key={wf.id}
                onClick={() => handleOpenDetail(wf)}
                className={`bg-white dark:bg-slate-900/90 hover:bg-slate-50/80 dark:hover:bg-slate-850 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 group relative overflow-hidden border ${
                  hasFailure
                    ? 'border-rose-300 dark:border-rose-900/70 hover:border-rose-400 dark:hover:border-rose-700 bg-rose-50/10 dark:bg-rose-950/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750'
                }`}
              >
                {/* Top indicator bar */}
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

                <div className="space-y-3.5">
                  {/* Header: Title, Active status, and Icon */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
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
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors leading-snug truncate">
                          {wf.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                              wf.isActive
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {wf.isActive ? 'SCHEDULE ACTIVE' : 'PAUSED'}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {stepCount} {stepCount === 1 ? 'Step' : 'Steps in DAG'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Workflow Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {wf.description || 'Automated multi-step diagnostics and self-healing execution runbook.'}
                  </p>

                  {/* Workflow Schedule & Cadence Box */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium truncate">{scheduleDesc}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                      {wf.cronExpression || 'No Cron'}
                    </span>
                  </div>

                  {/* Workflow Agents in DAG Preview */}
                  {wf.steps && wf.steps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mr-1">Agents:</span>
                      {wf.steps.slice(0, 4).map((s) => {
                        const agentMeta = getAgentInventoryItem(s.toolType);
                        const Icon = getToolIcon(s.toolType);
                        return (
                          <span
                            key={s.id || s.stepKey}
                            title={`${agentMeta.name} on ${s.targetHost || 'localhost'}`}
                            className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-lg border font-mono font-medium ${agentMeta.colorTheme.badgeBg}`}
                          >
                            <span className={`p-0.5 rounded ${agentMeta.colorTheme.iconContainer}`}>
                              <Icon className="w-2.5 h-2.5" />
                            </span>
                            {agentMeta.shortLabel}
                          </span>
                        );
                      })}
                      {wf.steps.length > 4 && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          +{wf.steps.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Latest Run Detail Strip */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Latest Run Status:</span>
                      {lastRun ? (
                        hasFailure ? (
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[11px] bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/60">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            FAILED {lastRun.failedSteps ? `(${lastRun.failedSteps} Alert)` : ''}
                          </span>
                        ) : isRunning ? (
                          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 text-[11px] bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            RUNNING
                          </span>
                        ) : (
                          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            PASSED
                          </span>
                        )
                      ) : (
                        <span className="font-mono text-slate-400 text-[10px]">No runs yet</span>
                      )}
                    </div>

                    {lastRun && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                        <span>Time: {new Date(lastRun.startedAt).toLocaleTimeString()}</span>
                        <span>Duration: {lastRun.durationMs ? `${lastRun.durationMs}ms` : '120ms'}</span>
                        <span>Mode: {lastRun.triggerType}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: DAG Canvas, Schedule, and Run */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBuilder(wf);
                      }}
                      title="Open in Visual DAG Builder Canvas"
                      className="px-2.5 py-1 text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-white bg-primary-50 hover:bg-primary-100 dark:bg-primary-600/20 dark:hover:bg-primary-600 rounded-lg text-xs font-semibold border border-primary-200 dark:border-primary-500/30 transition-all flex items-center gap-1 shadow-xs"
                    >
                      <GitBranch className="w-3 h-3" />
                      DAG Builder
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSetup(wf);
                      }}
                      title="Setup Name & Schedule Cadence"
                      className="px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-750 transition-colors"
                    >
                      Schedule
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerRun(wf);
                      }}
                      disabled={isTriggering}
                      title="Trigger execution run now"
                      className="p-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-all shadow-md shadow-primary-600/30 hover:scale-110 flex items-center gap-1 text-xs px-2 font-medium"
                    >
                      <Play className={`w-3.5 h-3.5 fill-white ${isTriggering ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Run</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Workflow Detail Modal */}
      <WorkflowDetailModal
        workflow={detailWorkflow}
        isOpen={isDetailOpen}
        initialRunId={initialRunId}
        onClose={() => setIsDetailOpen(false)}
        onOpenBuilder={(wf) => {
          setIsDetailOpen(false);
          onOpenBuilder(wf);
        }}
        onEditSetup={(wf) => {
          setIsDetailOpen(false);
          handleOpenSetup(wf);
        }}
        onTriggerRun={(wf) => handleTriggerRun(wf)}
      />

      {/* Workflow Setup Modal */}
      <WorkflowSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        name={setupWorkflow?.name || 'New Infrastructure Workflow'}
        description={setupWorkflow?.description || ''}
        cronExpression={setupWorkflow?.cronExpression || '0 2 * * *'}
        isActive={setupWorkflow ? setupWorkflow.isActive : true}
        onSave={handleSaveSetup}
      />
    </div>
  );
};
