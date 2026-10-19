/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Public Telegram link where visitors send questions, e.g. https://t.me/eavto_support. Button hidden when empty. */
  readonly VITE_TELEGRAM_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
