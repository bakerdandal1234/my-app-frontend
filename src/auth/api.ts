import { apiClient } from '../api/client.ts';
import { parseResponse } from '../api/validation.ts';
import {
  isAccessTokenResponse,
  isAuthUser,
  isLoginHistoryItemArray,
  isMessageResponse,
  isSessionItemArray,
  isTwoFactorRequiredResponse,
  isTwoFactorSetupResponse,
} from './contracts.ts';
import type {
  AccessTokenResponse,
  AuthUser,
  LoginHistoryItem,
  MessageResponse,
  SessionItem,
  TwoFactorRequiredResponse,
  TwoFactorSetupResponse,
} from './contracts.ts';

export {
  logoutSession,
  refreshAccessToken,
  startUserGithubLogin,
  startUserGoogleLogin,
} from '../api/client.ts';

export interface AuthReadOptions {
  signal?: AbortSignal;
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export type LoginResponse = AccessTokenResponse | TwoFactorRequiredResponse;

function isLoginResponse(value: unknown): value is LoginResponse {
  return isAccessTokenResponse(value) || isTwoFactorRequiredResponse(value);
}

export async function login({
  email,
  password,
  twoFactorCode,
}: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<unknown>('/auth/login', {
    email,
    password,
    ...(twoFactorCode ? { twoFactorCode } : {}),
  });
  return parseResponse(response.data, isLoginResponse);
}

export async function register({
  email,
  password,
  firstName,
  lastName,
}: RegisterRequest): Promise<void> {
  await apiClient.post<unknown>('/auth/register', {
    email,
    password,
    firstName,
    lastName,
  });
}

export async function getCurrentUser(options?: AuthReadOptions): Promise<AuthUser> {
  const response = await apiClient.get<unknown>('/users/me', {
    signal: options?.signal,
  });
  return parseResponse(response.data, isAuthUser);
}

export async function verifyEmail(
  token: string,
  options?: AuthReadOptions,
): Promise<MessageResponse> {
  const response = await apiClient.get<unknown>('/auth/verify-email', {
    params: { token },
    signal: options?.signal,
  });
  return parseResponse(response.data, isMessageResponse);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiClient.post<unknown>('/auth/forgot-password', { email });
}

export async function resetPassword({
  token,
  newPassword,
}: ResetPasswordRequest): Promise<void> {
  await apiClient.post<unknown>('/auth/reset-password', { token, newPassword });
}

export async function changePassword({
  currentPassword,
  newPassword,
}: ChangePasswordRequest): Promise<void> {
  await apiClient.post<unknown>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
}

export async function setPassword(newPassword: string): Promise<void> {
  await apiClient.post<unknown>('/auth/set-password', { newPassword });
}

export async function exchangeOAuthCode(code: string): Promise<AccessTokenResponse> {
  const response = await apiClient.post<unknown>('/auth/oauth/exchange', { code });
  return parseResponse(response.data, isAccessTokenResponse);
}

export async function verifyTwoFactorLogin(
  code: string,
): Promise<AccessTokenResponse> {
  const response = await apiClient.post<unknown>(
    '/auth/2fa/verify',
    { code },
    { _retry: true },
  );
  return parseResponse(response.data, isAccessTokenResponse);
}

export async function generateTwoFactorSetup(): Promise<TwoFactorSetupResponse> {
  const response = await apiClient.post<unknown>('/auth/2fa/generate');
  return parseResponse(response.data, isTwoFactorSetupResponse);
}

export async function enableTwoFactor(code: string): Promise<void> {
  await apiClient.post<unknown>('/auth/2fa/enable', { code });
}

export async function disableTwoFactor(code: string): Promise<void> {
  await apiClient.post<unknown>('/auth/2fa/disable', { code });
}

export async function getSessions(options?: AuthReadOptions): Promise<SessionItem[]> {
  const response = await apiClient.get<unknown>('/sessions', {
    signal: options?.signal,
  });
  return parseResponse(response.data, isSessionItemArray);
}

export async function revokeSession(sessionId: string): Promise<void> {
  await apiClient.delete<unknown>(`/sessions/${encodeURIComponent(sessionId)}`);
}

export async function revokeAllSessions(): Promise<void> {
  await apiClient.delete<unknown>('/sessions');
}

export async function getLoginHistory(
  options?: AuthReadOptions,
): Promise<LoginHistoryItem[]> {
  const response = await apiClient.get<unknown>('/auth/login-history', {
    signal: options?.signal,
  });
  return parseResponse(response.data, isLoginHistoryItemArray);
}
