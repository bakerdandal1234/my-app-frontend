import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input } from '@heroui/react';

import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import { useToast } from '../../ui/ToastContext';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import {
  adminListContainerVariants as containerVariants,
  adminListItemVariants as itemVariants,
  adminListErrorVariants as errorVariants,
} from '../../lib/motion-variants';

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
  action: z
    .string()
    .min(2, 'Action must be 2-50 characters.')
    .max(50, 'Action must be 2-50 characters.'),
  description: z
    .string()
    .max(255, 'Description must be at most 255 characters.')
    .optional(),
});

type PermissionFormValues = z.infer<typeof permissionSchema>;

// containerVariants / itemVariants / errorVariants now come from the
// shared ../../lib/motion-variants (this "admin list page" family is also
// used by AdminUsersPage; AdminRolesPage shares itemVariants/
// errorVariants but keeps its own containerVariants — see that file).

const ADMIN_PERMISSIONS_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none absolute inset-0 overflow-hidden';

const ADMIN_PERMISSIONS_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
  {
    x: [0, 50, 0],
    y: [0, 35, 0],
    scale: [1, 1.15, 1],
    duration: 14,
    className:
      'absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl',
  },
  {
    x: [0, -45, 0],
    y: [0, -30, 0],
    scale: [1, 1.1, 1],
    duration: 17,
    className:
      'absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl',
  },
];

