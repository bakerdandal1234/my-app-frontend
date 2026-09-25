import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@heroui/react';
import type { PermissionItem, RoleItem } from '../../api/guards';
import { formatPermission } from '../../auth/permissions';

interface RolePermissionsPanelProps {
  role: RoleItem;
  permissions: PermissionItem[];
  isMutating: boolean;
  /** Performs the POST and returns whether it succeeded, so this panel knows whether to clear its selection. */
  onAssign: (roleId: string, permissionId: string) => Promise<boolean>;
  onRemove: (roleId: string, permissionId: string, label: string) => Promise<void>;
}

/**
 * The assigned-permissions chips and "add a permission" picker shown when
 * a role row is expanded. Mounted only while expanded, so its selection
 * resets on its own the next time a (possibly different) role is opened.
 */
function RolePermissionsPanel({
  role,
  permissions,
  isMutating,
  onAssign,
  onRemove,
}: RolePermissionsPanelProps) {
  const [selectedPermissionId, setSelectedPermissionId] = useState('');

  const assignedIds = new Set(
    role.rolePermissions.map((rolePermission) => rolePermission.permissionId),
  );

  const assignablePermissions = permissions.filter(
    (permission) => !assignedIds.has(permission.id),
  );

  async function handleAssign(): Promise<void> {
    if (!selectedPermissionId) return;

    const ok = await onAssign(role.id, selectedPermissionId);
    if (ok) setSelectedPermissionId('');
  }

  return (
    <div className="border-t border-white/10 bg-slate-950/40 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">
          Assigned permissions
        </h3>

        <p className="mt-1 text-xs text-slate-400">
          Manage the permissions available to this role.
        </p>
      </div>

      {/* Assigned permissions */}
      <div className="flex flex-wrap gap-2">
        {role.rolePermissions.length === 0 && (
          <span className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-500">
            No permissions assigned.
          </span>
        )}

        {role.rolePermissions.map((rolePermission) => {
          const label = formatPermission(rolePermission.permission);

          return (
            <motion.span
              key={rolePermission.permissionId}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200"
            >
              {label}

              <button
                type="button"
                onClick={() =>
                  onRemove(role.id, rolePermission.permissionId, label)
                }
                disabled={isMutating}
                aria-label={`Remove ${label}`}
                className="-mr-1 rounded-full p-1 text-indigo-300 transition-colors hover:bg-indigo-400/20 hover:text-white disabled:opacity-50"
              >
                ×
              </button>
            </motion.span>
          );
        })}
      </div>

      {/* Assign permission */}
      {assignablePermissions.length > 0 && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-300">
              Add permission
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Select a permission that is not already assigned.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedPermissionId}
              onChange={(event) =>
                setSelectedPermissionId(event.target.value)
              }
              className="min-h-10 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-slate-200 outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Add a permission…</option>

              {assignablePermissions.map((permission) => (
                <option key={permission.id} value={permission.id}>
                  {formatPermission(permission)}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="primary"
              onPress={handleAssign}
              isDisabled={!selectedPermissionId || isMutating}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {isMutating ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </div>
      )}

      {assignablePermissions.length === 0 && permissions.length > 0 && (
        <div className="mt-5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2">
          <p className="text-xs text-emerald-300">
            All available permissions are assigned to this role.
          </p>
        </div>
      )}
    </div>
  );
}

export default RolePermissionsPanel;
