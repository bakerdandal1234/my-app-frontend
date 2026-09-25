import { motion, AnimatePresence } from 'framer-motion';
import type { AdminUser, RoleItem } from '../../api/guards';
import AdminUserAccessPanel from './AdminUserAccessPanel';

interface AdminUserRowProps {
  user: AdminUser;
  roles: RoleItem[];
  isExpanded: boolean;
  onToggle: () => void;
}

function getInitials(user: AdminUser) {
  const first = user.firstName?.trim().charAt(0) ?? '';
  const last = user.lastName?.trim().charAt(0) ?? '';

  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }

  return user.email.charAt(0).toUpperCase();
}

function getDisplayName(user: AdminUser) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');

  return name || 'No name';
}

/**
 * One row in the user list: the always-visible header (avatar, name,
 * email, verification badge, expand toggle) plus the access panel, which
 * only mounts while `isExpanded` — closing or switching rows unmounts the
 * previous AdminUserAccessPanel, which is what gives useUserAccess its
 * race-safety (see useUserAccess.ts).
 */
function AdminUserRow({ user, roles, isExpanded, onToggle }: AdminUserRowProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:px-5"
    >
      {/* User Header */}
      <button
        type="button"
        onClick={onToggle}
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

            <p className="truncate text-xs text-slate-500">{user.email}</p>
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
            {user.isEmailVerified ? 'Verified' : 'Unverified'}
          </span>

          <span className="text-xs text-indigo-400 transition-colors group-hover:text-indigo-300">
            {isExpanded ? 'Hide roles' : 'Manage roles'}
          </span>

          <span
            className={`text-slate-500 transition-transform ${
              isExpanded ? 'rotate-180' : ''
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <AdminUserAccessPanel userId={user.id} roles={roles} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export default AdminUserRow;
