import {
  isArrayOf,
  isDateString,
  isNonEmptyString,
  isNullableText,
  isOptionalDateString,
  isOptionalText,
  isRecord,
  isString,
} from "../api/validation.ts";

export interface UserIdentity {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isEmailVerified: boolean;
  createdAt: string;
}

export function isUserIdentity(value: unknown): value is UserIdentity {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.email) &&
    isOptionalText(value.firstName) &&
    isOptionalText(value.lastName) &&
    typeof value.isEmailVerified === "boolean" &&
    isDateString(value.createdAt)
  );
}

export interface AuthUser extends UserIdentity {
  // /users/me adds this capability; the admin user list does not.
  hasPassword: boolean;
  isTwoFactorEnabled: boolean;
  googleId?: string | null;
  githubId?: string | null;
}

export function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    isUserIdentity(value) &&
    typeof value.hasPassword === "boolean" &&
    typeof value.isTwoFactorEnabled === "boolean" &&
    isOptionalText(value.googleId) &&
    isOptionalText(value.githubId)
  );
}

export interface AccessTokenResponse {
  accessToken: string;
  twoFactorRequired?: false;
}

export function isAccessTokenResponse(
  value: unknown,
): value is AccessTokenResponse {
  return (
    isRecord(value) &&
    isNonEmptyString(value.accessToken) &&
    (value.twoFactorRequired === undefined || value.twoFactorRequired === false)
  );
}

export interface TwoFactorRequiredResponse {
  twoFactorRequired: true;
  // Customer challenges include expiry; staff password challenges omit it.
  expiresIn?: number;
}

export function isTwoFactorRequiredResponse(
  value: unknown,
): value is TwoFactorRequiredResponse {
  return (
    isRecord(value) &&
    value.twoFactorRequired === true &&
    value.accessToken === undefined &&
    (value.expiresIn === undefined ||
      (typeof value.expiresIn === "number" &&
        Number.isFinite(value.expiresIn) &&
        value.expiresIn > 0))
  );
}

export interface TwoFactorSetupResponse {
  qrCodeDataUrl: string;
  secret: string;
}

export function isTwoFactorSetupResponse(
  value: unknown,
): value is TwoFactorSetupResponse {
  return (
    isRecord(value) &&
    isNonEmptyString(value.qrCodeDataUrl) &&
    isNonEmptyString(value.secret)
  );
}

export interface SessionItem {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt: string;
  revokedAt?: string | null;
}

export function isSessionItem(value: unknown): value is SessionItem {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isOptionalText(value.userAgent) &&
    isOptionalText(value.ipAddress) &&
    isDateString(value.createdAt) &&
    isDateString(value.expiresAt) &&
    isOptionalDateString(value.lastUsedAt) &&
    isOptionalDateString(value.revokedAt)
  );
}

export const isSessionItemArray = (value: unknown): value is SessionItem[] =>
  isArrayOf(value, isSessionItem);

export interface LoginHistoryItem {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  createdAt: string;
}

export function isLoginHistoryItem(value: unknown): value is LoginHistoryItem {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.userId) &&
    isNullableText(value.ipAddress) &&
    isNullableText(value.userAgent) &&
    typeof value.success === "boolean" &&
    isNullableText(value.failureReason) &&
    isDateString(value.createdAt)
  );
}

export const isLoginHistoryItemArray = (
  value: unknown,
): value is LoginHistoryItem[] => isArrayOf(value, isLoginHistoryItem);

export interface MessageResponse {
  // Existing pages supply their own fallback when the server omits a message.
  message?: string;
}

export function isMessageResponse(value: unknown): value is MessageResponse {
  return (
    isRecord(value) && (value.message === undefined || isString(value.message))
  );
}
