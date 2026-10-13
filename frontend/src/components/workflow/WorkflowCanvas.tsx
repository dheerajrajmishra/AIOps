'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Play,
  Save,
  Plus,
  RefreshCw,
  Terminal,
  Layers,
  Clock,
  Settings,
  Cpu,
  Sparkles,
  Wand2,
  ArrowLeft,
} from 'lucide-react';

import { StepNode, StepNodeData } from './StepNode';
import { StepConfigDrawer } from './StepConfigDrawer';
import { LiveExecutionDrawer } from './LiveExecutionDrawer';
import { WorkflowSetupModal } from './WorkflowSetupModal';
import { AgentInventoryPanel } from '@/components/inventory/AgentInventoryPanel';
import { AiWorkflowPromptBar } from './AiWorkflowPromptBar';
import { GeneratedWorkflowResult } from '@/lib/aiWorkflowGenerator';
import { Workflow, WorkflowStep, ToolType, ConsoleLogMessage, StepExecutionLog } from '@/types';
import { createWorkflow, updateWorkflow, triggerWorkflowRun } from '@/lib/api';
import { startSignalR, joinRunStream } from '@/lib/signalr';
import { formatCronSchedule } from '@/lib/cronUtils';
import { getAgentInventoryItem } from '@/lib/agentInventory';
import { useTheme } from '@/context/ThemeContext';

interface WorkflowCanvasProps {
  workflow: Workflow | null;
  onWorkflowSaved?: (saved: Workflow) => void;
  onBackToWorkflows?: () => void;
}

const nodeTypes: any = {
  stepNode: StepNode,
};

