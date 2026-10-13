'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import {
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
  Clock,
  ShieldAlert,
  Settings,
  Copy,
  Trash2,
  Server,
  ArrowDown,
  ArrowRight,
} from 'lucide-react';
import { ToolType } from '@/types';

export interface StepNodeData extends Record<string, any> {
  stepKey: string;
  toolType: ToolType;
  targetHost?: string;
  parametersJson?: string;
  onSuccessStepKey?: string | null;
  onFailureStepKey?: string | null;
  timeoutSeconds?: number;
  retryCount?: number;
  status?: 'IDLE' | 'PENDING' | 'RUNNING' | 'PASS' | 'FAIL' | 'ERROR';
  metricValue?: string;
  durationMs?: number;
  errorMessage?: string | null;
  onConfigure?: (stepKey: string) => void;
  onDuplicate?: (stepKey: string) => void;
  onDelete?: (stepKey: string) => void;
}

const getToolInfo = (type: ToolType) => {
  switch (type) {
    case 'DISK_CHECK':
      return {
        label: 'Disk Space Check',
        icon: HardDrive,
        color: 'text-cyan-700 dark:text-cyan-400',
        badgeBg: 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-500/30',
        borderAccent: 'border-cyan-500/40',
      };
    case 'RDP_PORT_CHECK':
      return {
        label: 'RDP Port 3389 Handshake',
        icon: ShieldCheck,
        color: 'text-indigo-700 dark:text-indigo-400',
        badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-500/30',
        borderAccent: 'border-indigo-500/40',
      };
    case 'SQL_JOB_CHECK':
      return {
        label: 'SQL Server Job Audit',
        icon: Database,
        color: 'text-amber-700 dark:text-amber-400',
        badgeBg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/30',
        borderAccent: 'border-amber-500/40',
      };
    case 'URL_CHECK_EXT':
      return {
        label: 'External HTTPS Probe',
        icon: Globe,
        color: 'text-emerald-700 dark:text-emerald-400',
        badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/30',
        borderAccent: 'border-emerald-500/40',
      };
    case 'URL_CHECK_INT':
      return {
        label: 'Internal URL Probe',
        icon: Activity,
        color: 'text-teal-700 dark:text-teal-400',
        badgeBg: 'bg-teal-100 dark:bg-teal-950/60 border-teal-300 dark:border-teal-500/30',
        borderAccent: 'border-teal-500/40',
      };
    case 'SERVICE_ACTION':
      return {
        label: 'Windows Service Action',
        icon: Terminal,
        color: 'text-purple-700 dark:text-purple-400',
        badgeBg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-500/30',
        borderAccent: 'border-purple-500/40',
      };
    case 'VOICE_CALL_ACTION':
      return {
        label: 'Telephony Voice Alert (PIC)',
        icon: PhoneCall,
        color: 'text-rose-700 dark:text-rose-400',
        badgeBg: 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-500/30',
        borderAccent: 'border-rose-500/40',
      };
    default:
      return {
        label: 'Custom Diagnostic',
        icon: Activity,
        color: 'text-slate-700 dark:text-slate-400',
        badgeBg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
        borderAccent: 'border-slate-500/40',
      };
  }
};

const extractParameterSummary = (toolType: ToolType, jsonStr?: string): string | null => {
  if (!jsonStr) return null;
  try {
    const p = JSON.parse(jsonStr);
    if (toolType === 'DISK_CHECK') {
      return `Drive ${p.drive || 'C:'} (threshold < ${p.thresholdPercentFree || 15}%)`;
    }
    if (toolType === 'RDP_PORT_CHECK') {
      return `Port ${p.port || 3389}`;
    }
    if (toolType === 'SQL_JOB_CHECK') {
      return `Job: ${p.jobName || 'Audit'}`;
    }
    if (toolType === 'URL_CHECK_EXT' || toolType === 'URL_CHECK_INT') {
      return p.url ? `${p.url.replace(/^https?:\/\//, '')}` : null;
    }
    if (toolType === 'SERVICE_ACTION') {
      return `${p.action || 'Query'} ${p.serviceName || 'Service'}`;
    }
    if (toolType === 'VOICE_CALL_ACTION') {
      return p.picName ? `Call: ${p.picName}` : (p.recipientPhone ? `Call: ${p.recipientPhone}` : null);
    }
  } catch {
    return null;
  }
  return null;
};

export type StepNodeType = Node<StepNodeData, 'stepNode'>;

