/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HERMES_TARGET?: string;
  readonly VITE_HERMES_PROXY_PREFIX?: string;
  readonly VITE_HERMES_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
