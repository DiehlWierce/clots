/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TELEGRAM_BOT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Подставляется на сборке из package.json. */
declare const __APP_VERSION__: string
