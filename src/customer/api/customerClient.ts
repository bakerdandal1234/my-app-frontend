import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import {
  getCustomerAccessToken,
  setCustomerAccessToken,
} from './customerTokenStore';
import { getCustomerCsrfToken } from './customerCsrf';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Internal: set once a customer request has been retried after a 401. */
    _customerRetry?: boolean;
    /** Internal: marks the customer refresh call itself. */
    _isCustomerRefresh?: boolean;
  }
}

const API_URL = import.meta.env.VITE_API_URL as string;

/**
 * Axios instance for the customer side of the app.
 *
 * `withCredentials: true` is what makes the whole login work: the one-time
 * exchange code in the URL is useless without the httpOnly
 * customer_oauth_binding cookie, and the browser only attaches that cookie
 * to a cross-origin XHR when credentials are explicitly included. A plain
 * fetch(), curl or Postman call has no binding cookie, which is exactly the
 * `bindingValid: false` case.
 *
 * Separate instance from the staff apiClient so no staff Authorization
 * header, and no staff 401 -> /auth/refresh interceptor, can ever fire on a
 * customer request.
 */
export const customerApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

customerApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getCustomerAccessToken();

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

function isAccessTokenBody(data: unknown): data is { accessToken: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).accessToken === 'string'
  );
}

// Coalesces concurrent refresh needs into a single in-flight call.
let refreshPromise: Promise<string> | null = null;

/**
 * POST /customer/auth/refresh using the httpOnly customer_refresh_token
 * cookie plus the double-submit CSRF header. Rotates the refresh token
 * server-side, so the old one stops working immediately.
 */
export async function refreshCustomerAccessToken(): Promise<string> {
  refreshPromise ??= (async () => {
    const csrfToken = getCustomerCsrfToken();

    const response = await customerApi.post<unknown>(
      '/customer/auth/refresh',
      {},
      {
        _isCustomerRefresh: true,
        headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      },
    );

    if (!isAccessTokenBody(response.data)) {
      throw new Error('Unexpected refresh response');
    }

    setCustomerAccessToken(response.data.accessToken);

    return response.data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// One silent refresh + one retry, and only for a request that actually
// carried a customer access token. A 401 from the exchange or the 2FA
// endpoint (no Authorization header) means "bad code", not "expired
// session", and must never trigger a refresh.
customerApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;
    const isUnauthorized = error.response?.status === 401;
    const hadAccessToken = !!config?.headers?.get?.('Authorization');
    const canRetry =
      !!config &&
      hadAccessToken &&
      !config._isCustomerRefresh &&
      !config._customerRetry;

    if (!isUnauthorized || !canRetry) {
      if (isUnauthorized && hadAccessToken) {
        setCustomerAccessToken(null);
      }

      return Promise.reject(error);
    }

    config._customerRetry = true;

    try {
      const newToken = await refreshCustomerAccessToken();
      config.headers.set('Authorization', `Bearer ${newToken}`);

      return customerApi(config);
    } catch (refreshError: unknown) {
      setCustomerAccessToken(null);

      return Promise.reject(refreshError);
    }
  },
);

/** Full-page navigation to the backend's Google entry point. */
export function startCustomerGoogleLogin(): void {
  // Must be a real navigation, not XHR: the browser has to follow Google's
  // redirects and land on our callback so the binding cookie can be set.
  window.location.assign(`${API_URL}/customer/auth/google`);
}
