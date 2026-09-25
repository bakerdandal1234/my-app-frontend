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
import { PERMISSIONS } from './auth/permissions';
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

      <Route element={<ProtectedRoute />}>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/settings/2fa" element={<TwoFactorSetupPage />} />
          <Route path="/settings/change-password" element={<ChangePasswordPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/home" element={<HomePage />} />

          <Route element={<RequirePermissionRoute permission={PERMISSIONS.ROLES_READ} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/roles" element={<AdminRolesPage />} />
          </Route>

          <Route element={<RequirePermissionRoute permission={PERMISSIONS.PERMISSIONS_READ} />}>
            <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
