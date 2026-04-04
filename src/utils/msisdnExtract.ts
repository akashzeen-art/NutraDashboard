/** Normalize msisdnList entries to plain strings for counting / hourly entry length. */
export function msisdnStringsFromList(list: unknown[] | undefined): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      const x = item.trim();
      if (x) out.push(x);
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const m = String(o.msisdn ?? o.mobile ?? o.phone ?? '').trim();
      if (m) out.push(m);
    }
  }
  return out;
}
