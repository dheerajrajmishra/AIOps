'use client';

import React, { useState } from 'react';
import {
  HardDrive,
  ShieldCheck,
  Database,
  Globe,
  Terminal,
  PhoneCall,
  Activity,
  GripVertical,
  Plus,
  Info,
  Search,
  Filter,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  ChevronRight,
  X,
  ExternalLink,
} from 'lucide-react';
import { AGENT_INVENTORY, AgentInventoryItem, getAgentInventoryItem } from '@/lib/agentInventory';
import { ToolType } from '@/types';

interface AgentInventoryPanelProps {
  onAddAgent: (toolType: ToolType) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const getAgentIcon = (toolType: ToolType) => {
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

export const AgentInventoryPanel: React.FC<AgentInventoryPanelProps> = ({
  onAddAgent,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [inspectingAgent, setInspectingAgent] = useState<AgentInventoryItem | null>(null);

  const categories = ['ALL', 'Diagnostics', 'Security & Connectivity', 'Database', 'Network & Web', 'Remediation', 'Escalation'];

  const filteredAgents = AGENT_INVENTORY.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase()) ||
      agent.protocol.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || agent.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const onDragStart = (event: React.DragEvent, toolType: ToolType) => {
    event.dataTransfer.setData('application/reactflow-tooltype', toolType);
    event.dataTransfer.effectAllowed = 'move';
  };

  if (isCollapsed) {
    return (
      <div className="w-14 bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 justify-between h-full z-20 shadow-sm transition-colors duration-200">
        <button
          onClick={onToggleCollapse}
          title="Expand Agent Inventory"
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-primary-600 dark:text-primary-400 transition-colors shadow-sm"
        >
          <Layers className="w-5 h-5" />
        </button>
        <div className="flex flex-col gap-3">
          {AGENT_INVENTORY.map((agent) => {
            const Icon = getAgentIcon(agent.toolType);
            return (
              <div
                key={agent.toolType}
                draggable
                onDragStart={(e) => onDragStart(e, agent.toolType)}
                onClick={() => onAddAgent(agent.toolType)}
                title={`Drag ${agent.shortLabel} to canvas`}
                className={`w-9 h-9 rounded-lg border flex items-center justify-center cursor-grab active:cursor-grabbing transition-all hover:scale-105 shadow-sm ${agent.colorTheme.iconContainer}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            );
          })}
        </div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono rotate-[-90deg] whitespace-nowrap mb-6 font-semibold">
          AGENT DOCK
        </div>
      </div>
    );
  }

  return (
    <aside className="w-80 md:w-88 bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full z-20 shadow-xl relative select-none transition-colors duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 border border-primary-500/30 text-primary-600 dark:text-primary-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Agent Inventory
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                {AGENT_INVENTORY.length} Available
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Drag agents onto canvas to compose runbook
            </p>
          </div>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title="Collapse dock"
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search agents by protocol or task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors shadow-sm"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white font-medium shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {cat === 'Security & Connectivity' ? 'Security' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Agents List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold px-1 flex items-center justify-between">
          <span>Catalog ({filteredAgents.length})</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-normal">
            <GripVertical className="w-3 h-3" /> Drag & Drop
          </span>
        </div>

        {filteredAgents.map((agent) => {
          const Icon = getAgentIcon(agent.toolType);

          return (
            <div
              key={agent.toolType}
              draggable
              onDragStart={(e) => onDragStart(e, agent.toolType)}
              className="group relative bg-slate-50/80 hover:bg-slate-100 dark:bg-slate-950/70 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md shadow-sm"
            >
              <div className="flex items-start gap-2.5">
                {/* Drag Handle & Icon */}
                <div className="flex items-center gap-1 mt-0.5">
                  <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-600 dark:group-hover:text-slate-400 transition-colors" />
                  <div className={`p-2 rounded-lg border shadow-sm ${agent.colorTheme.iconContainer}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-white truncate">
                      {agent.name}
                    </h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {agent.inventoryCount} nodes
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                    {agent.description}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {agent.protocol}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingAgent(agent);
                        }}
                        title="View Agent Capabilities & Specs"
                        className="p-1 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAgent(agent.toolType);
                        }}
                        title="Add to Canvas"
                        className="px-2 py-0.5 bg-primary-600/10 hover:bg-primary-600 text-primary-700 dark:text-primary-300 hover:text-white border border-primary-500/30 rounded text-[11px] font-medium flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inventory Specs Modal */}
      {inspectingAgent && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 z-30 p-4 flex flex-col justify-between backdrop-blur-md overflow-y-auto">
          <div>
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg border shadow-sm ${inspectingAgent.colorTheme.iconContainer}`}>
                  {React.createElement(getAgentIcon(inspectingAgent.toolType), { className: 'w-5 h-5' })}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{inspectingAgent.name}</h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{inspectingAgent.protocol}</span>
                </div>
              </div>
              <button
                onClick={() => setInspectingAgent(null)}
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mt-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Overview</span>
                <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{inspectingAgent.description}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Capabilities</span>
                <ul className="mt-1 space-y-1">
                  {inspectingAgent.capabilities.map((cap, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Inventory Status:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{inspectingAgent.inventoryStatus}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Monitored Fleet:</span>
                  <span className="text-slate-800 dark:text-slate-200">{inspectingAgent.inventoryCount} Hosts</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Default Timeout:</span>
                  <span className="text-slate-800 dark:text-slate-200">{inspectingAgent.defaultTimeoutSeconds}s</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Retry Policy:</span>
                  <span className="text-slate-800 dark:text-slate-200">{inspectingAgent.defaultRetryCount} Retries</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <button
              onClick={() => {
                onAddAgent(inspectingAgent.toolType);
                setInspectingAgent(null);
              }}
              className="flex-1 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-primary-600/30 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Agent To DAG
            </button>
            <button
              onClick={() => setInspectingAgent(null)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
