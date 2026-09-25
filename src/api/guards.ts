export interface AuthUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  googleId?: string | null;
  githubId?: string | null;
  createdAt: string;
}

export interface UserAccess {
  userId: string;
  roles: string[];
  permissions: string[];
}

interface AccessTokenResponse {
  accessToken: string;
}

interface TwoFactorRequiredResponse {
  twoFactorRequired: true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalText(
  value: unknown,
): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown) => typeof item === 'string')
  );
}

export function isAccessTokenResponse(
  value: unknown,
): value is AccessTokenResponse {
  return (
    isRecord(value) &&
    typeof value.accessToken === 'string' &&
    value.accessToken.trim().length > 0 &&
    (
      value.twoFactorRequired === undefined ||
      value.twoFactorRequired === false
    )
  );
}

export function isTwoFactorRequiredResponse(
  value: unknown,
): value is TwoFactorRequiredResponse {
  return (
    isRecord(value) &&
    value.twoFactorRequired === true &&
    value.accessToken === undefined
  );
}

export function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    isOptionalText(value.firstName) &&
    isOptionalText(value.lastName) &&
    typeof value.isEmailVerified === 'boolean' &&
    typeof value.isTwoFactorEnabled === 'boolean' &&
    isOptionalText(value.googleId) &&
    isOptionalText(value.githubId) &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt))
  );
}

export function isUserAccess(value: unknown): value is UserAccess {
  return (
    isRecord(value) &&
    typeof value.userId === 'string' &&
    isStringArray(value.roles) &&
    isStringArray(value.permissions)
  );
}

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface PermissionItem {
  id: string;
  resource: string;
  action: string;
  description?: string | null;
}

export interface RolePermissionItem {
  permissionId: string;
  permission: PermissionItem;
}

export interface RoleItem {
  id: string;
  name: string;
  description?: string | null;
  rolePermissions: RolePermissionItem[];
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

function isDateString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    Number.isFinite(Date.parse(value))
  );
}

function isOptionalDateString(
  value: unknown,
): value is string | null | undefined {
  return value === undefined || value === null || isDateString(value);
}

export function isAdminUser(value: unknown): value is AdminUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    isOptionalText(value.firstName) &&
    isOptionalText(value.lastName) &&
    typeof value.isEmailVerified === 'boolean' &&
    isDateString(value.createdAt)
  );
}

export function isAdminUserArray(value: unknown): value is AdminUser[] {
  return Array.isArray(value) && value.every(isAdminUser);
}

export function isPermissionItem(value: unknown): value is PermissionItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.resource === 'string' &&
    typeof value.action === 'string' &&
    isOptionalText(value.description)
  );
}

export function isPermissionItemArray(
  value: unknown,
): value is PermissionItem[] {
  return Array.isArray(value) && value.every(isPermissionItem);
}

function isRolePermissionItem(value: unknown): value is RolePermissionItem {
  return (
    isRecord(value) &&
    typeof value.permissionId === 'string' &&
    isPermissionItem(value.permission)
  );
}

export function isRoleItem(value: unknown): value is RoleItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isOptionalText(value.description) &&
    Array.isArray(value.rolePermissions) &&
    value.rolePermissions.every(isRolePermissionItem)
  );
}

export function isRoleItemArray(value: unknown): value is RoleItem[] {
  return Array.isArray(value) && value.every(isRoleItem);
}

export function isSessionItem(value: unknown): value is SessionItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isOptionalText(value.userAgent) &&
    isOptionalText(value.ipAddress) &&
    isDateString(value.createdAt) &&
    isOptionalDateString(value.lastUsedAt) &&
    isDateString(value.expiresAt) &&
    isOptionalDateString(value.revokedAt)
  );
}

export function isSessionItemArray(value: unknown): value is SessionItem[] {
  return Array.isArray(value) && value.every(isSessionItem);
}

export interface TwoFactorSetupResponse {
  qrCodeDataUrl: string;
  secret: string;
}

export interface MessageResponse {
  message?: string;
}

/**
 * نفحص بيانات إعداد 2FA قبل تخزين السر أو عرض صورة QR.
 * هذا فحص لشكل البيانات؛ التحقق من رمز TOTP يبقى مسؤولية الخادم.
 */
export function isTwoFactorSetupResponse(
  value: unknown,
): value is TwoFactorSetupResponse {
  return (
    isRecord(value) &&
    typeof value.qrCodeDataUrl === 'string' &&
    value.qrCodeDataUrl.trim().length > 0 &&
    typeof value.secret === 'string' &&
    value.secret.trim().length > 0
  );
}

/**
 * الرسالة اختيارية للمحافظة على النص البديل الموجود في الواجهة.
 * إذا أرسل الخادم message، يجب أن تكون نصًا.
 */
export function isMessageResponse(
  value: unknown,
): value is MessageResponse {
  return (
    isRecord(value) &&
    (
      value.message === undefined ||
      typeof value.message === 'string'
    )
  );
}
