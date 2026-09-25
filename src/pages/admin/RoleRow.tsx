import { motion, AnimatePresence } from 'framer-motion';
import type { UseFormReturn } from 'react-hook-form';
import { Button, Input } from '@heroui/react';
import type { PermissionItem, RoleItem } from '../../api/guards';
import { itemVariants } from '../../lib/motion-variants';
import type { RoleFormValues } from './role-schema';
import RolePermissionsPanel from './RolePermissionsPanel';

interface RoleRowProps {
  role: RoleItem;
  permissions: PermissionItem[];
  isEditing: boolean;
  isExpanded: boolean;
  isMutating: boolean;
  editForm: UseFormReturn<RoleFormValues>;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (values: RoleFormValues) => Promise<void>;
  onDelete: () => void;
  onToggleExpand: () => void;
  onAssignPermission: (roleId: string, permissionId: string) => Promise<boolean>;
  onRemovePermission: (
    roleId: string,
    permissionId: string,
    label: string,
  ) => Promise<void>;
}

/**
 * One row in the role registry: either the display row (name, description,
 * Manage/Edit/Delete) or the inline edit form, plus the permissions panel,
 * which only mounts while expanded — see RolePermissionsPanel for why that
 * mount boundary matters for its selection state.
 */
function RoleRow({
  role,
  permissions,
  isEditing,
  isExpanded,
  isMutating,
  editForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onToggleExpand,
  onAssignPermission,
  onRemovePermission,
}: RoleRowProps) {
  return (
    <motion.div
      variants={itemVariants}
      layout
      className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/[0.07]"
    >
      {/* Role Row */}
      {isEditing ? (
        <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`edit-role-name-${role.id}`}
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Role name
              </label>

              <Input
                id={`edit-role-name-${role.id}`}
                {...editForm.register('name')}
                className="text-black"
              />

              {editForm.formState.errors.name && (
                <p className="mt-1.5 text-xs text-red-300">
                  {editForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`edit-role-description-${role.id}`}
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Description
              </label>

              <Input
                id={`edit-role-description-${role.id}`}
                {...editForm.register('description')}
                className="text-black"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              type="submit"
              variant="primary"
              isDisabled={editForm.formState.isSubmitting}
              className="bg-indigo-600 text-white hover:bg-indigo-500"
            >
              {editForm.formState.isSubmitting ? 'Saving…' : 'Save'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onPress={onCancelEdit}
              className="text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onToggleExpand}
            className="min-w-0 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-sm font-semibold text-indigo-300 ring-1 ring-indigo-400/10">
                {role.name.slice(0, 1).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {role.name}
                </p>

                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {role.description || 'No description'}
                </p>
              </div>
            </div>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200"
            >
              {isExpanded ? 'Hide permissions' : 'Manage permissions'}
            </button>

            <button
              type="button"
              onClick={onStartEdit}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Permissions Panel */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <RolePermissionsPanel
              role={role}
              permissions={permissions}
              isMutating={isMutating}
              onAssign={onAssignPermission}
              onRemove={onRemovePermission}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default RoleRow;
