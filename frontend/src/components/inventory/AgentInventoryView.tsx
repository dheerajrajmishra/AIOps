'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Search,
  Filter,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Database,
  Globe,
  Terminal,
  PhoneCall,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  Server,
  Zap,
  Play,
  Clock,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Info,
  Check,
  RefreshCw,
  Code2,
  SearchCode,
} from 'lucide-react';
import { AGENT_INVENTORY, AgentInventoryItem, AssignedHost } from '@/lib/agentInventory';
import { ToolType } from '@/types';

interface AgentInventoryViewProps {
  onOpenBuilderWithAgent?: (toolType: ToolType) => void;
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
    case 'WEB_SCRAPER':
      return SearchCode;
    default:
      return Cpu;
  }
};

export const AgentInventoryView: React.FC<AgentInventoryViewProps> = ({ onOpenBuilderWithAgent }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedAgent, setSelectedAgent] = useState<AgentInventoryItem>(AGENT_INVENTORY[0]);
  const [testingProbe, setTestingProbe] = useState(false);
  const [probeResult, setProbeResult] = useState<{
    status: 'SUCCESS' | 'WARNING' | 'ERROR';
    output: string;
    durationMs: number;
    timestamp: string;
  } | null>(null);

  const categories = [
    'ALL',
    'Diagnostics',
    'Security & Connectivity',
    'Database',
    'Network & Web',
    'Remediation',
    'Escalation',
  ];

  const filteredAgents = AGENT_INVENTORY.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(search.toLowerCase()) ||
      agent.shortLabel.toLowerCase().includes(search.toLowerCase()) ||
      agent.description.toLowerCase().includes(search.toLowerCase()) ||
      agent.protocol.toLowerCase().includes(search.toLowerCase()) ||
      agent.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || agent.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const totalMonitoredHosts = AGENT_INVENTORY.reduce((acc, a) => acc + a.inventoryCount, 0);

  const handleSimulateProbe = async (agent: AgentInventoryItem) => {
    setTestingProbe(true);
    setProbeResult(null);

    await new Promise((r) => setTimeout(r, 1100));

    let output = '';
    if (agent.toolType === 'DISK_CHECK') {
      output = `[PASS] Checked volume C:\\ - Free Space: 28.4% (129.8 GB available / 457.2 GB total). Filesystem: NTFS. Latency: 4ms`;
    } else if (agent.toolType === 'RDP_PORT_CHECK') {
      output = `[PASS] TCP Socket connection to 127.0.0.1:3389 established successfully in 14ms. NLA Handshake verified.`;
    } else if (agent.toolType === 'SQL_JOB_CHECK') {
      output = `[PASS] Connected to master on localhost\\SQLEXPRESS. DB State: ONLINE. Last SQL Agent Maintenance Job: SUCCESS (0 errors).`;
    } else if (agent.toolType === 'URL_CHECK_EXT') {
      output = `[PASS] HTTPS GET ${agent.defaultTargetHost} -> Status: 200 OK. TLS 1.3 Handshake: 24ms. Total Latency: 84ms. SSL Cert Valid (182 days remaining).`;
    } else if (agent.toolType === 'URL_CHECK_INT') {
      output = `[PASS] Intranet Mesh Health GET -> Status: 200 OK. Service State: HEALTHY. Downstream latency: 12ms.`;
    } else if (agent.toolType === 'SERVICE_ACTION') {
      output = `[PASS] Service Control Manager query -> W32Time service state: RUNNING (PID: 1488, Auto Start). Self-healing verification confirmed.`;
    } else {
      output = `[READY] Telephony SIP voice alert dispatch validated -> Target: +15550192834. Twilio Voice API response: 201 Created (SID: CA9921f084ba...).`;
    }

    setProbeResult({
      status: 'SUCCESS',
      output,
      durationMs: 1100,
      timestamp: new Date().toLocaleTimeString(),
    });
    setTestingProbe(false);
  };

  const SelectedIcon = getAgentIcon(selectedAgent.toolType);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-700/50 text-cyan-700 dark:text-cyan-300 shadow-md">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5 tracking-tight">
                Agent Inventory & Fleet Registry
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Certified autonomous diagnostic agents, infrastructure probes, and self-healing executors
              </p>
            </div>
          </div>
        </div>

        {onOpenBuilderWithAgent && (
          <button
            onClick={() => onOpenBuilderWithAgent(selectedAgent.toolType)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-primary-600/30 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Layers className="w-4 h-4" />
            <span>Open in DAG Builder</span>
          </button>
        )}
      </div>

      {/* Fleet Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[11px]">Certified Classes</span>
            <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 border border-cyan-300 dark:border-cyan-700/50">
              <Cpu className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2 flex items-baseline gap-1.5">
            {AGENT_INVENTORY.length}
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Agent Types</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[11px]">Assigned Fleet</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/50">
              <Server className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2 flex items-baseline gap-1.5">
            {totalMonitoredHosts}
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Hosts Monitored</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[11px]">Fleet Health</span>
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700/50">
              <CheckCircle2 className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-2 flex items-baseline gap-1.5">
            100%
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Operational</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span className="font-medium uppercase tracking-wider text-[11px]">Auto Remediation</span>
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-700/50">
              <Zap className="w-4 h-4 text-purple-700 dark:text-purple-300" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-2 flex items-baseline gap-1.5">
            Active
            <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Self-Healing</span>
          </div>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search agents by protocol, category, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat === 'Security & Connectivity' ? 'Security' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Agent Selector + Deep Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Agent Cards Catalog (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Agent Classes ({filteredAgents.length})</span>
            <span className="text-[11px] font-normal lowercase">Click to inspect full details</span>
          </div>

          <div className="space-y-2.5">
            {filteredAgents.map((agent) => {
              const Icon = getAgentIcon(agent.toolType);
              const isSelected = selectedAgent.toolType === agent.toolType;

              return (
                <div
                  key={agent.toolType}
                  onClick={() => {
                    setSelectedAgent(agent);
                    setProbeResult(null);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 shadow-sm ${
                    isSelected
                      ? 'bg-primary-50/60 dark:bg-primary-950/30 border-primary-500 dark:border-primary-500/60 ring-2 ring-primary-500/20 shadow-md'
                      : 'bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* High Contrast Icon Container */}
                  <div className={`p-2.5 rounded-xl border shrink-0 shadow-sm ${agent.colorTheme.iconContainer}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {agent.name}
                      </h3>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shrink-0">
                        {agent.inventoryStatus}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {agent.description}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-500 dark:text-slate-400 text-[10px]">
                        {agent.protocol}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                        {agent.inventoryCount} hosts assigned
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Agent Detail Inspector (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl sticky top-20 space-y-6">
            {/* Inspector Header */}
            <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className={`p-3.5 rounded-2xl border shadow-md ${selectedAgent.colorTheme.iconContainer}`}>
                  <SelectedIcon className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedAgent.name}
                    </h2>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border font-mono ${selectedAgent.colorTheme.badgeBg}`}>
                      {selectedAgent.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    <span>Protocol: {selectedAgent.protocol}</span>
                    <span>•</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Fleet Status: {selectedAgent.inventoryStatus}
                    </span>
                  </div>
                </div>
              </div>

              {onOpenBuilderWithAgent && (
                <button
                  onClick={() => onOpenBuilderWithAgent(selectedAgent.toolType)}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all hover:scale-105 shrink-0"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Use in DAG</span>
                </button>
              )}
            </div>

            {/* Architecture Overview */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Operational Overview & Architecture
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                {selectedAgent.description}
              </p>
            </div>

            {/* Execution Engine & Platforms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Execution Engine
                </span>
                <span className="text-xs font-mono text-slate-800 dark:text-slate-200 font-medium">
                  {selectedAgent.executionEngine}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Supported Platforms
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedAgent.supportedPlatforms.map((plat) => (
                    <span
                      key={plat}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono"
                    >
                      {plat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Capabilities Checklist */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Automated Capabilities & Health Probing
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedAgent.capabilities.map((cap, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{cap}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parameter Schema & Default JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Default Parameters & Config Schema
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Timeout: {selectedAgent.defaultTimeoutSeconds}s | Retries: {selectedAgent.defaultRetryCount}
                </span>
              </div>
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 shadow-inner">
                {JSON.stringify(selectedAgent.defaultParams, null, 2)}
              </pre>
            </div>

            {/* Assigned Infrastructure Fleet Samples */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Monitored Fleet Infrastructure ({selectedAgent.assignedHosts.length} Active Nodes)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedAgent.assignedHosts.map((host) => (
                  <div
                    key={host.hostname}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{host.hostname}</div>
                      <div className="text-[10px] font-mono text-slate-500">{host.ip}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                        {host.latency}
                      </span>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">{host.lastCheckTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Diagnostic Probe Simulator */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-100 to-primary-50/40 dark:from-slate-950 dark:to-primary-950/20 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Live Fleet Diagnostic Probe
                  </span>
                </div>
                <button
                  onClick={() => handleSimulateProbe(selectedAgent)}
                  disabled={testingProbe}
                  className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {testingProbe ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Probing Fleet...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Run Live Probe</span>
                    </>
                  )}
                </button>
              </div>

              {probeResult && (
                <div className="p-3 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs border border-slate-800 space-y-1 animate-in fade-in">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 border-b border-slate-800 pb-1">
                    <span>STATUS: 200 PROBE VERIFIED</span>
                    <span>Executed: {probeResult.timestamp}</span>
                  </div>
                  <p className="pt-1 text-slate-300 text-[11px] leading-relaxed">
                    {probeResult.output}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
