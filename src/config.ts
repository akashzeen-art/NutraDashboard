export const API_CONFIG = {
  baseUrl: 'https://pu.playtonight.fun',
  endpoint: '/api/payment/report/bucket-wise',
} as const;

export const AUTH_CREDENTIALS = {
  email: 'admin@gmail.com',
  password: 'Admin@123',
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

export type DashboardProductTabId = (typeof DASHBOARD_PRODUCT_TABS)[number]['id'];

export const CONTACT_DETAILS_CONFIG = {
  urlTemplate: (import.meta.env.VITE_CONTACT_DETAILS_URL as string | undefined) ?? '',
} as const;
