import { Link } from 'react-router-dom';
import { Card } from '@heroui/react';
import { motion, type Variants } from 'framer-motion';
import { useAuth } from '../../auth/AuthContext';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import { containerVariants, itemVariants } from '../../lib/motion-variants';
import StatusLink from '../../components/shared/StatusLink';

const rowVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
    },
  },
};

const PROFILE_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none fixed inset-0 -z-10 overflow-hidden';

const PROFILE_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
  {
    x: [0, 50, 0],
    y: [0, 30, 0],
    scale: [1, 1.15, 1],
    duration: 14,
    className:
      'absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl',
  },
  {
    x: [0, -40, 0],
    y: [0, 50, 0],
    scale: [1, 1.2, 1],
    duration: 16,
    className:
      'absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl',
  },
];

function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(' ');

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .map((name) => name[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || user.email[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <AnimatedBackground
        wrapperClassName={PROFILE_BACKGROUND_WRAPPER_CLASSNAME}
        blobs={PROFILE_BACKGROUND_BLOBS}
      />

      <motion.main
        className="mx-auto w-full max-w-2xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Profile
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage your account information and security.
            </p>
          </div>

          <StatusLink to="/home">Back to home</StatusLink>
        </motion.div>

        {/* Profile Card */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <Card.Content className="p-6">
              {/* User identity */}
              <motion.div
                variants={itemVariants}
                className="mb-6 flex items-center gap-4"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/20">
                  {initials}
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold text-white">
                    {fullName || 'User'}
                  </h2>

                  <p className="truncate text-sm text-slate-400">
                    {user.email}
                  </p>
                </div>
              </motion.div>

              {/* Account information */}
              <motion.div variants={itemVariants}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Account information
                </h3>

                <dl className="overflow-hidden rounded-xl border border-white/10 bg-black/10">
                  <motion.div
                    variants={rowVariants}
                    className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4"
                  >
                    <dt className="text-sm text-slate-400">
                      Email
                    </dt>

                    <dd className="max-w-[60%] truncate text-right text-sm font-medium text-slate-200">
                      {user.email}
                    </dd>
                  </motion.div>

                  <motion.div
                    variants={rowVariants}
                    className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4"
                  >
                    <dt className="text-sm text-slate-400">
                      Name
                    </dt>

                    <dd className="text-right text-sm font-medium text-slate-200">
                      {fullName || '—'}
                    </dd>
                  </motion.div>

                  <motion.div
                    variants={rowVariants}
                    className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4"
                  >
                    <dt className="text-sm text-slate-400">
                      Email verified
                    </dt>

                    <dd
                      className={`text-sm font-medium ${
                        user.isEmailVerified
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {user.isEmailVerified ? 'Verified' : 'Not verified'}
                    </dd>
                  </motion.div>

                  <motion.div
                    variants={rowVariants}
                    className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4"
                  >
                    <dt className="text-sm text-slate-400">
                      Two-factor authentication
                    </dt>

                    <dd
                      className={`text-sm font-medium ${
                        user.isTwoFactorEnabled
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {user.isTwoFactorEnabled
                        ? 'Enabled'
                        : 'Disabled'}
                    </dd>
                  </motion.div>

                  {(user.googleId || user.githubId) && (
                    <motion.div
                      variants={rowVariants}
                      className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-4"
                    >
                      <dt className="text-sm text-slate-400">
                        Linked accounts
                      </dt>

                      <dd className="text-right text-sm font-medium text-slate-200">
                        {[
                          user.googleId && 'Google',
                          user.githubId && 'GitHub',
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </dd>
                    </motion.div>
                  )}

                  <motion.div
                    variants={rowVariants}
                    className="flex items-center justify-between gap-4 px-4 py-4"
                  >
                    <dt className="text-sm text-slate-400">
                      Member since
                    </dt>

                    <dd className="text-sm font-medium text-slate-200">
                      {new Date(
                        user.createdAt,
                      ).toLocaleDateString()}
                    </dd>
                  </motion.div>
                </dl>
              </motion.div>

              {/* Security */}
              <motion.div
                variants={itemVariants}
                className="mt-8"
              >
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Security
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      to="/settings/2fa"
                      className="block rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-indigo-500/30 hover:bg-white/10"
                    >
                      <p className="font-medium text-white">
                        Two-factor authentication
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Manage your authentication settings.
                      </p>
                    </Link>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      to="/sessions"
                      className="block rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-indigo-500/30 hover:bg-white/10"
                    >
                      <p className="font-medium text-white">
                        Active sessions
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        View and manage your logged-in devices.
                      </p>
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            </Card.Content>
          </GlassCard>
        </motion.div>
      </motion.main>
    </div>
  );
}

export default ProfilePage;