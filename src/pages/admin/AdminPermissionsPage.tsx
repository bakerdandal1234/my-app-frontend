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

/** Mirrors CreatePermissionDto/UpdatePermissionDto. */
const permissionSchema = z.object({
  resource: z
    .string()
    .min(2, 'Resource must be 2-100 characters.')
    .max(100, 'Resource must be 2-100 characters.'),
  action: z.string().min(2, 'Action must be 2-50 characters.').max(50, 'Action must be 2-50 characters.'),
  description: z.string().max(255, 'Description must be at most 255 characters.').optional(),
});
type PermissionFormValues = z.infer<typeof permissionSchema>;

function AdminPermissionsPage() {
  const { showToast } = useToast();
  const [permissions, setPermissions] = useState<PermissionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createForm = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: { resource: '', action: '', description: '' },
  });
  const editForm = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: { resource: '', action: '', description: '' },
  });

  async function loadPermissions() {
    setError(null);
    try {
      const res = await apiClient.get<PermissionItem[]>('/authorization/permissions');
      setPermissions(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadPermissions();
  }, []);

  async function onCreate(values: PermissionFormValues) {
    setRowError(null);
    try {
      await apiClient.post('/authorization/permissions', {
        resource: values.resource,
        action: values.action,
        ...(values.description ? { description: values.description } : {}),
      });
      createForm.reset();
      setShowCreateForm(false);
      await loadPermissions();
      showToast(`Permission "${values.resource}:${values.action}" created`);
    } catch (err) {
      // Surfaces the backend's 409 verbatim if this (resource, action) pair
      // already exists — see the unique constraint on the Permission entity.
      setRowError(getErrorMessage(err));
    }
  }

  function startEditing(permission: PermissionItem) {
    setEditingId(permission.id);
    setRowError(null);
    editForm.reset({
      resource: permission.resource,
      action: permission.action,
      description: permission.description ?? '',
    });
  }

  async function onSaveEdit(values: PermissionFormValues) {
    if (!editingId) return;
    setRowError(null);
    try {
      await apiClient.patch(`/authorization/permissions/${editingId}`, {
        resource: values.resource,
        action: values.action,
        description: values.description || undefined,
      });
      setEditingId(null);
      await loadPermissions();
      showToast('Permission updated');
    } catch (err) {
      setRowError(getErrorMessage(err));
    }
  }

  async function handleDelete(permission: PermissionItem) {
    if (
      !window.confirm(
        `Delete permission "${permission.resource}:${permission.action}"? This also removes it from every role that has it.`,
      )
    ) {
      return;
    }
    setRowError(null);
    try {
      await apiClient.delete(`/authorization/permissions/${permission.id}`);
      await loadPermissions();
      showToast(`Permission "${permission.resource}:${permission.action}" deleted`);
    } catch (err) {
      setRowError(getErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Permissions</h1>
          <div className="space-x-4 text-sm">
            <Link to="/admin/users" className="text-blue-600 hover:underline">
              Users
            </Link>
            <Link to="/admin/roles" className="text-blue-600 hover:underline">
              Roles
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
          {showCreateForm ? 'Cancel' : '+ New permission'}
        </button>

        {showCreateForm && (
          <form
            onSubmit={createForm.handleSubmit(onCreate)}
            className="space-y-2 rounded border border-slate-200 p-3"
          >
            <div>
              <input
                placeholder="Resource (e.g. roles)"
                {...createForm.register('resource')}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              {createForm.formState.errors.resource && (
                <p className="mt-1 text-xs text-red-600">
                  {createForm.formState.errors.resource.message}
                </p>
              )}
            </div>
            <div>
              <input
                placeholder="Action (e.g. read)"
                {...createForm.register('action')}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              {createForm.formState.errors.action && (
                <p className="mt-1 text-xs text-red-600">{createForm.formState.errors.action.message}</p>
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
              {createForm.formState.isSubmitting ? 'Creating…' : 'Create permission'}
            </button>
          </form>
        )}

        {permissions === null && !error && <p className="text-slate-500">Loading permissions…</p>}

        {permissions && (
          <ul className="divide-y divide-slate-200">
            {permissions.map((permission) => (
              <li key={permission.id} className="py-3">
                {editingId === permission.id ? (
                  <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="space-y-2">
                    <input
                      {...editForm.register('resource')}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                    {editForm.formState.errors.resource && (
                      <p className="text-xs text-red-600">{editForm.formState.errors.resource.message}</p>
                    )}
                    <input
                      {...editForm.register('action')}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                    {editForm.formState.errors.action && (
                      <p className="text-xs text-red-600">{editForm.formState.errors.action.message}</p>
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
                        onClick={() => setEditingId(null)}
                        className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {permission.resource}:{permission.action}
                      </p>
                      <p className="text-xs text-slate-500">{permission.description || 'No description'}</p>
                    </div>
                    <div className="space-x-1 text-xs">
                      <button
                        type="button"
                        onClick={() => startEditing(permission)}
                        className="rounded px-2 py-2 text-slate-600 hover:bg-slate-100 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(permission)}
                        className="rounded px-2 py-2 text-red-600 hover:bg-red-50 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
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

export default AdminPermissionsPage;
