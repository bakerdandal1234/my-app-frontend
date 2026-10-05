import { apiClient } from '../../api/client.ts';
import { InvalidApiResponseError, parseResponse } from '../../api/validation.ts';
import {
  isAdminUserArray,
  isPermissionItemArray,
  isRoleItemArray,
  isRoleSummaryArray,
  isUserAccess,
  type AdminUser,
  type PermissionItem,
  type RoleItem,
  type RoleSummary,
  type UserAccess,
} from './authorization-contracts.ts';

export interface AuthorizationReadOptions {
  signal?: AbortSignal;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

export interface CreatePermissionRequest {
  resource: string;
  action: string;
  description?: string;
}

export interface UpdatePermissionRequest {
  resource?: string;
  action?: string;
  description?: string;
}

function parseUserAccessForUser(
  response: unknown,
  expectedUserId: string,
): UserAccess {
  const access = parseResponse(response, isUserAccess);
  if (access.userId !== expectedUserId) throw new InvalidApiResponseError();
  return access;
}

export async function getCurrentUserAccess(
  expectedUserId: string,
  options?: AuthorizationReadOptions,
): Promise<UserAccess> {
  const response = await apiClient.get<unknown>('/users/me/access', {
    signal: options?.signal,
  });
  return parseUserAccessForUser(response.data, expectedUserId);
}

export async function getAdminUsers(
  options?: AuthorizationReadOptions,
): Promise<AdminUser[]> {
  const response = await apiClient.get<unknown>('/authorization/users', {
    signal: options?.signal,
  });
  return parseResponse(response.data, isAdminUserArray);
}

export async function getUserAccess(
  userId: string,
  options?: AuthorizationReadOptions,
): Promise<UserAccess> {
  const response = await apiClient.get<unknown>(
    `/authorization/users/${encodeURIComponent(userId)}/access`,
    { signal: options?.signal },
  );
  return parseUserAccessForUser(response.data, userId);
}

export async function getRoles(
  options?: AuthorizationReadOptions,
): Promise<RoleItem[]> {
  const response = await apiClient.get<unknown>('/authorization/roles', {
    signal: options?.signal,
  });
  return parseResponse(response.data, isRoleItemArray);
}

export async function getRoleSummaries(
  options?: AuthorizationReadOptions,
): Promise<RoleSummary[]> {
  const response = await apiClient.get<unknown>('/authorization/roles', {
    signal: options?.signal,
  });
  return parseResponse(response.data, isRoleSummaryArray);
}

export async function createRole(request: CreateRoleRequest): Promise<void> {
  await apiClient.post<unknown>('/authorization/roles', request);
}

export async function updateRole(
  roleId: string,
  request: UpdateRoleRequest,
): Promise<void> {
  await apiClient.patch<unknown>(
    `/authorization/roles/${encodeURIComponent(roleId)}`,
    request,
  );
}

export async function deleteRole(roleId: string): Promise<void> {
  await apiClient.delete<unknown>(
    `/authorization/roles/${encodeURIComponent(roleId)}`,
  );
}

export async function getPermissions(
  options?: AuthorizationReadOptions,
): Promise<PermissionItem[]> {
  const response = await apiClient.get<unknown>('/authorization/permissions', {
    signal: options?.signal,
  });
  return parseResponse(response.data, isPermissionItemArray);
}

export async function createPermission(
  request: CreatePermissionRequest,
): Promise<void> {
  await apiClient.post<unknown>('/authorization/permissions', request);
}

export async function updatePermission(
  permissionId: string,
  request: UpdatePermissionRequest,
): Promise<void> {
  await apiClient.patch<unknown>(
    `/authorization/permissions/${encodeURIComponent(permissionId)}`,
    request,
  );
}

export async function deletePermission(permissionId: string): Promise<void> {
  await apiClient.delete<unknown>(
    `/authorization/permissions/${encodeURIComponent(permissionId)}`,
  );
}

export async function assignRoleToUser(
  userId: string,
  roleId: string,
): Promise<void> {
  await apiClient.post<unknown>(
    `/authorization/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
  );
}

export async function removeRoleFromUser(
  userId: string,
  roleId: string,
): Promise<void> {
  await apiClient.delete<unknown>(
    `/authorization/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
  );
}

export async function assignPermissionToRole(
  roleId: string,
  permissionId: string,
): Promise<void> {
  await apiClient.post<unknown>(
    `/authorization/roles/${encodeURIComponent(roleId)}/permissions/${encodeURIComponent(permissionId)}`,
  );
}

export async function removePermissionFromRole(
  roleId: string,
  permissionId: string,
): Promise<void> {
  await apiClient.delete<unknown>(
    `/authorization/roles/${encodeURIComponent(roleId)}/permissions/${encodeURIComponent(permissionId)}`,
  );
}
