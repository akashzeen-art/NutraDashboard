import { DASHBOARD_PRODUCT_TABS, hardcodedLeadsProductIds, type DashboardProductTabId } from '../config';
import type { FormLeadRecord, ProductReport } from '../types';
import { filterRowsForTab } from './dashboardData';
import { productNameMatchesHints } from './matchProduct';

export function filterLeadsForTab(
  leads: FormLeadRecord[],
  tab: DashboardProductTabId,
  reports: ProductReport[]
): FormLeadRecord[] {
  const def = DASHBOARD_PRODUCT_TABS.find((t) => t.id === tab);
  if (!def) return leads;

  const tabProductIds = new Set(filterRowsForTab(reports, tab).map((r) => r.productId));
  const hardcodedIds = new Set(hardcodedLeadsProductIds(tab));

  return leads.filter((lead) => {
    if (hardcodedIds.has(lead.productId)) {
      return true;
    }
    if (lead.productName && productNameMatchesHints(lead.productName, def.nameHints)) {
      return true;
    }
    if (tabProductIds.size > 0 && tabProductIds.has(lead.productId)) {
      return true;
    }
    return false;
  });
}

export function filterLeadsByProductId(leads: FormLeadRecord[], productId: number): FormLeadRecord[] {
  return leads.filter((l) => l.productId === productId);
}

export function uniqueLeadProductIds(leads: FormLeadRecord[]): number[] {
  return [...new Set(leads.map((l) => l.productId))].sort((a, b) => a - b);
}

export type LeadsDateGroup = {
  date: string;
  rows: FormLeadRecord[];
};

/** Newest dates first; within each date, newest records first. */
export function groupLeadsByDate(leads: FormLeadRecord[]): LeadsDateGroup[] {
  const map = new Map<string, FormLeadRecord[]>();
  for (const lead of leads) {
    const day = lead.createdAt.slice(0, 10) || 'Unknown';
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(lead);
  }

  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, rows]) => ({
      date,
      rows: [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    }));
}

export function leadRowKey(lead: FormLeadRecord, index: number): string {
  if (lead.id != null) return String(lead.id);
  return `${lead.productId}|${lead.msisdn}|${lead.createdAt}|${index}`;
}

export function displayMsisdn(msisdn: string, raw = false): string {
  const s = msisdn.trim();
  if (!s) return '—';
  if (raw) return s;
  if (s.length > 10 && s.startsWith('91')) return s.slice(2);
  return s;
}

export function displayLeadName(name: string | null): string {
  if (!name || !name.trim()) return '—';
  const n = name.trim();
  if (n.toLowerCase() === 'deafault') return '—';
  return n;
}
