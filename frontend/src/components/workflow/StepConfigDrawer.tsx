'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Settings,
  Server,
  Layers,
  ArrowRight,
  PhoneCall,
  PhoneForwarded,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { ToolType, WorkflowStep, EscalationGroup } from '@/types';
import { testTool, fetchEscalationGroups } from '@/lib/api';

interface StepConfigDrawerProps {
  step: WorkflowStep | null;
  allSteps: WorkflowStep[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStep: WorkflowStep) => void;
  onDelete: (stepKey: string) => void;
}

export const StepConfigDrawer: React.FC<StepConfigDrawerProps> = ({
  step,
  allSteps,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [formData, setFormData] = useState<WorkflowStep | null>(null);
  const [parsedParams, setParsedParams] = useState<Record<string, any>>({});
  const [escalationGroups, setEscalationGroups] = useState<EscalationGroup[]>([]);
  const [escalationMode, setEscalationMode] = useState<'matrix' | 'custom'>('matrix');
  const [testResult, setTestResult] = useState<{
    loading: boolean;
    status?: string;
    metricValue?: string;
    rawOutput?: string;
    errorMessage?: string;
  }>({ loading: false });

  useEffect(() => {
    fetchEscalationGroups().then((groups) => {
      setEscalationGroups(groups);
    });
  }, []);

  useEffect(() => {
    if (step) {
      setFormData({ ...step });
      try {
        const p = JSON.parse(step.parametersJson || '{}');
        setParsedParams(p);
        if (p.application || p.groupId || p.team) {
          setEscalationMode('matrix');
        } else if (p.recipientPhone && !p.application) {
          setEscalationMode('custom');
        }
      } catch {
        setParsedParams({});
      }
      setTestResult({ loading: false });
    }
  }, [step]);

  if (!isOpen || !formData) return null;

  const updateParam = (key: string, val: any) => {
    const updated = { ...parsedParams, [key]: val };
    setParsedParams(updated);
    setFormData((prev) => (prev ? { ...prev, parametersJson: JSON.stringify(updated, null, 2) } : null));
  };

  const handleTestStep = async () => {
    if (!formData) return;
    setTestResult({ loading: true });
    try {
      const result = await testTool(formData.toolType, formData.targetHost, JSON.stringify(parsedParams));
      setTestResult({
        loading: false,
        status: result.status,
        metricValue: result.metricValue,
        rawOutput: result.rawOutput,
        errorMessage: result.errorMessage,
      });
    } catch (err: any) {
      setTestResult({
        loading: false,
        status: 'ERROR',
        metricValue: 'Test invocation failed',
        errorMessage: err.message,
      });
    }
  };

  const handleSave = () => {
    if (formData) {
      onSave({
        ...formData,
        parametersJson: JSON.stringify(parsedParams),
      });
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[440px] bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl z-50 flex flex-col animate-in slide-in-from-right duration-200 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-600 dark:text-primary-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Configure Step Node</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Step Key */}
        <div>
          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Step Identifier Key</label>
          <input
            type="text"
            value={formData.stepKey}
            onChange={(e) => setFormData({ ...formData, stepKey: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 font-mono focus:outline-none focus:border-primary-500 shadow-sm"
          />
        </div>

        {/* Tool Type */}
        <div>
          <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Tool Type</label>
          <select
            value={formData.toolType}
            onChange={(e) => setFormData({ ...formData, toolType: e.target.value as ToolType })}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-primary-500 font-medium shadow-sm"
          >
            <option value="DISK_CHECK">DISK_CHECK (Disk Space Probe)</option>
            <option value="RDP_PORT_CHECK">RDP_PORT_CHECK (Port 3389 Handshake)</option>
            <option value="SQL_JOB_CHECK">SQL_JOB_CHECK (SQL Server Agent Audit)</option>
            <option value="URL_CHECK_EXT">URL_CHECK_EXT (External HTTPS Endpoint)</option>
            <option value="URL_CHECK_INT">URL_CHECK_INT (Internal URL Probe)</option>
            <option value="SERVICE_ACTION">SERVICE_ACTION (Windows Service Remediation)</option>
            <option value="VOICE_CALL_ACTION">VOICE_CALL_ACTION (Telephony Voice Call PIC)</option>
          </select>
        </div>

        {/* Target Host */}
        <div>
          <label className="block text-slate-400 font-medium mb-1">Target Host / Server / Phone</label>
          <div className="relative">
            <Server className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={formData.targetHost || ''}
              onChange={(e) => setFormData({ ...formData, targetHost: e.target.value })}
              placeholder="e.g., db-node-01.corp.internal or 127.0.0.1"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        {/* Tool Specific Parameters */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-3">
          <div className="flex items-center gap-1.5 text-primary-400 font-medium text-[11px] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Tool Parameters
          </div>

          {formData.toolType === 'DISK_CHECK' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Drive Letter</label>
                <input
                  type="text"
                  value={parsedParams.drive || 'C:'}
                  onChange={(e) => updateParam('drive', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Threshold Free %</label>
                <input
                  type="number"
                  value={parsedParams.thresholdPercentFree ?? 10}
                  onChange={(e) => updateParam('thresholdPercentFree', parseFloat(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                />
              </div>
            </div>
          )}

          {formData.toolType === 'RDP_PORT_CHECK' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Port</label>
                <input
                  type="number"
                  value={parsedParams.port ?? 3389}
                  onChange={(e) => updateParam('port', parseInt(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  value={parsedParams.timeoutMs ?? 3000}
                  onChange={(e) => updateParam('timeoutMs', parseInt(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                />
              </div>
            </div>
          )}

          {formData.toolType === 'SQL_JOB_CHECK' && (
            <div className="space-y-2">
              <div>
                <label className="text-slate-400 block mb-1">Job Name</label>
                <input
                  type="text"
                  value={parsedParams.jobName || 'Nightly_Backup'}
                  onChange={(e) => updateParam('jobName', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Database</label>
                <input
                  type="text"
                  value={parsedParams.database || 'master'}
                  onChange={(e) => updateParam('database', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                />
              </div>
            </div>
          )}

          {(formData.toolType === 'URL_CHECK_EXT' || formData.toolType === 'URL_CHECK_INT') && (
            <div className="space-y-2">
              <div>
                <label className="text-slate-400 block mb-1">Probe URL</label>
                <input
                  type="text"
                  value={parsedParams.url || 'https://httpbin.org/status/200'}
                  onChange={(e) => updateParam('url', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Expected Status</label>
                  <input
                    type="number"
                    value={parsedParams.expectedStatusCode ?? 200}
                    onChange={(e) => updateParam('expectedStatusCode', parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Timeout (s)</label>
                  <input
                    type="number"
                    value={parsedParams.timeoutSeconds ?? 10}
                    onChange={(e) => updateParam('timeoutSeconds', parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.toolType === 'SERVICE_ACTION' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Service Name</label>
                <input
                  type="text"
                  value={parsedParams.serviceName || 'MSSQL$SQLEXPRESS'}
                  onChange={(e) => updateParam('serviceName', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Action</label>
                <select
                  value={parsedParams.action || 'CHECK'}
                  onChange={(e) => updateParam('action', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                >
                  <option value="CHECK">CHECK</option>
                  <option value="START">START</option>
                  <option value="RESTART">RESTART</option>
                </select>
              </div>
            </div>
          )}

          {formData.toolType === 'VOICE_CALL_ACTION' && (
            <div className="space-y-3 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              {/* Mode Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneForwarded className="w-3.5 h-3.5 text-primary-400" />
                  PIC Routing Strategy
                </span>
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setEscalationMode('matrix')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      escalationMode === 'matrix'
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Escalation Matrix
                  </button>
                  <button
                    type="button"
                    onClick={() => setEscalationMode('custom')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      escalationMode === 'custom'
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Custom Phone
                  </button>
                </div>
              </div>

              {escalationMode === 'matrix' ? (
                <div className="space-y-2.5">
                  {/* Select Group / Policy */}
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      Target Application & Team Policy
                    </label>
                    <select
                      value={
                        parsedParams.groupId ||
                        escalationGroups.find(
                          (g) =>
                            g.application === parsedParams.application ||
                            g.team === parsedParams.team
                        )?.id ||
                        escalationGroups[0]?.id ||
                        ''
                      }
                      onChange={(e) => {
                        const grp = escalationGroups.find((g) => g.id === e.target.value);
                        if (grp) {
                          const updated = {
                            ...parsedParams,
                            groupId: grp.id,
                            application: grp.application,
                            team: grp.team,
                            layer: null,
                            picName: grp.layers[0]?.picName || 'Auto-Cascade PIC',
                            recipientPhone: grp.layers[0]?.phoneNumber || '+15550192834',
                          };
                          setParsedParams(updated);
                          setFormData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  targetHost: grp.layers[0]?.phoneNumber || grp.application,
                                  parametersJson: JSON.stringify(updated, null, 2),
                                }
                              : null
                          );
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs focus:border-primary-500 focus:outline-none"
                    >
                      {escalationGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.application} — {g.team} ({g.layers.length} Tiers)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Tier / PIC Routing */}
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">
                      On-Call Responder / Escalation Tier
                    </label>
                    {(() => {
                      const currentGroup =
                        escalationGroups.find(
                          (g) =>
                            g.id === parsedParams.groupId ||
                            g.application === parsedParams.application ||
                            g.team === parsedParams.team
                        ) || escalationGroups[0];

                      return (
                        <select
                          value={
                            parsedParams.layer != null
                              ? parsedParams.layer.toString()
                              : 'all'
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'all') {
                              const updated = {
                                ...parsedParams,
                                layer: null,
                                picName: currentGroup?.layers[0]?.picName || 'Auto-Cascade PIC',
                                recipientPhone: currentGroup?.layers[0]?.phoneNumber || '',
                              };
                              setParsedParams(updated);
                              setFormData((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      targetHost: currentGroup?.layers[0]?.phoneNumber || currentGroup?.application || '',
                                      parametersJson: JSON.stringify(updated, null, 2),
                                    }
                                  : null
                              );
                            } else {
                              const layerNum = parseInt(val);
                              const targetLayer = currentGroup?.layers.find(
                                (l) => l.layer === layerNum
                              );
                              if (targetLayer) {
                                const updated = {
                                  ...parsedParams,
                                  layer: layerNum,
                                  picName: targetLayer.picName,
                                  recipientPhone: targetLayer.phoneNumber,
                                };
                                setParsedParams(updated);
                                setFormData((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        targetHost: targetLayer.phoneNumber,
                                        parametersJson: JSON.stringify(updated, null, 2),
                                      }
                                    : null
                                );
                              }
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs focus:border-primary-500 focus:outline-none"
                        >
                          <option value="all">
                            ⚡ Auto-Cascade Full Chain (L1 → L2 → L3 with SLA timeouts)
                          </option>
                          {currentGroup?.layers.map((l) => (
                            <option key={l.layer} value={l.layer.toString()}>
                              Tier {l.layer}: {l.picName} ({l.role}) — {l.phoneNumber} ({l.timeoutSeconds}s SLA)
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>

                  {/* Active PIC Details Preview Badge */}
                  {(() => {
                    const currentGroup =
                      escalationGroups.find(
                        (g) =>
                          g.id === parsedParams.groupId ||
                          g.application === parsedParams.application ||
                          g.team === parsedParams.team
                      ) || escalationGroups[0];
                    const activeLayer = parsedParams.layer
                      ? currentGroup?.layers.find((l) => l.layer === parsedParams.layer)
                      : currentGroup?.layers[0];

                    return (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-indigo-900/40 text-xs space-y-1">
                        <div className="flex items-center justify-between text-indigo-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            {parsedParams.layer ? `Direct Tier ${parsedParams.layer} Call` : 'Tier 1 Primary Lead'}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-900">
                            {activeLayer?.channel || 'Voice Call (Twilio)'}
                          </span>
                        </div>
                        <div className="text-slate-200 font-bold flex items-center justify-between">
                          <span>{activeLayer?.picName || parsedParams.picName || 'Lead SRE'}</span>
                          <span className="font-mono text-slate-400">{activeLayer?.phoneNumber || parsedParams.recipientPhone}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>{activeLayer?.role || currentGroup?.team}</span>
                          <span>SLA: {activeLayer?.timeoutSeconds || 180}s</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Custom Phone Override Mode */
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Direct Phone</label>
                    <input
                      type="text"
                      value={parsedParams.recipientPhone || '+15550192834'}
                      onChange={(e) => {
                        updateParam('recipientPhone', e.target.value);
                        setFormData((prev) => (prev ? { ...prev, targetHost: e.target.value } : null));
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">PIC Name</label>
                    <input
                      type="text"
                      value={parsedParams.picName || 'Lead SRE On-Call'}
                      onChange={(e) => updateParam('picName', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Alert Message Textarea */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">
                  Emergency Alert Message (Synthesized via TTS to Phone)
                </label>
                <textarea
                  rows={2}
                  value={
                    parsedParams.message ||
                    'Emergency alert: InfraSentinel detected failure in automated runbook pipeline.'
                  }
                  onChange={(e) => updateParam('message', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-xs"
                />
              </div>
            </div>
          )}

        </div>

        {/* Branching Target Selectors */}
        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-3">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px] uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Pass/Fail Branch Routing
          </div>

          <div>
            <label className="block text-emerald-400 font-medium mb-1">On Success Target Step</label>
            <select
              value={formData.onSuccessStepKey || 'END'}
              onChange={(e) =>
                setFormData({ ...formData, onSuccessStepKey: e.target.value === 'END' ? null : e.target.value })
              }
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-emerald-900/50 rounded text-emerald-300 font-mono"
            >
              <option value="END">END (Conclude workflow)</option>
              {allSteps
                .filter((s) => s.stepKey !== formData.stepKey)
                .map((s) => (
                  <option key={s.stepKey} value={s.stepKey}>
                    Next: {s.stepKey} ({s.toolType})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-rose-400 font-medium mb-1">On Failure Target Step (Remediation)</label>
            <select
              value={formData.onFailureStepKey || 'END'}
              onChange={(e) =>
                setFormData({ ...formData, onFailureStepKey: e.target.value === 'END' ? null : e.target.value })
              }
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-rose-900/50 rounded text-rose-300 font-mono"
            >
              <option value="END">END (Conclude workflow)</option>
              {allSteps
                .filter((s) => s.stepKey !== formData.stepKey)
                .map((s) => (
                  <option key={s.stepKey} value={s.stepKey}>
                    Remediate: {s.stepKey} ({s.toolType})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Execution Reliability */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-slate-400 block mb-1">Timeout (Sec)</label>
            <input
              type="number"
              value={formData.timeoutSeconds}
              onChange={(e) => setFormData({ ...formData, timeoutSeconds: parseInt(e.target.value) || 30 })}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">Retry Count</label>
            <input
              type="number"
              value={formData.retryCount}
              onChange={(e) => setFormData({ ...formData, retryCount: parseInt(e.target.value) || 1 })}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200"
            />
          </div>
        </div>

        {/* Live Step Test Console */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleTestStep}
            disabled={testResult.loading}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg font-medium flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            {testResult.loading ? (
              <>
                <Clock className="w-4 h-4 animate-spin text-primary-400" />
                Testing step live...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-400" />
                Test Step Now
              </>
            )}
          </button>

          {testResult.status && (
            <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Result:</span>
                <span
                  className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                    testResult.status === 'PASS'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {testResult.status}
                </span>
              </div>
              <div className="text-slate-300 font-mono text-[11px]">
                Metric: <span className="text-white">{testResult.metricValue}</span>
              </div>
              {testResult.errorMessage && (
                <div className="text-rose-400 text-[11px]">Error: {testResult.errorMessage}</div>
              )}
              {testResult.rawOutput && (
                <pre className="p-2 bg-black/60 rounded text-[10px] font-mono text-slate-300 max-h-32 overflow-auto border border-slate-900">
                  {testResult.rawOutput}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
        <button
          onClick={() => onDelete(formData.stepKey)}
          className="px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded border border-rose-900/50 transition-colors"
        >
          Delete Node
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded font-medium shadow-md transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
