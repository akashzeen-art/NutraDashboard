import type { HourBucket, ProductReport } from '../types';
import { msisdnStringsFromList } from './msisdnExtract';

function norm(s: string | undefined): string {
  return (s ?? '').trim();
}

export function groupKeyForRow(r: ProductReport): string {
  const domain = norm(r.domain || r.link);
  const dsp = norm(r.dsp).toLowerCase();
  const name = norm(r.productName).toLowerCase();
  const pid = r.productId;
  return `${pid}|${name}|${dsp}|${domain}`;
}

/** Merge buckets that share the same hourTime string by summing metrics. */
function mergeHours(buckets: HourBucket[]): HourBucket[] {
  const map = new Map<string, HourBucket>();
  for (const b of buckets) {
    const k = b.hourTime.trim();
    if (!k) continue;
    const ex = map.get(k);
    if (!ex) {
      map.set(k, {
        hourTime: k,
        clicks: Number(b.clicks ?? 0),
        initiatedCount: Number(b.initiatedCount ?? 0),
        failureCount: Number(b.failureCount ?? 0),
        successCount: Number(b.successCount ?? 0),
      });
    } else {
      ex.clicks = Number(ex.clicks ?? 0) + Number(b.clicks ?? 0);
      ex.initiatedCount = Number(ex.initiatedCount ?? 0) + Number(b.initiatedCount ?? 0);
      ex.failureCount = Number(ex.failureCount ?? 0) + Number(b.failureCount ?? 0);
      ex.successCount = Number(ex.successCount ?? 0) + Number(b.successCount ?? 0);
    }
  }
  return [...map.values()];
}

function mergeMsisdnLists(a: unknown[] | undefined, b: unknown[] | undefined): string[] {
  const set = new Set<string>();
  for (const x of msisdnStringsFromList(a)) set.add(x);
  for (const x of msisdnStringsFromList(b)) set.add(x);
  return [...set];
}

/** Merge raw API rows for the same product + dsp + domain (same day or after concat). */
export function mergeProductRows(rows: ProductReport[]): ProductReport[] {
  const map = new Map<string, ProductReport>();
  for (const r of rows) {
    const k = groupKeyForRow(r);
    const ex = map.get(k);
    if (!ex) {
      map.set(k, {
        ...r,
        user: { msisdnList: msisdnStringsFromList(r.user?.msisdnList as unknown[]) },
        hours: [...(r.hours || [])],
      });
    } else {
      ex.hours = mergeHours([...(ex.hours || []), ...(r.hours || [])]);
      ex.user = {
        msisdnList: mergeMsisdnLists(ex.user?.msisdnList as unknown[], r.user?.msisdnList as unknown[]),
      };
    }
  }
  return [...map.values()];
}
