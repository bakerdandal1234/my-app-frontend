import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Button } from '@heroui/react';
import { useAuth } from '../../auth/AuthContext';
import { getRoles, getPermissions, createRole, updateRole, deleteRole, assignPermissionToRole, removePermissionFromRole } from '../../auth/authorization-api';
import { getAuthVersion, subscribeToAccessToken } from '../../api/tokenStore';
import { getErrorMessage } from '../../api/errors';
import { useToast } from '../../ui/ToastContext';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
  type AnimatedBackgroundPulseBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import {
  adminListItemVariants as itemVariants,
  adminListErrorVariants as errorVariants,
} from '../../lib/motion-variants';
import type { RoleItem, PermissionItem } from '../../auth/authorization-contracts';
import { PERMISSIONS, formatPermission } from '../../auth/permissions';
import { roleSchema, type RoleFormValues } from './role-schema';
import CreateRoleForm from './CreateRoleForm';
import RoleRow from './RoleRow';

// This page's containerVariants intentionally has no opacity step (see
// ../../lib/motion-variants for the shared adminListContainerVariants used
// by AdminUsersPage/AdminPermissionsPage, which do fade in on load — kept
// separate here rather than changing this page's load animation).
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const ADMIN_ROLES_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none absolute inset-0 overflow-hidden';

const ADMIN_ROLES_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
  {
    x: [0, 45, 0],
    y: [0, 30, 0],
    scale: [1, 1.12, 1],
    duration: 14,
    className:
      'absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl',
  },
  {
    x: [0, -40, 0],
    y: [0, -30, 0],
    scale: [1, 1.15, 1],
    duration: 17,
    className:
      'absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl',
  },
];

// The original had no `scale` on this pulse (only opacity); [1, 1, 1] keeps
// the prop required while animating between three identical values, which
// is visually a no-op — same as omitting it.
const ADMIN_ROLES_BACKGROUND_PULSE_BLOB: AnimatedBackgroundPulseBlob = {
  opacity: [0.15, 0.3, 0.15],
  scale: [1, 1, 1],
  duration: 8,
  className:
    'absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/5 blur-3xl',
};

interface RolesScope {
  authVersion: number;
  active: boolean;
  ready: boolean;
  catalogReady: boolean;
  mutating: boolean;
  needsRefresh: boolean;
  rolesController: AbortController | null;
  permissionsController: AbortController | null;
}

