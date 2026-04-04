import type { AnalyticsMetricLabels, Hourly24 } from '../types';
import { HOUR_INDEX_LABELS } from './hourSplit';

export type AnalyticsTableRow = {
  label: string;
  total: string;
  cells: string[];
};

const DEFAULT_METRIC_LABELS: Record<
  keyof Pick<Hourly24, 'clicks' | 'entry' | 'initiated' | 'failed' | 'success'>,
  string
> = {
  clicks: 'Clicks',
  entry: 'Entry (Mobile No)',
  initiated: 'Payment Initiated',
  failed: 'Payment Failed',
  success: 'Success',
};

const METRIC_ORDER = ['clicks', 'entry', 'initiated', 'failed', 'success'] as const;

function resolvedMetricLabels(overrides?: AnalyticsMetricLabels): string[] {
  return METRIC_ORDER.map((key) => overrides?.[key] ?? DEFAULT_METRIC_LABELS[key]);
}

function emptyRows(showHourCells: boolean, labels?: AnalyticsMetricLabels): AnalyticsTableRow[] {
  const cells = showHourCells ? HOUR_INDEX_LABELS.map(() => '-') : [];
  const metricLabels = resolvedMetricLabels(labels);
  return metricLabels.map((label) => ({ label, total: '-', cells: [...cells] }));
}

export function buildRowsFromHourly24(
  hourly: Hourly24 | null,
  showHourlyColumns: boolean,
  metricLabels?: AnalyticsMetricLabels
): AnalyticsTableRow[] {
  if (!hourly) {
    return emptyRows(showHourlyColumns, metricLabels);
  }

  const series: number[][] = [
    hourly.clicks,
    hourly.entry,
    hourly.initiated,
    hourly.failed,
    hourly.success,
  ];

  const labels = resolvedMetricLabels(metricLabels);

  return labels.map((label, idx) => {
    const arr = series[idx]!;
    const total = arr.reduce((a, b) => a + b, 0);
    const cells = showHourlyColumns ? arr.map((v) => String(v)) : [];
    return { label, total: String(total), cells };
  });
}

export { HOUR_INDEX_LABELS };
