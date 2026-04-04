import type { AnalyticsMetricLabels, ProductReport } from '../types';
import { normalizeReportArray } from './normalizeReport';

function readLabel(block: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = block[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function extractMetricLabels(root: Record<string, unknown>): AnalyticsMetricLabels | undefined {
  const raw = root.metricLabels ?? root.metric_labels;
  if (!raw || typeof raw !== 'object') return undefined;
  const b = raw as Record<string, unknown>;
  const out: AnalyticsMetricLabels = {};
  const clicks = readLabel(b, 'clicks', 'Clicks');
  if (clicks) out.clicks = clicks;
  const entry = readLabel(
    b,
    'entry',
    'entryMobile',
    'entry_mobile',
    'entryLabel',
    'mobileEntry',
    'mobile_entry'
  );
  if (entry) out.entry = entry;
  const initiated = readLabel(
    b,
    'initiated',
    'paymentInitiated',
    'payment_initiated',
    'initiatedCountLabel'
  );
  if (initiated) out.initiated = initiated;
  const failed = readLabel(b, 'failed', 'failure', 'paymentFailed', 'payment_failed');
  if (failed) out.failed = failed;
  const success = readLabel(b, 'success', 'paymentSuccess', 'payment_success');
  if (success) out.success = success;
  return Object.keys(out).length ? out : undefined;
}

/**
 * Accepts a raw JSON array of reports, or an object envelope such as:
 * `{ "data": [...], "metricLabels": { "entry": "Entry (Mobile No)", ... } }`
 */
export function parseReportApiPayload(raw: unknown): {
  reports: ProductReport[];
  metricLabels?: AnalyticsMetricLabels;
} {
  if (Array.isArray(raw)) {
    return { reports: normalizeReportArray(raw) };
  }
  if (!raw || typeof raw !== 'object') {
    return { reports: [] };
  }
  const o = raw as Record<string, unknown>;
  const arr = o.data ?? o.reports ?? o.rows ?? o.result ?? o.items ?? o.list;
  const reports = Array.isArray(arr) ? normalizeReportArray(arr) : [];
  const metricLabels = extractMetricLabels(o);
  return { reports, metricLabels };
}
