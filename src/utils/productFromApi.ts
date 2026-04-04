import type { ProductReport } from '../types';

/** Distinct `productName` values from the API (stable display casing = first seen). */
export function uniqueProductNamesFromReports(data: ProductReport[]): string[] {
  const map = new Map<string, string>();
  for (const r of data) {
    const raw = (r.productName || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!map.has(key)) map.set(key, raw);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function filterRowsForProduct(data: ProductReport[], productName: string): ProductReport[] {
  const t = productName.trim().toLowerCase();
  if (!t) return [];
  return data.filter((r) => (r.productName || '').trim().toLowerCase() === t);
}
