export type HourBucket = {
  hourTime: string;
  clicks?: number;
  initiatedCount?: number;
  failureCount?: number;
  successCount?: number;
  dropOffCount?: number;
  dropoffCount?: number;
  dropOff?: number;
  drop_off?: number;
};

export type ProductReport = {
  productId: number;
  productName: string;
  date?: string;
  dsp?: string;
  /** Domain / link grouping (when API provides) */
  domain?: string;
  link?: string;
  pubId?: string;
  pub_id?: string;
  /** `msisdnList` may be strings or objects with mobile/name/status (API-dependent). */
  user?: {
    msisdnList?: Array<string | Record<string, unknown>>;
    contactList?: Array<Record<string, unknown>>;
    contacts?: Array<Record<string, unknown>>;
    registrations?: Array<Record<string, unknown>>;
  };
  hours?: HourBucket[];
  /** Price string from API (e.g. "699.00") */
  price?: string;
};

/** Per-hour arrays for hours 0..23 (labels 0–1 … 23–24) */
export type Hourly24 = {
  clicks: number[];
  entry: number[];
  initiated: number[];
  failed: number[];
  success: number[];
};

export type ContactRow = {
  mobile?: string;
  phone?: string;
  /** Single display name from API */
  displayName?: string;
  name?: string;
  email?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  /** Success | Failed | Initiated (or raw API) */
  status?: string;
  /** From msisdnList object: e.g. Ameora_1007 */
  productInfo?: string;
  /** DSP on the customer record (may differ from report row DSP) */
  customerDsp?: string;
  /** API productId for the report line this contact came from */
  sourceProductId?: number;
  lineDomain?: string;
  linePrice?: string;
  /** DSP on the parent report row */
  lineReportDsp?: string;
};

export type DspAnalyticsBlock = {
  key: string;
  productName: string;
  dsp: string;
  domain: string;
  hourly: Hourly24;
  msisdnList: string[];
};

export type ContactDetails = {
  phone?: string;
  mobile?: string;
  email?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  productInfo?: string;
  customerDsp?: string;
  lineDomain?: string;
  linePrice?: string;
  lineReportDsp?: string;
  sourceProductId?: number;
};
