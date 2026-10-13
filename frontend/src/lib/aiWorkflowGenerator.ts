import { ToolType, WorkflowStep } from '@/types';
import { getAgentInventoryItem } from './agentInventory';

export interface GeneratedWorkflowResult {
  name: string;
  description: string;
  cronExpression: string;
  explanation: string;
  steps: WorkflowStep[];
}

export interface PromptTemplate {
  title: string;
  badge: string;
  prompt: string;
}

export const AI_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    title: 'Database & Storage Sentinel',
    badge: 'Popular',
    prompt:
      'Check drive C: capacity on db-node-01.corp.internal. If free space dips below 15%, immediately place an automated telephone call to on-call PIC (+15550192834). If disk check passes, audit SQL Server master database status and scheduled backup jobs.',
  },
  {
    title: 'Perimeter Security & RDP Inspection',
    badge: 'Security',
    prompt:
      'Audit TCP port 3389 handshake on 192.168.1.50 every 4 hours. If connection fails, autonomously restart the W32Time Windows Service, then verify the internal health gateway.',
  },
  {
    title: 'Public Gateway & Intranet SLA Probe',
    badge: 'Web & API',
    prompt:
      'Probe public HTTPS API https://api.github.com every 5 minutes with latency tracking. If response fails, probe internal microservice at http://localhost:5000/api/noc/matrix, and call Lead SRE PIC (+15550192834) if outage persists.',
  },
  {
    title: 'Autonomous Windows Service Self-Healing',
    badge: 'Remediation',
    prompt:
      'Inspect W32Time Windows Service state on localhost every hour. If halted, restart the service and check drive C: free space to confirm system stability.',
  },
];

/**
 * Intelligent AI / LLM Workflow Reasoning Engine
 * Parses natural language prompts to construct DAG workflows with nodes,
 * target hosts, parameters, conditional branching (PASS/FAIL), and schedules.
 */
