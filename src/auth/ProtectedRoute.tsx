import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import FullPageLoading from '../ui/FullPageLoading';

/**
 * Gate for any route that requires a logged-in user. Used via nested
 * routes in App.tsx: <Route element={<ProtectedRoute />}>...</Route>.
 * Waits out the initial silent-refresh (isLoading) before deciding, so a
 * refresh doesn't briefly bounce an already-logged-in user to /login.
 */
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageLoading label="Checking session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
