/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the FastAPI backend. Empty = same-origin `/api` (proxied in dev). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
