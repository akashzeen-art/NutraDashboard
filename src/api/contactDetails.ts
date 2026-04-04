import { CONTACT_DETAILS_CONFIG } from '../config';
import type { ContactDetails } from '../types';

function normalizeDetails(raw: unknown): ContactDetails {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const out: ContactDetails = {};
  const phone = pickStr(o.phone, o.mobile, o.msisdn);
  if (phone) {
    out.phone = phone;
    out.mobile = phone;
  }
  const email = pickStr(o.email);
  if (email) out.email = email;
  const firstName = pickStr(o.firstName, o.first_name);
  if (firstName) {
    out.firstName = firstName;
    out.first_name = firstName;
  }
  const lastName = pickStr(o.lastName, o.last_name);
  if (lastName) {
    out.lastName = lastName;
    out.last_name = lastName;
  }
  const productInfo = pickStr(o.productInfo, o.product_info);
  if (productInfo) out.productInfo = productInfo;
  const customerDsp = pickStr(o.customerDsp, o.dsp, o.customer_dsp);
  if (customerDsp) out.customerDsp = customerDsp;
  const lineReportDsp = pickStr(o.lineReportDsp, o.reportDsp, o.line_report_dsp);
  if (lineReportDsp) out.lineReportDsp = lineReportDsp;
  const lineDomain = pickStr(o.lineDomain, o.domain, o.line_domain);
  if (lineDomain) out.lineDomain = lineDomain;
  const linePrice = pickStr(o.linePrice, o.price, o.line_price);
  if (linePrice) out.linePrice = linePrice;
  const pid = o.sourceProductId ?? o.productId ?? o.product_id;
  if (typeof pid === 'number' && Number.isFinite(pid)) out.sourceProductId = pid;
  else if (typeof pid === 'string' && /^\d+$/.test(pid.trim())) out.sourceProductId = Number(pid.trim());
  return out;
}

function pickStr(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

export async function fetchContactDetails(
  mobile: string,
  ctx: { date: string; productId: number | null }
): Promise<ContactDetails> {
  const tpl = CONTACT_DETAILS_CONFIG.urlTemplate?.trim();
  if (!tpl) {
    return {};
  }

  const url = tpl
    .replaceAll('{mobile}', encodeURIComponent(mobile))
    .replaceAll('{date}', encodeURIComponent(ctx.date))
    .replaceAll('{productId}', encodeURIComponent(String(ctx.productId ?? '')));

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Contact API error: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();
  return normalizeDetails(data);
}

/** Merge API fields into modal state without wiping existing values with empty/undefined. */
export function mergeContactDetailsFromApi(base: ContactDetails, fromApi: ContactDetails): ContactDetails {
  const patch: ContactDetails = {};
  for (const key of Object.keys(fromApi) as (keyof ContactDetails)[]) {
    const v = fromApi[key];
    if (v === undefined || v === null) continue;
    if (key === 'sourceProductId') {
      if (typeof v === 'number' && Number.isFinite(v)) patch.sourceProductId = v;
      continue;
    }
    if (typeof v === 'string' && !v.trim()) continue;
    (patch as Record<string, unknown>)[key] = v;
  }
  return { ...base, ...patch };
}
