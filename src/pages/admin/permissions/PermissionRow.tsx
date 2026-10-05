import { motion } from 'framer-motion';
import { Button } from '@heroui/react';
import type { UseFormReturn } from 'react-hook-form';
import type { PermissionItem } from '../../../auth/authorization/authorization-contracts';
import { formatPermission } from '../../../auth/authorization/permissions';
import { PermissionFormFields } from './CreatePermissionForm';
import type { PermissionFormValues } from './permission-schema';

interface PermissionRowProps {
  permission: PermissionItem;
  isEditing: boolean;
  isMutating: boolean;
  editForm: UseFormReturn<PermissionFormValues>;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (values: PermissionFormValues) => Promise<void>;
  onDelete: () => void;
}

function PermissionRow({
  permission, isEditing, isMutating, editForm,
  onStartEdit, onCancelEdit, onSaveEdit, onDelete,
}: PermissionRowProps) {
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:px-5">
      {isEditing ? (
        <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4">
          <fieldset disabled={isMutating || editForm.formState.isSubmitting}>
            <PermissionFormFields form={editForm} idPrefix={`edit-permission-${permission.id}`} />
            <div className="mt-4 flex gap-2">
              <Button type="submit" variant="primary" isDisabled={isMutating || editForm.formState.isSubmitting} className="bg-indigo-600 text-white hover:bg-indigo-500">
                {editForm.formState.isSubmitting ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="ghost" onPress={onCancelEdit} isDisabled={isMutating} className="border border-white/10 text-slate-300 hover:bg-white/10">
                Cancel
              </Button>
            </div>
          </fieldset>
        </form>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-sm text-indigo-300">/</div>
            <div className="min-w-0">
              <p className="truncate font-mono text-sm font-medium text-white">{formatPermission(permission)}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{permission.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="ghost" onPress={onStartEdit} isDisabled={isMutating} className="border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              Edit
            </Button>
            <Button type="button" variant="ghost" onPress={onDelete} isDisabled={isMutating} className="border border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/20">
              Delete
            </Button>
          </div>
        </div>
      )}
    </motion.li>
  );
}

export default PermissionRow;
