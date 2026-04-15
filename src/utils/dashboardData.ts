import type { ContactRow, DspAnalyticsBlock, ProductReport } from '../types';
import { collectContactsFromReports } from './contactMerge';
import { bucketsToHourly24 } from './hourSplit';
import { groupKeyForRow, mergeProductRows } from './groupReports';
import { msisdnStringsFromList } from './msisdnExtract';
import { productNameMatchesHints } from './matchProduct';
import type { DashboardProductTabId } from '../config';
import { DASHBOARD_PRODUCT_TABS } from '../config';

export type DashboardFilters = {
  dspPreset: string;
  pubIdQuery: string;
};

/** Map raw API dsp value to a human-readable dashboard label. */
export function dspDisplayLabel(rawDsp: string | undefined): string {
  const d = (rawDsp ?? '').trim().toLowerCase();
  if (d === 'propeller ads' || d === 'propellerads') return 'Meta Ads';
  if (d === 'inhouse' || d === 'in-house' || d === 'in house') return 'Nutra Inhouse Dashboard';
  return rawDsp?.trim() || 'PayU';
}

export type DspSummary = {
  dspLabel: string;
  initiated: number;
  success: number;
  /** successCount from hours[] — may be lower than PayU if API under-reports */
  hoursSuccess: number;
  /** msisdnList entries with status SUCCESS — cross-check against PayU */
  msisdnSuccess: number;
  failed: number;
  clicks: number;
};

export type ProductSummary = {
  productId: number;
  productName: string;
  initiated: number;
  success: number;
};

export type DashboardSummary = {
  byDsp: DspSummary[];
  byProduct: ProductSummary[];
  totalInitiated: number;
  totalSuccess: number;
  /** Sum of hours[].successCount across ALL DSPs — this is what PayU gateway counts as sales */
  payuGatewaySuccess: number;
  /** Sum of hours[].initiatedCount across ALL DSPs */
  payuGatewayInitiated: number;
};

/** Aggregate raw API rows into per-DSP and per-product summary totals (no rounding, direct from API). */
export function buildSummary(rows: ProductReport[]): DashboardSummary {
  const dspMap = new Map<string, DspSummary>();
  const productMap = new Map<number, ProductSummary>();

  for (const r of rows) {
    const label = dspDisplayLabel(r.dsp);
    const initiated = (r.hours ?? []).reduce((s, h) => s + Number(h.initiatedCount ?? 0), 0);
    const hoursSuccess = (r.hours ?? []).reduce((s, h) => s + Number(h.successCount ?? 0), 0);
    const failed = (r.hours ?? []).reduce((s, h) => s + Number(h.failureCount ?? 0), 0);
    const clicks = (r.hours ?? []).reduce((s, h) => s + Number(h.clicks ?? 0), 0);

    // Cross-check: count msisdnList entries where status = SUCCESS (any casing)
    const msisdnSuccess = (r.user?.msisdnList ?? []).filter((m) => {
      if (typeof m === 'string') return false;
      const s = String((m as Record<string, unknown>).status ?? '').trim().toLowerCase();
      return s === 'success' || s === 'completed' || s === 'paid' || s.includes('success');
    }).length;

    // Use the higher of the two as the displayed success (API hours may under-report)
    const success = Math.max(hoursSuccess, msisdnSuccess);

    const dspEntry = dspMap.get(label);
    if (!dspEntry) {
      dspMap.set(label, { dspLabel: label, initiated, success, hoursSuccess, msisdnSuccess, failed, clicks });
    } else {
      dspEntry.initiated += initiated;
      dspEntry.hoursSuccess += hoursSuccess;
      dspEntry.msisdnSuccess += msisdnSuccess;
      dspEntry.success = Math.max(dspEntry.hoursSuccess, dspEntry.msisdnSuccess);
      dspEntry.failed += failed;
      dspEntry.clicks += clicks;
    }

    const prodEntry = productMap.get(r.productId);
    if (!prodEntry) {
      productMap.set(r.productId, { productId: r.productId, productName: r.productName, initiated, success });
    } else {
      prodEntry.initiated += initiated;
      prodEntry.success += success;
    }
  }

  const byDsp = [...dspMap.values()];
  const byProduct = [...productMap.values()];
  const totalInitiated = byDsp.reduce((s, d) => s + d.initiated, 0);
  const totalSuccess = byDsp.reduce((s, d) => s + d.success, 0);
  // payuGateway = raw sum of hours[].successCount across ALL rows (no dedup, no max trick)
  // This is the number PayU's own dashboard counts as "sales"
  const payuGatewaySuccess = rows.reduce(
    (s, r) => s + (r.hours ?? []).reduce((a, h) => a + Number(h.successCount ?? 0), 0), 0
  );
  const payuGatewayInitiated = rows.reduce(
    (s, r) => s + (r.hours ?? []).reduce((a, h) => a + Number(h.initiatedCount ?? 0), 0), 0
  );
  return { byDsp, byProduct, totalInitiated, totalSuccess, payuGatewaySuccess, payuGatewayInitiated };
}

