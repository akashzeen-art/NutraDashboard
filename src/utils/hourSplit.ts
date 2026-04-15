import type { HourBucket, Hourly24 } from '../types';

export const HOUR_INDEX_LABELS = Array.from({ length: 24 }, (_, i) => `${i}-${i + 1}`);

/** Even integer split: remainder distributed to earliest buckets. */
export function distributeEvenInt(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const t = Math.max(0, Math.round(total));
  const base = Math.floor(t / parts);
  let rem = t - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
}

/**
 * Map API `hourTime` to hour indices 0..23.
 * Supports "12:00-16:00", "12:00–16:00", "12-16", "0-1", etc.
 */
export function parseHourTimeToIndices(hourTime: string): number[] {
  const s = hourTime.trim();
  const reClock = /^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/;
  const m = s.match(reClock);
  if (m) {
    const h0 = parseInt(m[1]!, 10);
    const min0 = parseInt(m[2]!, 10);
    const h1 = parseInt(m[3]!, 10);
    const min1 = parseInt(m[4]!, 10);
    const startMin = h0 * 60 + min0;
    const endMin = h1 * 60 + min1;
    const indices: number[] = [];
    for (let t = startMin; t < endMin; t += 60) {
      const hi = Math.floor(t / 60);
      if (hi >= 0 && hi < 24) indices.push(hi);
    }
    return indices;
  }

  const reHr = /^(\d{1,2})\s*[-–]\s*(\d{1,2})$/;
  const m2 = s.match(reHr);
  if (m2) {
    let a = parseInt(m2[1]!, 10);
    let b = parseInt(m2[2]!, 10);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const indices: number[] = [];
    for (let h = lo; h < hi && h < 24; h++) {
      if (h >= 0) indices.push(h);
    }
    return indices;
  }

  return [];
}

function emptyHourlyArrays(): Omit<Hourly24, 'entry'> & { entry: number[] } {
  const z = () => Array(24).fill(0) as number[];
  return { clicks: z(), entry: z(), initiated: z(), failed: z(), success: z() };
}

function addBucketToAcc(acc: ReturnType<typeof emptyHourlyArrays>, bucket: HourBucket): void {
  const indices = parseHourTimeToIndices(bucket.hourTime);
  if (!indices.length) return;

  const n = indices.length;
  const clicks = distributeEvenInt(Number(bucket.clicks ?? 0), n);
  const initiated = distributeEvenInt(Number(bucket.initiatedCount ?? 0), n);
  const failed = distributeEvenInt(Number(bucket.failureCount ?? 0), n);
  const success = distributeEvenInt(Number(bucket.successCount ?? 0), n);

  indices.forEach((h, i) => {
    acc.clicks[h] += clicks[i] ?? 0;
    acc.initiated[h] += initiated[i] ?? 0;
    acc.failed[h] += failed[i] ?? 0;
    acc.success[h] += success[i] ?? 0;
  });
}

/** Ensure each metric array sums exactly to the raw API total across all buckets. */
function reconcileMetricTotals(
  acc: ReturnType<typeof emptyHourlyArrays>,
  buckets: HourBucket[]
): void {
  const apiClicks = buckets.reduce((s, b) => s + Number(b.clicks ?? 0), 0);
  const apiInitiated = buckets.reduce((s, b) => s + Number(b.initiatedCount ?? 0), 0);
  const apiFailed = buckets.reduce((s, b) => s + Number(b.failureCount ?? 0), 0);
  const apiSuccess = buckets.reduce((s, b) => s + Number(b.successCount ?? 0), 0);
  fixSumToTarget(acc.clicks, apiClicks);
  fixSumToTarget(acc.initiated, apiInitiated);
  fixSumToTarget(acc.failed, apiFailed);
  fixSumToTarget(acc.success, apiSuccess);
}

/** Fix rounding so entry sums to target. */
function fixSumToTarget(arr: number[], target: number): void {
  let s = arr.reduce((a, b) => a + b, 0);
  let d = target - s;
  let i = 23;
  while (d !== 0 && i >= 0) {
    const add = d > 0 ? 1 : arr[i] > 0 ? -1 : 0;
    if (add === 0) {
      i--;
      continue;
    }
    arr[i] += add;
    d -= add;
  }
}

/**
 * Build 24×1h metrics from API buckets. Entry row = msisdn count spread by click share, else even.
 */
export function bucketsToHourly24(buckets: HourBucket[], msisdnCount: number): Hourly24 {
  const acc = emptyHourlyArrays();
  for (const b of buckets) {
    addBucketToAcc(acc, b);
  }
  reconcileMetricTotals(acc, buckets);

  const totalC = acc.clicks.reduce((a, b) => a + b, 0);
  const n = Math.max(0, Math.round(msisdnCount));

  if (totalC > 0 && n > 0) {
    const raw = acc.clicks.map((c) => (n * c) / totalC);
    acc.entry = raw.map((x) => Math.floor(x));
    fixSumToTarget(acc.entry, n);
  } else {
    acc.entry = distributeEvenInt(n, 24);
  }

  return acc;
}
