'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  HardDrive,
  ShieldCheck,
  Database,
  Globe,
  Terminal,
  PhoneCall,
  Activity,
  Cpu,
  Plus,
  Sparkles,
  ArrowRight,
  SearchCode,
} from 'lucide-react';
import { AGENT_INVENTORY, AgentInventoryItem } from '@/lib/agentInventory';
import { ToolType } from '@/types';

interface QuickAddStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (toolType: ToolType) => void;
  position?: { x: number; y: number } | null;
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
    case 'WEB_SCRAPER':
      return SearchCode;
    default:
      return Cpu;
  }
};

export const QuickAddStepModal: React.FC<QuickAddStepModalProps> = ({
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['ALL', 'Diagnostics', 'Security & Connectivity', 'Database', 'Network & Web', 'Remediation', 'Escalation'];

  const filtered = AGENT_INVENTORY.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.protocol.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh] text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 text-primary-600 dark:text-primary-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Add Step to Workflow</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose an agent capability to insert into the DAG
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

        {/* Search & Categories */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents by protocol or action (e.g. disk, voice, sql)..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary-500 shadow-sm transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {cat === 'Security & Connectivity' ? 'Security' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching agents found for &quot;{search}&quot;
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = getToolIcon(item.toolType);
              return (
                <button
                  key={item.toolType}
                  onClick={() => {
                    onSelectTool(item.toolType);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 bg-white hover:bg-primary-50/50 dark:bg-slate-950 dark:hover:bg-primary-950/20 transition-all flex items-start gap-3 group shadow-sm hover:shadow"
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 ${item.colorTheme.iconContainer}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {item.protocol}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                  <div className="self-center p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary-600 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Tip: You can also drag & drop agents directly from the left dock</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
