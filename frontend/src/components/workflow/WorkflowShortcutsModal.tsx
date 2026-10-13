'use client';

import React from 'react';
import { X, Keyboard, MousePointer, Sparkles, Layers, ArrowRight, CornerDownLeft } from 'lucide-react';

interface WorkflowShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowShortcutsModal: React.FC<WorkflowShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      action: 'Delete Step or Connection',
      keys: ['Backspace', 'Delete'],
      description: 'Select any step node or arrow line and press to remove.',
    },
    {
      action: 'Quick Insert Step',
      keys: ['Double Click Canvas'],
      description: 'Double click empty canvas area to open the agent search palette.',
    },
    {
      action: 'Connect Branches',
      keys: ['Drag from Handles'],
      description: 'Drag from PASS (green) or FAIL (rose) handles to another step.',
    },
    {
      action: 'In-Node Quick Actions',
      keys: ['Hover Node'],
      description: 'Access Settings (⚙️), Duplicate (📋), and Delete (🗑️) directly on each step.',
    },
    {
      action: 'Auto-Layout DAG',
      keys: ['Auto Layout Button'],
      description: 'Re-aligns and centers all workflow steps automatically in hierarchical order.',
    },
    {
      action: 'Pan Canvas',
      keys: ['Click + Drag'],
      description: 'Click and drag on empty canvas background to pan viewport.',
    },
    {
      action: 'Zoom In / Out',
      keys: ['Mouse Wheel'],
      description: 'Pinch trackpad or roll mouse wheel to zoom smoothly.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 text-primary-600 dark:text-primary-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Workflow Builder Guide & Shortcuts</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Key gestures and tips for high-speed runbook composition
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-4"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{sc.action}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sc.description}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {sc.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300 shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
