/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FastAPI backend. Empty = same-origin `/api` (proxied in dev). */
  readonly VITE_API_BASE_URL?: string;
  /** "false" switches the API layer from mock data to real HTTP calls. */
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