function rowMatchesDsp(r: ProductReport, dspPreset: string): boolean {
  if (!dspPreset || dspPreset === 'All') return true;
  const d = (r.dsp || '').trim().toLowerCase();
  return d === dspPreset.trim().toLowerCase();
}

/** Pub / publisher id from row (normalized API or raw aliases). */
export function pubIdFromRow(r: ProductReport): string {
  const raw = r as Record<string, unknown>;
  const v =
    r.pubId ??
    r.pub_id ??
    raw.publisherId ??
    raw.publisher_id ??
    raw.pubID ??
    raw.PubId;
  return v != null ? String(v).trim() : '';
}

function rowMatchesPubId(r: ProductReport, q: string): boolean {
  const t = q.trim();
  if (!t) return true;
  const pid = pubIdFromRow(r).toLowerCase();
  return pid.includes(t.toLowerCase());
}

export function filterRowsForTab(
  data: ProductReport[],
  tab: DashboardProductTabId
): ProductReport[] {
  const def = DASHBOARD_PRODUCT_TABS.find((x) => x.id === tab);
  if (!def) return [];
  return data.filter((r) => productNameMatchesHints(r.productName, def.nameHints));
}

export function uniqueDspsForTab(data: ProductReport[], tab: DashboardProductTabId): string[] {
  const rows = filterRowsForTab(data, tab);
  const set = new Set<string>();
  for (const r of rows) {
    const d = (r.dsp || '').trim();
    if (d) set.add(d);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function uniquePubIdsForTab(data: ProductReport[], tab: DashboardProductTabId): string[] {
  const rows = filterRowsForTab(data, tab);
  const set = new Set<string>();
  for (const r of rows) {
    const p = pubIdFromRow(r);
    if (p) set.add(p);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function buildDashboardModels(
  raw: ProductReport[],
  tab: DashboardProductTabId,
  filters: DashboardFilters
): {
  contacts: ContactRow[];
  dspBlocks: DspAnalyticsBlock[];
  hasProductMatch: boolean;
} {
  const matched = filterRowsForTab(raw, tab);
  if (!matched.length) {
    return { contacts: [], dspBlocks: [], hasProductMatch: false };
  }

  const dspFiltered = matched.filter(
    (r) => rowMatchesDsp(r, filters.dspPreset) && rowMatchesPubId(r, filters.pubIdQuery)
  );

  if (!dspFiltered.length) {
    return { contacts: [], dspBlocks: [], hasProductMatch: true };
  }

  const merged = mergeProductRows(dspFiltered);

  const contacts: ContactRow[] = collectContactsFromReports(dspFiltered);

  const dspBlocks: DspAnalyticsBlock[] = merged.map((r) => {
    const msisdnList = msisdnStringsFromList(r.user?.msisdnList as unknown[]);
    const hourly = bucketsToHourly24(r.hours || [], msisdnList.length);
    return {
      key: groupKeyForRow(r),
      productId: r.productId,
      productName: r.productName,
      dsp: dspDisplayLabel(r.dsp),
      domain: r.domain || r.link || '—',
      hourly,
      msisdnList,
    };
  });

  return {
    contacts,
    dspBlocks,
    hasProductMatch: true,
  };
}
