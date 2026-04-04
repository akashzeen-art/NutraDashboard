/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_REPORT_ENDPOINT?: string;
  readonly VITE_AUTH_LOGIN_URL?: string;
  readonly VITE_FALLBACK_LOGIN_EMAIL?: string;
  readonly VITE_FALLBACK_LOGIN_PASSWORD?: string;
  readonly VITE_DATE_RANGE_MAX_DAYS?: string;
  readonly VITE_CONTACT_DETAILS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
