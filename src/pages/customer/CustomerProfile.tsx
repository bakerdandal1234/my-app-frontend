import { Card } from '@heroui/react';
import { motion, type Variants } from 'framer-motion';

import { useCustomerAuth } from '../../customer/CustomerAuthContext';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import {
  containerVariants,
  itemVariants,
} from '../../lib/motion-variants';
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

function CustomerProfile() {
  const { account } = useCustomerAuth();

  return (
    <div className="relative isolate min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
      <AnimatedBackground
        wrapperClassName="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        blobs={PROFILE_BACKGROUND_BLOBS}
      />

      <motion.main
        className="mx-auto w-full max-w-2xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-6 flex items-center justify-between">
          <div>
             <h1 className="text-3xl font-bold tracking-tight">
            Profile
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Your customer account information.
          </p>
          </div>

         
           <StatusLink to="/customer/account">Back to home</StatusLink>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard>
            <Card.Content className="p-6">
              <motion.div
                variants={itemVariants}
                className="mb-6 flex items-center gap-4"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/20">
                  {account?.email?.[0]?.toUpperCase() || 'C'}
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-white">
                    Customer
                  </h2>

                  <p className="truncate text-sm text-slate-400">
                    {account?.email ?? '—'}
                  </p>
                </div>
              </motion.div>

              <motion.div variants={itemVariants}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Account information
                </h3>

                <motion.dl
                  variants={containerVariants}
                  className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-black/10"
                >
                  <motion.div
                    variants={rowVariants}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <dt className="text-sm text-slate-400">
                      Email
                    </dt>

                    <dd className="break-all text-sm font-medium text-slate-200 sm:text-right">
                      {account?.email ?? '—'}
                    </dd>
                  </motion.div>

                  <motion.div
                    variants={rowVariants}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <dt className="text-sm text-slate-400">
                      Sign-in method
                    </dt>

                    <dd className="text-sm font-medium text-slate-200">
                      Google
                    </dd>
                  </motion.div>

                  <motion.div
                    variants={rowVariants}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <dt className="text-sm text-slate-400">
                      Email status
                    </dt>

                    <dd>
                      <span
                        className={
                          account?.isEmailVerified
                            ? 'rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300'
                            : 'rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300'
                        }
                      >
                        {account?.isEmailVerified
                          ? 'Verified'
                          : 'Not verified'}
                      </span>
                    </dd>
                  </motion.div>

                  <motion.div
                    variants={rowVariants}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <dt className="text-sm text-slate-400">
                      Two-step verification
                    </dt>

                    <dd>
                      <span
                        className={
                          account?.isTwoFactorEnabled
                            ? 'rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-300'
                            : 'rounded-full bg-slate-500/20 px-3 py-1 text-xs font-medium text-slate-300'
                        }
                      >
                        {account?.isTwoFactorEnabled
                          ? 'Enabled'
                          : 'Disabled'}
                      </span>
                    </dd>
                  </motion.div>

                  <motion.div
                    variants={rowVariants}
                    className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <dt className="shrink-0 text-sm text-slate-400">
                      Customer ID
                    </dt>

                    <dd className="break-all font-mono text-xs text-slate-300 sm:text-right">
                      {account?.customerId ?? '—'}
                    </dd>
                  </motion.div>
                </motion.dl>
              </motion.div>
            </Card.Content>
          </GlassCard>
        </motion.div>
      </motion.main>
    </div>
  );
}

export default CustomerProfile;