export const StepNode = memo(({ data, selected }: NodeProps<any>) => {
  const stepData = data;
  const tool = getToolInfo(stepData.toolType);
  const Icon = tool.icon;
  const status = stepData.status || 'IDLE';
  const paramSummary = extractParameterSummary(stepData.toolType, stepData.parametersJson);

  let borderStyle = 'border-slate-300 dark:border-slate-750 bg-white dark:bg-slate-900 shadow-md hover:shadow-lg';
  let statusBadge = null;

  if (status === 'RUNNING') {
    borderStyle = 'border-blue-500 dark:bg-blue-950/40 bg-blue-50/90 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/40 animate-pulse">
        <Clock className="w-3 h-3 animate-spin" /> RUNNING
      </span>
    );
  } else if (status === 'PASS') {
    borderStyle = 'border-emerald-500 dark:border-emerald-500/70 bg-emerald-50/70 dark:bg-emerald-950/25 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-500/15';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> PASS
      </span>
    );
  } else if (status === 'FAIL') {
    borderStyle = 'border-rose-500 dark:border-rose-500/70 bg-rose-50/80 dark:bg-rose-950/30 ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/20';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/40">
        <XCircle className="w-3 h-3 text-rose-500" /> FAIL
      </span>
    );
  } else if (status === 'ERROR') {
    borderStyle = 'border-amber-500 dark:border-amber-500/70 bg-amber-50/80 dark:bg-amber-950/30 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/20';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
        <AlertTriangle className="w-3 h-3 text-amber-500" /> ERROR
      </span>
    );
  }

  return (
    <div
      className={`group relative min-w-[290px] max-w-[340px] rounded-2xl border p-4 backdrop-blur-md transition-all duration-200 select-none ${borderStyle} ${
        selected ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 shadow-xl' : ''
      }`}
    >
      {/* Top Incoming Connection Handle (Unobstructed, High-Contrast Blue Port) */}
      <Handle
        type="target"
        position={Position.Top}
        id="target"
        title="Input: Connect previous step's PASS or FAIL here"
        className="!w-4 !h-4 !bg-blue-600 dark:!bg-blue-500 border-2 !border-slate-900 dark:!border-white rounded-full shadow-lg hover:!scale-150 transition-transform !cursor-crosshair z-30"
      />

      {/* Quick Action Overlay (Shown on hover or when selected) */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity bg-white/95 dark:bg-slate-900/95 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (stepData.onConfigure) stepData.onConfigure(stepData.stepKey);
          }}
          title="Configure Step Settings"
          className="p-1 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (stepData.onDuplicate) stepData.onDuplicate(stepData.stepKey);
          }}
          title="Duplicate Step"
          className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (stepData.onDelete) stepData.onDelete(stepData.stepKey);
          }}
          title="Delete Step"
          className="p-1 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start gap-2.5 pr-20 mb-2.5">
        <div className={`p-2 rounded-xl border shadow-sm shrink-0 ${tool.badgeBg}`}>
          <Icon className={`w-4 h-4 ${tool.color}`} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 truncate">
            {tool.label}
          </div>
          <div
            className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs tracking-tight truncate"
            title={stepData.stepKey}
          >
            {stepData.stepKey}
          </div>
        </div>
      </div>

      {/* Status Badge (if executed or running) */}
      {statusBadge && <div className="mb-2.5">{statusBadge}</div>}

      {/* Target Host Details */}
      <div className="py-1 px-2.5 rounded-lg bg-slate-100/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
          <Server className="w-3 h-3 text-slate-400" /> Target:
        </span>
        <span
          className="font-mono text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[170px]"
          title={stepData.targetHost ?? 'localhost'}
        >
          {stepData.targetHost ?? 'localhost'}
        </span>
      </div>

      {/* Parameter preview if available */}
      {paramSummary && (
        <div className="mt-1.5 py-0.5 px-2 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate">
          {paramSummary}
        </div>
      )}

      {/* Metric Value on execution */}
      {stepData.metricValue && (
        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Metric:</span>
          <span
            className={`font-mono text-xs font-semibold truncate max-w-[180px] ${
              status === 'PASS'
                ? 'text-emerald-700 dark:text-emerald-300'
                : status === 'FAIL'
                ? 'text-rose-700 dark:text-rose-300'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {stepData.metricValue}
          </span>
        </div>
      )}

      {/* Error message if failed */}
      {stepData.errorMessage && (
        <div className="mt-2 p-2 rounded-lg bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-800 dark:text-rose-300 flex items-start gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{stepData.errorMessage}</span>
        </div>
      )}

      {/* Branching Output Connection Info Bar (Inside Card - Never Blocks Handles) */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
        {/* On Success Branch Indicator */}
        <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10px] uppercase font-mono tracking-wider">
            PASS ➔
          </span>
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[60px]" title={stepData.onSuccessStepKey || 'END'}>
            {stepData.onSuccessStepKey || 'END'}
          </span>
        </div>

        {/* On Failure Branch Indicator */}
        <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
          <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-[10px] uppercase font-mono tracking-wider">
            FAIL ➔
          </span>
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[60px]" title={stepData.onFailureStepKey || 'END'}>
            {stepData.onFailureStepKey || 'END'}
          </span>
        </div>
      </div>

      {/* Bottom Outgoing Handles (Unobstructed, High-Contrast Ports with Clear IDs) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="success"
        style={{ left: '25%' }}
        title="PASS: Drag from here to connect the next step on SUCCESS"
        className="!w-4 !h-4 !bg-emerald-500 dark:!bg-emerald-400 border-2 !border-slate-900 dark:!border-white rounded-full shadow-lg hover:!scale-150 transition-transform !cursor-crosshair z-30"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="failure"
        style={{ left: '75%' }}
        title="FAIL: Drag from here to connect the next step on FAILURE / ESCALATION"
        className="!w-4 !h-4 !bg-rose-500 dark:!bg-rose-400 border-2 !border-slate-900 dark:!border-white rounded-full shadow-lg hover:!scale-150 transition-transform !cursor-crosshair z-30"
      />
    </div>
  );
});

StepNode.displayName = 'StepNode';
