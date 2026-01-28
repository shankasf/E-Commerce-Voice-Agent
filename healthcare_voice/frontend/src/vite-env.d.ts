/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_AI_SERVICE_URL: string
  readonly VITE_AI_SERVICE_WS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
