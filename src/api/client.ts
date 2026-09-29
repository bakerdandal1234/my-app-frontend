import axios, {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { isAccessTokenResponse } from '../auth/contracts';
import { API_URL } from './config';
import { getCsrfToken } from './csrf';
import { isAuthRejection } from './errors';
import {
  getAccessToken,
  getAuthVersion,
  setAccessToken,
  setRefreshedAccessToken,
} from './tokenStore';
import { parseResponse } from './validation';

export { API_URL } from './config';

declare module 'axios' {
  export interface AxiosRequestConfig {
    _authVersion?: number;
    _retry?: boolean;
    _isRefreshCall?: boolean;
  }
}

const cookieMutationPaths = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/2fa/verify',
  '/auth/logout',
]);

// This transport runs inside a queue slot, without re-entering interceptors.
const sessionTransport = axios.create({ baseURL: API_URL, withCredentials: true });
const networkAdapter = axios.getAdapter(sessionTransport.defaults.adapter);
let cookieOperationQueue: Promise<void> = Promise.resolve();
let refreshRequest: { version: number; promise: Promise<string> } | null = null;
let logoutRequest: { version: number; promise: Promise<void> } | null = null;

function assertCurrentSession(version: number): void {
  if (version !== getAuthVersion()) {
    throw new axios.CanceledError('Authentication changed');
  }
}

function enqueueCookieOperation<T>(
  version: number,
  operation: () => Promise<T>,
): Promise<T> {
  // Version checks protect JS state; serialization also orders Set-Cookie.
  const request = cookieOperationQueue.then(async () => {
    assertCurrentSession(version);
    const response = await operation();
    assertCurrentSession(version);
    return response;
  });
  // Keep the queue usable after failure; the caller still receives rejection.
  cookieOperationQueue = request.then(() => undefined, () => undefined);
  return request;
}

function dispatchRequest(
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse<unknown>> {
  const requestPath = config.url?.split('?')[0] ?? '';
  if (config.method?.toLowerCase() === 'post' && cookieMutationPaths.has(requestPath)) {
    return enqueueCookieOperation(
      config._authVersion ?? getAuthVersion(),
      () => networkAdapter(config),
    );
  }
  return networkAdapter(config);
}

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  adapter: dispatchRequest,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config._authVersion ??= getAuthVersion();
    assertCurrentSession(config._authVersion);
    const token = getAccessToken();
    if (token) config.headers.set('Authorization', 'Bearer ' + token);
    return config;
  },
  (error: unknown) => { throw error; },
  { synchronous: true },
);

async function requestRefreshToken(): Promise<string> {
  // Read CSRF at dispatch time, after preceding cookie mutations have settled.
  const csrfToken = getCsrfToken();
  const response = await sessionTransport.post<unknown>('/auth/refresh', {}, {
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
  });
  return parseResponse(response.data, isAccessTokenResponse).accessToken;
}

export function refreshAccessToken(): Promise<string> {
  const version = getAuthVersion();
  if (logoutRequest?.version === version) {
    return Promise.reject(new axios.CanceledError('Logout is in progress'));
  }
  if (refreshRequest?.version === version) return refreshRequest.promise;

  const promise = enqueueCookieOperation(version, requestRefreshToken)
    .then((token) => {
      assertCurrentSession(version);
      setRefreshedAccessToken(token);
      return token;
    })
    .catch((error: unknown) => {
      if (version === getAuthVersion() && isAuthRejection(error)) {
        setAccessToken(null);
      }
      throw error;
    })
    .finally(() => {
      if (refreshRequest?.promise === promise) refreshRequest = null;
    });

  refreshRequest = { version, promise };
  return promise;
}

function isCurrentRequestToken(config: InternalAxiosRequestConfig): boolean {
  const token = getAccessToken();
  return config._authVersion === getAuthVersion() &&
    token !== null &&
    config.headers.get('Authorization') === 'Bearer ' + token;
}

async function retryAuthenticatedRequest(
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse<unknown>> {
  config._retry = true;
  if (!getAccessToken() || isCurrentRequestToken(config)) {
    await refreshAccessToken();
  }
  return apiClient<unknown>(config);
}

apiClient.interceptors.response.use(
  (response: AxiosResponse<unknown>) => {
    if (response.config._authVersion !== undefined) {
      assertCurrentSession(response.config._authVersion);
    }
    return response;
  },
  async (error: unknown) => {
    if (!axios.isAxiosError<unknown, unknown>(error)) throw error;
    const config = error.config;
    if (!config) throw error;
    if (config._authVersion !== undefined) assertCurrentSession(config._authVersion);
    if (error.response?.status !== 401 || !config.headers.get('Authorization')) {
      throw error;
    }
    if (config._isRefreshCall) throw error;
    if (!config._retry) return retryAuthenticatedRequest(config);
    if (isCurrentRequestToken(config)) setAccessToken(null);
    throw error;
  },
);

async function revokeSession(token: string | null, version: number): Promise<void> {
  assertCurrentSession(version);
  try {
    await sessionTransport.post<unknown>('/auth/logout', {}, {
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    });
  } catch (error: unknown) {
    if (!axios.isAxiosError<unknown, unknown>(error) || error.response?.status !== 401) {
      throw error;
    }
    assertCurrentSession(version);
    const refreshedToken = await requestRefreshToken();
    assertCurrentSession(version);
    // Revocation credentials must never restore the locally signed-out session.
    await sessionTransport.post<unknown>('/auth/logout', {}, {
      headers: { Authorization: 'Bearer ' + refreshedToken },
    });
  }
}

export function logoutSession(): Promise<void> {
  if (logoutRequest?.version === getAuthVersion()) return logoutRequest.promise;
  const token = getAccessToken();
  setAccessToken(null);
  const version = getAuthVersion();
  const promise = enqueueCookieOperation(version, () => revokeSession(token, version))
    .finally(() => {
      if (logoutRequest?.promise === promise) logoutRequest = null;
    });
  logoutRequest = { version, promise };
  return promise;
}

export function startUserGoogleLogin(): void {
  window.location.assign(API_URL + '/auth/google');
}

export function startUserGithubLogin(): void {
  window.location.assign(API_URL + '/auth/github');
}
