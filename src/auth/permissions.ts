import type { PermissionItem } from '../api/guards';

/**
 * Permission strings enforced server-side via @Permissions() guards.
 * Repeated as raw string literals across App.tsx, AuthenticatedLayout and
 * AdminRolesPage; centralized here so a renamed permission can't drift out
 * of sync between the route guards and the UI that checks for it.
 */
export const PERMISSIONS = {
  ROLES_READ: 'roles:read',
  PERMISSIONS_READ: 'permissions:read',
} as const;

/**
 * "resource:action", matching the format the backend returns and expects
 * (e.g. "roles:read"). Takes just the two fields — not the full
 * PermissionItem — so it also formats a not-yet-saved create/edit form's
 * values, which have no id yet.
 */
export function formatPermission(
  permission: Pick<PermissionItem, 'resource' | 'action'>,
): string {
  return `${permission.resource}:${permission.action}`;
}