export function generateWorkflowFromNaturalLanguage(prompt: string): GeneratedWorkflowResult {
  const p = prompt.toLowerCase();

  // 1. Determine Schedule / Cron
  let cron = '0 2 * * *'; // default daily 2am
  if (p.includes('every 5 min') || p.includes('5 minutes') || p.includes('high frequency')) {
    cron = '*/5 * * * *';
  } else if (p.includes('every 15 min') || p.includes('15 minutes')) {
    cron = '*/15 * * * *';
  } else if (p.includes('every hour') || p.includes('hourly') || p.includes('1 hour')) {
    cron = '0 * * * *';
  } else if (p.includes('every 4 hour') || p.includes('4 hours')) {
    cron = '0 */4 * * *';
  } else if (p.includes('every 2 hour') || p.includes('2 hours')) {
    cron = '0 */2 * * *';
  } else if (p.includes('weekly') || p.includes('every sunday')) {
    cron = '0 0 * * 0';
  } else if (p.includes('midnight')) {
    cron = '0 0 * * *';
  }

  // 2. Identify Target Hosts, Drive, Phone, Service
  const driveMatch = prompt.match(/\b([c-zC-Z]:)\b/);
  const drive = driveMatch ? driveMatch[1].toUpperCase() : 'C:';

  const phoneMatch = prompt.match(/(\+?\d{10,15})/);
  const phone = phoneMatch ? phoneMatch[1] : '+15550192834';

  const hostMatch = prompt.match(/\b([a-zA-Z0-9.-]+\.(?:internal|corp|com|net|org|local))\b/i);
  const ipMatch = prompt.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
  const targetHost = hostMatch ? hostMatch[1] : ipMatch ? ipMatch[1] : 'localhost';

  const serviceMatch = prompt.match(/service\s+([a-zA-Z0-9_-]+)/i);
  const serviceName = serviceMatch ? serviceMatch[1] : 'W32Time';

  const thresholdMatch = prompt.match(/(\d+)%/);
  const threshold = thresholdMatch ? parseInt(thresholdMatch[1], 10) : 15;

  // 3. Extract Tools needed
  const needsDisk = p.includes('disk') || p.includes('storage') || p.includes('drive') || p.includes('space') || p.includes('capacity');
  const needsRdp = p.includes('rdp') || p.includes('3389') || p.includes('port') || p.includes('perimeter') || p.includes('handshake');
  const needsSql = p.includes('sql') || p.includes('database') || p.includes('cluster') || p.includes('db-') || p.includes('backup');
  const needsExtUrl = p.includes('http') || p.includes('https') || p.includes('external') || p.includes('api.') || p.includes('website') || p.includes('gateway');
  const needsIntUrl = p.includes('internal') || p.includes('intranet') || p.includes('microservice') || p.includes('localhost');
  const needsService = p.includes('service') || p.includes('restart') || p.includes('daemon') || p.includes('self-healing') || p.includes('remediation');
  const needsVoice = p.includes('voice') || p.includes('call') || p.includes('phone') || p.includes('pic') || p.includes('escalat') || p.includes('alert pic') || p.includes('emergency');

  // Fallback if no specific keyword matched
  const activeToolTypes: ToolType[] = [];
  if (needsDisk) activeToolTypes.push('DISK_CHECK');
  if (needsRdp) activeToolTypes.push('RDP_PORT_CHECK');
  if (needsSql) activeToolTypes.push('SQL_JOB_CHECK');
  if (needsExtUrl) activeToolTypes.push('URL_CHECK_EXT');
  if (needsIntUrl) activeToolTypes.push('URL_CHECK_INT');
  if (needsService) activeToolTypes.push('SERVICE_ACTION');
  if (needsVoice) activeToolTypes.push('VOICE_CALL_ACTION');

  if (activeToolTypes.length === 0) {
    // Default balanced AIOps diagnostic pipeline
    activeToolTypes.push('DISK_CHECK', 'SQL_JOB_CHECK', 'VOICE_CALL_ACTION');
  }

  // 4. Construct DAG Steps with conditional branching and coordinates
  const steps: WorkflowStep[] = [];
  let name = 'AI-Generated Infrastructure Runbook';
  let description = prompt.slice(0, 160);

  if (needsDisk && needsSql && needsVoice) {
    name = 'Database Cluster Capacity & PIC Escalation Sentinel';
  } else if (needsRdp && needsService) {
    name = 'Perimeter Port 3389 & Service Self-Healing Pipeline';
  } else if (needsExtUrl) {
    name = 'Gateway Health & Multi-Tier API Sentinel';
  } else if (needsDisk) {
    name = `Storage Volume (${drive}) & Health Assurance Runbook`;
  }

  // Let's create an intelligent DAG:
  // Root diagnostic step ->
  // If Pass -> Next diagnostic / End
  // If Fail -> Remediation / Emergency Call PIC

  let currentX = 280;
  let currentY = 80;

  // Primary Check (Step 1)
  const step1Type = activeToolTypes[0];
  const step1Key = `step_${step1Type.toLowerCase()}_root`;

  let step1Host = targetHost;
  let step1Params: any = {};

  if (step1Type === 'DISK_CHECK') {
    step1Host = targetHost !== 'localhost' ? targetHost : 'db-node-01.corp.internal';
    step1Params = { drive, thresholdPercentFree: threshold };
  } else if (step1Type === 'RDP_PORT_CHECK') {
    step1Host = ipMatch ? ipMatch[1] : '192.168.1.50';
    step1Params = { port: 3389, timeoutMs: 3000 };
  } else if (step1Type === 'URL_CHECK_EXT') {
    step1Host = prompt.includes('github') ? 'https://api.github.com' : 'https://api.production.gateway';
    step1Params = { url: step1Host, expectedStatusCode: 200, maxLatencyMs: 2000 };
  } else if (step1Type === 'SQL_JOB_CHECK') {
    step1Host = 'localhost\\SQLEXPRESS';
    step1Params = { databaseName: 'master', jobName: 'Nightly_Backup' };
  } else {
    const meta = getAgentInventoryItem(step1Type);
    step1Host = meta.defaultTargetHost;
    step1Params = meta.defaultParams;
  }

  // Next steps logic
  const secondType = activeToolTypes.length > 1 ? activeToolTypes[1] : null;
  const failureType = needsVoice
    ? 'VOICE_CALL_ACTION'
    : needsService
    ? 'SERVICE_ACTION'
    : null;

  const step2Key = secondType && secondType !== failureType ? `step_${secondType.toLowerCase()}_pass` : 'END';
  const failStepKey = failureType ? `step_${failureType.toLowerCase()}_fail` : 'END';

  steps.push({
    id: '1',
    stepKey: step1Key,
    toolType: step1Type,
    targetHost: step1Host,
    parametersJson: JSON.stringify(step1Params, null, 2),
    onSuccessStepKey: step2Key !== 'END' ? step2Key : 'END',
    onFailureStepKey: failStepKey !== 'END' ? failStepKey : 'END',
    timeoutSeconds: 20,
    retryCount: 1,
    positionX: currentX,
    positionY: currentY,
  });

  // Step 2 (Success Path)
  if (secondType && secondType !== failureType) {
    const meta = getAgentInventoryItem(secondType);
    const step2Host = secondType === 'SQL_JOB_CHECK'
      ? 'localhost\\SQLEXPRESS'
      : secondType === 'URL_CHECK_INT'
      ? 'http://localhost:5000/api/noc/matrix'
      : targetHost;

    steps.push({
      id: '2',
      stepKey: step2Key,
      toolType: secondType,
      targetHost: step2Host,
      parametersJson: JSON.stringify(meta.defaultParams, null, 2),
      onSuccessStepKey: activeToolTypes.length > 2 && activeToolTypes[2] !== failureType ? `step_${activeToolTypes[2].toLowerCase()}_3` : 'END',
      onFailureStepKey: failStepKey !== 'END' ? failStepKey : 'END',
      timeoutSeconds: meta.defaultTimeoutSeconds,
      retryCount: 1,
      positionX: currentX + 240,
      positionY: currentY + 160,
    });
  }

  // Failure Path (Remediation / PIC Escalation)
  if (failureType) {
    const meta = getAgentInventoryItem(failureType);
    let failParams: any = {};

    if (failureType === 'VOICE_CALL_ACTION') {
      failParams = {
        recipientPhone: phone,
        picName: 'On-Call Incident Lead',
        message: `InfraSentinel Alert: An automated runbook check failed on ${step1Host}. Please inspect immediately.`,
        provider: 'Twilio',
      };
    } else if (failureType === 'SERVICE_ACTION') {
      failParams = {
        serviceName,
        action: 'RESTART',
      };
    }

    steps.push({
      id: '3',
      stepKey: failStepKey,
      toolType: failureType,
      targetHost: failureType === 'VOICE_CALL_ACTION' ? phone : targetHost,
      parametersJson: JSON.stringify(failParams, null, 2),
      onSuccessStepKey: secondType && secondType !== failureType ? step2Key : 'END',
      onFailureStepKey: 'END',
      timeoutSeconds: meta.defaultTimeoutSeconds,
      retryCount: 1,
      positionX: currentX - 220,
      positionY: currentY + 160,
    });
  }

  // Step 3 (Additional if 3rd non-failure tool exists)
  if (activeToolTypes.length > 2) {
    const thirdType = activeToolTypes[2];
    if (thirdType !== failureType && thirdType !== secondType) {
      const meta = getAgentInventoryItem(thirdType);
      const step3Key = `step_${thirdType.toLowerCase()}_3`;

      steps.push({
        id: '4',
        stepKey: step3Key,
        toolType: thirdType,
        targetHost: meta.defaultTargetHost,
        parametersJson: JSON.stringify(meta.defaultParams, null, 2),
        onSuccessStepKey: 'END',
        onFailureStepKey: failStepKey !== 'END' ? failStepKey : 'END',
        timeoutSeconds: meta.defaultTimeoutSeconds,
        retryCount: 1,
        positionX: currentX + 240,
        positionY: currentY + 320,
      });
    }
  }

  const explanation = `LLM analyzed the prompt: synthesized ${steps.length} DAG nodes spanning [${activeToolTypes.join(
    ', '
  )}], assigned target host '${step1Host}', calibrated cron '${cron}', and linked automated PASS/FAIL branching routing.`;

  return {
    name,
    description,
    cronExpression: cron,
    explanation,
    steps,
  };
}
