import type { PermissionItem } from './authorization-contracts';

/** Shared permission names used by route guards and administration controls. */
export const PERMISSIONS = {
  ROLES_READ: 'roles:read',
  PERMISSIONS_READ: 'permissions:read',
} as const;

export function formatPermission(
  permission: Pick<PermissionItem, 'resource' | 'action'>,
): string {
  return `${permission.resource}:${permission.action}`;
}
