import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import { useToast } from '../../ui/ToastContext';

interface PermissionItem {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

interface RolePermissionItem {
  permissionId: string;
  permission: PermissionItem;
}

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  rolePermissions: RolePermissionItem[];
}

/** Mirrors CreateRoleDto/UpdateRoleDto — name is lowercased/trimmed server-side. */
const roleSchema = z.object({
  name: z.string().min(2, 'Name must be 2-50 characters.').max(50, 'Name must be 2-50 characters.'),
  description: z.string().max(255, 'Description must be at most 255 characters.').optional(),
});
type RoleFormValues = z.infer<typeof roleSchema>;

function permissionLabel(p: PermissionItem): string {
  return `${p.resource}:${p.action}`;
}

function AdminRolesPage() {
  const { showToast } = useToast();
  const [roles, setRoles] = useState<RoleItem[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [selectedPermissionId, setSelectedPermissionId] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const createForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '' },
  });
  const editForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '' },
  });

  async function loadRolesAndPermissions() {
    setError(null);
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        apiClient.get<RoleItem[]>('/authorization/roles'),
        apiClient.get<PermissionItem[]>('/authorization/permissions'),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadRolesAndPermissions();
  }, []);

  async function onCreateRole(values: RoleFormValues) {
    setRowError(null);
    try {
      await apiClient.post('/authorization/roles', {
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
      });
      createForm.reset();
      setShowCreateForm(false);
      await loadRolesAndPermissions();
      showToast(`Role "${values.name.toLowerCase().trim()}" created`);
    } catch (err) {
      setRowError(getErrorMessage(err));
    }
  }

  function startEditing(role: RoleItem) {
    setEditingRoleId(role.id);
    setRowError(null);
    editForm.reset({ name: role.name, description: role.description ?? '' });
  }

  async function onSaveEdit(values: RoleFormValues) {
    if (!editingRoleId) return;
    setRowError(null);
    try {
      await apiClient.patch(`/authorization/roles/${editingRoleId}`, {
        name: values.name,
        description: values.description || undefined,
      });
      setEditingRoleId(null);
      await loadRolesAndPermissions();
      showToast('Role updated');
    } catch (err) {
      setRowError(getErrorMessage(err));
    }
  }

  async function handleDeleteRole(role: RoleItem) {
    if (!window.confirm(`Delete role "${role.name}"? This also removes it from every user who has it.`)) {
      return;
    }
    setRowError(null);
    try {
      await apiClient.delete(`/authorization/roles/${role.id}`);
      await loadRolesAndPermissions();
      showToast(`Role "${role.name}" deleted`);
    } catch (err) {
      setRowError(getErrorMessage(err));
    }
  }

  function toggleExpand(roleId: string) {
    setExpandedRoleId(expandedRoleId === roleId ? null : roleId);
    setSelectedPermissionId('');
    setRowError(null);
  }

  async function handleAssignPermission(roleId: string) {
    if (!selectedPermissionId) return;
    const perm = permissions.find((p) => p.id === selectedPermissionId);
    setIsMutating(true);
    setRowError(null);
    try {
      await apiClient.post(`/authorization/roles/${roleId}/permissions/${selectedPermissionId}`);
      setSelectedPermissionId('');
      await loadRolesAndPermissions();
      showToast(`Assigned "${perm ? permissionLabel(perm) : 'permission'}"`);
    } catch (err) {
      setRowError(getErrorMessage(err));
    } finally {
      setIsMutating(false);
    }
  }

  async function handleRemovePermission(roleId: string, permissionId: string, label: string) {
    setIsMutating(true);
    setRowError(null);
    try {
      await apiClient.delete(`/authorization/roles/${roleId}/permissions/${permissionId}`);
      await loadRolesAndPermissions();
      showToast(`Removed "${label}"`);
    } catch (err) {
      setRowError(getErrorMessage(err));
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Roles</h1>
          <div className="space-x-4 text-sm">
            <Link to="/admin/users" className="text-blue-600 hover:underline">
              Users
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
        {rowError && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {rowError}
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreateForm ? 'Cancel' : '+ New role'}
        </button>

        {showCreateForm && (
          <form
            onSubmit={createForm.handleSubmit(onCreateRole)}
            className="space-y-2 rounded border border-slate-200 p-3"
          >
            <div>
              <input
                placeholder="Name (will be lowercased)"
                {...createForm.register('name')}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              {createForm.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <input
                placeholder="Description (optional)"
                {...createForm.register('description')}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              {createForm.formState.errors.description && (
                <p className="mt-1 text-xs text-red-600">
                  {createForm.formState.errors.description.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={createForm.formState.isSubmitting}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createForm.formState.isSubmitting ? 'Creating…' : 'Create role'}
            </button>
          </form>
        )}

        {roles === null && !error && <p className="text-slate-500">Loading roles…</p>}

        {roles && (
          <ul className="divide-y divide-slate-200">
            {roles.map((role) => {
              const assignedIds = new Set(role.rolePermissions.map((rp) => rp.permissionId));
              const assignablePermissions = permissions.filter((p) => !assignedIds.has(p.id));

              return (
                <li key={role.id} className="py-3">
                  {editingRoleId === role.id ? (
                    <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="space-y-2">
                      <input
                        {...editForm.register('name')}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      {editForm.formState.errors.name && (
                        <p className="text-xs text-red-600">{editForm.formState.errors.name.message}</p>
                      )}
                      <input
                        {...editForm.register('description')}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      <div className="space-x-2">
                        <button
                          type="submit"
                          disabled={editForm.formState.isSubmitting}
                          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRoleId(null)}
                          className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => toggleExpand(role.id)} className="text-left">
                        <p className="text-sm font-medium text-slate-800">{role.name}</p>
                        <p className="text-xs text-slate-500">{role.description || 'No description'}</p>
                      </button>
                      <div className="space-x-1 text-xs">
                        <button
                          type="button"
                          onClick={() => toggleExpand(role.id)}
                          className="rounded px-2 py-2 text-blue-600 hover:bg-blue-50 hover:underline"
                        >
                          {expandedRoleId === role.id ? 'Hide permissions' : 'Manage permissions'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditing(role)}
                          className="rounded px-2 py-2 text-slate-600 hover:bg-slate-100 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRole(role)}
                          className="rounded px-2 py-2 text-red-600 hover:bg-red-50 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {expandedRoleId === role.id && (
                    <div className="mt-3 rounded bg-slate-50 p-3 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {role.rolePermissions.length === 0 && (
                          <span className="text-xs text-slate-500">No permissions assigned.</span>
                        )}
                        {role.rolePermissions.map((rp) => (
                          <span
                            key={rp.permissionId}
                            className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                          >
                            {permissionLabel(rp.permission)}
                            <button
                              type="button"
                              onClick={() => handleRemovePermission(role.id, rp.permissionId, permissionLabel(rp.permission))}
                              disabled={isMutating}
                              aria-label={`Remove ${permissionLabel(rp.permission)}`}
                              className="-m-1.5 rounded-full p-1.5 text-blue-500 hover:bg-blue-200 hover:text-blue-900 disabled:opacity-50"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      {assignablePermissions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedPermissionId}
                            onChange={(e) => setSelectedPermissionId(e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                          >
                            <option value="">Add a permission…</option>
                            {assignablePermissions.map((p) => (
                              <option key={p.id} value={p.id}>
                                {permissionLabel(p)}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAssignPermission(role.id)}
                            disabled={!selectedPermissionId || isMutating}
                            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Assign
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AdminRolesPage;
