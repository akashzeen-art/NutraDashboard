import { FORM_LEADS_CONFIG } from '../config';
import type { FormLeadRecord } from '../types';

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function normalizeFormLead(raw: unknown): FormLeadRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const productId = num(r.productId ?? r.product_id);
  if (productId == null) return null;

  const msisdn = str(r.msisdn ?? r.mobile ?? r.phone) ?? '';
  const createdAt = str(r.createdAt ?? r.created_at) ?? '';
  const id = num(r.id);

  return {
    id: id ?? undefined,
    msisdn,
    name: r.name == null ? null : str(r.name),
    dsp: str(r.dsp) ?? '',
    productId,
    clickId: str(r.clickId ?? r.click_id),
    productName: r.productName == null ? null : str(r.productName ?? r.product_name),
    createdAt,
  };
}

export function normalizeFormLeadsArray(data: unknown): FormLeadRecord[] {
  if (!Array.isArray(data)) return [];
  const out: FormLeadRecord[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = normalizeFormLead(data[i]);
    if (row) out.push(row);
  }
  return out;
}

export async function fetchFormLeadsByDate(
  fromDate: string,
  toDate: string,
  productId: number | null
): Promise<FormLeadRecord[]> {
  const params = new URLSearchParams({ fromDate, toDate });
  if (productId != null) {
    params.set('productId', String(productId));
  } else {
    params.set('productId', '');
  }

  const url = `${FORM_LEADS_CONFIG.baseUrl}${FORM_LEADS_CONFIG.endpoint}?${params}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Leads API error: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();
  return normalizeFormLeadsArray(data);
}
