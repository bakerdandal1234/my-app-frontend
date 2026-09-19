import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@heroui/react';

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

interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  createdAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  description?: string;
}

interface UserAccess {
  userId: string;
  roles: string[];
  permissions: string[];
}

// containerVariants / itemVariants / errorVariants now come from the
// shared ../../lib/motion-variants (this "admin list page" family is also
// used by AdminPermissionsPage; AdminRolesPage shares itemVariants/
// errorVariants but keeps its own containerVariants — see that file).

const ADMIN_USERS_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none absolute inset-0 overflow-hidden';

const ADMIN_USERS_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
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

function getInitials(user: AdminUser) {
  const first = user.firstName?.trim().charAt(0) ?? '';
  const last = user.lastName?.trim().charAt(0) ?? '';

  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }

  return user.email.charAt(0).toUpperCase();
}

function getDisplayName(user: AdminUser) {
  const name = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ');

  return name || 'No name';
}

function AdminUsersPage() {
  const { showToast } = useToast();

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Which user row is expanded, and that user's current roles.
  // Access is loaded lazily when a row is expanded.
  const [expandedUserId, setExpandedUserId] = useState<string | null>(
    null,
  );

  const [access, setAccess] = useState<UserAccess | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  // Role name -> id, because GET /authorization/users/:userId/access
  // returns role names while assign/remove require the role id.
  const roleIdByName = new Map(
    roles.map((role) => [role.name, role.id]),
  );

  async function loadUsersAndRoles() {
    setError(null);

    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get<AdminUser[]>('/authorization/users'),
        apiClient.get<RoleItem[]>('/authorization/roles'),
      ]);

      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadUsersAndRoles();
  }, []);

  async function loadAccess(userId: string) {
    setAccessError(null);
    setSelectedRoleId('');

    try {
      const res = await apiClient.get<UserAccess>(
        `/authorization/users/${userId}/access`,
      );

      setAccess(res.data);
    } catch (err) {
      setAccessError(getErrorMessage(err));
    }
  }

  function toggleExpand(userId: string) {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setAccess(null);
      return;
    }

    setExpandedUserId(userId);
    setAccess(null);
    loadAccess(userId);
  }

  async function handleAssignRole(userId: string) {
    if (!selectedRoleId) return;

    const roleName =
      roles.find((role) => role.id === selectedRoleId)?.name ??
      'role';

    setIsMutating(true);
    setAccessError(null);

    try {
      await apiClient.post(
        `/authorization/users/${userId}/roles/${selectedRoleId}`,
      );

      await loadAccess(userId);

      showToast(`Assigned "${roleName}" role`);
    } catch (err) {
      setAccessError(getErrorMessage(err));
    } finally {
      setIsMutating(false);
    }
  }

  async function handleRemoveRole(
    userId: string,
    roleName: string,
  ) {
    const roleId = roleIdByName.get(roleName);

    if (!roleId) return;

    setIsMutating(true);
    setAccessError(null);

    try {
      await apiClient.delete(
        `/authorization/users/${userId}/roles/${roleId}`,
      );

      await loadAccess(userId);

      showToast(`Removed "${roleName}" role`);
    } catch (err) {
      setAccessError(getErrorMessage(err));
    } finally {
      setIsMutating(false);
    }
  }

  const assignableRoles = access
    ? roles.filter((role) => !access.roles.includes(role.name))
    : [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <AnimatedBackground
        wrapperClassName={ADMIN_USERS_BACKGROUND_WRAPPER_CLASSNAME}
        blobs={ADMIN_USERS_BACKGROUND_BLOBS}
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
              Users
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage users and control their role assignments.
            </p>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="p-5 sm:p-7">
              {/* Card Header */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">
                  User Access Management
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {users
                    ? `${users.length} user${
                        users.length === 1 ? '' : 's'
                      }`
                    : 'Loading users…'}
                </p>
              </div>

              {/* Error */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="users-error"
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
              </AnimatePresence>

              {/* Loading */}
              {users === null && !error && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />

                    <p className="text-sm text-slate-400">
                      Loading users…
                    </p>
                  </div>
                </div>
              )}

              {/* Empty */}
              {users?.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 py-16 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                    👥
                  </div>

                  <h3 className="font-medium text-white">
                    No users found
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    There are currently no users to manage.
                  </p>
                </div>
              )}

              {/* User List */}
              {users && users.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {/* Desktop Header */}
                  <div className="hidden border-b border-white/10 bg-white/5 px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500 sm:grid sm:grid-cols-[1fr_150px]">
                    <span>User</span>

                    <span className="text-right">
                      Access
                    </span>
                  </div>

                  <ul className="divide-y divide-white/10">
                    {users.map((user) => {
                      const isExpanded =
                        expandedUserId === user.id;

                      return (
                        <motion.li
                          key={user.id}
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
                          {/* User Header */}
                          <button
                            type="button"
                            onClick={() =>
                              toggleExpand(user.id)
                            }
                            className="group flex w-full items-center justify-between gap-4 text-left"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {/* Avatar */}
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-sm font-semibold text-indigo-200 ring-1 ring-white/10">
                                {getInitials(user)}
                              </div>

                              {/* User info */}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">
                                  {getDisplayName(user)}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              {/* Verification */}
                              <span
                                className={`hidden rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex ${
                                  user.isEmailVerified
                                    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                                    : 'border-amber-400/20 bg-amber-500/10 text-amber-300'
                                }`}
                              >
                                {user.isEmailVerified
                                  ? 'Verified'
                                  : 'Unverified'}
                              </span>

                              <span className="text-xs text-indigo-400 transition-colors group-hover:text-indigo-300">
                                {isExpanded
                                  ? 'Hide roles'
                                  : 'Manage roles'}
                              </span>

                              <span
                                className={`text-slate-500 transition-transform ${
                                  isExpanded
                                    ? 'rotate-180'
                                    : ''
                                }`}
                              >
                                ↓
                              </span>
                            </div>
                          </button>

                          {/* Expanded Access Panel */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
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
                                transition={{
                                  duration: 0.25,
                                }}
                                className="overflow-hidden"
                              >
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

                                      <p className="text-xs text-slate-400">
                                        Loading roles…
                                      </p>
                                    </div>
                                  )}

                                  {/* Access */}
                                  {access && (
                                    <div className="space-y-5">
                                      {/* Current Roles */}
                                      <div>
                                        <div className="mb-3 flex items-center justify-between">
                                          <div>
                                            <h3 className="text-sm font-medium text-white">
                                              Assigned roles
                                            </h3>

                                            <p className="mt-1 text-xs text-slate-500">
                                              Roles currently assigned to
                                              this user.
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

                                          {access.roles.map(
                                            (roleName) => (
                                              <span
                                                key={roleName}
                                                className="group flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300"
                                              >
                                                {roleName}

                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleRemoveRole(
                                                      user.id,
                                                      roleName,
                                                    )
                                                  }
                                                  disabled={
                                                    isMutating
                                                  }
                                                  aria-label={`Remove ${roleName} role`}
                                                  className="-mr-1 rounded-full p-1 text-indigo-400 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                                                >
                                                  ×
                                                </button>
                                              </span>
                                            ),
                                          )}
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
                                              Add another role to this
                                              user.
                                            </p>
                                          </div>

                                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                            <div className="flex-1">
                                              <label className="mb-2 block text-xs font-medium text-slate-400">
                                                Available roles
                                              </label>

                                              <select
                                                value={
                                                  selectedRoleId
                                                }
                                                onChange={(event) =>
                                                  setSelectedRoleId(
                                                    event.target
                                                      .value,
                                                  )
                                                }
                                                disabled={
                                                  isMutating
                                                }
                                                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                              >
                                                <option
                                                  value=""
                                                  className="bg-slate-900"
                                                >
                                                  Add a role…
                                                </option>

                                                {assignableRoles.map(
                                                  (role) => (
                                                    <option
                                                      key={role.id}
                                                      value={role.id}
                                                      className="bg-slate-900"
                                                    >
                                                      {role.name}
                                                    </option>
                                                  ),
                                                )}
                                              </select>
                                            </div>

                                            <Button
                                              type="button"
                                              variant="primary"
                                              onPress={() =>
                                                handleAssignRole(
                                                  user.id,
                                                )
                                              }
                                              isDisabled={
                                                !selectedRoleId ||
                                                isMutating
                                              }
                                              className="bg-indigo-600 text-white hover:bg-indigo-500 sm:min-w-24"
                                            >
                                              {isMutating
                                                ? 'Assigning…'
                                                : 'Assign'}
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {assignableRoles.length ===
                                        0 &&
                                        roles.length > 0 && (
                                          <p className="border-t border-white/10 pt-4 text-xs text-slate-500">
                                            This user already has all
                                            available roles.
                                          </p>
                                        )}

                                      {/* Permissions */}
                                      <div className="border-t border-white/10 pt-5">
                                        <div className="mb-3">
                                          <h3 className="text-sm font-medium text-white">
                                            Effective permissions
                                          </h3>

                                          <p className="mt-1 text-xs text-slate-500">
                                            Permissions inherited through
                                            the assigned roles.
                                          </p>
                                        </div>

                                        {access.permissions.length ===
                                        0 ? (
                                          <span className="text-xs text-slate-500">
                                            No permissions available.
                                          </span>
                                        ) : (
                                          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                                            {access.permissions.map(
                                              (permission) => (
                                                <span
                                                  key={permission}
                                                  className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-slate-400"
                                                >
                                                  {permission}
                                                </span>
                                              ),
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.li>
                      );
                    })}
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

export default AdminUsersPage;