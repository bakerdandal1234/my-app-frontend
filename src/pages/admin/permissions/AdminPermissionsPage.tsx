import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@heroui/react';

import { getPermissions, createPermission, updatePermission, deletePermission } from '../../../auth/authorization/authorization-api';
import { getAuthVersion, subscribeToAccessToken } from '../../../api/tokenStore';
import { getErrorMessage } from '../../../api/errors';
import { useToast } from '../../../ui/ToastContext';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../../../components/layout/AnimatedBackground';
import GlassCard from '../../../components/shared/GlassCard';
import {
  adminListContainerVariants as containerVariants,
  adminListItemVariants as itemVariants,
  adminListErrorVariants as errorVariants,
} from '../../../lib/motion-variants';
import type { PermissionItem } from '../../../auth/authorization/authorization-contracts';
import { formatPermission } from '../../../auth/authorization/permissions';
import { permissionSchema, type PermissionFormValues } from './permission-schema';
import CreatePermissionForm from './CreatePermissionForm';
import PermissionRow from './PermissionRow';

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

interface PermissionsScope {
  authVersion: number;
  active: boolean;
  ready: boolean;
  mutating: boolean;
  needsRefresh: boolean;
  controller: AbortController | null;
}

function AdminPermissionsPage() {
  const { showToast } = useToast();
  const [authVersion, setAuthVersion] = useState(getAuthVersion);
  const [permissions, setPermissions] = useState<PermissionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const scopeRef = useRef<PermissionsScope | null>(null);
  const editForm = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: { resource: '', action: '', description: '' },
  });

  const isCurrent = useCallback((scope: PermissionsScope) =>
    scope.active && scopeRef.current === scope &&
    getAuthVersion() === scope.authVersion, []);

  const loadPermissions = useCallback(async (scope: PermissionsScope): Promise<void> => {
    if (!isCurrent(scope)) return;
    scope.controller?.abort();
    const controller = new AbortController();
    scope.controller = controller;
    scope.ready = false;
    setPermissions(null);
    setError(null);
    try {
      const nextPermissions = await getPermissions({ signal: controller.signal });
      if (!isCurrent(scope) || controller.signal.aborted) return;
      scope.ready = true;
      scope.needsRefresh = false;
      setPermissions(nextPermissions);
    } catch (error: unknown) {
      if (!isCurrent(scope) || controller.signal.aborted) return;
      const message = getErrorMessage(error);
      setError(scope.needsRefresh
        ? `Changes saved, but permissions could not be refreshed. ${message}`
        : message);
    }
  }, [isCurrent]);

  useEffect(() => subscribeToAccessToken(() => {
    setAuthVersion(getAuthVersion());
  }), []);

  useEffect(() => {
    const scope: PermissionsScope = {
      authVersion, active: true, ready: false, mutating: false,
      needsRefresh: false, controller: null,
    };
    scopeRef.current = scope;
    setIsMutating(false);
    setRowError(null);
    setShowCreateForm(false);
    setEditingId(null);
    void loadPermissions(scope);
    return () => {
      scope.active = false;
      scope.controller?.abort();
    };
  }, [authVersion, loadPermissions]);

  async function retryPermissions(): Promise<void> {
    const scope = scopeRef.current;
    if (scope && !scope.mutating) await loadPermissions(scope);
  }

  async function mutate({
    request, onSaved, successMessage,
  }: {
    request: () => Promise<void>;
    onSaved: () => void;
    successMessage: string;
  }): Promise<void> {
    const scope = scopeRef.current;
    if (!scope || !isCurrent(scope) || !scope.ready || scope.mutating) return;
    scope.mutating = true;
    setIsMutating(true);
    setRowError(null);
    try {
      await request();
    } catch (error: unknown) {
      if (isCurrent(scope)) {
        scope.mutating = false;
        setIsMutating(false);
        setRowError(getErrorMessage(error));
      }
      return;
    }
    if (!isCurrent(scope)) return;
    scope.needsRefresh = true;
    onSaved();
    showToast(successMessage);
    await loadPermissions(scope);
    if (isCurrent(scope)) {
      scope.mutating = false;
      setIsMutating(false);
    }
  }

  async function onCreate(values: PermissionFormValues, onSaved: () => void): Promise<void> {
    await mutate({
      request: () => createPermission({
        resource: values.resource,
        action: values.action,
        ...(values.description ? { description: values.description } : {}),
      }),
      onSaved: () => {
        setShowCreateForm(false);
        onSaved();
      },
      successMessage: 'Permission created',
    });
  }

  function startEditing(permission: PermissionItem): void {
    if (isMutating) return;
    setEditingId(permission.id);
    setRowError(null);
    editForm.reset({
      resource: permission.resource,
      action: permission.action,
      description: permission.description ?? '',
    });
  }

  async function onSaveEdit(values: PermissionFormValues): Promise<void> {
    if (!editingId) return;
    const permissionId = editingId;
    await mutate({
      request: () => updatePermission(permissionId, {
        resource: values.resource, action: values.action, description: values.description ?? '',
      }),
      onSaved: () => setEditingId(null),
      successMessage: 'Permission updated',
    });
  }

  async function handleDelete(permission: PermissionItem): Promise<void> {
    if (isMutating || !window.confirm(`Delete permission "${formatPermission(permission)}"? This also removes it from every role that has it.`)) return;
    await mutate({
      request: () => deletePermission(permission.id),
      onSaved: () => setEditingId((current) => current === permission.id ? null : current),
      successMessage: 'Permission deleted',
    });
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
                  isDisabled={isMutating || permissions === null}
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
                    <button type="button" onClick={() => void retryPermissions()} disabled={isMutating} className="ml-3 underline disabled:opacity-50">Retry loading permissions</button>
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
              <CreatePermissionForm show={showCreateForm} disabled={isMutating || permissions === null} onCreate={onCreate} />

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
                      <PermissionRow
                        key={permission.id}
                        permission={permission}
                        isEditing={editingId === permission.id}
                        isMutating={isMutating}
                        editForm={editForm}
                        onStartEdit={() => startEditing(permission)}
                        onCancelEdit={() => setEditingId(null)}
                        onSaveEdit={onSaveEdit}
                        onDelete={() => handleDelete(permission)}
                      />
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
