import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import RequirePermission from '../auth/RequirePermission';

function HomePage() {
  const { user, roles, permissions, isAuthenticated, isLoading, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800">my-app-frontend</h1>
        <p className="mt-2 text-slate-500">
          API target: <code className="text-slate-700">{import.meta.env.VITE_API_URL}</code>
        </p>
        <p className="mt-4 text-slate-600">
          {isLoading
            ? 'Checking session…'
            : isAuthenticated
              ? `Logged in as ${user?.email}`
              : 'Not logged in'}
        </p>

        {!isLoading && !isAuthenticated && (
          <div className="mt-4 space-x-4">
            <Link to="/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
            <Link to="/register" className="text-blue-600 hover:underline">
              Create an account
            </Link>
          </div>
        )}

        {!isLoading && isAuthenticated && (
          <div className="mt-4 space-y-3">
            <div className="space-x-4">
              <Link to="/profile" className="text-blue-600 hover:underline">
                Profile
              </Link>
              <Link to="/sessions" className="text-blue-600 hover:underline">
                Sessions
              </Link>
              <Link to="/settings/2fa" className="text-blue-600 hover:underline">
                Manage 2FA
              </Link>
            </div>

            <p className="text-xs text-slate-500">
              Roles: {roles.join(', ') || '—'} &middot; Permissions: {permissions.join(', ') || '—'}
            </p>

            <RequirePermission permission="roles:read">
              <p className="text-sm font-medium text-purple-700">
                You have admin-level access (roles:read).{' '}
                <Link to="/admin/users" className="underline">
                  Open admin dashboard
                </Link>
              </p>
            </RequirePermission>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isLoggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