const WorkflowCanvasInner: React.FC<WorkflowCanvasProps> = ({ workflow, onWorkflowSaved, onBackToWorkflows }) => {
  const { theme } = useTheme();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<any>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Workflow Metadata & Setup
  const [workflowName, setWorkflowName] = useState(workflow?.name || 'New Infrastructure Runbook');
  const [workflowDesc, setWorkflowDesc] = useState(workflow?.description || '');
  const [cronExpression, setCronExpression] = useState(workflow?.cronExpression || '0 2 * * *');
  const [isActive, setIsActive] = useState(workflow ? workflow.isActive : true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Agent Inventory Dock
  const [isInventoryCollapsed, setIsInventoryCollapsed] = useState(false);

  // AI Prompt Generator Bar
  const [isAiBarOpen, setIsAiBarOpen] = useState(true);

  const handleAiWorkflowGenerated = (result: GeneratedWorkflowResult) => {
    setWorkflowName(result.name);
    setWorkflowDesc(result.description);
    setCronExpression(result.cronExpression);
    loadWorkflowIntoCanvas({
      id: 'ai-gen-' + Date.now().toString().slice(-4),
      name: result.name,
      description: result.description,
      cronExpression: result.cronExpression,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: result.steps,
    });
  };

  // Step Drawer
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live Execution Stream state
  const [isExecutionDrawerOpen, setIsExecutionDrawerOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<'IDLE' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [totalStepsCount, setTotalStepsCount] = useState(0);
  const [failedStepsCount, setFailedStepsCount] = useState(0);
  const [liveLogs, setLiveLogs] = useState<ConsoleLogMessage[]>([]);
  const [stepResults, setStepResults] = useState<Record<string, StepExecutionLog>>({});

  // Sync canvas with workflow prop
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
      setWorkflowDesc(workflow.description || '');
      setCronExpression(workflow.cronExpression || '0 2 * * *');
      setIsActive(workflow.isActive);
      loadWorkflowIntoCanvas(workflow);
    } else {
      createDefaultCanvas();
    }
  }, [workflow]);

  // Connect to SignalR hub on mount
  useEffect(() => {
    let unmounted = false;

    const setupSignalR = async () => {
      try {
        const conn = await startSignalR();

        conn.on('ReceiveConsoleLog', (runId: string, timestamp: string, level: string, message: string) => {
          if (unmounted) return;
          setLiveLogs((prev) => [
            ...prev,
            { id: Math.random().toString(), runId, timestamp, level: level as any, message },
          ]);
        });

        conn.on('ReceiveStepStarted', (runId: string, stepKey: string, toolType: string, targetHost?: string) => {
          if (unmounted) return;
          setNodes((nds) =>
            nds.map((node) => {
              if (node.data.stepKey === stepKey) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'RUNNING',
                  },
                };
              }
              return node;
            })
          );
        });

        conn.on(
          'ReceiveStepCompleted',
          (
            runId: string,
            stepKey: string,
            status: string,
            metricValue: string,
            durationMs: number,
            rawOutput?: string,
            errorMessage?: string
          ) => {
            if (unmounted) return;
            setNodes((nds) =>
              nds.map((node) => {
                if (node.data.stepKey === stepKey) {
                  return {
                    ...node,
                    data: {
                      ...node.data,
                      status: status as any,
                      metricValue,
                      durationMs,
                      errorMessage,
                    },
                  };
                }
                return node;
              })
            );

            setStepResults((prev) => ({
              ...prev,
              [stepKey]: {
                id: Math.random().toString(),
                runId,
                stepKey,
                checkType: '',
                status: status as any,
                metricValue,
                rawOutput,
                errorMessage,
                durationMs,
                executedAt: new Date().toISOString(),
              },
            }));
          }
        );

        conn.on('ReceiveRunCompleted', (runId: string, status: string, total: number, failed: number) => {
          if (unmounted) return;
          setRunStatus(status as any);
          setTotalStepsCount(total);
          setFailedStepsCount(failed);
        });
      } catch (err) {
        console.warn('SignalR setup issue:', err);
      }
    };

    setupSignalR();

    return () => {
      unmounted = true;
    };
  }, [setNodes]);

  const loadWorkflowIntoCanvas = (wf: Workflow) => {
    if (!wf.steps || wf.steps.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node<any>[] = wf.steps.map((step) => ({
      id: step.stepKey,
      type: 'stepNode',
      position: { x: step.positionX || 250, y: step.positionY || 100 },
      data: {
        stepKey: step.stepKey,
        toolType: step.toolType,
        targetHost: step.targetHost,
        parametersJson: step.parametersJson,
        onSuccessStepKey: step.onSuccessStepKey,
        onFailureStepKey: step.onFailureStepKey,
        timeoutSeconds: step.timeoutSeconds,
        retryCount: step.retryCount,
        status: 'IDLE',
      },
    }));

    const newEdges: Edge[] = [];
    wf.steps.forEach((step) => {
      if (step.onSuccessStepKey && step.onSuccessStepKey !== 'END') {
        newEdges.push({
          id: `edge_success_${step.stepKey}_${step.onSuccessStepKey}`,
          source: step.stepKey,
          target: step.onSuccessStepKey,
          sourceHandle: 'success',
          animated: true,
          style: { stroke: '#10b981', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
          label: 'PASS',
          labelStyle: { fill: '#10b981', fontWeight: 600, fontSize: 10 },
          labelBgStyle: { fill: '#064e3b', fillOpacity: 0.8 },
        });
      }
      if (step.onFailureStepKey && step.onFailureStepKey !== 'END') {
        newEdges.push({
          id: `edge_failure_${step.stepKey}_${step.onFailureStepKey}`,
          source: step.stepKey,
          target: step.onFailureStepKey,
          sourceHandle: 'failure',
          animated: true,
          style: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '5,5' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
          label: 'FAIL / CALL PIC',
          labelStyle: { fill: '#f43f5e', fontWeight: 600, fontSize: 10 },
          labelBgStyle: { fill: '#881337', fillOpacity: 0.8 },
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const createDefaultCanvas = () => {
    const defaultSteps: WorkflowStep[] = [
      {
        id: '1',
        stepKey: 'step_disk_check',
        toolType: 'DISK_CHECK',
        targetHost: 'localhost',
        parametersJson: '{"drive": "C:", "thresholdPercentFree": 15}',
        onSuccessStepKey: 'step_sql_job_check',
        onFailureStepKey: 'step_voice_call_pic',
        timeoutSeconds: 15,
        retryCount: 1,
        positionX: 320,
        positionY: 80,
      },
      {
        id: '2',
        stepKey: 'step_voice_call_pic',
        toolType: 'VOICE_CALL_ACTION',
        targetHost: '+15550192834',
        parametersJson: '{"recipientPhone": "+15550192834", "picName": "Lead SRE On-Call", "message": "Low disk space alert", "provider": "Twilio"}',
        onSuccessStepKey: 'step_sql_job_check',
        onFailureStepKey: 'END',
        timeoutSeconds: 30,
        retryCount: 1,
        positionX: 100,
        positionY: 280,
      },
      {
        id: '3',
        stepKey: 'step_sql_job_check',
        toolType: 'SQL_JOB_CHECK',
        targetHost: 'localhost\\SQLEXPRESS',
        parametersJson: '{"jobName": "Nightly_Backup", "database": "master"}',
        onSuccessStepKey: 'END',
        onFailureStepKey: 'END',
        timeoutSeconds: 20,
        retryCount: 1,
        positionX: 560,
        positionY: 280,
      },
    ];

    loadWorkflowIntoCanvas({
      id: 'default',
      name: 'Nightly Core Infra Audit & PIC Escalation',
      description: 'Multi-step automated audit checking disk capacity, SQL agent jobs, and fallback voice alerting.',
      cronExpression: '0 2 * * *',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: defaultSteps,
    });
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      const isSuccess = connection.sourceHandle === 'success';
      const edgeColor = isSuccess ? '#10b981' : '#f43f5e';
      const edgeLabel = isSuccess ? 'PASS' : 'FAIL';

      const newEdge: Edge = {
        id: `edge_${connection.sourceHandle}_${connection.source}_${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        animated: true,
        style: { stroke: edgeColor, strokeWidth: 2, strokeDasharray: isSuccess ? undefined : '5,5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        label: edgeLabel,
        labelStyle: { fill: edgeColor, fontWeight: 600, fontSize: 10 },
        labelBgStyle: { fill: isSuccess ? '#064e3b' : '#881337', fillOpacity: 0.8 },
      };

      setEdges((eds) => addEdge(newEdge, eds));

      // Update source node's branch link
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === connection.source) {
            return {
              ...node,
              data: {
                ...node.data,
                [isSuccess ? 'onSuccessStepKey' : 'onFailureStepKey']: connection.target,
              },
            };
          }
          return node;
        })
      );
    },
    [setEdges, setNodes]
  );

  const onNodeClick = (_: React.MouseEvent, node: Node<any>) => {
    const step: WorkflowStep = {
      id: node.id,
      stepKey: node.data.stepKey,
      toolType: node.data.toolType,
      targetHost: node.data.targetHost,
      parametersJson: node.data.parametersJson || '{}',
      onSuccessStepKey: node.data.onSuccessStepKey,
      onFailureStepKey: node.data.onFailureStepKey,
      timeoutSeconds: node.data.timeoutSeconds || 30,
      retryCount: node.data.retryCount || 1,
      positionX: node.position.x,
      positionY: node.position.y,
    };
    setSelectedStep(step);
    setIsDrawerOpen(true);
  };

  const handleAddNode = useCallback(
    (toolType: ToolType = 'DISK_CHECK', position?: { x: number; y: number }) => {
      const agentMeta = getAgentInventoryItem(toolType);
      const stepKey = `step_${toolType.toLowerCase()}_${Date.now().toString().slice(-4)}`;
      const nodePos = position || {
        x: 280 + Math.random() * 80,
        y: 120 + nodes.length * 70,
      };

      const newNode: Node<any> = {
        id: stepKey,
        type: 'stepNode',
        position: nodePos,
        data: {
          stepKey,
          toolType,
          targetHost: agentMeta.defaultTargetHost || 'localhost',
          parametersJson: JSON.stringify(agentMeta.defaultParams, null, 2),
          onSuccessStepKey: 'END',
          onFailureStepKey: 'END',
          timeoutSeconds: agentMeta.defaultTimeoutSeconds || 30,
          retryCount: agentMeta.defaultRetryCount || 1,
          status: 'IDLE',
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes]
  );

  // HTML5 Drag and Drop handlers from Agent Inventory onto Canvas
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const toolType = event.dataTransfer.getData('application/reactflow-tooltype') as ToolType;
      if (!toolType) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const position = reactFlowInstance
        ? reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })
        : {
            x: event.clientX - (reactFlowBounds?.left || 0) - 100,
            y: event.clientY - (reactFlowBounds?.top || 0) - 40,
          };

      handleAddNode(toolType, position);
    },
    [reactFlowInstance, handleAddNode]
  );

  const handleSaveStep = (updated: WorkflowStep) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === updated.stepKey || node.data.stepKey === updated.stepKey) {
          return {
            ...node,
            data: {
              ...node.data,
              targetHost: updated.targetHost,
              parametersJson: updated.parametersJson,
              onSuccessStepKey: updated.onSuccessStepKey,
              onFailureStepKey: updated.onFailureStepKey,
              timeoutSeconds: updated.timeoutSeconds,
              retryCount: updated.retryCount,
            },
          };
        }
        return node;
      })
    );
    setIsDrawerOpen(false);
  };

  const handleDeleteStep = (stepKey: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== stepKey && n.data.stepKey !== stepKey));
    setEdges((eds) => eds.filter((e) => e.source !== stepKey && e.target !== stepKey));
    setIsDrawerOpen(false);
  };

  const handleSaveWorkflow = async () => {
    setSaving(true);
    try {
      const payloadSteps: Partial<WorkflowStep>[] = nodes.map((node) => ({
        stepKey: node.data.stepKey,
        toolType: node.data.toolType,
        targetHost: node.data.targetHost,
        parametersJson: node.data.parametersJson || '{}',
        onSuccessStepKey: node.data.onSuccessStepKey || 'END',
        onFailureStepKey: node.data.onFailureStepKey || 'END',
        timeoutSeconds: node.data.timeoutSeconds || 30,
        retryCount: node.data.retryCount || 1,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
      }));

      const workflowPayload = {
        name: workflowName,
        description: workflowDesc,
        cronExpression,
        isActive,
        steps: payloadSteps as WorkflowStep[],
      };

      let result: Workflow;
      if (workflow && workflow.id && workflow.id !== 'default') {
        result = await updateWorkflow(workflow.id, workflowPayload);
      } else {
        result = await createWorkflow(workflowPayload);
      }

      if (onWorkflowSaved) {
        onWorkflowSaved(result);
      }
    } catch (err) {
      console.error('Failed to save workflow:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteNow = async () => {
    setRunStatus('RUNNING');
    setIsExecutionDrawerOpen(true);
    setLiveLogs([]);
    setStepResults({});

    // Reset all node statuses to PENDING
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: 'PENDING',
          metricValue: undefined,
          errorMessage: undefined,
        },
      }))
    );

    if (workflow && workflow.id && workflow.id !== 'default') {
      try {
        const res = await triggerWorkflowRun(workflow.id);
        setActiveRunId(res.workflowId);
        await joinRunStream(res.workflowId);
        return;
      } catch (err) {
        console.warn('Backend run dispatch failed, executing simulated run:', err);
      }
    }

    // Interactive fallback simulation
    const stepList = nodes.map((n) => n.data as StepNodeData);
    if (stepList.length === 0) return;

    let current = stepList[0];
    let executed = 0;
    let failed = 0;

    while (current) {
      executed++;
      const currentKey = current.stepKey;

      setNodes((nds) =>
        nds.map((n) =>
          n.data.stepKey === currentKey
            ? { ...n, data: { ...n.data, status: 'RUNNING' } }
            : n
        )
      );

      setLiveLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          runId: 'local',
          timestamp: new Date().toLocaleTimeString(),
          level: 'INFO',
          message: `[DISPATCH] [${currentKey}] Running ${current.toolType} on ${current.targetHost || 'localhost'}`,
        },
      ]);

      await new Promise((r) => setTimeout(r, 1200));

      const isPass = current.toolType !== 'DISK_CHECK' || !current.parametersJson?.includes('FAIL');
      const status = isPass ? 'PASS' : 'FAIL';
      if (!isPass) failed++;

      const metric =
        current.toolType === 'DISK_CHECK'
          ? '24.5% Free (112 GB / 458 GB)'
          : current.toolType === 'RDP_PORT_CHECK'
          ? 'Port 3389 OPEN (14ms)'
          : current.toolType === 'SQL_JOB_CHECK'
          ? 'SQL DB master ONLINE (18ms)'
          : current.toolType === 'VOICE_CALL_ACTION'
          ? 'Voice Alert Dispatched -> PIC (Twilio SID: CA8b9...)'
          : 'HTTP 200 OK (84ms)';

      setNodes((nds) =>
        nds.map((n) =>
          n.data.stepKey === currentKey
            ? {
                ...n,
                data: {
                  ...n.data,
                  status: status as any,
                  metricValue: metric,
                },
              }
            : n
        )
      );

      setLiveLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          runId: 'local',
          timestamp: new Date().toLocaleTimeString(),
          level: isPass ? 'SUCCESS' : 'ERROR',
          message: `[RESULT] [${currentKey}] Status: ${status} | Metric: ${metric}`,
        },
      ]);

      setStepResults((prev) => ({
        ...prev,
        [currentKey]: {
          id: Math.random().toString(),
          runId: 'local',
          stepKey: currentKey,
          checkType: current.toolType,
          status: status as any,
          metricValue: metric,
          durationMs: 1200,
          executedAt: new Date().toISOString(),
        },
      }));

      // Branch
      const nextKey = isPass ? current.onSuccessStepKey : current.onFailureStepKey;
      if (nextKey && nextKey !== 'END') {
        const nextNode = stepList.find((s) => s.stepKey === nextKey);
        current = nextNode!;
      } else {
        break;
      }
    }

    setRunStatus(failed === 0 ? 'COMPLETED' : 'FAILED');
    setTotalStepsCount(executed);
    setFailedStepsCount(failed);
  };

  const allStepObjects: WorkflowStep[] = useMemo(() => {
    return nodes.map((n) => ({
      id: n.id,
      stepKey: n.data.stepKey,
      toolType: n.data.toolType,
      targetHost: n.data.targetHost,
      parametersJson: n.data.parametersJson || '{}',
      onSuccessStepKey: n.data.onSuccessStepKey,
      onFailureStepKey: n.data.onFailureStepKey,
      timeoutSeconds: n.data.timeoutSeconds || 30,
      retryCount: n.data.retryCount || 1,
      positionX: n.position.x,
      positionY: n.position.y,
    }));
  }, [nodes]);

  const scheduleHumanText = formatCronSchedule(cronExpression);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden transition-colors duration-200">
      {/* Top Toolbar */}
      <div className="h-16 px-6 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          {/* Back to Workflows Button */}
          {onBackToWorkflows && (
            <button
              onClick={onBackToWorkflows}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
              title="Return to Workflows Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Workflows</span>
            </button>
          )}

          {/* Workflow Identity & Setup Button */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 border border-primary-500/30 text-primary-600 dark:text-primary-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Workflow Name"
                  className="bg-transparent text-slate-900 dark:text-slate-100 font-bold text-sm hover:border-slate-400 dark:hover:border-slate-700 focus:border-primary-500 focus:outline-none px-1 py-0.5 border-b border-transparent transition-colors max-w-xs"
                />
                <button
                  onClick={() => setIsSetupModalOpen(true)}
                  title="Configure Name & Schedule"
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors shadow-sm"
                >
                  <Settings className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span>Setup</span>
                </button>
              </div>

              {/* Schedule Indicator */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                  <Clock className="w-3 h-3" />
                  {scheduleHumanText}
                </span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span
                  className={`font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isActive ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* AI Runbook Architect Toggle */}
          <button
            onClick={() => setIsAiBarOpen(!isAiBarOpen)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 shadow-sm transition-all ${
              isAiBarOpen
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white border-primary-500 shadow-md shadow-primary-500/20'
                : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiBarOpen ? 'text-amber-300' : 'text-primary-600 dark:text-primary-400'}`} />
            <span>AI Architect</span>
          </button>

          <button
            onClick={() => setIsInventoryCollapsed(!isInventoryCollapsed)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-colors shadow-sm ${
              !isInventoryCollapsed
                ? 'bg-primary-50 dark:bg-primary-600/20 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-500/40'
                : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Cpu className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span>Agent Inventory ({nodes.length} in DAG)</span>
          </button>

          <button
            onClick={createDefaultCanvas}
            title="Reset template"
            className="p-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaveWorkflow}
            disabled={saving}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 text-emerald-500" />
            {saving ? 'Saving...' : 'Save Runbook'}
          </button>

          <button
            onClick={handleExecuteNow}
            className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-lg shadow-primary-600/30 transition-all hover:scale-105"
          >
            <Play className="w-4 h-4 fill-white" />
            Execute Now
          </button>
        </div>
      </div>

      {/* AI Runbook Prompt Bar (Natural Language ➔ DAG Generator) */}
      <AiWorkflowPromptBar
        isOpen={isAiBarOpen}
        onClose={() => setIsAiBarOpen(false)}
        onWorkflowGenerated={handleAiWorkflowGenerated}
      />

      {/* Main Canvas Area with Agent Inventory Dock */}
      <div className="flex-1 w-full h-full flex overflow-hidden relative">
        {/* Agent Inventory Sidebar Dock (Draggable Agents Catalog) */}
        <AgentInventoryPanel
          onAddAgent={(toolType) => handleAddNode(toolType)}
          isCollapsed={isInventoryCollapsed}
          onToggleCollapse={() => setIsInventoryCollapsed(!isInventoryCollapsed)}
        />

        {/* React Flow Visual Canvas */}
        <div
          ref={reactFlowWrapper}
          onDragOver={onDragOver}
          onDrop={onDrop}
          className="flex-1 w-full h-full relative"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className={theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.2}
              color={theme === 'dark' ? '#1e293b' : '#cbd5e1'}
            />
            <Controls className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !text-slate-700 dark:!text-slate-300 rounded-lg overflow-hidden shadow-md" />
            <MiniMap
              nodeColor={(node) => {
                if (node.data?.status === 'PASS') return '#10b981';
                if (node.data?.status === 'FAIL') return '#f43f5e';
                if (node.data?.status === 'RUNNING') return '#3b82f6';
                return theme === 'dark' ? '#475569' : '#94a3b8';
              }}
              className="!bg-white/90 dark:!bg-slate-900/90 !border-slate-200 dark:!border-slate-800 rounded-lg overflow-hidden shadow-md"
            />
          </ReactFlow>

          {/* Floating Console Toggle Button */}
          {!isExecutionDrawerOpen && (
            <button
              onClick={() => setIsExecutionDrawerOpen(true)}
              className="absolute bottom-5 right-5 px-3 py-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-2 text-xs font-medium transition-all"
            >
              <Terminal className="w-4 h-4 text-primary-500" />
              <span>Open Stream Console</span>
              {runStatus !== 'IDLE' && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Workflow Setup Modal */}
      <WorkflowSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        name={workflowName}
        description={workflowDesc}
        cronExpression={cronExpression}
        isActive={isActive}
        onSave={(data) => {
          setWorkflowName(data.name);
          setWorkflowDesc(data.description);
          setCronExpression(data.cronExpression);
          setIsActive(data.isActive);
        }}
      />

      {/* Step Config Drawer */}
      <StepConfigDrawer
        step={selectedStep}
        allSteps={allStepObjects}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSave={handleSaveStep}
        onDelete={handleDeleteStep}
      />

      {/* Live SignalR Execution Drawer */}
      <LiveExecutionDrawer
        runId={activeRunId}
        status={runStatus}
        totalSteps={totalStepsCount}
        failedSteps={failedStepsCount}
        logs={liveLogs}
        stepResults={stepResults}
        isOpen={isExecutionDrawerOpen}
        onClose={() => setIsExecutionDrawerOpen(false)}
      />
    </div>
  );
};

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
