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
  EdgeChange,
  applyEdgeChanges,
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
  ChevronDown,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Maximize2,
  ZoomIn,
  ZoomOut,
  FolderOpen,
  Power,
  RotateCcw,
} from 'lucide-react';

import { StepNode, StepNodeData } from './StepNode';
import { StepConfigDrawer } from './StepConfigDrawer';
import { LiveExecutionDrawer } from './LiveExecutionDrawer';
import { WorkflowSetupModal } from './WorkflowSetupModal';
import { QuickAddStepModal } from './QuickAddStepModal';
import { WorkflowShortcutsModal } from './WorkflowShortcutsModal';
import { AgentInventoryPanel } from '@/components/inventory/AgentInventoryPanel';
import { AiWorkflowPromptBar } from './AiWorkflowPromptBar';
import { GeneratedWorkflowResult } from '@/lib/aiWorkflowGenerator';
import { WORKFLOW_TEMPLATES, WorkflowTemplate } from '@/lib/workflowTemplates';
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
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // Workflow Metadata & Setup
  const [workflowName, setWorkflowName] = useState(workflow?.name || 'New Infrastructure Runbook');
  const [workflowDesc, setWorkflowDesc] = useState(workflow?.description || '');
  const [cronExpression, setCronExpression] = useState(workflow?.cronExpression || '0 2 * * *');
  const [isActive, setIsActive] = useState(workflow ? workflow.isActive : true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Agent Inventory Dock
  const [isInventoryCollapsed, setIsInventoryCollapsed] = useState(false);

  // Modals & Drawers
  const [isAiBarOpen, setIsAiBarOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddPos, setQuickAddPos] = useState<{ x: number; y: number } | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTemplatesDropdownOpen, setIsTemplatesDropdownOpen] = useState(false);

  // Click outside listener for templates dropdown
  useEffect(() => {
    if (!isTemplatesDropdownOpen) return;
    const handleClickOutside = () => setIsTemplatesDropdownOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isTemplatesDropdownOpen]);

  // Step Drawer
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Live Execution Stream state
  const [isExecutionDrawerOpen, setIsExecutionDrawerOpen] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<'IDLE' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [totalStepsCount, setTotalStepsCount] = useState(0);
  const [failedStepsCount, setFailedStepsCount] = useState(0);
  const [liveLogs, setLiveLogs] = useState<ConsoleLogMessage[]>([]);
  const [stepResults, setStepResults] = useState<Record<string, StepExecutionLog>>({});

  // Background Grid Style
  const [gridVariant, setGridVariant] = useState<BackgroundVariant>(BackgroundVariant.Dots);

  // Node Callbacks (attached to node data)
  const handleOpenConfigure = useCallback((stepKey: string) => {
    setNodes((currentNodes) => {
      const target = currentNodes.find((n) => n.id === stepKey || n.data.stepKey === stepKey);
      if (target) {
        setSelectedStep({
          id: target.id,
          stepKey: target.data.stepKey,
          toolType: target.data.toolType,
          targetHost: target.data.targetHost,
          parametersJson: target.data.parametersJson || '{}',
          onSuccessStepKey: target.data.onSuccessStepKey,
          onFailureStepKey: target.data.onFailureStepKey,
          timeoutSeconds: target.data.timeoutSeconds || 30,
          retryCount: target.data.retryCount || 1,
          positionX: target.position.x,
          positionY: target.position.y,
        });
        setIsDrawerOpen(true);
      }
      return currentNodes;
    });
  }, [setNodes]);

  const handleDuplicateNode = useCallback((stepKey: string) => {
    setNodes((currentNodes) => {
      const targetNode = currentNodes.find((n) => n.id === stepKey || n.data.stepKey === stepKey);
      if (!targetNode) return currentNodes;

      const newStepKey = `${targetNode.data.stepKey}_copy_${Date.now().toString().slice(-4)}`;
      const newNode: Node<any> = {
        id: newStepKey,
        type: 'stepNode',
        position: {
          x: targetNode.position.x + 50,
          y: targetNode.position.y + 50,
        },
        data: {
          ...targetNode.data,
          stepKey: newStepKey,
          onSuccessStepKey: 'END',
          onFailureStepKey: 'END',
          status: 'IDLE',
          metricValue: undefined,
          errorMessage: undefined,
          onConfigure: handleOpenConfigure,
          onDuplicate: handleDuplicateNode,
          onDelete: handleDeleteNode,
        },
      };

      return [...currentNodes, newNode];
    });
  }, [handleOpenConfigure, setNodes]);

  const handleDeleteNode = useCallback((stepKey: string) => {
    setNodes((currentNodes) => {
      return currentNodes
        .filter((n) => n.id !== stepKey && n.data.stepKey !== stepKey)
        .map((n) => {
          let updated = false;
          let onSuccess = n.data.onSuccessStepKey;
          let onFailure = n.data.onFailureStepKey;
          if (onSuccess === stepKey) {
            onSuccess = 'END';
            updated = true;
          }
          if (onFailure === stepKey) {
            onFailure = 'END';
            updated = true;
          }
          if (updated) {
            return {
              ...n,
              data: {
                ...n.data,
                onSuccessStepKey: onSuccess,
                onFailureStepKey: onFailure,
              },
            };
          }
          return n;
        });
    });

    setEdges((currentEdges) =>
      currentEdges.filter((e) => e.source !== stepKey && e.target !== stepKey)
    );

    setSelectedStep((prev) => (prev?.stepKey === stepKey ? null : prev));
  }, [setNodes, setEdges]);

  // Synchronized Edge Change handler
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'remove') {
          const removed = edges.find((e) => e.id === change.id);
          if (removed) {
            const isSuccess = removed.sourceHandle === 'success';
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === removed.source) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      [isSuccess ? 'onSuccessStepKey' : 'onFailureStepKey']: 'END',
                    },
                  };
                }
                return n;
              })
            );
          }
        }
      });
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [edges, setEdges, setNodes]
  );

  const loadWorkflowIntoCanvas = useCallback(
    (wf: Workflow) => {
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
          onConfigure: handleOpenConfigure,
          onDuplicate: handleDuplicateNode,
          onDelete: handleDeleteNode,
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
            style: { stroke: '#10b981', strokeWidth: 2.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
            label: 'PASS',
            labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 10 },
            labelBgStyle: { fill: theme === 'dark' ? '#064e3b' : '#ecfdf5', fillOpacity: 0.9 },
          });
        }
        if (step.onFailureStepKey && step.onFailureStepKey !== 'END') {
          newEdges.push({
            id: `edge_failure_${step.stepKey}_${step.onFailureStepKey}`,
            source: step.stepKey,
            target: step.onFailureStepKey,
            sourceHandle: 'failure',
            animated: true,
            style: { stroke: '#f43f5e', strokeWidth: 2.5, strokeDasharray: '5,5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
            label: 'FAIL / CALL PIC',
            labelStyle: { fill: '#f43f5e', fontWeight: 700, fontSize: 10 },
            labelBgStyle: { fill: theme === 'dark' ? '#881337' : '#fff1f2', fillOpacity: 0.9 },
          });
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);
    },
    [handleOpenConfigure, handleDuplicateNode, handleDeleteNode, setNodes, setEdges, theme]
  );

  const loadTemplate = (tmpl: WorkflowTemplate) => {
    setWorkflowName(tmpl.name);
    setWorkflowDesc(tmpl.description);
    setCronExpression(tmpl.cronExpression);
    setIsActive(true);
    setIsTemplatesDropdownOpen(false);

    loadWorkflowIntoCanvas({
      id: 'tmpl-' + tmpl.id,
      name: tmpl.name,
      description: tmpl.description,
      cronExpression: tmpl.cronExpression,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: tmpl.steps,
    });

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
    }, 100);
  };

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
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
    }, 100);
  };

  // Sync canvas with workflow prop
  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
      setWorkflowDesc(workflow.description || '');
      setCronExpression(workflow.cronExpression || '0 2 * * *');
      setIsActive(workflow.isActive);
      loadWorkflowIntoCanvas(workflow);
    } else {
      loadTemplate(WORKFLOW_TEMPLATES[0]);
    }
  }, [workflow, loadWorkflowIntoCanvas]);

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

  // Auto Layout Hierarchical DAG Function
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    nodes.forEach((n) => {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    });
    edges.forEach((e) => {
      if (adj[e.source]) adj[e.source].push(e.target);
      if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    });

    const levels: Record<string, number> = {};
    const queue: string[] = [];

    // Roots (inDegree === 0)
    nodes.forEach((n) => {
      if (inDegree[n.id] === 0) {
        queue.push(n.id);
        levels[n.id] = 0;
      }
    });

    if (queue.length === 0 && nodes.length > 0) {
      queue.push(nodes[0].id);
      levels[nodes[0].id] = 0;
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const currLevel = levels[curr] || 0;
      const neighbors = adj[curr] || [];
      for (const next of neighbors) {
        if (levels[next] === undefined || levels[next] < currLevel + 1) {
          levels[next] = currLevel + 1;
          queue.push(next);
        }
      }
    }

    nodes.forEach((n) => {
      if (levels[n.id] === undefined) {
        levels[n.id] = 0;
      }
    });

    const levelGroups: Record<number, Node<any>[]> = {};
    nodes.forEach((n) => {
      const lvl = levels[n.id] || 0;
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push(n);
    });

    const NODE_WIDTH = 340;
    const NODE_HEIGHT = 200;
    const HORIZONTAL_GAP = 70;
    const VERTICAL_GAP = 130;

    const updatedNodes = nodes.map((node) => {
      const lvl = levels[node.id] || 0;
      const group = levelGroups[lvl];
      const indexInGroup = group.findIndex((g) => g.id === node.id);
      const totalInGroup = group.length;

      const totalWidth = totalInGroup * NODE_WIDTH + (totalInGroup - 1) * HORIZONTAL_GAP;
      const startX = 420 - totalWidth / 2;
      const x = Math.round(startX + indexInGroup * (NODE_WIDTH + HORIZONTAL_GAP));
      const y = Math.round(80 + lvl * (NODE_HEIGHT + VERTICAL_GAP));

      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(updatedNodes);
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
    }, 60);
  }, [nodes, edges, reactFlowInstance, setNodes]);

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
        style: { stroke: edgeColor, strokeWidth: 2.5, strokeDasharray: isSuccess ? undefined : '5,5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        label: edgeLabel,
        labelStyle: { fill: edgeColor, fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: isSuccess ? (theme === 'dark' ? '#064e3b' : '#ecfdf5') : (theme === 'dark' ? '#881337' : '#fff1f2'), fillOpacity: 0.9 },
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
    [setEdges, setNodes, theme]
  );

  const onNodeClick = (_: React.MouseEvent, node: Node<any>) => {
    handleOpenConfigure(node.id);
  };

  const handleAddNode = useCallback(
    (toolType: ToolType = 'DISK_CHECK', position?: { x: number; y: number }) => {
      const agentMeta = getAgentInventoryItem(toolType);
      const stepKey = `step_${toolType.toLowerCase()}_${Date.now().toString().slice(-4)}`;
      const nodePos = position || {
        x: 340 + Math.random() * 60,
        y: 120 + nodes.length * 60,
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
          onConfigure: handleOpenConfigure,
          onDuplicate: handleDuplicateNode,
          onDelete: handleDeleteNode,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, handleOpenConfigure, handleDuplicateNode, handleDeleteNode, setNodes]
  );

  // HTML5 Drag and Drop handlers
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

  // Canvas Double Click ➔ Quick Add
  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const position = reactFlowInstance
        ? reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          })
        : undefined;
      setQuickAddPos(position || null);
      setIsQuickAddOpen(true);
    },
    [reactFlowInstance]
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

  const handleSaveWorkflow = async () => {
    setSaving(true);
    setSaveSuccessMessage(null);
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
      if (workflow && workflow.id && !workflow.id.startsWith('tmpl-') && workflow.id !== 'default') {
        result = await updateWorkflow(workflow.id, workflowPayload);
      } else {
        result = await createWorkflow(workflowPayload);
      }

      setSaveSuccessMessage('Workflow saved successfully!');
      setTimeout(() => setSaveSuccessMessage(null), 3000);

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

    if (workflow && workflow.id && !workflow.id.startsWith('tmpl-') && workflow.id !== 'default') {
      try {
        const res = await triggerWorkflowRun(workflow.id);
        setActiveRunId(res.workflowId);
        await joinRunStream(res.workflowId);
        return;
      } catch (err) {
        console.warn('Backend run dispatch failed, executing simulated run:', err);
      }
    }

    // Fallback simulation
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

      await new Promise((r) => setTimeout(r, 1100));

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
          durationMs: 1100,
          executedAt: new Date().toISOString(),
        },
      }));

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

  // DAG Health & Connectivity Validation
  const dagHealth = useMemo(() => {
    if (nodes.length <= 1) return { isHealthy: true, message: 'Valid DAG' };

    const targetNodeIds = new Set<string>();
    const sourceNodeIds = new Set<string>();
    edges.forEach((e) => {
      sourceNodeIds.add(e.source);
      targetNodeIds.add(e.target);
    });

    const disconnectedCount = nodes.filter(
      (n) => !sourceNodeIds.has(n.id) && !targetNodeIds.has(n.id)
    ).length;

    if (disconnectedCount > 0) {
      return {
        isHealthy: false,
        message: `${disconnectedCount} step${disconnectedCount > 1 ? 's' : ''} disconnected`,
      };
    }
    return { isHealthy: true, message: `${nodes.length} Steps Connected` };
  }, [nodes, edges]);

  const scheduleHumanText = formatCronSchedule(cronExpression);

  return (
    <div className="relative w-full h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden transition-colors duration-200">
      {/* Top Usability Toolbar */}
      <div className="h-16 px-4 md:px-6 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between backdrop-blur-md z-30 shadow-sm">
        {/* Left Section: Back, Title, Inline Status Toggle, Schedule */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          {onBackToWorkflows && (
            <button
              onClick={onBackToWorkflows}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm shrink-0"
              title="Return to Workflows Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-primary-600/10 dark:bg-primary-600/20 border border-primary-500/30 text-primary-600 dark:text-primary-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Workflow Name"
                  className="bg-transparent text-slate-900 dark:text-slate-100 font-bold text-sm hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-500 focus:outline-none px-1 py-0.5 border-b border-transparent transition-colors max-w-[200px] md:max-w-xs truncate"
                />

                <button
                  onClick={() => setIsSetupModalOpen(true)}
                  title="Configure Details & Schedule"
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-md text-[11px] font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors shadow-sm shrink-0"
                >
                  <Settings className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span className="hidden md:inline">Setup</span>
                </button>
              </div>

              {/* Status & Schedule Badges */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {/* 1-Click Interactive Active/Paused Toggle */}
                <button
                  onClick={() => setIsActive(!isActive)}
                  title="Click to toggle Active/Paused status"
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                    isActive
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-200'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-300'
                  }`}
                >
                  <Power className="w-2.5 h-2.5" />
                  {isActive ? 'ACTIVE' : 'PAUSED'}
                </button>

                <span className="text-slate-300 dark:text-slate-700">•</span>

                <button
                  onClick={() => setIsSetupModalOpen(true)}
                  className="flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline"
                  title="Click to change schedule"
                >
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">{scheduleHumanText}</span>
                </button>

                <span className="text-slate-300 dark:text-slate-700 hidden lg:inline">•</span>

                {/* DAG Health status chip */}
                <div
                  className={`hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border ${
                    dagHealth.isHealthy
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {dagHealth.isHealthy ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                  )}
                  <span>{dagHealth.message}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Usability Actions (Templates, Add Step, Auto-Layout, AI, Save, Run) */}
        <div className="flex items-center gap-2">
          {/* Templates Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsTemplatesDropdownOpen(!isTemplatesDropdownOpen)}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Load Pre-configured Runbook Template"
            >
              <FolderOpen className="w-3.5 h-3.5 text-primary-500" />
              <span className="hidden md:inline">Templates</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {isTemplatesDropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                  Enterprise Starter Runbooks
                </div>
                {WORKFLOW_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => loadTemplate(tmpl)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex flex-col gap-0.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0"
                  >
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {tmpl.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {tmpl.description}
                    </div>
                    <span className="text-[10px] font-mono text-primary-600 dark:text-primary-400 mt-0.5">
                      {tmpl.steps.length} Steps • {tmpl.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Add Step Button */}
          <button
            onClick={() => {
              setQuickAddPos(null);
              setIsQuickAddOpen(true);
            }}
            className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 dark:hover:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-semibold rounded-lg border border-primary-200 dark:border-primary-500/40 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Quickly search and insert a step"
          >
            <Plus className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="hidden sm:inline">Add Step</span>
          </button>

          {/* Auto Layout DAG Button */}
          <button
            onClick={handleAutoLayout}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Auto-align steps hierarchically"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden xl:inline">Auto Layout</span>
          </button>

          {/* AI Architect Toggle */}
          <button
            onClick={() => setIsAiBarOpen(!isAiBarOpen)}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 shadow-sm transition-all ${
              isAiBarOpen
                ? 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white border-primary-500 shadow-md shadow-primary-500/20'
                : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title="Natural language runbook generator"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiBarOpen ? 'text-amber-300' : 'text-primary-500'}`} />
            <span className="hidden sm:inline">AI Architect</span>
          </button>

          {/* Agent Inventory Sidebar Toggle */}
          <button
            onClick={() => setIsInventoryCollapsed(!isInventoryCollapsed)}
            className={`p-2 text-xs font-medium rounded-lg border transition-colors shadow-sm ${
              !isInventoryCollapsed
                ? 'bg-primary-50 dark:bg-primary-600/20 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-500/40'
                : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="Toggle Agent Dock"
          >
            <Cpu className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </button>

          {/* Shortcuts Guide Button */}
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="p-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
            title="Keyboard shortcuts & gestures guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Save Workflow Button */}
          <button
            onClick={handleSaveWorkflow}
            disabled={saving}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-4 h-4 text-emerald-500" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>

          {/* Execute Now Button */}
          <button
            onClick={handleExecuteNow}
            className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-primary-600/30 transition-all hover:scale-105"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Run</span>
          </button>
        </div>
      </div>

      {/* Save Success Banner Notification */}
      {saveSuccessMessage && (
        <div className="absolute top-18 right-6 z-40 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* AI Runbook Prompt Bar (Natural Language ➔ DAG Generator) */}
      <AiWorkflowPromptBar
        isOpen={isAiBarOpen}
        onClose={() => setIsAiBarOpen(false)}
        onWorkflowGenerated={handleAiWorkflowGenerated}
      />

      {/* Main Canvas Area with Agent Inventory Dock */}
      <div className="flex-1 w-full h-full flex overflow-hidden relative">
        {/* Agent Inventory Sidebar Dock */}
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
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDoubleClick={onPaneDoubleClick}
            nodeTypes={nodeTypes}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            className={theme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'}
          >
            <Background
              variant={gridVariant}
              gap={24}
              size={1.2}
              color={theme === 'dark' ? '#1e293b' : '#cbd5e1'}
            />
            <Controls className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !text-slate-700 dark:!text-slate-300 rounded-xl overflow-hidden shadow-md" />
            <MiniMap
              nodeColor={(node) => {
                if (node.data?.status === 'PASS') return '#10b981';
                if (node.data?.status === 'FAIL') return '#f43f5e';
                if (node.data?.status === 'RUNNING') return '#3b82f6';
                return theme === 'dark' ? '#475569' : '#94a3b8';
              }}
              className="!bg-white/90 dark:!bg-slate-900/90 !border-slate-200 dark:!border-slate-800 rounded-xl overflow-hidden shadow-md"
            />
          </ReactFlow>

          {/* Floating Canvas Quick Utilities Bar (Bottom Left) */}
          <div className="absolute bottom-5 left-5 z-20 flex items-center gap-1.5 p-1 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl backdrop-blur-md">
            <button
              onClick={() => reactFlowInstance.zoomIn({ duration: 250 })}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => reactFlowInstance.zoomOut({ duration: 250 })}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => reactFlowInstance.fitView({ padding: 0.25, duration: 300 })}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Fit to Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
            <button
              onClick={handleAutoLayout}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Auto-Layout DAG"
            >
              <Wand2 className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setGridVariant((prev) =>
                  prev === BackgroundVariant.Dots
                    ? BackgroundVariant.Lines
                    : prev === BackgroundVariant.Lines
                    ? BackgroundVariant.Cross
                    : BackgroundVariant.Dots
                )
              }
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle Grid Style (Dots/Lines/Cross)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Floating Empty Canvas Helper if No Steps */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-center max-w-sm pointer-events-auto backdrop-blur-md">
                <div className="p-3 bg-primary-50 dark:bg-primary-950/50 rounded-2xl w-fit mx-auto text-primary-600 dark:text-primary-400 mb-3 border border-primary-100 dark:border-primary-800">
                  <Layers className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Compose Your Runbook
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Drag agents from the left dock, load a starter template, or double-click anywhere to insert a step.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => loadTemplate(WORKFLOW_TEMPLATES[0])}
                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    Load Default Template
                  </button>
                  <button
                    onClick={() => setIsQuickAddOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    + Add Step
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Console Toggle Button */}
          {!isExecutionDrawerOpen && (
            <button
              onClick={() => setIsExecutionDrawerOpen(true)}
              className="absolute bottom-5 right-5 px-3 py-2 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-2 text-xs font-medium transition-all"
            >
              <Terminal className="w-4 h-4 text-primary-500" />
              <span>Open Execution Console</span>
              {runStatus !== 'IDLE' && (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quick Add Step Modal */}
      <QuickAddStepModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSelectTool={(toolType) => handleAddNode(toolType, quickAddPos || undefined)}
      />

      {/* Workflow Keyboard Shortcuts / Help Modal */}
      <WorkflowShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

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
        onDelete={handleDeleteNode}
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
