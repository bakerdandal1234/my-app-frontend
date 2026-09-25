import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Button } from '@heroui/react';
import { useAuth } from '../../auth/AuthContext';
import { apiClient } from '../../api/client';
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
import {
  isRoleItemArray,
  isPermissionItemArray,
  type RoleItem,
  type PermissionItem,
} from '../../api/guards';
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

function AdminRolesPage() {
  const { hasPermission } = useAuth();
  const canReadPermissions = hasPermission(PERMISSIONS.PERMISSIONS_READ);
  const { showToast } = useToast();

  const [roles, setRoles] = useState<RoleItem[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(
    null,
  );

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const editForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  async function loadRoles(): Promise<void> {
    setError(null);

    try {
      const response = await apiClient.get<unknown>('/authorization/roles');

      if (!isRoleItemArray(response.data)) {
        throw new Error('Unexpected roles response');
      }

      setRoles(response.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }

  async function loadPermissionCatalog(): Promise<void> {
    setPermissions([]);
    setPermissionsError(null);
    if (!canReadPermissions) return;

    try {
      const response = await apiClient.get<unknown>(
        '/authorization/permissions',
      );

      if (!isPermissionItemArray(response.data)) {
        throw new Error('Unexpected permissions response');
      }

      setPermissions(response.data);
    } catch (err: unknown) {
      setPermissionsError(getErrorMessage(err));
    }
  }

  async function loadRolesAndPermissions(): Promise<void> {
    await Promise.all([loadRoles(), loadPermissionCatalog()]);
  }

  useEffect(() => {
    void loadRolesAndPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReadPermissions]);

  async function onCreateRole(values: RoleFormValues): Promise<boolean> {
    setRowError(null);

    try {
      await apiClient.post('/authorization/roles', {
        name: values.name,
        ...(values.description ? { description: values.description } : {}),
      });

      setShowCreateForm(false);
      await loadRolesAndPermissions();
      showToast(`Role "${values.name}" created`);

      return true;
    } catch (err) {
      setRowError(getErrorMessage(err));
      return false;
    }
  }

  function startEditing(role: RoleItem): void {
    setEditingRoleId(role.id);
    setRowError(null);

    editForm.reset({
      name: role.name,
      description: role.description ?? '',
    });
  }

  async function onSaveEdit(values: RoleFormValues): Promise<void> {
    if (!editingRoleId) return;

    setRowError(null);

    try {
      await apiClient.patch(`/authorization/roles/${editingRoleId}`, {
        name: values.name,
        description: values.description || '',
      });

      setEditingRoleId(null);
      await loadRolesAndPermissions();
      showToast('Role updated');
    } catch (err) {
      setRowError(getErrorMessage(err));
    }
  }

  async function handleDeleteRole(role: RoleItem): Promise<void> {
    if (
      !window.confirm(
        `Delete role "${role.name}"? This also removes it from every user who has it.`,
      )
    ) {
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

  function toggleExpand(roleId: string): void {
    setExpandedRoleId((current) => (current === roleId ? null : roleId));
    setRowError(null);
  }

  async function handleAssignPermission(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const permission = permissions.find((item) => item.id === permissionId);

    setIsMutating(true);
    setRowError(null);

    try {
      await apiClient.post(
        `/authorization/roles/${roleId}/permissions/${permissionId}`,
      );

      await loadRolesAndPermissions();

      showToast(
        `Assigned "${permission ? formatPermission(permission) : 'permission'}"`,
      );

      return true;
    } catch (err) {
      setRowError(getErrorMessage(err));
      return false;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleRemovePermission(
    roleId: string,
    permissionId: string,
    label: string,
  ): Promise<void> {
    setIsMutating(true);
    setRowError(null);

    try {
      await apiClient.delete(
        `/authorization/roles/${roleId}/permissions/${permissionId}`,
      );

      await loadRolesAndPermissions();
      showToast(`Removed "${label}"`);
    } catch (err) {
      setRowError(getErrorMessage(err));
    } finally {
      setIsMutating(false);
    }
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
              <CreateRoleForm show={showCreateForm} onCreate={onCreateRole} />

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
                      permissions={permissions}
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
