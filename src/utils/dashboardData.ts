import type { ContactRow, DspAnalyticsBlock, ProductReport } from '../types';
import { collectContactsFromReports } from './contactMerge';
import { bucketsToHourly24 } from './hourSplit';
import { groupKeyForRow, mergeProductRows } from './groupReports';
import { msisdnStringsFromList } from './msisdnExtract';
import { filterRowsForProduct } from './productFromApi';

export type DashboardFilters = {
  dspPreset: string;
  pubIdQuery: string;
};

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

export function uniqueDspsForProduct(data: ProductReport[], productName: string): string[] {
  const rows = filterRowsForProduct(data, productName);
  const set = new Set<string>();
  for (const r of rows) {
    const d = (r.dsp || '').trim();
    if (d) set.add(d);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function uniquePubIdsForProduct(data: ProductReport[], productName: string): string[] {
  const rows = filterRowsForProduct(data, productName);
  const set = new Set<string>();
  for (const r of rows) {
    const p = pubIdFromRow(r);
    if (p) set.add(p);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function buildDashboardModels(
  raw: ProductReport[],
  productName: string,
  filters: DashboardFilters
): {
  contacts: ContactRow[];
  dspBlocks: DspAnalyticsBlock[];
  hasProductMatch: boolean;
} {
  const matched = filterRowsForProduct(raw, productName);
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
      productName: r.productName,
      dsp: r.dsp || '—',
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
