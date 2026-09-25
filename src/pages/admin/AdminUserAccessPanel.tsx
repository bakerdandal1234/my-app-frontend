import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@heroui/react';
import { useState } from 'react';
import { useToast } from '../../ui/ToastContext';
import { apiClient } from '../../api/client';
import { adminListErrorVariants as errorVariants } from '../../lib/motion-variants';
import type { RoleItem } from '../../api/guards';
import { useUserAccess } from './useUserAccess';

interface AdminUserAccessPanelProps {
  userId: string;
  roles: RoleItem[];
}

/**
 * The "current roles / assign a role / effective permissions" content
 * shown once a user row is expanded. Mounted only while that row is
 * expanded (see AdminUserRow) — useUserAccess relies on that mount
 * boundary for its race-safety, so this must not be kept mounted and
 * merely hidden.
 */
function AdminUserAccessPanel({ userId, roles }: AdminUserAccessPanelProps) {
  const { showToast } = useToast();
  const { access, accessError, isMutating, mutate } = useUserAccess(userId);
  const [selectedRoleId, setSelectedRoleId] = useState('');

  const assignableRoles =
    access?.userId === userId
      ? roles.filter((role) => !access.roles.includes(role.name))
      : [];

  async function handleAssignRole(): Promise<void> {
    const role = roles.find((item) => item.id === selectedRoleId);
    if (!role) return;

    const ok = await mutate(() =>
      apiClient.post<unknown>(`/authorization/users/${userId}/roles/${role.id}`),
    );

    if (ok) {
      setSelectedRoleId('');
      showToast(`Assigned "${role.name}" role`);
    }
  }

  async function handleRemoveRole(roleName: string): Promise<void> {
    const role = roles.find((item) => item.name === roleName);
    if (!role) return;

    const ok = await mutate(() =>
      apiClient.delete<unknown>(`/authorization/users/${userId}/roles/${role.id}`),
    );

    if (ok) showToast(`Removed "${roleName}" role`);
  }

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
      {/* Access Error */}
      <AnimatePresence mode="wait">
        {accessError && (
          <motion.p
            key="access-error"
            variants={errorVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            role="alert"
          >
            {accessError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Loading Roles */}
      {!access && !accessError && (
        <div className="flex items-center gap-3 py-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />

          <p className="text-xs text-slate-400">Loading roles…</p>
        </div>
      )}

      {/* Access */}
      {access?.userId === userId && (
        <div className="space-y-5">
          {/* Current Roles */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">
                  Assigned roles
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Roles currently assigned to this user.
                </p>
              </div>

              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-400">
                {access.roles.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {access.roles.length === 0 && (
                <span className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-xs text-slate-500">
                  No roles assigned.
                </span>
              )}

              {access.roles.map((roleName) => (
                <span
                  key={roleName}
                  className="group flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300"
                >
                  {roleName}

                  <button
                    type="button"
                    onClick={() => handleRemoveRole(roleName)}
                    disabled={isMutating}
                    aria-label={`Remove ${roleName} role`}
                    className="-mr-1 rounded-full p-1 text-indigo-400 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Assign Role */}
          {assignableRoles.length > 0 && (
            <div className="border-t border-white/10 pt-5">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-white">
                  Assign a role
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Add another role to this user.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Available roles
                  </label>

                  <select
                    value={selectedRoleId}
                    onChange={(event) =>
                      setSelectedRoleId(event.target.value)
                    }
                    disabled={isMutating}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" className="bg-slate-900">
                      Add a role…
                    </option>

                    {assignableRoles.map((role) => (
                      <option
                        key={role.id}
                        value={role.id}
                        className="bg-slate-900"
                      >
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  onPress={handleAssignRole}
                  isDisabled={!selectedRoleId || isMutating}
                  className="bg-indigo-600 text-white hover:bg-indigo-500 sm:min-w-24"
                >
                  {isMutating ? 'Assigning…' : 'Assign'}
                </Button>
              </div>
            </div>
          )}

          {assignableRoles.length === 0 && roles.length > 0 && (
            <p className="border-t border-white/10 pt-4 text-xs text-slate-500">
              This user already has all available roles.
            </p>
          )}

          {/* Permissions */}
          <div className="border-t border-white/10 pt-5">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-white">
                Effective permissions
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Permissions inherited through the assigned roles.
              </p>
            </div>

            {access.permissions.length === 0 ? (
              <span className="text-xs text-slate-500">
                No permissions available.
              </span>
            ) : (
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {access.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-slate-400"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserAccessPanel;
