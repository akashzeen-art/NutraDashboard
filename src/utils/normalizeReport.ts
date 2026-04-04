import type { HourBucket, ProductReport } from '../types';

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function normalizeHourBucket(raw: Record<string, unknown>): HourBucket | null {
  const hourTime = str(raw.hourTime ?? raw.hour_time ?? raw.time ?? raw.slot ?? raw.bucket);
  if (!hourTime) return null;
  return {
    hourTime,
    clicks: num(raw.clicks),
    initiatedCount: num(raw.initiatedCount ?? raw.initiated_count),
    failureCount: num(raw.failureCount ?? raw.failure_count),
    successCount: num(raw.successCount ?? raw.success_count),
    dropOffCount: num(raw.dropOffCount ?? raw.dropoff_count ?? raw.drop_off_count),
    dropoffCount: num(raw.dropoffCount),
    dropOff: num(raw.dropOff ?? raw.drop_off),
    drop_off: num(raw.drop_off),
  };
}

/**
 * Map one API row to ProductReport so DSP, pub id, domain, price, hours, and user match dashboard expectations.
 */
export function normalizeProductReport(raw: unknown): ProductReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const productId = num(r.productId ?? r.product_id);
  if (productId == null) return null;

  const hoursIn = r.hours ?? r.hourList ?? r.buckets ?? r.hourly ?? r.hourlyBuckets;
  const hours: HourBucket[] = [];
  if (Array.isArray(hoursIn)) {
    for (const item of hoursIn) {
      if (!item || typeof item !== 'object') continue;
      const b = normalizeHourBucket(item as Record<string, unknown>);
      if (b) hours.push(b);
    }
  }

  const user = r.user;
  const userObj =
    user && typeof user === 'object'
      ? (user as NonNullable<ProductReport['user']>)
      : undefined;

  return {
    productId,
    productName: str(r.productName ?? r.product_name) ?? '',
    date: str(r.date),
    dsp: str(r.dsp),
    domain: str(r.domain ?? r.siteDomain ?? r.site_domain),
    link: str(r.link ?? r.url),
    pubId: str(
      r.pubId ??
        r.pub_id ??
        r.publisherId ??
        r.publisher_id ??
        r.pubID ??
        r.PubId
    ),
    pub_id: str(r.pub_id),
    user: userObj,
    hours: hours.length ? hours : undefined,
    price: str(r.price),
  };
}

export function normalizeReportArray(data: unknown): ProductReport[] {
  if (!Array.isArray(data)) return [];
  const out: ProductReport[] = [];
  for (const item of data) {
    const row = normalizeProductReport(item);
    if (row) out.push(row);
  }
  return out;
}
