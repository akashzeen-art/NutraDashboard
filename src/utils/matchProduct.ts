import type { ProductReport } from '../types';

export function productNameMatchesHints(
  productName: string | undefined,
  hints: readonly string[]
): boolean {
  const n = (productName || '').toLowerCase();
  return hints.some((h) => n.includes(h.toLowerCase().trim()));
}

export function findProductReportByNameHints(
  data: ProductReport[],
  hints: readonly string[]
): ProductReport | undefined {
  if (!data.length) return undefined;
  return data.find((p) => productNameMatchesHints(p.productName, hints));
}
