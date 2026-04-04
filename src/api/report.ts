import type { ProductReport } from '../types';
import { authHeadersForReport, buildReportUrlForDate } from './reportUrl';
import { normalizeReportArray } from '../utils/normalizeReport';

export async function fetchBucketWiseReport(date: string): Promise<ProductReport[]> {
  const url = buildReportUrlForDate(date);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeadersForReport(),
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const data: unknown = await response.json();
  return normalizeReportArray(data);
}
