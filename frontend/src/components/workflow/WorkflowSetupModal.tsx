'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { CRON_PRESETS, formatCronSchedule, validateCronExpression } from '@/lib/cronUtils';

interface WorkflowSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  description: string;
  cronExpression: string;
  isActive: boolean;
  onSave: (setup: { name: string; description: string; cronExpression: string; isActive: boolean }) => void;
}

export const WorkflowSetupModal: React.FC<WorkflowSetupModalProps> = ({
  isOpen,
  onClose,
  name,
  description,
  cronExpression,
  isActive,
  onSave,
}) => {
  const [localName, setLocalName] = useState(name);
  const [localDesc, setLocalDesc] = useState(description);
  const [localCron, setLocalCron] = useState(cronExpression || '0 2 * * *');
  const [localActive, setLocalActive] = useState(isActive);
  const [customCron, setCustomCron] = useState(cronExpression);

  useEffect(() => {
    if (isOpen) {
      setLocalName(name);
      setLocalDesc(description || '');
      setLocalCron(cronExpression || '0 2 * * *');
      setCustomCron(cronExpression || '0 2 * * *');
      setLocalActive(isActive);
    }
  }, [isOpen, name, description, cronExpression, isActive]);

  if (!isOpen) return null;

  const cronValidation = validateCronExpression(localCron);
  const humanReadableSchedule = formatCronSchedule(localCron);

  const handleSelectPreset = (presetExpr: string) => {
    setLocalCron(presetExpr);
    setCustomCron(presetExpr);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localName.trim()) return;
    onSave({
      name: localName.trim(),
      description: localDesc.trim(),
      cronExpression: localCron.trim(),
      isActive: localActive,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 border border-primary-500/30 text-primary-600 dark:text-primary-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Workflow Setup & Schedule</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure runbook identity, description, and execution cadence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Workflow Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center justify-between">
              <span>Workflow Name <span className="text-rose-500 dark:text-rose-400">*</span></span>
              <span className="text-[10px] text-slate-500 font-mono">Unique identifier</span>
            </label>
            <input
              type="text"
              required
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="e.g. Core Database & Disk Space Sentinel"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors shadow-sm"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-300">Description & Objective</label>
            <textarea
              rows={2}
              value={localDesc}
              onChange={(e) => setLocalDesc(e.target.value)}
              placeholder="Describe what automated checks and remediations this workflow executes..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors resize-none shadow-sm"
            />
          </div>

          {/* Status Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Active Quartz Scheduling</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {localActive ? 'Workflow will trigger automatically on schedule' : 'Workflow is paused; manual triggers only'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLocalActive(!localActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                localActive
                  ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${localActive ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`} />
              {localActive ? 'ACTIVE' : 'PAUSED'}
            </button>
          </div>

          {/* Schedule Configuration */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                Schedule Cadence (Cron)
              </label>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                {humanReadableSchedule}
              </span>
            </div>

            {/* Quick Presets Grid */}
            <div className="grid grid-cols-2 gap-2 text-left">
              {CRON_PRESETS.map((preset) => {
                const isSelected = localCron.trim() === preset.expression.trim();
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelectPreset(preset.expression)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-primary-50 dark:bg-primary-600/20 border-primary-500/60 text-primary-900 dark:text-white shadow-md shadow-primary-600/10 ring-1 ring-primary-500/40'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{preset.label}</span>
                      {preset.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                          {preset.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">{preset.expression}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Cron Input */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Or enter custom 5-part cron expression:</span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">(min hour dom month dow)</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customCron}
                  onChange={(e) => {
                    setCustomCron(e.target.value);
                    setLocalCron(e.target.value);
                  }}
                  placeholder="0 2 * * *"
                  className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none transition-colors shadow-sm"
                />
              </div>

              {!cronValidation.isValid && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {cronValidation.error}
                </p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!localName.trim() || !cronValidation.isValid}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-primary-600/30 flex items-center gap-2 transition-all"
            >
              <Check className="w-4 h-4" />
              Save Workflow Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
