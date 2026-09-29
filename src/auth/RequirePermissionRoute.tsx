import { Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import FullPageLoading from '../ui/FullPageLoading';

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
  const { accessStatus, accessError, retryAccess, hasPermission } = useAuth();

  if (accessStatus === 'idle' || accessStatus === 'loading') {
    return <FullPageLoading label="Loading permissions…" />;
  }

  if (accessStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-bold text-slate-800">Unable to load permissions</h1>
          <p className="mt-2 text-slate-600" role="alert">
            {accessError ?? 'Your permissions could not be loaded. Please try again.'}
          </p>
          <button
            type="button"
            onClick={() => { void retryAccess(); }}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
