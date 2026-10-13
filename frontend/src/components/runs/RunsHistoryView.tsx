'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ChevronRight,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { WorkflowRun, StepExecutionLog } from '@/types';
import { fetchRuns, fetchRun } from '@/lib/api';

export const RunsHistoryView: React.FC = () => {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [loadingRunDetails, setLoadingRunDetails] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadRuns = async () => {
    setLoading(true);
    const data = await fetchRuns();
    setRuns(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const handleSelectRun = async (runId: string) => {
    setLoadingRunDetails(true);
    const details = await fetchRun(runId);
    setSelectedRun(details);
    setLoadingRunDetails(false);
  };

  const filteredRuns = runs.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            Execution Runs & Audit Trail
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Historical audit logs, runbook pass/fail branches, step latency, and raw stdout inspection
          </p>
        </div>

        <button
          onClick={loadRuns}
          disabled={loading}
          className="px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh History
        </button>
      </div>

      {/* Main Grid: Left Table, Right Drilldown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table Column */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Execution History</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-primary-500 shadow-sm"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="RUNNING">Running</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[11px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3 font-sans">Workflow</th>
                  <th className="py-2.5 px-3">Trigger</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Steps</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {filteredRuns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500 italic font-sans">
                      No runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredRuns.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => handleSelectRun(r.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedRun?.id === r.id ? 'bg-primary-950/30 border-l-2 border-primary-500' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {r.id.substring(0, 8)}...
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        {r.workflowName || 'Workflow'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                          {r.triggerType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300'
                              : r.status === 'RUNNING'
                              ? 'bg-blue-950 text-blue-300 animate-pulse'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {r.totalSteps} {r.failedSteps > 0 && <span className="text-rose-400">({r.failedSteps} err)</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {r.durationMs > 0 ? `${r.durationMs}ms` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-500 inline" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Drill-down Detail Column */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary-600 dark:text-primary-400" /> Run Detail Waterfall
            </span>
            {selectedRun && (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {new Date(selectedRun.startedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {!selectedRun ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 italic text-xs">
              Select an execution run on the left to inspect its step-by-step waterfall timeline and diagnostics.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Status</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRun.status}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Total Steps</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRun.totalSteps}</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Total Duration</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRun.durationMs}ms</span>
                </div>
              </div>

              {/* Step Waterfall Timeline */}
              <div className="space-y-2.5">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 block">Step Execution Sequence:</span>
                {selectedRun.logs?.map((stepLog, idx) => (
                  <div
                    key={stepLog.id || idx}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="text-slate-500">{idx + 1}.</span>
                        <span>{stepLog.stepKey}</span>
                        <span className="text-slate-500 font-sans text-[10px]">({stepLog.checkType})</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          stepLog.status === 'PASS'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {stepLog.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Host: <strong className="text-slate-300 font-mono">{stepLog.targetHost || 'localhost'}</strong></span>
                      <span>Latency: <strong className="text-slate-300 font-mono">{stepLog.durationMs}ms</strong></span>
                    </div>

                    <div className="p-2 rounded bg-black/40 border border-slate-900 font-mono text-[11px] text-slate-200">
                      Metric: <span className="font-semibold text-white">{stepLog.metricValue}</span>
                    </div>

                    {stepLog.errorMessage && (
                      <div className="p-2 rounded bg-rose-950/40 border border-rose-900/50 text-rose-300 text-[11px]">
                        {stepLog.errorMessage}
                      </div>
                    )}

                    {stepLog.rawOutput && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-primary-400 hover:text-primary-300 cursor-pointer">
                          Inspect Raw JSON Output
                        </summary>
                        <pre className="mt-1.5 p-2 bg-black rounded text-[10px] font-mono text-slate-300 max-h-28 overflow-auto border border-slate-900">
                          {stepLog.rawOutput}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
