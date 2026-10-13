export type ToolType =
  | 'DISK_CHECK'
  | 'RDP_PORT_CHECK'
  | 'SQL_JOB_CHECK'
  | 'URL_CHECK_EXT'
  | 'URL_CHECK_INT'
  | 'SERVICE_ACTION'
  | 'VOICE_CALL_ACTION';

export interface WorkflowStep {
  id: string;
  workflowId?: string;
  stepKey: string;
  toolType: ToolType;
  targetHost?: string;
  parametersJson: string;
  onSuccessStepKey?: string | null;
  onFailureStepKey?: string | null;
  timeoutSeconds: number;
  retryCount: number;
  positionX: number;
  positionY: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  cronExpression?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stepCount?: number;
  steps?: WorkflowStep[];
  lastRun?: {
    id: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    startedAt: string;
    completedAt?: string;
    failedSteps: number;
    totalSteps?: number;
    triggerType: 'SCHEDULED' | 'MANUAL';
    durationMs?: number;
  } | null;
  recentRuns?: Array<{
    id: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    startedAt: string;
    completedAt?: string | null;
    failedSteps: number;
    totalSteps: number;
    triggerType: 'SCHEDULED' | 'MANUAL';
    durationMs: number;
  }>;
}

export interface StepExecutionLog {
  id: string;
  runId: string;
  stepKey: string;
  targetHost?: string;
  checkType: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  metricValue: string;
  rawOutput?: string;
  errorMessage?: string | null;
  durationMs: number;
  executedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName?: string;
  triggerType: 'SCHEDULED' | 'MANUAL';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string | null;
  totalSteps: number;
  failedSteps: number;
  durationMs: number;
  logs?: StepExecutionLog[];
}

export interface NocOverviewStats {
  totalHosts: number;
  totalWorkflows: number;
  activeWorkflows: number;
  totalRuns24h: number;
  failedRuns24h: number;
  successRate24h: number;
  activeIncidents: number;
  avgDurationMs: number;
}

export interface HostSparklinePoint {
  status: 'PASS' | 'FAIL' | 'ERROR';
  durationMs: number;
  executedAt: string;
}

export interface HostHealthItem {
  targetHost: string;
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  lastCheckedAt: string;
  totalChecks: number;
  passCount: number;
  failCount: number;
  uptimePercent: number;
  checkTypes: string;
  recentMetricValue: string;
  recentError?: string | null;
  history: HostSparklinePoint[];
}

export interface NocIncidentItem {
  runId: string;
  workflowName: string;
  stepKey: string;
  targetHost: string;
  checkType: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  metricValue: string;
  errorMessage?: string | null;
  durationMs: number;
  executedAt: string;
}

export interface NocMatrixResponse {
  overview: NocOverviewStats;
  hosts: HostHealthItem[];
  recentIncidents: NocIncidentItem[];
}

export interface ConsoleLogMessage {
  id: string;
  runId: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface AiInferenceInsight {
  id: string;
  title: string;
  category: 'CAPACITY_FORECAST' | 'ROOT_CAUSE_ANALYSIS' | 'ANOMALY_DETECTION' | 'SECURITY_AUDIT' | 'HEALING_RECOMMENDATION' | string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  confidenceScore: number;
  affectedTarget: string;
  inferenceSummary: string;
  evidenceMetrics: string[];
  recommendedAction: string;
  remediationWorkflowId?: string | null;
  generatedAt: string;
}

export interface AiInferenceReport {
  generatedAt: string;
  engineModel: string;
  systemHealthIndex: number;
  totalAnomaliesDetected: number;
  proactiveRemediationsSuggested: number;
  insights: AiInferenceInsight[];
}

export interface EscalationLayer {
  layer: number;
  role: string;
  picName: string;
  phoneNumber: string;
  timeoutSeconds: number;
  channel: string;
}

export interface EscalationGroup {
  id: string;
  name: string;
  team: string;
  application: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  layers: EscalationLayer[];
  description: string;
}

export interface LayerDispatchAudit {
  layer: number;
  role: string;
  picName: string;
  phoneNumber: string;
  callSid: string;
  status: string;
  details: string;
  timestamp: string;
}

export interface MultiLayerCallResult {
  success: boolean;
  groupName: string;
  team: string;
  application: string;
  totalLayers: number;
  dispatchedLayers: LayerDispatchAudit[];
  summary: string;
}

export interface EscalationDispatchRequest {
  appOrTeam?: string;
  specificLayer?: number | null;
  alertMessage: string;
}