function AdminRolesPage() {
  const { hasPermission } = useAuth();
  const canReadPermissions = hasPermission(PERMISSIONS.PERMISSIONS_READ);
  const { showToast } = useToast();
  const [authVersion, setAuthVersion] = useState(getAuthVersion);
  const [roles, setRoles] = useState<RoleItem[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const scopeRef = useRef<RolesScope | null>(null);
  const editForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '' },
  });

  const isCurrent = useCallback((scope: RolesScope) =>
    scope.active && scopeRef.current === scope &&
    getAuthVersion() === scope.authVersion, []);

  const loadRoles = useCallback(async (scope: RolesScope): Promise<void> => {
    if (!isCurrent(scope)) return;
    scope.rolesController?.abort();
    const controller = new AbortController();
    scope.rolesController = controller;
    scope.ready = false;
    setRoles(null);
    setError(null);

    try {
      const nextRoles = await getRoles({ signal: controller.signal });
      if (!isCurrent(scope) || controller.signal.aborted) return;
      scope.ready = true;
      scope.needsRefresh = false;
      setRoles(nextRoles);
    } catch (error: unknown) {
      if (!isCurrent(scope) || controller.signal.aborted) return;
      const message = getErrorMessage(error);
      setError(scope.needsRefresh
        ? `Changes saved, but roles could not be refreshed. ${message}`
        : message);
    }
  }, [isCurrent]);

  const loadPermissionCatalog = useCallback(async (scope: RolesScope): Promise<void> => {
    if (!isCurrent(scope)) return;
    scope.permissionsController?.abort();
    scope.catalogReady = false;
    setPermissions(null);
    setPermissionsError(null);
    if (!canReadPermissions) return;
    const controller = new AbortController();
    scope.permissionsController = controller;

    try {
      const nextPermissions = await getPermissions({ signal: controller.signal });
      if (!isCurrent(scope) || controller.signal.aborted) return;
      scope.catalogReady = true;
      setPermissions(nextPermissions);
    } catch (error: unknown) {
      if (!isCurrent(scope) || controller.signal.aborted) return;
      setPermissionsError(getErrorMessage(error));
    }
  }, [canReadPermissions, isCurrent]);

  useEffect(() => subscribeToAccessToken(() => {
    setAuthVersion(getAuthVersion());
  }), []);

  useEffect(() => {
    const scope: RolesScope = {
      authVersion, active: true, ready: false, catalogReady: false,
      mutating: false, needsRefresh: false,
      rolesController: null, permissionsController: null,
    };
    scopeRef.current = scope;
    setIsMutating(false);
    setRowError(null);
    setShowCreateForm(false);
    setEditingRoleId(null);
    setExpandedRoleId(null);
    void loadRoles(scope);
    return () => {
      scope.active = false;
      scope.rolesController?.abort();
      scope.permissionsController?.abort();
    };
  }, [authVersion, loadRoles]);

  useEffect(() => {
    const scope = scopeRef.current;
    if (!scope) return;
    void loadPermissionCatalog(scope);
    return () => scope.permissionsController?.abort();
  }, [authVersion, loadPermissionCatalog]);

  async function retryRoles(): Promise<void> {
    const scope = scopeRef.current;
    if (scope && !scope.mutating) await loadRoles(scope);
  }

  async function retryPermissions(): Promise<void> {
    const scope = scopeRef.current;
    if (scope) await loadPermissionCatalog(scope);
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
    await loadRoles(scope);
    if (isCurrent(scope)) {
      scope.mutating = false;
      setIsMutating(false);
    }
  }

  async function onCreateRole(values: RoleFormValues, onSaved: () => void): Promise<void> {
    await mutate({
      request: () => createRole({
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
      }),
      onSaved: () => {
        setShowCreateForm(false);
        onSaved();
      },
      successMessage: 'Role created',
    });
  }

  function startEditing(role: RoleItem): void {
    if (isMutating) return;
    setEditingRoleId(role.id);
    setRowError(null);
    editForm.reset({ name: role.name, description: role.description ?? '' });
  }

  async function onSaveEdit(values: RoleFormValues): Promise<void> {
    if (!editingRoleId) return;
    const roleId = editingRoleId;
    await mutate({
      request: () => updateRole(roleId, { name: values.name, description: values.description ?? '' }),
      onSaved: () => setEditingRoleId(null),
      successMessage: 'Role updated',
    });
  }

  async function handleDeleteRole(role: RoleItem): Promise<void> {
    if (isMutating || !window.confirm(`Delete role "${role.name}"? This also removes it from every user who has it.`)) return;
    await mutate({
      request: () => deleteRole(role.id),
      onSaved: () => {
        setExpandedRoleId((current) => current === role.id ? null : current);
        setEditingRoleId((current) => current === role.id ? null : current);
      },
      successMessage: 'Role deleted',
    });
  }

  function toggleExpand(roleId: string): void {
    if (isMutating) return;
    setExpandedRoleId((current) => current === roleId ? null : roleId);
    setRowError(null);
  }

  async function handleAssignPermission(
    roleId: string, permissionId: string, onSaved: () => void,
  ): Promise<void> {
    const permission = permissions?.find((item) => item.id === permissionId);
    if (!canReadPermissions || !scopeRef.current?.catalogReady || !permission) return;
    await mutate({
      request: () => assignPermissionToRole(roleId, permissionId),
      onSaved,
      successMessage: `Assigned "${formatPermission(permission)}" permission`,
    });
  }

  async function handleRemovePermission(
    roleId: string, permissionId: string, label: string,
  ): Promise<void> {
    await mutate({
      request: () => removePermissionFromRole(roleId, permissionId),
      onSaved: () => {},
      successMessage: `Removed "${label}" permission`,
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <AnimatedBackground
        wrapperClassName={ADMIN_ROLES_BACKGROUND_WRAPPER_CLASSNAME}
        blobs={ADMIN_ROLES_BACKGROUND_BLOBS}
        pulseBlob={ADMIN_ROLES_BACKGROUND_PULSE_BLOB}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto max-w-5xl"
      >
        {/* Header */}
        <motion.header
          variants={itemVariants}
          className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 ring-1 ring-indigo-400/20">
                <span className="text-lg font-bold text-indigo-300">F</span>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-300/80">
                  FlowDesk
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Roles
                </h1>
              </div>
            </div>

            <p className="max-w-xl text-sm text-slate-400">
              Manage application roles and control which permissions each
              role can access.
            </p>
          </div>
        </motion.header>

        {/* Main Card */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="p-5 sm:p-6">
              {/* Card Header */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Role registry
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Create roles, update them, or manage their assigned
                    permissions.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  onPress={() => setShowCreateForm((value) => !value)}
                  isDisabled={isMutating || roles === null}
                  className="bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  {showCreateForm ? 'Cancel' : '+ New role'}
                </Button>
              </div>

              {/* Errors */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="main-error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    role="alert"
                  >
                    {error}
                    <button type="button" onClick={() => void retryRoles()} disabled={isMutating} className="ml-3 underline disabled:opacity-50">Retry loading roles</button>
                  </motion.p>
                )}

                {rowError && (
                  <motion.p
                    key="row-error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    role="alert"
                  >
                    {rowError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Create Role */}
              <CreateRoleForm show={showCreateForm} disabled={isMutating || roles === null} onCreate={onCreateRole} />

              {!canReadPermissions ? (
                <p className="mb-4 text-sm text-slate-400">Assigning permissions requires permissions:read access.</p>
              ) : permissionsError ? (
                <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  Could not load the permission catalog: {permissionsError}
                  <button type="button" onClick={() => void retryPermissions()} className="ml-3 underline">Retry loading permissions</button>
                </p>
              ) : permissions === null ? (
                <p className="mb-4 text-sm text-slate-400">Loading permission catalog…</p>
              ) : permissions.length === 0 ? (
                <p className="mb-4 text-sm text-slate-400">No permissions are available to assign.</p>
              ) : null}

              {/* Loading */}
              {roles === null && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center py-16"
                >
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="h-5 w-5 rounded-full border-2 border-indigo-400/30 border-t-indigo-400"
                    />
                    Loading roles…
                  </div>
                </motion.div>
              )}

              {/* Empty */}
              {roles && roles.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300">
                    <span className="text-xl">+</span>
                  </div>

                  <h3 className="text-sm font-semibold text-white">
                    No roles yet
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    Create your first role to start managing permissions.
                  </p>
                </motion.div>
              )}

              {/* Roles */}
              {roles && roles.length > 0 && (
                <div className="space-y-3">
                  {roles.map((role) => (
                    <RoleRow
                      key={role.id}
                      role={role}
                      permissions={canReadPermissions ? permissions ?? [] : []}
                      isEditing={editingRoleId === role.id}
                      isExpanded={expandedRoleId === role.id}
                      isMutating={isMutating}
                      editForm={editForm}
                      onStartEdit={() => startEditing(role)}
                      onCancelEdit={() => setEditingRoleId(null)}
                      onSaveEdit={onSaveEdit}
                      onDelete={() => handleDeleteRole(role)}
                      onToggleExpand={() => toggleExpand(role.id)}
                      onAssignPermission={handleAssignPermission}
                      onRemovePermission={handleRemovePermission}
                    />
                  ))}
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default AdminRolesPage;

