import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null; // ProtectedRoute guarantees this won't render logged out.

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Profile</h1>
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            Back to home
          </Link>
        </div>

        <dl className="divide-y divide-slate-200">
          <div className="py-2 flex justify-between">
            <dt className="text-sm text-slate-500">Email</dt>
            <dd className="text-sm font-medium text-slate-800">{user.email}</dd>
          </div>

          <div className="py-2 flex justify-between">
            <dt className="text-sm text-slate-500">Name</dt>
            <dd className="text-sm font-medium text-slate-800">{fullName || '—'}</dd>
          </div>

          <div className="py-2 flex justify-between">
            <dt className="text-sm text-slate-500">Email verified</dt>
            <dd className={`text-sm font-medium ${user.isEmailVerified ? 'text-green-600' : 'text-amber-600'}`}>
              {user.isEmailVerified ? 'Yes' : 'No'}
            </dd>
          </div>

          <div className="py-2 flex justify-between">
            <dt className="text-sm text-slate-500">Two-factor authentication</dt>
            <dd className={`text-sm font-medium ${user.isTwoFactorEnabled ? 'text-green-600' : 'text-slate-600'}`}>
              {user.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
            </dd>
          </div>

          {(user.googleId || user.githubId) && (
            <div className="py-2 flex justify-between">
              <dt className="text-sm text-slate-500">Linked accounts</dt>
              <dd className="text-sm font-medium text-slate-800">
                {[user.googleId && 'Google', user.githubId && 'GitHub'].filter(Boolean).join(', ')}
              </dd>
            </div>
          )}

          <div className="py-2 flex justify-between">
            <dt className="text-sm text-slate-500">Member since</dt>
            <dd className="text-sm font-medium text-slate-800">
              {new Date(user.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>

        <div className="flex gap-4 pt-2 text-sm">
          <Link to="/settings/2fa" className="text-blue-600 hover:underline">
            Manage 2FA
          </Link>
          <Link to="/sessions" className="text-blue-600 hover:underline">
            Manage sessions
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
