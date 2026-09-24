/**
 * In-memory access-token store. Deliberately NOT localStorage/sessionStorage
 * — those are readable by any injected script (XSS), while a JS variable is
 * only reachable within this page's live JS context and is wiped on every
 * full reload (at which point AuthContext re-establishes it via a silent
 * POST /auth/refresh against the httpOnly refresh_token cookie).
 *
 * A tiny pub-sub is used instead of exporting the token directly so React
 * (AuthContext) can re-render whenever apiClient's interceptors change it
 * out-of-band (e.g. after a silent refresh triggered by a 401).
 */

type Listener = (token: string | null) => void;

let accessToken: string | null = null;
let authVersion = 0;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

/** Login, logout, and invalidation supersede work from the previous session. */
export function getAuthVersion(): number {
  return authVersion;
}

export function setAccessToken(token: string | null): void {
  authVersion += 1;
  publishAccessToken(token);
}

/** A refresh rotates credentials without invalidating the same user's requests. */
export function setRefreshedAccessToken(token: string): void {
  publishAccessToken(token);
}

function publishAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => listener(token));
}

export function subscribeToAccessToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
