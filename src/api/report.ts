import type { AnalyticsMetricLabels, ProductReport } from '../types';
import { authHeadersForReport, buildReportUrlForDate } from './reportUrl';
import { parseReportApiPayload } from '../utils/parseReportResponse';

export type BucketWiseReportFetchResult = {
  reports: ProductReport[];
  metricLabels?: AnalyticsMetricLabels;
};

export async function fetchBucketWiseReport(date: string): Promise<BucketWiseReportFetchResult> {
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
    const hint =
      response.status === 404
        ? ' If this URL is on your dashboard domain, /api may not be proxied (check Netlify redirects / public/_redirects). Or set VITE_API_BASE_URL=https://pu.playtonight.fun if the API allows CORS.'
        : '';
    throw new Error(`API error: ${response.status} ${response.statusText} — ${url}${hint}`);
  }
  const data: unknown = await response.json();
  return parseReportApiPayload(data);
}
