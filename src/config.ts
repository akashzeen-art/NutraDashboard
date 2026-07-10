export const API_CONFIG = {
  baseUrl: 'https://pu.playtonight.fun',
  endpoint: '/api/payment/report/bucket-wise',
} as const;

export const AUTH_CREDENTIALS = {
  email: 'nutra@gmail.com',
  password: 'Nutra@123',
} as const;

/** Max days in one range request (inclusive). */
export const DATE_RANGE_MAX_DAYS = 31;

/** Product toggles: Ameora first, then PlayTonight (per spec). */
export const DASHBOARD_PRODUCT_TABS = [
  {
    id: 'ameora' as const,
    label: 'Ameora',
    nameHints: ['ameora', 'amoora'] as const,
  },
  {
    id: 'playTonight' as const,
    label: 'PlayTonight',
    nameHints: ['playtonight', 'play tonight'] as const,
  },
] as const;

export const FORM_LEADS_CONFIG = {
  baseUrl: 'https://playtonight.fun',
  endpoint: '/api/payment/getformdatabydate',
} as const;

export type DashboardProductTabId = (typeof DASHBOARD_PRODUCT_TABS)[number]['id'];

/** Product IDs not returned by bucket-wise report but available for leads fetch. */
export const LEADS_HARDCODED_PRODUCT_IDS: Record<DashboardProductTabId, readonly number[]> = {
  ameora: [],
  playTonight: [1061],
};

export function hardcodedLeadsProductIds(tab: DashboardProductTabId): number[] {
  return [...LEADS_HARDCODED_PRODUCT_IDS[tab]];
}

export const CONTACT_DETAILS_CONFIG = {
  urlTemplate: (import.meta.env.VITE_CONTACT_DETAILS_URL as string | undefined) ?? '',
} as const;
