import type { Hourly24 } from '../types';
import { HOUR_INDEX_LABELS } from './hourSplit';

export type AnalyticsTableRow = {
  label: string;
  total: string;
  cells: string[];
};

const METRIC_LABELS = [
  'Clicks',
  'Entry (Mobile No)',
  'Payment Initiated',
  'Payment Failed',
  'Success',
] as const;

function emptyRows(showHourCells: boolean): AnalyticsTableRow[] {
  const cells = showHourCells ? HOUR_INDEX_LABELS.map(() => '-') : [];
  return METRIC_LABELS.map((label) => ({ label, total: '-', cells: [...cells] }));
}

export function buildRowsFromHourly24(
  hourly: Hourly24 | null,
  showHourlyColumns: boolean
): AnalyticsTableRow[] {
  if (!hourly) {
    return emptyRows(showHourlyColumns);
  }

  const series: number[][] = [
    hourly.clicks,
    hourly.entry,
    hourly.initiated,
    hourly.failed,
    hourly.success,
  ];

  return METRIC_LABELS.map((label, idx) => {
    const arr = series[idx]!;
    const total = arr.reduce((a, b) => a + b, 0);
    const cells = showHourlyColumns ? arr.map((v) => String(v)) : [];
    return { label, total: String(total), cells };
  });
}

export { HOUR_INDEX_LABELS };
