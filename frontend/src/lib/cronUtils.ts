export interface CronPreset {
  label: string;
  expression: string;
  description: string;
  badge?: string;
}

export const CRON_PRESETS: CronPreset[] = [
  {
    label: 'Every 5 Minutes',
    expression: '*/5 * * * *',
    description: 'High-frequency mission-critical health checks',
    badge: 'Real-time',
  },
  {
    label: 'Every 15 Minutes',
    expression: '*/15 * * * *',
    description: 'Regular telemetry and gateway heartbeat',
  },
  {
    label: 'Hourly',
    expression: '0 * * * *',
    description: 'Hourly infrastructure & database sweep',
  },
  {
    label: 'Every 4 Hours',
    expression: '0 */4 * * *',
    description: 'Perimeter inspection and gateway audits',
    badge: 'Popular',
  },
  {
    label: 'Daily at 02:00 UTC',
    expression: '0 2 * * *',
    description: 'Nightly deep diagnostics and cleanup runbook',
    badge: 'Standard',
  },
  {
    label: 'Daily at Midnight UTC',
    expression: '0 0 * * *',
    description: 'Midnight comprehensive audit cycle',
  },
  {
    label: 'Weekly (Sunday 00:00 UTC)',
    expression: '0 0 * * 0',
    description: 'Weekly deep storage & archive checks',
  },
];

export function formatCronSchedule(cron?: string | null): string {
  if (!cron || cron.trim() === '') return 'Manual trigger only (No schedule)';

  const normalized = cron.trim();

  // Preset quick matches
  switch (normalized) {
    case '*/5 * * * *':
      return 'Every 5 minutes';
    case '*/15 * * * *':
      return 'Every 15 minutes';
    case '*/30 * * * *':
      return 'Every 30 minutes';
    case '0 * * * *':
      return 'Every hour at :00';
    case '0 */2 * * *':
      return 'Every 2 hours';
    case '0 */4 * * *':
      return 'Every 4 hours';
    case '0 */6 * * *':
      return 'Every 6 hours';
    case '0 */12 * * *':
      return 'Every 12 hours';
    case '0 2 * * *':
      return 'Daily at 02:00 AM UTC';
    case '30 3 * * *':
      return 'Daily at 03:30 AM UTC';
    case '0 0 * * *':
      return 'Daily at Midnight (00:00 UTC)';
    case '0 0 * * 0':
      return 'Weekly on Sunday at 00:00 UTC';
    case '0 0 * * 1-5':
      return 'Weekdays (Mon-Fri) at 00:00 UTC';
    default:
      break;
  }

  // Parse 5-token cron (minute hour dom month dow)
  const parts = normalized.split(/\s+/);
  if (parts.length === 5) {
    const [min, hour, dom, month, dow] = parts;
    if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
      return `Every ${min.replace('*/', '')} minutes`;
    }
    if (min === '0' && hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
      return `Every ${hour.replace('*/', '')} hours`;
    }
    if (!isNaN(Number(min)) && !isNaN(Number(hour)) && dom === '*' && month === '*' && dow === '*') {
      const paddedHour = hour.padStart(2, '0');
      const paddedMin = min.padStart(2, '0');
      return `Daily at ${paddedHour}:${paddedMin} UTC`;
    }
  }

  return `Custom Schedule (${normalized})`;
}

export function validateCronExpression(cron: string): { isValid: boolean; error?: string } {
  if (!cron || cron.trim() === '') {
    return { isValid: false, error: 'Cron expression cannot be empty' };
  }
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) {
    return { isValid: false, error: 'Cron must have 5 fields: minute hour day month day-of-week' };
  }
  return { isValid: true };
}
