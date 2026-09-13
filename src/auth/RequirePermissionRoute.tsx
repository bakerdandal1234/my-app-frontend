import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface RequirePermissionRouteProps {
  permission: string;
}

/**
 * Route-level counterpart to RequirePermission: gates an entire nested
 * route tree behind a specific permission, rather than hiding one bit of
 * UI. Must be nested inside <ProtectedRoute> — it only checks the
 * permission, not login status, since a logged-out user should be
 * redirected to /login (ProtectedRoute's job), not shown "Access denied".
 */
function RequirePermissionRoute({ permission }: RequirePermissionRouteProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-bold text-slate-800">Access denied</h1>
          <p className="mt-2 text-slate-600">
            You don&apos;t have the required permission ({permission}) to view this page.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export default RequirePermissionRoute;
