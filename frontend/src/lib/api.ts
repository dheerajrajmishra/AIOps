import {
  Workflow,
  WorkflowRun,
  NocMatrixResponse,
  ToolType,
  AiInferenceReport,
  EscalationGroup,
  MultiLayerCallResult,
  EscalationDispatchRequest,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchWorkflows(): Promise<Workflow[]> {
  try {
    const res = await fetch(`${API_BASE}/workflows`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch workflows:', err);
    return [];
  }
}

export async function fetchWorkflow(id: string): Promise<Workflow | null> {
  try {
    const res = await fetch(`${API_BASE}/workflows/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch workflow:', err);
    return null;
  }
}

export async function createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
  const res = await fetch(`${API_BASE}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create workflow: ${res.statusText}`);
  return await res.json();
}

export async function updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
  const res = await fetch(`${API_BASE}/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update workflow: ${res.statusText}`);
  return await res.json();
}

export async function deleteWorkflow(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/workflows/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete workflow: ${res.statusText}`);
}

export async function triggerWorkflowRun(id: string): Promise<{ workflowId: string; message: string }> {
  const res = await fetch(`${API_BASE}/workflows/${id}/run`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to trigger workflow run: ${res.statusText}`);
  return await res.json();
}

export async function fetchRuns(workflowId?: string): Promise<WorkflowRun[]> {
  try {
    const url = workflowId
      ? `${API_BASE}/workflowruns?workflowId=${workflowId}`
      : `${API_BASE}/workflowruns`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch runs:', err);
    return [];
  }
}

export async function fetchRun(id: string): Promise<WorkflowRun | null> {
  try {
    const res = await fetch(`${API_BASE}/workflowruns/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch run:', err);
    return null;
  }
}

export async function fetchNocMatrix(): Promise<NocMatrixResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/noc/matrix`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch NOC matrix:', err);
    return null;
  }
}

export async function testTool(
  toolType: ToolType,
  targetHost?: string,
  parametersJson?: string
): Promise<{ status: string; metricValue: string; rawOutput?: string; errorMessage?: string }> {
  const res = await fetch(`${API_BASE}/tools/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toolType,
      targetHost,
      parametersJson: parametersJson || '{}',
    }),
  });
  return await res.json();
}

export async function fetchAiInferenceReport(): Promise<AiInferenceReport | null> {
  try {
    const res = await fetch(`${API_BASE}/noc/ai-inference`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch AI inference report:', err);
    return null;
  }
}

export async function fetchEscalationGroups(): Promise<EscalationGroup[]> {
  try {
    const res = await fetch(`${API_BASE}/escalation`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch escalation groups:', err);
    return [];
  }
}

export async function fetchEscalationGroup(id: string): Promise<EscalationGroup | null> {
  try {
    const res = await fetch(`${API_BASE}/escalation/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch escalation group:', err);
    return null;
  }
}

export async function saveEscalationGroup(group: EscalationGroup): Promise<EscalationGroup | null> {
  try {
    const res = await fetch(`${API_BASE}/escalation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    if (!res.ok) throw new Error(`Failed to save escalation group: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to save escalation group:', err);
    return null;
  }
}

export async function dispatchEscalationTest(
  request: EscalationDispatchRequest
): Promise<MultiLayerCallResult | null> {
  try {
    const res = await fetch(`${API_BASE}/escalation/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`Failed to dispatch escalation test: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error('Failed to dispatch escalation test:', err);
    return null;
  }
}


