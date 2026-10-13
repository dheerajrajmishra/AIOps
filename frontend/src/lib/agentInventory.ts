import { ToolType } from '@/types';

export interface AssignedHost {
  hostname: string;
  ip: string;
  status: 'HEALTHY' | 'WARNING' | 'ONLINE';
  latency: string;
  lastCheckTime: string;
}

export interface AgentInventoryItem {
  toolType: ToolType;
  name: string;
  shortLabel: string;
  category: 'Diagnostics' | 'Security & Connectivity' | 'Database' | 'Network & Web' | 'Remediation' | 'Escalation';
  description: string;
  capabilities: string[];
  protocol: string;
  executionEngine: string;
  supportedPlatforms: string[];
  telemetryMetrics: string[];
  assignedHosts: AssignedHost[];
  defaultTargetHost: string;
  defaultParams: Record<string, any>;
  defaultTimeoutSeconds: number;
  defaultRetryCount: number;
  inventoryCount: number;
  inventoryStatus: 'Online' | 'Deployed' | 'Ready' | 'Standby';
  colorTheme: {
    text: string;
    bg: string;
    border: string;
    glow: string;
    badgeBg: string;
    iconContainer: string;
    pillBg: string;
  };
}

export const AGENT_INVENTORY: AgentInventoryItem[] = [
  {
    toolType: 'DISK_CHECK',
    name: 'Storage & Disk Capacity Agent',
    shortLabel: 'Disk Space Check',
    category: 'Diagnostics',
    description: 'Inspects local and SAN drive volumes for free capacity, total size, and filesystem health thresholds.',
    capabilities: [
      'Checks drive letters (C:, D:, E:)',
      'Warns when free space dips below threshold %',
      'Reports exact available GB and percentage',
      'Triggers immediate failure branch on low capacity',
      'Monitors volume mount point health and NTFS integrity',
    ],
    protocol: 'WMI / Windows Drive API',
    executionEngine: 'System.IO.DriveInfo & Win32_LogicalDisk WMI Provider',
    supportedPlatforms: ['Windows Server 2016/2019/2022', 'Windows 10/11 Pro', 'Azure VM', 'Hyper-V Host'],
    telemetryMetrics: [
      'Disk Free Space (%)',
      'Total Capacity (GB)',
      'Available Capacity (GB)',
      'Filesystem Format (NTFS/ReFS)',
    ],
    assignedHosts: [
      { hostname: 'SRV-DB-PROD-01', ip: '10.0.1.15', status: 'HEALTHY', latency: '4ms', lastCheckTime: '2 min ago' },
      { hostname: 'SRV-APP-PROD-01', ip: '10.0.1.20', status: 'HEALTHY', latency: '6ms', lastCheckTime: '3 min ago' },
      { hostname: 'SRV-BACKUP-01', ip: '10.0.3.50', status: 'WARNING', latency: '12ms', lastCheckTime: '1 min ago' },
      { hostname: 'SRV-FILESHARE-02', ip: '10.0.2.18', status: 'HEALTHY', latency: '8ms', lastCheckTime: '4 min ago' },
    ],
    defaultTargetHost: 'localhost',
    defaultParams: {
      drive: 'C:',
      thresholdPercentFree: 15,
    },
    defaultTimeoutSeconds: 15,
    defaultRetryCount: 1,
    inventoryCount: 14,
    inventoryStatus: 'Online',
    colorTheme: {
      text: 'text-cyan-700 dark:text-cyan-300',
      bg: 'bg-cyan-50 dark:bg-cyan-950/50',
      border: 'border-cyan-200 dark:border-cyan-500/30',
      glow: 'shadow-cyan-500/20',
      badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30',
      iconContainer: 'bg-cyan-100 text-cyan-700 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-600/50',
      pillBg: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300',
    },
  },
  {
    toolType: 'RDP_PORT_CHECK',
    name: 'Perimeter Port Handshake Agent',
    shortLabel: 'RDP Port 3389 Probe',
    category: 'Security & Connectivity',
    description: 'Executes rapid TCP socket handshakes to verify perimeter accessibility, network reachability, and port health.',
    capabilities: [
      'Validates TCP port 3389 / custom ports',
      'Measures socket connection latency (ms)',
      'Identifies firewall drops and socket timeouts',
      'Non-intrusive probe without payload intrusion',
      'Verifies TLS/NLA handshake responsiveness',
    ],
    protocol: 'TCP Handshake / Socket Probe',
    executionEngine: 'System.Net.Sockets.TcpClient (.NET 8 Async Socket)',
    supportedPlatforms: ['Windows Server 2012-2022', 'Linux Bastion', 'AWS EC2', 'Azure VNet'],
    telemetryMetrics: [
      'TCP Socket Latency (ms)',
      'Port Open/Closed State',
      'Firewall Response Code',
      'Handshake Success Flag',
    ],
    assignedHosts: [
      { hostname: 'GW-BASTION-01', ip: '10.0.0.5', status: 'HEALTHY', latency: '14ms', lastCheckTime: 'Just now' },
      { hostname: 'SRV-RDP-FARM-01', ip: '10.0.1.10', status: 'HEALTHY', latency: '11ms', lastCheckTime: '2 min ago' },
      { hostname: 'SRV-MGMT-02', ip: '10.0.0.12', status: 'HEALTHY', latency: '18ms', lastCheckTime: '5 min ago' },
    ],
    defaultTargetHost: '127.0.0.1',
    defaultParams: {
      port: 3389,
      timeoutMs: 3000,
    },
    defaultTimeoutSeconds: 10,
    defaultRetryCount: 2,
    inventoryCount: 8,
    inventoryStatus: 'Online',
    colorTheme: {
      text: 'text-indigo-700 dark:text-indigo-300',
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
      border: 'border-indigo-200 dark:border-indigo-500/30',
      glow: 'shadow-indigo-500/20',
      badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30',
      iconContainer: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-600/50',
      pillBg: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300',
    },
  },
  {
    toolType: 'SQL_JOB_CHECK',
    name: 'SQL Server Cluster Auditor Agent',
    shortLabel: 'SQL DB & Job Audit',
    category: 'Database',
    description: 'Audits Microsoft SQL Server engine status, database online availability, and SQL Agent maintenance job states.',
    capabilities: [
      'Direct connection via Dapper / SqlClient',
      'Queries sys.databases for operational state',
      'Audits MSDB SQL Agent scheduled jobs',
      'Catches replication lag and stalled backups',
      'Monitors database recovery status (ONLINE/RESTORING/SUSPECT)',
    ],
    protocol: 'T-SQL / TDS Protocol (Port 1433)',
    executionEngine: 'Microsoft.Data.SqlClient with Integrated/SQL Auth Pooling',
    supportedPlatforms: ['SQL Server 2016-2022', 'Azure SQL Managed Instance', 'SQL Server on Linux'],
    telemetryMetrics: [
      'Database State (ONLINE)',
      'SQL Agent Job Last Run Outcome',
      'Query Execution Duration (ms)',
      'Transaction Log Space Used (%)',
    ],
    assignedHosts: [
      { hostname: 'SQL-PROD-CLUSTER-A', ip: '10.0.1.100', status: 'HEALTHY', latency: '18ms', lastCheckTime: '1 min ago' },
      { hostname: 'SQL-PROD-CLUSTER-B', ip: '10.0.1.101', status: 'HEALTHY', latency: '19ms', lastCheckTime: '1 min ago' },
      { hostname: 'SQL-STAGING-01', ip: '10.0.2.100', status: 'HEALTHY', latency: '22ms', lastCheckTime: '6 min ago' },
    ],
    defaultTargetHost: 'localhost\\SQLEXPRESS',
    defaultParams: {
      databaseName: 'master',
      jobName: '',
      query: 'SELECT state_desc FROM sys.databases WHERE name = @databaseName',
    },
    defaultTimeoutSeconds: 20,
    defaultRetryCount: 1,
    inventoryCount: 6,
    inventoryStatus: 'Online',
    colorTheme: {
      text: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      border: 'border-amber-200 dark:border-amber-500/30',
      glow: 'shadow-amber-500/20',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
      iconContainer: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-600/50',
      pillBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
    },
  },
  {
    toolType: 'URL_CHECK_EXT',
    name: 'Public HTTPS Edge Probe Agent',
    shortLabel: 'External URL Probe',
    category: 'Network & Web',
    description: 'Probes external internet gateways and customer-facing API endpoints with TLS 1.3 verification and latency tracking.',
    capabilities: [
      'Validates HTTP status code (200-299)',
      'Calculates DNS lookup + TLS handshake time',
      'Checks SSL certificate expiration warnings',
      'Configurable custom headers and user-agents',
      'Detects CDN edge anomalies and cache misses',
    ],
    protocol: 'HTTPS / TLS 1.3 Probe',
    executionEngine: 'System.Net.Http.SocketsHttpHandler with pooled connection reuse',
    supportedPlatforms: ['Public Internet', 'Cloudflare CDN', 'AWS CloudFront', 'Azure Front Door'],
    telemetryMetrics: [
      'HTTP Response Status Code',
      'Round-Trip Latency (ms)',
      'TLS Handshake Duration (ms)',
      'SSL Certificate Days Remaining',
    ],
    assignedHosts: [
      { hostname: 'api.github.com', ip: '140.82.121.4', status: 'HEALTHY', latency: '42ms', lastCheckTime: 'Just now' },
      { hostname: 'portal.company.com', ip: '104.21.55.8', status: 'HEALTHY', latency: '28ms', lastCheckTime: '2 min ago' },
      { hostname: 'auth.company.com', ip: '104.21.55.9', status: 'HEALTHY', latency: '31ms', lastCheckTime: '2 min ago' },
    ],
    defaultTargetHost: 'https://api.github.com',
    defaultParams: {
      url: 'https://api.github.com',
      expectedStatusCode: 200,
      maxLatencyMs: 2000,
    },
    defaultTimeoutSeconds: 15,
    defaultRetryCount: 2,
    inventoryCount: 12,
    inventoryStatus: 'Online',
    colorTheme: {
      text: 'text-emerald-700 dark:text-emerald-300',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      glow: 'shadow-emerald-500/20',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
      iconContainer: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-600/50',
      pillBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
    },
  },
  {
    toolType: 'URL_CHECK_INT',
    name: 'Internal Gateway & Microservice Probe Agent',
    shortLabel: 'Internal URL Probe',
    category: 'Network & Web',
    description: 'Polls internal VPC / intranet endpoints, backend health checks, and microservice mesh endpoints.',
    capabilities: [
      'Probes intranet health URLs (/health, /metrics)',
      'Detects slow downstream services before SLA breach',
      'Supports private IP and corporate DNS resolution',
      'Parses JSON health response bodies',
    ],
    protocol: 'HTTP Private / LAN Mesh',
    executionEngine: 'System.Net.Http.HttpClient (Direct VPC/Intranet routing)',
    supportedPlatforms: ['Kubernetes Pods', 'Docker Swarm', 'Internal Windows IIS', 'Linux Nginx'],
    telemetryMetrics: [
      'Internal Service Status (Healthy/Degraded)',
      'Service Response Latency (ms)',
      'Health Check HTTP Code',
    ],
    assignedHosts: [
      { hostname: 'SRV-API-INT-01', ip: '10.0.1.30', status: 'HEALTHY', latency: '12ms', lastCheckTime: '1 min ago' },
      { hostname: 'SRV-PAYMENT-SVC', ip: '10.0.1.35', status: 'HEALTHY', latency: '16ms', lastCheckTime: '3 min ago' },
      { hostname: 'SRV-AUTH-INT-01', ip: '10.0.1.32', status: 'HEALTHY', latency: '9ms', lastCheckTime: '2 min ago' },
    ],
    defaultTargetHost: 'http://localhost:5000/api/noc/matrix',
    defaultParams: {
      url: 'http://localhost:5000/api/noc/matrix',
      expectedStatusCode: 200,
      maxLatencyMs: 1000,
    },
    defaultTimeoutSeconds: 10,
    defaultRetryCount: 2,
    inventoryCount: 9,
    inventoryStatus: 'Online',
    colorTheme: {
      text: 'text-teal-700 dark:text-teal-300',
      bg: 'bg-teal-50 dark:bg-teal-950/50',
      border: 'border-teal-200 dark:border-teal-500/30',
      glow: 'shadow-teal-500/20',
      badgeBg: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30',
      iconContainer: 'bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-600/50',
      pillBg: 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300',
    },
  },
  {
    toolType: 'SERVICE_ACTION',
    name: 'Windows Service Remediation Agent',
    shortLabel: 'Windows Service Control',
    category: 'Remediation',
    description: 'Directly manages Windows Service controller to inspect states, restart halted daemon processes, or trigger self-healing.',
    capabilities: [
      'Inspects service status (Running, Stopped, Paused)',
      'Issues Start, Stop, or Restart commands',
      'Waits for clean service lifecycle confirmation',
      'Executes autonomous self-healing remediation',
      'Logs Service Control Manager error codes',
    ],
    protocol: 'Win32 Service Controller (SCM)',
    executionEngine: 'System.ServiceProcess.ServiceController API via Advapi32.dll',
    supportedPlatforms: ['Windows Server 2012-2022', 'Windows 10/11 Workstations'],
    telemetryMetrics: [
      'Service State (Running/Stopped)',
      'Service Startup Type',
      'Action Execution Duration (ms)',
      'Restart Attempt Counter',
    ],
    assignedHosts: [
      { hostname: 'SRV-APP-PROD-01', ip: '10.0.1.20', status: 'HEALTHY', latency: '8ms', lastCheckTime: '2 min ago' },
      { hostname: 'SRV-APP-PROD-02', ip: '10.0.1.21', status: 'HEALTHY', latency: '7ms', lastCheckTime: '1 min ago' },
      { hostname: 'SRV-INTEG-01', ip: '10.0.1.45', status: 'HEALTHY', latency: '14ms', lastCheckTime: '4 min ago' },
    ],
    defaultTargetHost: 'localhost',
    defaultParams: {
      serviceName: 'W32Time',
      action: 'STATUS',
    },
    defaultTimeoutSeconds: 30,
    defaultRetryCount: 1,
    inventoryCount: 14,
    inventoryStatus: 'Online',
    colorTheme: {
      text: 'text-purple-700 dark:text-purple-300',
      bg: 'bg-purple-50 dark:bg-purple-950/50',
      border: 'border-purple-200 dark:border-purple-500/30',
      glow: 'shadow-purple-500/20',
      badgeBg: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30',
      iconContainer: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-600/50',
      pillBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300',
    },
  },
  {
    toolType: 'VOICE_CALL_ACTION',
    name: 'Telephony Voice Alert (PIC Escalation) Agent',
    shortLabel: 'PIC Voice Call Alert',
    category: 'Escalation',
    description: 'Places real-time automated voice telephone calls to designated Person-In-Charge (PIC) engineers when critical checks fail.',
    capabilities: [
      'Dispatches high-urgency telephone calls',
      'Speaks custom synthesized incident message via TTS',
      'Bypasses silent phone modes to wake up on-call PIC',
      'Logs Twilio call SID and pickup confirmation status',
      'Records call duration and response acknowledgment',
    ],
    protocol: 'Twilio REST API / SIP Telephony',
    executionEngine: 'Twilio C# SDK / Twilio Voice VoiceResponse TwiML',
    supportedPlatforms: ['Global PSTN Telephony', 'Cellular Mobile Networks', 'Twilio Voice Infrastructure'],
    telemetryMetrics: [
      'Twilio Call SID',
      'Call Dispatch Status (queued/ringing/completed)',
      'PIC Pickup Latency (sec)',
      'Speech Synthesis Duration',
    ],
    assignedHosts: [
      { hostname: 'TWILIO-US-EAST', ip: '54.244.51.0', status: 'HEALTHY', latency: '48ms', lastCheckTime: 'Just now' },
      { hostname: 'TWILIO-EU-WEST', ip: '54.171.127.0', status: 'HEALTHY', latency: '62ms', lastCheckTime: '4 min ago' },
    ],
    defaultTargetHost: '+15550192834',
    defaultParams: {
      recipientPhone: '+15550192834',
      picName: 'Lead On-Call SRE',
      message: 'Critical alert: InfraSentinel detected automated runbook failure on database cluster.',
      provider: 'Twilio',
    },
    defaultTimeoutSeconds: 45,
    defaultRetryCount: 1,
    inventoryCount: 4,
    inventoryStatus: 'Ready',
    colorTheme: {
      text: 'text-rose-700 dark:text-rose-300',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
      border: 'border-rose-200 dark:border-rose-500/30',
      glow: 'shadow-rose-500/20',
      badgeBg: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
      iconContainer: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-600/50',
      pillBg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300',
    },
  },
];

