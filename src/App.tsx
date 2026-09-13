import { Routes, Route } from 'react-router-dom';
import { Button } from '@heroui/react';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import TwoFactorSetupPage from './pages/TwoFactorSetupPage';
import ProfilePage from './pages/ProfilePage';
import SessionsPage from './pages/SessionsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRolesPage from './pages/admin/AdminRolesPage';
import AdminPermissionsPage from './pages/admin/AdminPermissionsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './auth/ProtectedRoute';
import RequirePermissionRoute from './auth/RequirePermissionRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/settings/2fa" element={<TwoFactorSetupPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/sessions" element={<SessionsPage />} />

        <Route element={<RequirePermissionRoute permission="roles:read" />}>
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/roles" element={<AdminRolesPage />} />
        </Route>

        <Route element={<RequirePermissionRoute permission="permissions:read" />}>
          <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
        </Route>
      </Route>

      {/* HeroUI smoke test — remove once we start actually redesigning real pages */}
      <Route
        path="/heroui-smoke-test"
        element={
          <div className="flex min-h-screen items-center justify-center gap-4">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
          </div>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
