import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken } from './tokenStore';
import { getCsrfToken } from './csrf';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Internal: set once a request has already been retried after a 401 refresh, to prevent retry loops. */
    _retry?: boolean;
    /** Internal: marks the /auth/refresh call itself, so its own 401 is never treated as "needs a refresh". */
    _isRefreshCall?: boolean;
  }
}

/**
 * Base URL of the backend API. Validated once here rather than trusted
 * silently — a missing/misconfigured env var should fail loudly and
 * immediately at startup, not surface later as a confusing
 * `baseURL: undefined` request with no clear explanation. Exported so
 * customerClient.ts and LoginPage.tsx (OAuth links) reuse this instead of
 * each redeclaring/re-reading the env var independently.
 */
export const API_URL = (() => {
  const value = import.meta.env.VITE_API_URL;
  if (!value) {
    throw new Error(
      'VITE_API_URL is not set. Check your .env file (see .env.example).',
    );
  }
  return value;
})();

export const apiClient = axios.create({
  baseURL: API_URL,
  // Required so the browser sends/receives the httpOnly refresh_token and
  // (non-httpOnly) csrf_token cookies — see backend README "Cookies & CSRF".
  withCredentials: true,
});

// Attach the in-memory access token to every outgoing request.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Coalesces concurrent refresh needs (e.g. several requests 401-ing at once,
// or a 401-triggered refresh racing the app's own startup refresh) into a
// single in-flight /auth/refresh call.
let refreshPromise: Promise<string> | null = null;

/**
 * Calls POST /auth/refresh using the httpOnly refresh_token cookie + the
 * X-CSRF-Token header read from the (non-httpOnly) csrf_token cookie, and
 * stores the resulting access token. Exported so AuthProvider can call this
 * directly on app load to silently restore a session — the 401 interceptor
 * below only fires in response to an already-failed request, which doesn't
 * exist yet on first mount.
 */
export async function refreshAccessToken(): Promise<string> {
  refreshPromise ??= (async () => {
    const csrfToken = getCsrfToken();
    const response = await apiClient.post<{ accessToken: string }>(
      '/auth/refresh',
      {},
      {
        _isRefreshCall: true,
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      },
    );
    setAccessToken(response.data.accessToken);
    return response.data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// On a 401 from a request that WAS carrying an access token: try exactly
// one silent refresh + one retry. A 401 from a request with no
// Authorization header (e.g. /auth/login with wrong credentials,
// /auth/register, /auth/verify-email, ...) means something else entirely
// (bad credentials, bad token) and must never trigger a refresh attempt —
// otherwise a wrong-password error gets silently replaced by whatever the
// refresh call itself fails with instead. If the refresh call succeeds but
// we've already retried once, or the refresh call itself 401s, give up and
// clear the in-memory token — AuthContext is subscribed to tokenStore and
// will react by treating the user as logged out.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;
    const isUnauthorized = error.response?.status === 401;
    const hadAccessToken = !!config?.headers?.get?.('Authorization');
    const canRetry = !!config && hadAccessToken && !config._isRefreshCall && !config._retry;

    if (!isUnauthorized || !canRetry) {
      if (isUnauthorized && hadAccessToken) {
        setAccessToken(null);
      }
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      const newToken = await refreshAccessToken();
      config.headers.set('Authorization', `Bearer ${newToken}`);
      return apiClient(config);
    } catch (refreshError) {
      setAccessToken(null);
      return Promise.reject(refreshError);
    }
  },
);

export function startUserGoogleLogin(): void {
  // Must be a real navigation, not XHR: the browser has to follow Google's
  // redirects and land on our callback so the binding cookie can be set.
  window.location.assign(`${API_URL}/auth/google`);
}
export function startUserGithubLogin(): void {
  // Must be a real navigation, not XHR: the browser has to follow Google's
  // redirects and land on our callback so the binding cookie can be set.
  window.location.assign(`${API_URL}/auth/github`);
}
