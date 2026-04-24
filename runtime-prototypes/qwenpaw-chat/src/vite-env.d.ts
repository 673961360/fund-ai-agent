/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QWENPAW_TARGET?: string;
  readonly VITE_QWENPAW_PROXY_PREFIX?: string;
  readonly VITE_QWENPAW_USER_ID?: string;
  readonly VITE_QWENPAW_CHANNEL?: string;
  readonly VITE_QWENPAW_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
