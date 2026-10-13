'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  GitBranch,
  History,
  Radio,
  Clock,
  Sparkles,
  ChevronDown,
  Layers,
  Sun,
  Moon,
  Cpu,
  Brain,
  PhoneForwarded,
} from 'lucide-react';
import { Workflow } from '@/types';
import { useTheme } from '@/context/ThemeContext';

interface NavbarProps {
  currentView: 'workflows' | 'builder' | 'inventory' | 'noc' | 'runs' | 'inference' | 'escalation';
  onViewChange: (view: 'workflows' | 'builder' | 'inventory' | 'noc' | 'runs' | 'inference' | 'escalation') => void;
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  onSelectWorkflow: (wf: Workflow) => void;
  onNewWorkflow: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  workflows,
  selectedWorkflow,
  onSelectWorkflow,
  onNewWorkflow,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800/90 px-6 flex items-center justify-between backdrop-blur-xl sticky top-0 z-50 transition-colors duration-200">
      {/* Brand & Logo */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onViewChange('workflows')}>
          <div className="p-2 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 border border-primary-500/30 text-primary-600 dark:text-primary-400 shadow-lg shadow-primary-500/10">
            <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-base tracking-tight flex items-center gap-2">
              InfraSentinel
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-normal uppercase bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                AIOps NOC
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wider">
              Automated Runbook Orchestration Engine
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => onViewChange('workflows')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentView === 'workflows' || currentView === 'builder'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Workflows
          </button>

          <button
            onClick={() => onViewChange('inventory')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentView === 'inventory'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Agent Inventory
          </button>

          <button
            onClick={() => onViewChange('noc')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentView === 'noc'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            NOC Matrix
          </button>

          <button
            onClick={() => onViewChange('inference')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentView === 'inference'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            AI Inference
          </button>

          <button
            onClick={() => onViewChange('escalation')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentView === 'escalation'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <PhoneForwarded className="w-3.5 h-3.5" />
            Escalation Matrix
          </button>

          <button
            onClick={() => onViewChange('runs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              currentView === 'runs'
                ? 'bg-primary-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit Runs
          </button>
        </nav>
      </div>

      {/* Right Toolbar */}
      <div className="flex items-center gap-3">
        {/* Workflow Dropdown (for Visual Builder) */}
        {currentView === 'builder' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedWorkflow?.id || ''}
              onChange={(e) => {
                if (e.target.value === 'new') {
                  onNewWorkflow();
                } else {
                  const wf = workflows.find((w) => w.id === e.target.value);
                  if (wf) onSelectWorkflow(wf);
                }
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-500 max-w-[220px] truncate shadow-sm"
            >
              <option value="new">+ Create New Workflow</option>
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} ({wf.stepCount ?? wf.steps?.length ?? 0} steps)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Theme Toggle Button (Light/Dark) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light View' : 'Switch to Dark View'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-800 shadow-sm"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
              <span className="hidden sm:inline text-[11px] font-medium">Light View</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500 animate-in spin-in-180 duration-300" />
              <span className="hidden sm:inline text-[11px] font-medium">Dark View</span>
            </>
          )}
        </button>

        {/* SignalR Live Pulse */}
        <div className="hidden md:flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-mono">Stream Active</span>
        </div>

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-lg">
          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>{timeStr || 'Loading UTC...'}</span>
        </div>
      </div>
    </header>
  );
};
