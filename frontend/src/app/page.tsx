'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { WorkflowsDashboard } from '@/components/dashboard/WorkflowsDashboard';
import { NocMatrixView } from '@/components/noc/NocMatrixView';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { RunsHistoryView } from '@/components/runs/RunsHistoryView';
import { AgentInventoryView } from '@/components/inventory/AgentInventoryView';
import { AiInferenceDashboard } from '@/components/noc/AiInferenceDashboard';
import { EscalationMatrixView } from '@/components/escalation/EscalationMatrixView';
import { Workflow, ToolType, AiInferenceReport } from '@/types';
import { fetchWorkflows, fetchWorkflow, fetchAiInferenceReport, triggerWorkflowRun } from '@/lib/api';

export default function Home() {
  const [currentView, setCurrentView] = useState<'workflows' | 'builder' | 'inventory' | 'noc' | 'runs' | 'inference' | 'escalation'>('workflows');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [inferenceReport, setInferenceReport] = useState<AiInferenceReport | null>(null);
  const [inferenceLoading, setInferenceLoading] = useState<boolean>(false);

  const loadWorkflows = async () => {
    const list = await fetchWorkflows();
    setWorkflows(list);
    if (list.length > 0 && !selectedWorkflow) {
      // Pre-load first workflow with full steps
      const full = await fetchWorkflow(list[0].id);
      if (full) setSelectedWorkflow(full);
    }
  };

  const loadInference = async () => {
    setInferenceLoading(true);
    const rep = await fetchAiInferenceReport();
    if (rep) setInferenceReport(rep);
    setInferenceLoading(false);
  };

  useEffect(() => {
    loadWorkflows();
    loadInference();
  }, []);

  const handleSelectWorkflow = async (wf: Workflow) => {
    const full = await fetchWorkflow(wf.id);
    if (full) setSelectedWorkflow(full);
    else setSelectedWorkflow(wf);
  };

  const handleOpenBuilderWithWorkflow = async (wf: Workflow) => {
    const full = await fetchWorkflow(wf.id);
    setSelectedWorkflow(full || wf);
    setCurrentView('builder');
  };

  const handleNewWorkflow = () => {
    setSelectedWorkflow(null);
    setCurrentView('builder');
  };

  const handleWorkflowSaved = (saved: Workflow) => {
    setSelectedWorkflow(saved);
    loadWorkflows();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Navbar
        currentView={currentView}
        onViewChange={setCurrentView}
        workflows={workflows}
        selectedWorkflow={selectedWorkflow}
        onSelectWorkflow={handleOpenBuilderWithWorkflow}
        onNewWorkflow={handleNewWorkflow}
      />

      <main className="flex-1 w-full overflow-y-auto">
        {currentView === 'workflows' && (
          <WorkflowsDashboard
            workflows={workflows}
            onSelectWorkflow={handleSelectWorkflow}
            onOpenBuilder={handleOpenBuilderWithWorkflow}
            onNewWorkflow={handleNewWorkflow}
            onRefreshWorkflows={loadWorkflows}
            onSwitchToNocMatrix={() => setCurrentView('noc')}
            onSwitchToAgentInventory={() => setCurrentView('inventory')}
            onSwitchToAiInference={() => setCurrentView('inference')}
          />
        )}
        {currentView === 'builder' && (
          <WorkflowCanvas
            workflow={selectedWorkflow}
            onWorkflowSaved={handleWorkflowSaved}
            onBackToWorkflows={() => setCurrentView('workflows')}
          />
        )}
        {currentView === 'inventory' && (
          <AgentInventoryView
            onOpenBuilderWithAgent={(toolType) => {
              setCurrentView('builder');
            }}
          />
        )}
        {currentView === 'noc' && (
          <NocMatrixView onOpenBuilder={handleOpenBuilderWithWorkflow} />
        )}
        {currentView === 'inference' && (
          <div className="p-6 max-w-7xl mx-auto">
            <AiInferenceDashboard
              report={inferenceReport}
              loading={inferenceLoading}
              onRefresh={loadInference}
              onOpenBuilder={handleOpenBuilderWithWorkflow}
              onTriggerRunbook={async (wfId) => {
                await triggerWorkflowRun(wfId);
                loadInference();
              }}
              workflows={workflows}
            />
          </div>
        )}
        {currentView === 'escalation' && <EscalationMatrixView />}
        {currentView === 'runs' && <RunsHistoryView />}
      </main>
    </div>
  );
}

