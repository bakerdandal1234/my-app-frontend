/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL. Optional in the type because it can be missing at runtime; see src/api/config.ts. */
  readonly VITE_API_URL?: string;
}
