/**
 * Build bucket-wise report URL from env:
 * - `VITE_API_BASE_URL` — origin only, no trailing slash (e.g. https://api.example.com)
 * - `VITE_API_REPORT_ENDPOINT` — path starting with / (e.g. /api/payment/report/bucket-wise)
 */
export function buildReportUrlForDate(date: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '') ?? '';
  const pathRaw = (import.meta.env.VITE_API_REPORT_ENDPOINT as string | undefined)?.trim() ?? '';
  const path = pathRaw.startsWith('/') ? pathRaw : pathRaw ? `/${pathRaw}` : '';

  if (!base || !path) {
    throw new Error(
      'Report API is not configured. Set VITE_API_BASE_URL and VITE_API_REPORT_ENDPOINT in your .env file.'
    );
  }

  const sep = path.includes('?') ? '&' : '?';
  return `${base}${path}${sep}date=${encodeURIComponent(date)}`;
}

export function authHeadersForReport(): HeadersInit {
  const token = sessionStorage.getItem('authToken');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
