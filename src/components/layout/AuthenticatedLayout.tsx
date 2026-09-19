import { useAuth } from '../../auth/AuthContext';
import AppHeader, { type HeaderNavigationItem } from './AppHeader';
import { Link, Outlet, useLocation } from 'react-router-dom';
import RequirePermission from '../../auth/RequirePermission';
import UserMenu from './UserMenu';
const ADMIN_NAVIGATION: HeaderNavigationItem[] = [
  { label: 'Users', href: '/admin/users' },
  { label: 'Roles', href: '/admin/roles' },
  { label: 'Permissions', href: '/admin/permissions' },
  { label: 'Home', href: '/home' },
];

/**
 * Shared layout for every authenticated page (nested inside <ProtectedRoute>
 * in App.tsx). Renders AppHeader once, plus an <Outlet/> for the actual
 * page content, instead of each protected page re-implementing its own
 * header. By the time this renders, ProtectedRoute already guarantees
 * isLoading is false and user is non-null.
 *
 * The three /admin/* pages used to each hand-roll their own
 * Users/Roles/Permissions/Home link row; that's now handled here via
 * AppHeader's `navigation` prop, shown only while on an /admin/* route.
 */
function AuthenticatedLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigation = location.pathname.startsWith('/admin')
    ? ADMIN_NAVIGATION
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AppHeader
  appName="FlowDesk"
  navigation={navigation}
  actions={
    <>
      <RequirePermission permission="roles:read">
        <Link
          to="/admin/users"
          className="hidden rounded-lg px-3 py-2 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-500/10 hover:text-purple-200 md:block"
        >
          Administration
        </Link>
      </RequirePermission>

      {user && (
        <UserMenu
          user={user}
          onLogout={logout}
        />
      )}
    </>
  }
/>

      <Outlet />
    </div>
  );
}

export default AuthenticatedLayout;
