import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/user/HomePage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OAuthCallbackPage from '././pages/auth/OAuthCallbackPage';
import TwoFactorSetupPage from './pages/user/SecurityPage';
import ProfilePage from './pages/user/ProfilePage';
import SessionsPage from '././pages/user/SessionsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminPermissionsPage from './pages/admin/AdminPermissionsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './auth/ProtectedRoute';
import RequirePermissionRoute from './auth/RequirePermissionRoute';
import ChangePasswordPage from '././pages/user/ChangePasswordPage';
import AuthenticatedLayout from './components/layout/AuthenticatedLayout';
import LandingPage from './pages/LandingPage';
import CustomerAuthLayout from './customer/CustomerAuthLayout';
import CustomerProtectedRoute from './customer/CustomerProtectedRoute';
import CustomerLoginPage from './pages/customer/CustomerLoginPage';
import CustomerAccountPage from './pages/customer/CustomerAccountPage';
import AuthenticatedCustomerLayout from './components/layout/AuthenticatedCustomerLayout';
import CustomerSessionsPage from './pages/customer/CustomerSessionsPage';
import CustomerSecurityPage from './pages/customer/CustomerSecurityPage';
import CustomerProfile from './pages/customer/CustomerProfile';
import CustomerOAuthCallbackPage from './pages/auth/CustomerOAuthCallbackPage';
function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

      {/*
        Customer side (Google-only login), completely separate from the
        staff routes above: its own provider, its own axios instance, its
        own in-memory access token and its own cookies. Both sessions can
        be held in the same browser at once without interfering.

        /customer/oauth/callback is the ONLY redirect target the backend's
        customer Google callback ever sends the browser to, and it sits
        outside CustomerProtectedRoute because the visitor is not signed in
        yet when they land on it.
      */}
      <Route path="/customer" element={<CustomerAuthLayout />}>
  <Route path="login" element={<CustomerLoginPage />} />
  <Route
    path="oauth/callback"
    element={<CustomerOAuthCallbackPage />}
  />

  <Route element={<CustomerProtectedRoute />}>
    <Route element={<AuthenticatedCustomerLayout />}>
      <Route path="account" element={<CustomerAccountPage />} />
      <Route path="sessions"  element={<CustomerSessionsPage />}/>
      <Route path="security"  element={<CustomerSecurityPage />}/>
      <Route path="profile"  element={<CustomerProfile />}/>

      
    </Route>
  </Route>
</Route>


      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/settings/2fa" element={<TwoFactorSetupPage />} />
          <Route path="/settings/change-password" element={<ChangePasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/home" element={<HomePage />} />

          <Route element={<RequirePermissionRoute permission="roles:read" />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/roles" element={<AdminRolesPage />} />
          </Route>

          <Route element={<RequirePermissionRoute permission="permissions:read" />}>
            <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
