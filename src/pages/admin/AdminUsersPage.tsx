import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import { useToast } from '../../ui/ToastContext';

interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  createdAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  description?: string;
}

interface UserAccess {
  userId: string;
  roles: string[];
  permissions: string[];
}

function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Which user row is expanded, and that user's current roles (lazily
  // loaded on expand rather than N+1-fetched for every row up front).
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  // Role name -> id, since GET /authorization/users/:userId/access only
  // returns role *names* (see AuthorizationService.getUserAuthorization()),
  // but assign/remove need the role id.
  const roleIdByName = new Map(roles.map((r) => [r.name, r.id]));

  async function loadUsersAndRoles() {
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get<AdminUser[]>('/authorization/users'),
        apiClient.get<RoleItem[]>('/authorization/roles'),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadUsersAndRoles();
  }, []);

  async function loadAccess(userId: string) {
    setAccessError(null);
    setSelectedRoleId('');
    try {
      const res = await apiClient.get<UserAccess>(`/authorization/users/${userId}/access`);
      setAccess(res.data);
    } catch (err) {
      setAccessError(getErrorMessage(err));
    }
  }

  function toggleExpand(userId: string) {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setAccess(null);
      return;
    }
    setExpandedUserId(userId);
    setAccess(null);
    loadAccess(userId);
  }

  async function handleAssignRole(userId: string) {
    if (!selectedRoleId) return;
    const roleName = roles.find((r) => r.id === selectedRoleId)?.name ?? 'role';
    setIsMutating(true);
    setAccessError(null);
    try {
      await apiClient.post(`/authorization/users/${userId}/roles/${selectedRoleId}`);
      await loadAccess(userId);
      showToast(`Assigned "${roleName}" role`);
    } catch (err) {
      setAccessError(getErrorMessage(err));
    } finally {
      setIsMutating(false);
    }
  }

  async function handleRemoveRole(userId: string, roleName: string) {
    const roleId = roleIdByName.get(roleName);
    if (!roleId) return;
    setIsMutating(true);
    setAccessError(null);
    try {
      await apiClient.delete(`/authorization/users/${userId}/roles/${roleId}`);
      await loadAccess(userId);
      showToast(`Removed "${roleName}" role`);
    } catch (err) {
      setAccessError(getErrorMessage(err));
    } finally {
      setIsMutating(false);
    }
  }

  const assignableRoles = access ? roles.filter((r) => !access.roles.includes(r.name)) : [];

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <div className="space-x-4 text-sm">
            <Link to="/admin/roles" className="text-blue-600 hover:underline">
              Roles
            </Link>
            <Link to="/admin/permissions" className="text-blue-600 hover:underline">
              Permissions
            </Link>
            <Link to="/" className="text-blue-600 hover:underline">
              Back to home
            </Link>
          </div>
        </div>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {users === null && !error && <p className="text-slate-500">Loading users…</p>}

        {users && (
          <ul className="divide-y divide-slate-200">
            {users.map((u) => (
              <li key={u.id} className="py-3">
                <button
                  type="button"
                  onClick={() => toggleExpand(u.id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">{u.email}</p>
                    <p className="text-xs text-slate-500">
                      {[u.firstName, u.lastName].filter(Boolean).join(' ') || 'No name'} ·{' '}
                      {u.isEmailVerified ? 'Verified' : 'Unverified'}
                    </p>
                  </div>
                  <span className="text-xs text-blue-600">
                    {expandedUserId === u.id ? 'Hide roles' : 'Manage roles'}
                  </span>
                </button>

                {expandedUserId === u.id && (
                  <div className="mt-3 rounded bg-slate-50 p-3 space-y-3">
                    {accessError && (
                      <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                        {accessError}
                      </p>
                    )}

                    {!access && !accessError && (
                      <p className="text-xs text-slate-500">Loading roles…</p>
                    )}

                    {access && (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {access.roles.length === 0 && (
                            <span className="text-xs text-slate-500">No roles assigned.</span>
                          )}
                          {access.roles.map((roleName) => (
                            <span
                              key={roleName}
                              className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                            >
                              {roleName}
                              <button
                                type="button"
                                onClick={() => handleRemoveRole(u.id, roleName)}
                                disabled={isMutating}
                                aria-label={`Remove ${roleName} role`}
                                className="-m-1.5 rounded-full p-1.5 text-blue-500 hover:bg-blue-200 hover:text-blue-900 disabled:opacity-50"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>

                        {assignableRoles.length > 0 && (
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedRoleId}
                              onChange={(e) => setSelectedRoleId(e.target.value)}
                              className="rounded border border-slate-300 px-2 py-1 text-sm"
                            >
                              <option value="">Add a role…</option>
                              {assignableRoles.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleAssignRole(u.id)}
                              disabled={!selectedRoleId || isMutating}
                              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Assign
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AdminUsersPage;
