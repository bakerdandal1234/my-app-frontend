import { Navigate, Outlet } from 'react-router-dom';
import { useCustomerAuth } from './CustomerAuthContext';

/**
 * Gate for customer-only pages. While the initial silent refresh is in
 * flight we must render neither the page nor a redirect, otherwise a
 * reload on /customer/account would bounce a signed-in customer to the
 * login page before their cookie has had a chance to be used.
 */
function CustomerProtectedRoute() {
  const { isAuthenticated, isLoading } = useCustomerAuth();
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/customer/login" replace />;
  }

  return <Outlet />;
}

export default CustomerProtectedRoute;