export function getAgentInventoryItem(toolType: ToolType): AgentInventoryItem {
  return (
    AGENT_INVENTORY.find((item) => item.toolType === toolType) || {
      toolType,
      name: 'Custom Agent Tool',
      shortLabel: 'Custom Tool',
      category: 'Diagnostics',
      description: 'Custom automated runbook executor agent.',
      capabilities: ['Standard diagnostic execution'],
      protocol: 'Generic Protocol',
      executionEngine: 'Default Agent Driver',
      supportedPlatforms: ['Generic Platform'],
      telemetryMetrics: ['Execution Duration (ms)'],
      assignedHosts: [{ hostname: 'localhost', ip: '127.0.0.1', status: 'HEALTHY', latency: '1ms', lastCheckTime: 'Now' }],
      defaultTargetHost: 'localhost',
      defaultParams: {},
      defaultTimeoutSeconds: 30,
      defaultRetryCount: 1,
      inventoryCount: 1,
      inventoryStatus: 'Standby',
      colorTheme: {
        text: 'text-slate-700 dark:text-slate-300',
        bg: 'bg-slate-100 dark:bg-slate-900',
        border: 'border-slate-300 dark:border-slate-800',
        glow: 'shadow-slate-800',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        iconContainer: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        pillBg: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300',
      },
    }
  );
}
