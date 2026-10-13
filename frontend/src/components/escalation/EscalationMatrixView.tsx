'use client';

import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  ShieldAlert,
  Users,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sparkles,
  PhoneForwarded,
  ShieldCheck,
  Edit2,
  Trash2,
  Play,
  X,
  Volume2,
  FileCode2,
  ChevronRight,
  Send,
  Zap,
} from 'lucide-react';
import {
  EscalationGroup,
  EscalationLayer,
  MultiLayerCallResult,
  EscalationDispatchRequest,
} from '@/types';
import {
  fetchEscalationGroups,
  saveEscalationGroup,
  dispatchEscalationTest,
} from '@/lib/api';

export const EscalationMatrixView: React.FC = () => {
  const [groups, setGroups] = useState<EscalationGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<EscalationGroup | null>(null);

  // Live Test Dispatcher Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [testAppOrTeam, setTestAppOrTeam] = useState<string>('');
  const [testSpecificLayer, setTestSpecificLayer] = useState<string>('all');
  const [testMessage, setTestMessage] = useState<string>(
    'Emergency Alert: Database transaction log threshold breached SLA. Initiating Tier-1 on-call incident response.'
  );
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [dispatchResult, setDispatchResult] = useState<MultiLayerCallResult | null>(null);

  const loadGroups = async () => {
    setLoading(true);
    const data = await fetchEscalationGroups();
    setGroups(data);
    setLoading(false);
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      searchQuery === '' ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.application.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.layers.some(
        (l) =>
          l.picName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.phoneNumber.includes(searchQuery)
      );
    const matchesSeverity = severityFilter === 'ALL' || g.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const totalLayersCount = groups.reduce((acc, curr) => acc + curr.layers.length, 0);

  const handleOpenCreateModal = () => {
    const newGroup: EscalationGroup = {
      id: '',
      name: '',
      team: '',
      application: '',
      severity: 'CRITICAL',
      description: '',
      layers: [
        {
          layer: 1,
          role: 'L1 Primary On-Call SRE',
          picName: '',
          phoneNumber: '+1555',
          timeoutSeconds: 180,
          channel: 'Voice Call (Twilio Priority)',
        },
        {
          layer: 2,
          role: 'L2 Secondary Tech Lead',
          picName: '',
          phoneNumber: '+1555',
          timeoutSeconds: 300,
          channel: 'Voice Call + SMS',
        },
      ],
    };
    setEditingGroup(newGroup);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group: EscalationGroup) => {
    setEditingGroup(JSON.parse(JSON.stringify(group)));
    setIsModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!editingGroup) return;
    if (!editingGroup.name || !editingGroup.application || !editingGroup.team) {
      alert('Please fill in Team, Application, and Name.');
      return;
    }
    await saveEscalationGroup(editingGroup);
    setIsModalOpen(false);
    loadGroups();
  };

  const handleAddLayerToEditing = () => {
    if (!editingGroup) return;
    const nextLayerNum = editingGroup.layers.length + 1;
    const newLayer: EscalationLayer = {
      layer: nextLayerNum,
      role: `L${nextLayerNum} Escalation Lead`,
      picName: 'New Contact',
      phoneNumber: '+1555',
      timeoutSeconds: 300,
      channel: 'Voice Call (Twilio)',
    };
    setEditingGroup({
      ...editingGroup,
      layers: [...editingGroup.layers, newLayer],
    });
  };

  const handleRemoveLayer = (idx: number) => {
    if (!editingGroup) return;
    const updated = editingGroup.layers.filter((_, i) => i !== idx).map((l, i) => ({
      ...l,
      layer: i + 1,
    }));
    setEditingGroup({
      ...editingGroup,
      layers: updated,
    });
  };

  const handleOpenTestModal = (group?: EscalationGroup, layer?: number) => {
    setTestAppOrTeam(group ? group.application : groups[0]?.application || '');
    setTestSpecificLayer(layer ? layer.toString() : 'all');
    setDispatchResult(null);
    setIsTestModalOpen(true);
  };

  const handleDispatchTestCall = async () => {
    setIsDispatching(true);
    setDispatchResult(null);
    const req: EscalationDispatchRequest = {
      appOrTeam: testAppOrTeam,
      specificLayer: testSpecificLayer === 'all' ? null : parseInt(testSpecificLayer),
      alertMessage: testMessage,
    };
    const res = await dispatchEscalationTest(req);
    setDispatchResult(res);
    setIsDispatching(false);
  };

  return (
    <div className="p-6 space-y-7 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Executive Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-100/90 dark:from-slate-900/90 dark:via-indigo-950/40 dark:to-slate-900/90 border border-blue-200/80 dark:border-indigo-500/30 backdrop-blur-xl shadow-lg shadow-indigo-100/40 dark:shadow-none transition-colors duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary-600/10 dark:bg-primary-600/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 shadow-sm">
                <PhoneCall className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2.5">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                    Enterprise Multi-Tier Escalation Matrix
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Telephony Mesh Active (Twilio)
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Hierarchical on-call routing chains, autonomous PIC phone dispatching, and tiered timeout escalation policies
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => handleOpenTestModal()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
            >
              <PhoneForwarded className="w-3.5 h-3.5" />
              Simulate Test Call
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-primary-600/25"
            >
              <Plus className="w-3.5 h-3.5" />
              New Policy Chain
            </button>

            <button
              onClick={loadGroups}
              disabled={loading}
              className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* High-Level Overview Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-blue-200/60 dark:border-indigo-500/20">
          <div className="bg-white/85 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Configured Escalation Groups
            </div>
            <div className="text-2xl font-black mt-1 text-slate-900 dark:text-slate-100 flex items-baseline gap-1">
              {groups.length}
              <span className="text-[10px] text-primary-600 dark:text-primary-400 font-normal">Active Teams</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Covering Banking, DBA, SecOps & Edge APIs
            </p>
          </div>

          <div className="bg-white/85 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Total On-Call PIC Roster
            </div>
            <div className="text-2xl font-black mt-1 text-indigo-600 dark:text-indigo-400 flex items-baseline gap-1">
              {totalLayersCount}
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Responders</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Assigned across L1, L2, L3 incident tiers
            </p>
          </div>

          <div className="bg-white/85 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              L1 Dispatch SLA
            </div>
            <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1">
              Immediate
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(0s delay)</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Direct Twilio outbound voice alert
            </p>
          </div>

          <div className="bg-white/85 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              Voice Agent Tool Integration
            </div>
            <div className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400 flex items-baseline gap-1">
              Bound
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">VOICE_CALL_ACTION</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Invoked dynamically during step failures
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter by Team, Application, PIC Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 w-72"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Showing {filteredGroups.length} of {groups.length} Escalation Policies
        </div>
      </div>

      {/* Escalation Groups List */}
      <div className="space-y-6">
        {filteredGroups.map((group) => {
          const isCritical = group.severity === 'CRITICAL';
          return (
            <div
              key={group.id}
              className={`p-6 rounded-3xl bg-white dark:bg-slate-900/90 border transition-all duration-200 shadow-sm hover:shadow-xl ${
                isCritical
                  ? 'border-rose-200 dark:border-rose-900/60'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Policy Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold uppercase border ${
                        isCritical
                          ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                          : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800'
                      }`}
                    >
                      {group.severity}
                    </span>

                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      {group.name}
                    </h2>

                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      App: {group.application}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      Team: {group.team}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {group.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenTestModal(group)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Dispatch Call
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(group)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit Tiers
                  </button>
                </div>
              </div>

              {/* Multi-Tier Escalation Stepper / Chain */}
              <div className="pt-6">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Hierarchical Multi-Layer Escalation Chain ({group.layers.length} Tiers)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                  {group.layers
                    .sort((a, b) => a.layer - b.layer)
                    .map((layer, index) => {
                      const isFirst = index === 0;
                      const isLast = index === group.layers.length - 1;

                      return (
                        <div
                          key={layer.layer}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 relative flex flex-col justify-between space-y-3"
                        >
                          {/* Step header */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold ${
                                layer.layer === 1
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                                  : layer.layer === 2
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300'
                              }`}
                            >
                              Tier {layer.layer} (L{layer.layer})
                            </span>

                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {layer.timeoutSeconds}s SLA
                            </span>
                          </div>

                          {/* Role and Contact Details */}
                          <div>
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {layer.role}
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-primary-500" />
                              {layer.picName}
                            </div>
                            <div className="text-xs font-mono text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <PhoneCall className="w-3 h-3 text-emerald-500" />
                              {layer.phoneNumber}
                            </div>
                          </div>

                          {/* Dispatch channel badge */}
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400 truncate">
                              {layer.channel}
                            </span>
                            <button
                              onClick={() => handleOpenTestModal(group, layer.layer)}
                              className="text-primary-600 dark:text-primary-400 hover:underline font-medium shrink-0 ml-1"
                            >
                              Test L{layer.layer}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Integration Reference Info Card */}
      <div className="p-6 rounded-3xl bg-slate-900 text-slate-100 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center gap-2.5 text-indigo-400">
          <FileCode2 className="w-5 h-5" />
          <h3 className="text-base font-bold text-white tracking-tight">
            How Automated Calling Agents Utilize This Escalation Matrix
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          When any automated diagnostic check (such as <strong>DISK_CHECK</strong>, <strong>URL_CHECK_INT</strong>, or <strong>SQL_JOB_CHECK</strong>) encounters a critical incident, you can attach the <strong>VOICE_CALL_ACTION</strong> agent step. By specifying either the target <code>application</code> or <code>team</code>, the orchestration engine automatically looks up this exact escalation matrix and triggers a priority voice call to the designated Layer 1 on-call PIC. If unacknowledged within the configured SLA timeout, it cascades through subsequent tiers.
        </p>
        <div className="p-3.5 rounded-2xl bg-slate-950 font-mono text-xs text-emerald-400 border border-slate-800/80 overflow-x-auto">
          {`// Sample Step Parameter for VOICE_CALL_ACTION Agent
{
  "application": "Payment Gateway",
  "team": "FinTech Core SRE",
  "message": "Payment processing error rate exceeded 5% threshold across US-East cluster."
}`}
        </div>
      </div>

      {/* EDIT / CREATE ESCALATION POLICY MODAL */}
      {isModalOpen && editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editingGroup.id ? 'Edit Escalation Policy Chain' : 'Configure New Escalation Matrix'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set tiered responder PICs, phone numbers, and auto-escalation timeouts
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Policy Name
                  </label>
                  <input
                    type="text"
                    value={editingGroup.name}
                    onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                    placeholder="e.g. Core Banking & Payment Gateway Escalation"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Application / Target System
                  </label>
                  <input
                    type="text"
                    value={editingGroup.application}
                    onChange={(e) => setEditingGroup({ ...editingGroup, application: e.target.value })}
                    placeholder="e.g. Payment Gateway"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Responsible Team
                  </label>
                  <input
                    type="text"
                    value={editingGroup.team}
                    onChange={(e) => setEditingGroup({ ...editingGroup, team: e.target.value })}
                    placeholder="e.g. FinTech Core SRE"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Severity Threshold
                  </label>
                  <select
                    value={editingGroup.severity}
                    onChange={(e) => setEditingGroup({ ...editingGroup, severity: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingGroup.description}
                  onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  placeholder="Policy scope and operational SLA details..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Tiered Layers Config */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Tiered Escalation Responders ({editingGroup.layers.length} Tiers)
                  </span>
                  <button
                    onClick={handleAddLayerToEditing}
                    className="px-2.5 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 rounded-lg hover:bg-primary-100 border border-primary-200 dark:border-primary-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Tier
                  </button>
                </div>

                <div className="space-y-3">
                  {editingGroup.layers.map((layer, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          Tier {layer.layer} (L{layer.layer})
                        </span>
                        {editingGroup.layers.length > 1 && (
                          <button
                            onClick={() => handleRemoveLayer(idx)}
                            className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                            Role Title
                          </label>
                          <input
                            type="text"
                            value={layer.role}
                            onChange={(e) => {
                              const updated = [...editingGroup.layers];
                              updated[idx].role = e.target.value;
                              setEditingGroup({ ...editingGroup, layers: updated });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                            PIC Name
                          </label>
                          <input
                            type="text"
                            value={layer.picName}
                            onChange={(e) => {
                              const updated = [...editingGroup.layers];
                              updated[idx].picName = e.target.value;
                              setEditingGroup({ ...editingGroup, layers: updated });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                            Phone Number
                          </label>
                          <input
                            type="text"
                            value={layer.phoneNumber}
                            onChange={(e) => {
                              const updated = [...editingGroup.layers];
                              updated[idx].phoneNumber = e.target.value;
                              setEditingGroup({ ...editingGroup, layers: updated });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                            Timeout (Seconds before Escalating)
                          </label>
                          <input
                            type="number"
                            value={layer.timeoutSeconds}
                            onChange={(e) => {
                              const updated = [...editingGroup.layers];
                              updated[idx].timeoutSeconds = parseInt(e.target.value) || 180;
                              setEditingGroup({ ...editingGroup, layers: updated });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                            Dispatch Channel / Method
                          </label>
                          <input
                            type="text"
                            value={layer.channel}
                            onChange={(e) => {
                              const updated = [...editingGroup.layers];
                              updated[idx].channel = e.target.value;
                              setEditingGroup({ ...editingGroup, layers: updated });
                            }}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-850">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGroup}
                className="px-5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-md"
              >
                Save Policy Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATE TEST CALL MODAL */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <PhoneForwarded className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Live Telephony Escalation Simulator
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Test automated voice alerting against configured PIC matrices
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Application / Matrix Group
                </label>
                <select
                  value={testAppOrTeam}
                  onChange={(e) => setTestAppOrTeam(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.application}>
                      {g.application} ({g.team}) - {g.layers.length} Tiers
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Escalation Tier to Test
                </label>
                <select
                  value={testSpecificLayer}
                  onChange={(e) => setTestSpecificLayer(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none"
                >
                  <option value="all">Full Tier Cascade (All Layers in Order)</option>
                  <option value="1">Layer 1 (L1 Primary On-Call PIC)</option>
                  <option value="2">Layer 2 (L2 Secondary Lead)</option>
                  <option value="3">Layer 3 (L3 Executive Incident Commander)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Voice Speech Alert Message (TTS)
                </label>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none font-sans"
                />
              </div>

              {/* Dispatch Action */}
              <button
                onClick={handleDispatchTestCall}
                disabled={isDispatching}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Dialing Twilio Outbound Gateway...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Dispatch Emergency Voice Alert
                  </>
                )}
              </button>

              {/* Dispatch Result Card */}
              {dispatchResult && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Dispatched Successfully
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Target: {dispatchResult.groupName}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {dispatchResult.summary}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                    {dispatchResult.dispatchedLayers.map((d, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-xs font-mono border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            L{d.layer}:
                          </span>{' '}
                          {d.picName} ({d.phoneNumber})
                        </div>
                        <div className="text-[10px] text-slate-500">
                          SID: {d.callSid.slice(0, 12)}... | {d.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
