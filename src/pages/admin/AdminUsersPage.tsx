import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import {
  adminListContainerVariants as containerVariants,
  adminListItemVariants as itemVariants,
  adminListErrorVariants as errorVariants,
} from '../../lib/motion-variants';
import {
  isAdminUserArray,
  isRoleItemArray,
  type AdminUser,
  type RoleItem,
} from '../../api/guards';
import AdminUserRow from './AdminUserRow';

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

function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Only one row's access panel can be open at a time; opening a
  // different row (or the same one again) unmounts the previous
  // AdminUserAccessPanel and mounts a fresh one — see useUserAccess.ts
  // for why that mount boundary matters.
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  async function loadUsersAndRoles(): Promise<void> {
    setError(null);

    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get<unknown>('/authorization/users'),
        apiClient.get<unknown>('/authorization/roles'),
      ]);

      if (!isAdminUserArray(usersRes.data)) {
        throw new Error('Unexpected users response');
      }

      if (!isRoleItemArray(rolesRes.data)) {
        throw new Error('Unexpected roles response');
      }

      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    void loadUsersAndRoles();
  }, []);

  function toggleExpand(userId: string): void {
    setExpandedUserId((current) => (current === userId ? null : userId));
  }

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

              <span className="text-sm text-slate-400">Administration</span>
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
                    ? `${users.length} user${users.length === 1 ? '' : 's'}`
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

                  <h3 className="font-medium text-white">No users found</h3>

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

                    <span className="text-right">Access</span>
                  </div>

                  <ul className="divide-y divide-white/10">
                    {users.map((user) => (
                      <AdminUserRow
                        key={user.id}
                        user={user}
                        roles={roles}
                        isExpanded={expandedUserId === user.id}
                        onToggle={() => toggleExpand(user.id)}
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

export default AdminUsersPage;
