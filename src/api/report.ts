import { API_CONFIG } from '../config';
import type { ProductReport } from '../types';
import { normalizeReportArray } from '../utils/normalizeReport';

export async function fetchBucketWiseReport(date: string): Promise<ProductReport[]> {
  const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoint}?date=${encodeURIComponent(date)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  const data: unknown = await response.json();
  return normalizeReportArray(data);
}
