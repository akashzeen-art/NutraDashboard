/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTACT_DETAILS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

