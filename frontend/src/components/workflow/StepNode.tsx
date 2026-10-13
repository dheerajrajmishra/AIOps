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
  onSelect?: () => void;
}

const getToolInfo = (type: ToolType) => {
  switch (type) {
    case 'DISK_CHECK':
      return { label: 'Disk Space Check', icon: HardDrive, color: 'text-cyan-700 dark:text-cyan-400', badgeBg: 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-500/30' };
    case 'RDP_PORT_CHECK':
      return { label: 'RDP Port 3389 Handshake', icon: ShieldCheck, color: 'text-indigo-700 dark:text-indigo-400', badgeBg: 'bg-indigo-100 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-500/30' };
    case 'SQL_JOB_CHECK':
      return { label: 'SQL Server Job Audit', icon: Database, color: 'text-amber-700 dark:text-amber-400', badgeBg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/30' };
    case 'URL_CHECK_EXT':
      return { label: 'External HTTPS Probe', icon: Globe, color: 'text-emerald-700 dark:text-emerald-400', badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/30' };
    case 'URL_CHECK_INT':
      return { label: 'Internal URL Probe', icon: Activity, color: 'text-teal-700 dark:text-teal-400', badgeBg: 'bg-teal-100 dark:bg-teal-950/60 border-teal-300 dark:border-teal-500/30' };
    case 'SERVICE_ACTION':
      return { label: 'Windows Service Action', icon: Terminal, color: 'text-purple-700 dark:text-purple-400', badgeBg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-500/30' };
    case 'VOICE_CALL_ACTION':
      return { label: 'Telephony Voice Alert (PIC)', icon: PhoneCall, color: 'text-rose-700 dark:text-rose-400', badgeBg: 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-500/30' };
    default:
      return { label: 'Custom Diagnostic', icon: Activity, color: 'text-slate-700 dark:text-slate-400', badgeBg: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700' };
  }
};

export type StepNodeType = Node<StepNodeData, 'stepNode'>;

export const StepNode = memo(({ data, selected }: NodeProps<any>) => {
  const stepData = data;
  const tool = getToolInfo(stepData.toolType);
  const Icon = tool.icon;
  const status = stepData.status || 'IDLE';

  let borderStyle = 'dark:border-slate-800 border-slate-300 dark:bg-slate-900/90 bg-white/95 shadow-md';
  let statusBadge = null;

  if (status === 'RUNNING') {
    borderStyle = 'border-blue-500 dark:bg-blue-950/40 bg-blue-50/80 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/30 animate-pulse';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full dark:bg-blue-500/20 bg-blue-100 dark:text-blue-300 text-blue-700 border border-blue-500/40 animate-pulse">
        <Clock className="w-3 h-3 animate-spin" /> RUNNING
      </span>
    );
  } else if (status === 'PASS') {
    borderStyle = 'dark:border-emerald-500/80 border-emerald-400 dark:bg-emerald-950/20 bg-emerald-50/60 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-500/20';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full dark:bg-emerald-500/20 bg-emerald-100 dark:text-emerald-300 text-emerald-800 border border-emerald-500/40">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> PASS
      </span>
    );
  } else if (status === 'FAIL') {
    borderStyle = 'border-rose-500 dark:bg-rose-950/30 bg-rose-50/80 ring-2 ring-rose-500/60 shadow-lg shadow-rose-500/25';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full dark:bg-rose-500/20 bg-rose-100 dark:text-rose-300 text-rose-800 border border-rose-500/40">
        <XCircle className="w-3 h-3 text-rose-500" /> FAIL
      </span>
    );
  } else if (status === 'ERROR') {
    borderStyle = 'border-amber-500 dark:bg-amber-950/30 bg-amber-50/80 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/20';
    statusBadge = (
      <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full dark:bg-amber-500/20 bg-amber-100 dark:text-amber-300 text-amber-800 border border-amber-500/40">
        <AlertTriangle className="w-3 h-3 text-amber-500" /> ERROR
      </span>
    );
  }

  return (
    <div
      className={`min-w-[280px] max-w-[340px] rounded-xl border p-4 backdrop-blur-md transition-all duration-200 ${borderStyle} ${
        selected ? 'ring-2 ring-primary-500' : ''
      }`}
    >
      {/* Incoming Connection Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 dark:!bg-slate-400 !bg-slate-600 border-2 dark:!border-slate-900 !border-white rounded-full hover:!scale-125 transition-transform"
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg border ${tool.badgeBg}`}>
            <Icon className={`w-4 h-4 ${tool.color}`} />
          </div>
          <div>
            <div className="text-[11px] font-medium tracking-wider uppercase dark:text-slate-400 text-slate-500">
              {stepData.toolType}
            </div>
            <div className="font-semibold dark:text-slate-100 text-slate-900 text-sm tracking-tight truncate max-w-[150px]" title={stepData.stepKey}>
              {stepData.stepKey}
            </div>
          </div>
        </div>
        {statusBadge}
      </div>

      {/* Target Host */}
      <div className="mt-2 py-1 px-2.5 rounded dark:bg-slate-950/60 bg-slate-100 dark:border-slate-800/80 border-slate-200 flex items-center justify-between text-xs">
        <span className="dark:text-slate-400 text-slate-500 text-[11px]">Target:</span>
        <span className="font-mono dark:text-slate-200 text-slate-800 font-medium truncate max-w-[170px]" title={stepData.targetHost ?? 'localhost'}>
          {stepData.targetHost ?? 'localhost'}
        </span>
      </div>

      {/* Metric Value or Error */}
      {stepData.metricValue && (
        <div className="mt-2 px-2.5 py-1.5 rounded-lg dark:bg-slate-950/90 bg-slate-100/80 dark:border-slate-800 border-slate-200 flex items-center justify-between">
          <span className="text-[11px] dark:text-slate-400 text-slate-500">Metric:</span>
          <span
            className={`font-mono text-xs font-semibold truncate max-w-[180px] ${
              status === 'PASS'
                ? 'dark:text-emerald-300 text-emerald-700'
                : status === 'FAIL'
                ? 'dark:text-rose-300 text-rose-700'
                : 'dark:text-slate-200 text-slate-800'
            }`}
          >
            {stepData.metricValue}
          </span>
        </div>
      )}

      {stepData.errorMessage && (
        <div className="mt-2 p-2 rounded dark:bg-rose-950/40 bg-rose-100 dark:border-rose-900/50 border-rose-200 text-[11px] dark:text-rose-300 text-rose-800 flex items-start gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{stepData.errorMessage}</span>
        </div>
      )}

      {/* Branching Output Handles */}
      <div className="mt-4 pt-2.5 dark:border-slate-800/80 border-slate-200 border-t flex items-center justify-between text-[11px]">
        {/* On Success Branch */}
        <div className="flex items-center gap-1.5 dark:text-emerald-400 text-emerald-600 font-medium">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span>Pass:</span>
          <span className="font-mono text-[10px] dark:text-slate-400 text-slate-500 truncate max-w-[65px]">
            {stepData.onSuccessStepKey || 'END'}
          </span>
        </div>

        {/* On Failure Branch */}
        <div className="flex items-center gap-1.5 dark:text-rose-400 text-rose-600 font-medium">
          <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
          <span>Fail:</span>
          <span className="font-mono text-[10px] dark:text-slate-400 text-slate-500 truncate max-w-[65px]">
            {stepData.onFailureStepKey || 'END'}
          </span>
        </div>
      </div>

      {/* Outgoing Handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="success"
        style={{ left: '25%' }}
        className="w-3.5 h-3.5 !bg-emerald-500 border-2 dark:!border-slate-900 !border-white rounded-full hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="failure"
        style={{ left: '75%' }}
        className="w-3.5 h-3.5 !bg-rose-500 border-2 dark:!border-slate-900 !border-white rounded-full hover:!scale-125 transition-transform"
      />
    </div>
  );
});

StepNode.displayName = 'StepNode';
