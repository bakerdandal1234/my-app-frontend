import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface RequirePermissionProps {
  permission: string;
  children: ReactNode;
  /** Rendered instead when the permission is missing. Defaults to nothing. */
  fallback?: ReactNode;
}

/**
 * Shows/hides UI based on the current user's resolved permissions (from
 * GET /users/me/access, loaded into AuthContext — see hasPermission()).
 * This is UI convenience only, not a security boundary: every actual
 * permission check still happens server-side via @Permissions() guards.
 * Hiding a button here just avoids showing the user an action that would
 * 403 anyway.
 */
function RequirePermission({ permission, children, fallback = null }: RequirePermissionProps) {
  const { hasPermission } = useAuth();
  return <>{hasPermission(permission) ? children : fallback}</>;
}

export default RequirePermission;
