/** Visible title on login and dashboard header — set in `.env` as `VITE_APP_TITLE`. */
export function appTitle(): string {
  const t = (import.meta.env.VITE_APP_TITLE as string | undefined)?.trim();
  return t || 'Dashboard';
}

/**
 * Max inclusive days per range. Set `VITE_DATE_RANGE_MAX_DAYS` in `.env`.
 * If unset or invalid, defaults to 31.
 */
export function dateRangeMaxDays(): number {
  const raw = import.meta.env.VITE_DATE_RANGE_MAX_DAYS;
  if (raw === undefined || raw === '') return 31;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 31;
  return Math.min(Math.floor(n), 366);
}

export const CONTACT_DETAILS_CONFIG = {
  urlTemplate: (import.meta.env.VITE_CONTACT_DETAILS_URL as string | undefined) ?? '',
} as const;
