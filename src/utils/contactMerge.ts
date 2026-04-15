import type { ContactDetails, ContactRow, ProductReport } from '../types';

/** Deduplicate keys: digits only (handles +91 vs local). */
export function mobileKey(raw: string | undefined): string {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length >= 10) return d.slice(-10);
  return d || String(raw || '').trim().toLowerCase();
}

function pickStr(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/** Map API status strings to display labels. */
export function normalizeContactStatus(raw: unknown): string {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!s) return '';
  if (/^(success|completed|paid|ok)$/.test(s) || s.includes('success')) return 'Success';
  if (/^(fail|failed|failure|error|declin)/.test(s) || s.includes('fail')) return 'Failed';
  if (/^(init|pending|start|process)/.test(s) || s.includes('initiat')) return 'Initiated';
  return raw === undefined || raw === null ? '' : String(raw).trim();
}

function rowFromObject(o: Record<string, unknown>): ContactRow | null {
  const mobile = pickStr(o.msisdn, o.mobile, o.phone);
  if (!mobile) return null;

  const fromFirstLast = [o.firstName, o.lastName]
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .join(' ')
    .trim();

  const displayName = pickStr(
    o.fullName,
    o.name,
    fromFirstLast || undefined,
    typeof o.firstName === 'string' ? o.firstName : undefined,
    o.customerName
  );

  const status = normalizeContactStatus(
    pickStr(o.status, o.paymentStatus, o.state, o.payment_state, o.paymentState)
  );

  const productInfo = pickStr(o.productInfo);
  const customerDsp = pickStr(o.dsp);

  return {
    mobile,
    displayName,
    firstName: typeof o.firstName === 'string' ? o.firstName : undefined,
    lastName: typeof o.lastName === 'string' ? o.lastName : undefined,
    status,
    productInfo,
    customerDsp,
  };
}

/** Pull contact rows from `user` (strings-only list or rich objects). */
export function parseContactsFromUser(user: ProductReport['user'] | undefined): ContactRow[] {
  if (!user) return [];

  const out: ContactRow[] = [];
  const u = user as {
    msisdnList?: unknown[];
    contactList?: unknown[];
    contacts?: unknown[];
    registrations?: unknown[];
  };

  const arrays = [u.contactList, u.contacts, u.registrations].filter(Boolean) as unknown[][];
  const primary = Array.isArray(u.msisdnList) ? u.msisdnList : [];

  const pushFromList = (list: unknown[]) => {
    for (const item of list) {
      if (typeof item === 'string') {
        const m = item.trim();
        if (m) out.push({ mobile: m, displayName: '', status: '' });
      } else if (item && typeof item === 'object') {
        const row = rowFromObject(item as Record<string, unknown>);
        if (row) out.push(row);
      }
    }
  };

  pushFromList(primary);
  for (const arr of arrays) pushFromList(arr);

  return out;
}

const STATUS_PRIORITY: Record<string, number> = { success: 3, failed: 2, initiated: 1 };

function statusPriority(status: string): number {
  return STATUS_PRIORITY[status.toLowerCase()] ?? 0;
}

function mergeContactRow(into: ContactRow, next: ContactRow): void {
  if (!into.displayName && (next.displayName || next.name)) {
    into.displayName = next.displayName || next.name;
  }
  if (!into.firstName && next.firstName) into.firstName = next.firstName;
  if (!into.lastName && next.lastName) into.lastName = next.lastName;
  // Always keep the highest-priority status (Success > Failed > Initiated)
  if (statusPriority(next.status ?? '') > statusPriority(into.status ?? '')) {
    into.status = next.status;
  }
  if (!into.email && next.email) into.email = next.email;
  if (!into.productInfo && next.productInfo) into.productInfo = next.productInfo;
  if (!into.customerDsp && next.customerDsp) into.customerDsp = next.customerDsp;
}

/** One row per phone + source product line + productInfo (API can repeat phone across products). */
export function contactRowDedupeKey(c: ContactRow): string {
  const m = mobileKey(c.mobile || c.phone);
  return `${m}|${c.sourceProductId ?? 0}|${c.productInfo || ''}`;
}

export function mergeContactsByCompositeKey(rows: ContactRow[]): ContactRow[] {
  const map = new Map<string, ContactRow>();
  for (const r of rows) {
    const k = contactRowDedupeKey(r);
    const ex = map.get(k);
    if (!ex) {
      map.set(k, { ...r });
    } else {
      mergeContactRow(ex, r);
    }
  }
  return [...map.values()].sort((a, b) => {
    const cmp = (a.mobile || '').localeCompare(b.mobile || '', undefined, { numeric: true });
    if (cmp !== 0) return cmp;
    return (a.productInfo || '').localeCompare(b.productInfo || '');
  });
}

export function collectContactsFromReports(rows: ProductReport[]): ContactRow[] {
  const all: ContactRow[] = [];
  for (const r of rows) {
    for (const c of parseContactsFromUser(r.user)) {
      all.push({
        ...c,
        sourceProductId: r.productId,
        lineDomain: r.domain,
        linePrice: r.price,
        lineReportDsp: r.dsp,
      });
    }
  }
  return mergeContactsByCompositeKey(all);
}

export function contactNameDisplay(c: ContactRow): string {
  if (c.displayName?.trim()) return c.displayName.trim();
  if (c.name?.trim()) return c.name.trim();
  const fn = c.firstName || c.first_name || '';
  const ln = c.lastName || c.last_name || '';
  const n = [fn, ln].filter(Boolean).join(' ').trim();
  return n || '—';
}

export function contactStatusDisplay(c: ContactRow): string {
  const s = (c.status || '').trim();
  return s || '—';
}

export function contactRowToDetailsPartial(c: ContactRow): ContactDetails {
  return {
    phone: c.mobile || c.phone,
    mobile: c.mobile || c.phone,
    firstName: c.firstName || (c.displayName ? c.displayName.split(/\s+/)[0] : undefined),
    lastName: c.lastName || c.last_name,
    email: c.email,
    productInfo: c.productInfo,
    customerDsp: c.customerDsp,
    lineDomain: c.lineDomain,
    linePrice: c.linePrice,
    lineReportDsp: c.lineReportDsp,
    sourceProductId: c.sourceProductId,
  };
}
