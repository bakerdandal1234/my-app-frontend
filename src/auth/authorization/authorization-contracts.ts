import { isArrayOf, isOptionalText, isRecord, isString } from "../../api/validation.ts";
import { isUserIdentity, type UserIdentity } from "../contracts.ts";

export type AdminUser = UserIdentity;
export const isAdminUser = isUserIdentity;
export const isAdminUserArray = (value: unknown): value is AdminUser[] =>
  isArrayOf(value, isAdminUser);

export interface PermissionItem {
  id: string;
  resource: string;
  action: string;
  description?: string | null;
}

export function isPermissionItem(value: unknown): value is PermissionItem {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.resource) &&
    isString(value.action) &&
    isOptionalText(value.description)
  );
}

export const isPermissionItemArray = (
  value: unknown,
): value is PermissionItem[] => isArrayOf(value, isPermissionItem);

export interface RoleSummary {
  id: string;
  name: string;
  description?: string | null;
}

export function isRoleSummary(value: unknown): value is RoleSummary {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isOptionalText(value.description)
  );
}

export const isRoleSummaryArray = (value: unknown): value is RoleSummary[] =>
  isArrayOf(value, isRoleSummary);

export interface RolePermissionItem {
  permissionId: string;
  permission: PermissionItem;
}

function isRolePermissionItem(value: unknown): value is RolePermissionItem {
  return (
    isRecord(value) &&
    isString(value.permissionId) &&
    isPermissionItem(value.permission)
  );
}

export interface RoleItem extends RoleSummary {
  rolePermissions: RolePermissionItem[];
}

export function isRoleItem(value: unknown): value is RoleItem {
  return (
    isRecord(value) &&
    isRoleSummary(value) &&
    isArrayOf(value.rolePermissions, isRolePermissionItem)
  );
}

export const isRoleItemArray = (value: unknown): value is RoleItem[] =>
  isArrayOf(value, isRoleItem);

export interface UserAccess {
  userId: string;
  roles: string[];
  permissions: string[];
}

export function isUserAccess(value: unknown): value is UserAccess {
  return (
    isRecord(value) &&
    isString(value.userId) &&
    isArrayOf(value.roles, isString) &&
    isArrayOf(value.permissions, isString)
  );
}
