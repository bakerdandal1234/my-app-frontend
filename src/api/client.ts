import axios, { type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, setAccessToken } from './tokenStore';
import { getCsrfToken } from './csrf';
import { isAccessTokenResponse } from './guards';
declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Internal: set once a request has already been retried after a 401 refresh, to prevent retry loops. */
    _retry?: boolean;
    /** Internal: marks the /auth/refresh call itself, so its own 401 is never treated as "needs a refresh". */
    _isRefreshCall?: boolean;
  }
}

const API_URL = import.meta.env.VITE_API_URL as string;

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

    const response = await apiClient.post<unknown>(
      '/auth/refresh',
      {},
      {
        _isRefreshCall: true,
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      },
    );

    if (!isAccessTokenResponse(response.data)) {
      throw new Error('Unexpected refresh response');
    }

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
  async (error: unknown) => {
    // قد يأتي الخطأ من كود التطبيق أو interceptor آخر.
    // لا نقرأ config أو response قبل التأكد من أنه خطأ Axios.
    if (!axios.isAxiosError<unknown, unknown>(error)) {
      return Promise.reject(error);
    }

    const config = error.config;
    const isUnauthorized = error.response?.status === 401;
    const hadAccessToken =
      !!config?.headers?.get?.('Authorization');

    if (
      !isUnauthorized ||
      !config ||
      !hadAccessToken ||
      config._isRefreshCall ||
      config._retry
    ) {
      if (isUnauthorized && hadAccessToken) {
        setAccessToken(null);
      }

      return Promise.reject(error);
    }

    config._retry = true;

    try {
      const newToken = await refreshAccessToken();

      config.headers.set(
        'Authorization',
        `Bearer ${newToken}`,
      );

      return apiClient<unknown>(config);
    } catch (refreshError: unknown) {
      setAccessToken(null);
      return Promise.reject(refreshError);
    }
  },
);