function AdminPermissionsPage() {
  const { showToast } = useToast();

  const [permissions, setPermissions] = useState<PermissionItem[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createForm = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      resource: '',
      action: '',
      description: '',
    },
  });

  const editForm = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      resource: '',
      action: '',
      description: '',
    },
  });

  async function loadPermissions() {
    setError(null);

    try {
      const res = await apiClient.get<PermissionItem[]>(
        '/authorization/permissions',
      );

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
        ...(values.description
          ? { description: values.description }
          : {}),
      });

      createForm.reset();
      setShowCreateForm(false);

      await loadPermissions();

      showToast(
        `Permission "${values.resource}:${values.action}" created`,
      );
    } catch (err) {
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
      await apiClient.patch(
        `/authorization/permissions/${editingId}`,
        {
          resource: values.resource,
          action: values.action,
          description: values.description || undefined,
        },
      );

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
      await apiClient.delete(
        `/authorization/permissions/${permission.id}`,
      );

      await loadPermissions();

      showToast(
        `Permission "${permission.resource}:${permission.action}" deleted`,
      );
    } catch (err) {
      setRowError(getErrorMessage(err));
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <AnimatedBackground
        wrapperClassName={ADMIN_PERMISSIONS_BACKGROUND_WRAPPER_CLASSNAME}
        blobs={ADMIN_PERMISSIONS_BACKGROUND_BLOBS}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto max-w-6xl"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-medium text-indigo-400">
                FlowDesk
              </span>

              <span className="text-slate-600">/</span>

              <span className="text-sm text-slate-400">
                Administration
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Permissions
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage system permissions and control role capabilities.
            </p>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="p-5 sm:p-7">
              {/* Card Header */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Permission Registry
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {permissions
                      ? `${permissions.length} permission${
                          permissions.length === 1 ? '' : 's'
                        } configured`
                      : 'Loading permissions…'}
                  </p>
                </div>

                <Button
                  type="button"
                  variant={showCreateForm ? 'ghost' : 'primary'}
                  onPress={() =>
                    setShowCreateForm((value) => !value)
                  }
                  className={
                    showCreateForm
                      ? 'border border-white/10 text-slate-300 hover:bg-white/10'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }
                >
                  {showCreateForm
                    ? 'Cancel'
                    : '+ New permission'}
                </Button>
              </div>

              {/* Errors */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="load-error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}

                {rowError && (
                  <motion.p
                    key="row-error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    role="alert"
                  >
                    {rowError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Create Form */}
              <AnimatePresence>
                {showCreateForm && (
                  <motion.form
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: 'auto',
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                    transition={{ duration: 0.25 }}
                    onSubmit={createForm.handleSubmit(onCreate)}
                    className="mb-6 overflow-hidden"
                  >
                    <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-5">
                      <div className="mb-4">
                        <h3 className="font-medium text-white">
                          Create permission
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          Permissions follow the resource:action
                          format.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Resource */}
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Resource
                          </label>

                          <Input
                            placeholder="e.g. roles"
                            {...createForm.register('resource')}
                            className="text-white"
                          />

                          {createForm.formState.errors.resource && (
                            <p className="mt-1 text-xs text-red-300">
                              {
                                createForm.formState.errors.resource
                                  .message
                              }
                            </p>
                          )}
                        </div>

                        {/* Action */}
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Action
                          </label>

                          <Input
                            placeholder="e.g. read"
                            {...createForm.register('action')}
                            className="text-white"
                          />

                          {createForm.formState.errors.action && (
                            <p className="mt-1 text-xs text-red-300">
                              {
                                createForm.formState.errors.action
                                  .message
                              }
                            </p>
                          )}
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Description
                          </label>

                          <Input
                            placeholder="Optional description"
                            {...createForm.register('description')}
                            className="text-white"
                          />

                          {createForm.formState.errors.description && (
                            <p className="mt-1 text-xs text-red-300">
                              {
                                createForm.formState.errors.description
                                  .message
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-5">
                        <Button
                          type="submit"
                          variant="primary"
                          isDisabled={
                            createForm.formState.isSubmitting
                          }
                          className="bg-indigo-600 text-white hover:bg-indigo-500"
                        >
                          {createForm.formState.isSubmitting
                            ? 'Creating…'
                            : 'Create permission'}
                        </Button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Loading */}
              {permissions === null && !error && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />

                    <p className="text-sm text-slate-400">
                      Loading permissions…
                    </p>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {permissions?.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                    🔐
                  </div>

                  <h3 className="font-medium text-white">
                    No permissions yet
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    Create your first permission to get started.
                  </p>
                </div>
              )}

              {/* Permission List */}
              {permissions && permissions.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {/* Table Header */}
                  <div className="hidden border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 sm:grid sm:grid-cols-[1fr_120px]">
                    <span>Permission</span>

                    <span className="text-right">
                      Actions
                    </span>
                  </div>

                  <ul className="divide-y divide-white/10">
                    {permissions.map((permission) => (
                      <motion.li
                        key={permission.id}
                        layout
                        initial={{
                          opacity: 0,
                          y: 8,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className="p-4 sm:px-5"
                      >
                        {editingId === permission.id ? (
                          /* Edit Form */
                          <form
                            onSubmit={editForm.handleSubmit(
                              onSaveEdit,
                            )}
                            className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4"
                          >
                            <div className="grid gap-4 md:grid-cols-2">
                              {/* Resource */}
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                  Resource
                                </label>

                                <Input
                                  {...editForm.register('resource')}
                                  className="text-white"
                                />

                                {editForm.formState.errors.resource && (
                                  <p className="mt-1 text-xs text-red-300">
                                    {
                                      editForm.formState.errors.resource
                                        .message
                                    }
                                  </p>
                                )}
                              </div>

                              {/* Action */}
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                  Action
                                </label>

                                <Input
                                  {...editForm.register('action')}
                                  className="text-white"
                                />

                                {editForm.formState.errors.action && (
                                  <p className="mt-1 text-xs text-red-300">
                                    {
                                      editForm.formState.errors.action
                                        .message
                                    }
                                  </p>
                                )}
                              </div>

                              {/* Description */}
                              <div className="md:col-span-2">
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                  Description
                                </label>

                                <Input
                                  {...editForm.register('description')}
                                  className="text-white"
                                />
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                              <Button
                                type="submit"
                                variant="primary"
                                isDisabled={
                                  editForm.formState.isSubmitting
                                }
                                className="bg-indigo-600 text-white hover:bg-indigo-500"
                              >
                                {editForm.formState.isSubmitting
                                  ? 'Saving…'
                                  : 'Save'}
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                onPress={() =>
                                  setEditingId(null)
                                }
                                className="border border-white/10 text-slate-300 hover:bg-white/10"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          /* Permission Row */
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
                                  <span className="text-sm">
                                    /
                                  </span>
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-mono text-sm font-medium text-white">
                                    {permission.resource}:
                                    {permission.action}
                                  </p>

                                  <p className="mt-1 truncate text-xs text-slate-500">
                                    {permission.description ||
                                      'No description'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                onPress={() =>
                                  startEditing(permission)
                                }
                                className="border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                              >
                                Edit
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                onPress={() =>
                                  handleDelete(permission)
                                }
                                className="border border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default AdminPermissionsPage;