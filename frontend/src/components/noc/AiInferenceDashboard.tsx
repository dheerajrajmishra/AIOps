'use client';

import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  ShieldCheck,
  TrendingUp,
  HardDrive,
  Activity,
  Zap,
  Play,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Check,
  Cpu,
  Clock,
  ChevronRight,
  Layers,
  Wrench,
} from 'lucide-react';
import { AiInferenceReport, AiInferenceInsight, Workflow } from '@/types';

interface AiInferenceDashboardProps {
  report: AiInferenceReport | null;
  loading?: boolean;
  onRefresh?: () => void;
  onOpenBuilder?: (wf: Workflow) => void;
  onTriggerRunbook?: (workflowId: string) => void;
  workflows?: Workflow[];
}

export const AiInferenceDashboard: React.FC<AiInferenceDashboardProps> = ({
  report,
  loading = false,
  onRefresh,
  onOpenBuilder,
  onTriggerRunbook,
  workflows = [],
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [executingWorkflowId, setExecutingWorkflowId] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CAPACITY_FORECAST':
        return HardDrive;
      case 'ROOT_CAUSE_ANALYSIS':
        return AlertTriangle;
      case 'ANOMALY_DETECTION':
        return Activity;
      case 'SECURITY_AUDIT':
        return ShieldCheck;
      case 'HEALING_RECOMMENDATION':
        return Sparkles;
      default:
        return Brain;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'CAPACITY_FORECAST':
        return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
      case 'ROOT_CAUSE_ANALYSIS':
        return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'ANOMALY_DETECTION':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'SECURITY_AUDIT':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'HEALING_RECOMMENDATION':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
      case 'MEDIUM':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30';
      case 'INFO':
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30';
    }
  };

  const insights = report?.insights || [];

  const filteredInsights = insights.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSev = selectedSeverity === 'ALL' || item.severity === selectedSeverity;
    const matchesSearch =
      searchFilter === '' ||
      item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.inferenceSummary.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.affectedTarget.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSev && matchesSearch;
  });

  const healthIndex = report?.systemHealthIndex ?? 85.0;
  const healthColor =
    healthIndex >= 90
      ? 'text-emerald-600 dark:text-emerald-400'
      : healthIndex >= 75
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  const healthBgColor =
    healthIndex >= 90
      ? 'bg-emerald-500'
      : healthIndex >= 75
      ? 'bg-amber-500'
      : 'bg-rose-500';

  const avgConfidence =
    insights.length > 0
      ? Math.round(
          (insights.reduce((acc, curr) => acc + curr.confidenceScore, 0) / insights.length) * 10
        ) / 10
      : 95.0;

  const handleExecuteRemediation = async (workflowId?: string | null) => {
    if (!workflowId) return;
    setExecutingWorkflowId(workflowId);
    if (onTriggerRunbook) {
      await onTriggerRunbook(workflowId);
    } else if (onOpenBuilder) {
      const match = workflows.find((w) => w.id === workflowId);
      if (match) onOpenBuilder(match);
    }
    setTimeout(() => setExecutingWorkflowId(null), 1500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Engine Banner - Fully Optimized for Light & Dark Themes */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-slate-100/90 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900/60 border border-indigo-200/80 dark:border-indigo-500/30 backdrop-blur-xl shadow-lg shadow-indigo-100/50 dark:shadow-none relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 dark:border-indigo-400/30 shadow-sm">
                <Brain className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2.5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    AIOps Cognitive Inference Mesh
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-400/30">
                    {report?.engineModel || 'SentinelCognitive-v2.5 (AIOps Inference Mesh)'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Real-time cognitive synthesis of runbook execution telemetry, multi-host log traces, and anomaly forecasting
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-mono shadow-sm">
              <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>
                {report?.generatedAt
                  ? `Last Synthesized: ${new Date(report.generatedAt).toLocaleTimeString()}`
                  : 'Synthesizing Stream...'}
              </span>
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/25 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Analyzing Telemetry...' : 'Re-Run Inference'}
              </button>
            )}
          </div>
        </div>

        {/* Inference High-Level KPI Strip - Beautiful in both Light and Dark */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-200/60 dark:border-indigo-500/20">
          {/* Health Index */}
          <div className="bg-white/85 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
            <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Cognitive Health Index
            </div>
            <div className={`text-2xl font-black mt-1 ${healthColor} flex items-baseline gap-1`}>
              {healthIndex.toFixed(1)}%
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                {healthIndex >= 90 ? 'Optimal' : healthIndex >= 75 ? 'Degraded' : 'Critical Hazard'}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full ${healthBgColor} transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(0, healthIndex))}%` }}
              />
            </div>
          </div>

          {/* Anomalies Detected */}
          <div className="bg-white/85 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
            <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Active Anomalies Detected
            </div>
            <div className="text-2xl font-black mt-1 text-rose-600 dark:text-rose-500 flex items-baseline gap-2">
              {report?.totalAnomaliesDetected ?? 0}
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">High Priority</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Correlated across recent runbook execution traces
            </p>
          </div>

          {/* Proactive Remediations */}
          <div className="bg-white/85 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
            <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Proactive Remediations
            </div>
            <div className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400 flex items-baseline gap-2">
              {report?.proactiveRemediationsSuggested ?? 0}
              <span className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">Actionable</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Self-healing & automated DAG runbooks available
            </p>
          </div>

          {/* Confidence Score */}
          <div className="bg-white/85 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
            <div className="text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Mean AI Confidence
            </div>
            <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
              {avgConfidence}%
              <span className="text-xs text-emerald-600 dark:text-emerald-300 font-medium">Certainty</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Statistical Bayesian anomaly model accuracy
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200/70'
            }`}
          >
            All Insights ({insights.length})
          </button>
          <button
            onClick={() => setSelectedCategory('CAPACITY_FORECAST')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
              selectedCategory === 'CAPACITY_FORECAST'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200/70'
            }`}
          >
            Capacity ({insights.filter((i) => i.category === 'CAPACITY_FORECAST').length})
          </button>
          <button
            onClick={() => setSelectedCategory('ROOT_CAUSE_ANALYSIS')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
              selectedCategory === 'ROOT_CAUSE_ANALYSIS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200/70'
            }`}
          >
            Root Cause ({insights.filter((i) => i.category === 'ROOT_CAUSE_ANALYSIS').length})
          </button>
          <button
            onClick={() => setSelectedCategory('SECURITY_AUDIT')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
              selectedCategory === 'SECURITY_AUDIT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200/70'
            }`}
          >
            Security ({insights.filter((i) => i.category === 'SECURITY_AUDIT').length})
          </button>
          <button
            onClick={() => setSelectedCategory('HEALING_RECOMMENDATION')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap ${
              selectedCategory === 'HEALING_RECOMMENDATION'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200/70'
            }`}
          >
            Healing ({insights.filter((i) => i.category === 'HEALING_RECOMMENDATION').length})
          </button>
        </div>

        {/* Severity Selector & Search */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="INFO">Informational</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search inferences..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* Insights Cards List */}
      {filteredInsights.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <Brain className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-40 animate-pulse" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Cognitive Insights Match Filter
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            All evaluated infrastructure telemetry is operating within nominal thresholds for the selected filter parameters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInsights.map((insight) => {
            const CategoryIcon = getCategoryIcon(insight.category);
            const isCritical = insight.severity === 'CRITICAL';
            const isHigh = insight.severity === 'HIGH';

            return (
              <div
                key={insight.id}
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900/90 border transition-all duration-200 shadow-sm hover:shadow-xl ${
                  isCritical
                    ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/20'
                    : isHigh
                    ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/20'
                    : 'border-slate-200 dark:border-slate-800/90'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center flex-wrap gap-2.5">
                    {/* Category badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${getCategoryBadgeClass(
                        insight.category
                      )}`}
                    >
                      <CategoryIcon className="w-3.5 h-3.5" />
                      {insight.category.replace(/_/g, ' ')}
                    </span>

                    {/* Severity badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold uppercase border ${getSeverityBadgeClass(
                        insight.severity
                      )}`}
                    >
                      {isCritical && <AlertOctagon className="w-3.5 h-3.5" />}
                      {isHigh && <AlertTriangle className="w-3.5 h-3.5" />}
                      {insight.severity}
                    </span>

                    {/* Affected Node Pill */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <Cpu className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      {insight.affectedTarget}
                    </span>
                  </div>

                  {/* Confidence Gauge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Confidence:
                    </span>
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <Zap className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
                      {insight.confidenceScore}%
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-2">
                  {insight.title}
                </h3>

                {/* Inference Summary */}
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 font-sans">
                  {insight.inferenceSummary}
                </p>

                {/* Evidence Metrics */}
                {insight.evidenceMetrics && insight.evidenceMetrics.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                      Diagnostic Telemetry Evidence:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {insight.evidenceMetrics.map((metric, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 text-xs text-slate-800 dark:text-slate-200 font-mono flex items-center gap-2 shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span className="truncate">{metric}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Remediation Action Bar */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Recommended Remediation
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                        {insight.recommendedAction}
                      </p>
                    </div>
                  </div>

                  {/* Remediation Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {insight.remediationWorkflowId ? (
                      <button
                        onClick={() => handleExecuteRemediation(insight.remediationWorkflowId)}
                        disabled={executingWorkflowId === insight.remediationWorkflowId}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                      >
                        {executingWorkflowId === insight.remediationWorkflowId ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Dispatching Runbook...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-white" />
                            Execute Remediation Runbook
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono">
                        Policy Guarded (No Manual Action Needed)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
