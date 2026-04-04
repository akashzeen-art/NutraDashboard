/** PlayTonight bucket-wise report path; override with `VITE_API_REPORT_ENDPOINT` if your API differs. */
const DEFAULT_REPORT_ENDPOINT = '/api/payment/report/bucket-wise';

/**
 * API origin:
 * - Set `VITE_API_BASE_URL` (e.g. https://pu.playtonight.fun) for direct browser calls (needs CORS).
 * - Leave it unset to use the current site origin — use with Netlify/Vite `/api/*` proxy to pu.playtonight.fun.
 *
 * Path: `VITE_API_REPORT_ENDPOINT` — defaults to `/api/payment/report/bucket-wise` when unset.
 */
function reportApiOrigin(): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, '') ?? '';
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function buildReportUrlForDate(date: string): string {
  const base = reportApiOrigin();
  const pathRaw =
    (import.meta.env.VITE_API_REPORT_ENDPOINT as string | undefined)?.trim() || DEFAULT_REPORT_ENDPOINT;
  const path = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
  if (!base) {
    throw new Error(
      'Report API origin is unknown. Set VITE_API_BASE_URL or open the app in a browser so the current origin can be used with a same-origin /api proxy.'
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
