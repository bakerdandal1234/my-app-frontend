import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@heroui/react';
import {
  AnimatePresence,
  motion,
  type Variants,
} from 'framer-motion';

import { getErrorMessage } from '../../api/errors';
import { customerApi } from '../../customer/api/customerClient';
import { useCustomerAuth } from '../../customer/CustomerAuthContext';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import {
  containerVariants,
  itemVariants,
  errorVariants,
} from '../../lib/motion-variants';
import StatusLink from '../../components/shared/StatusLink';

interface CustomerSession {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt: string;
  current: boolean;
}

function isCustomerSession(value: unknown): value is CustomerSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;

  return (
    typeof session.id === 'string' &&
    typeof session.createdAt === 'string' &&
    typeof session.expiresAt === 'string' &&
    typeof session.current === 'boolean'
  );
}

function isCustomerSessionList(
  value: unknown,
): value is CustomerSession[] {
  return Array.isArray(value) && value.every(isCustomerSession);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString();
}

const sessionVariants: Variants = {
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
  exit: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.2,
    },
  },
};

const SESSIONS_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
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
    y: [0, 45, 0],
    scale: [1, 1.2, 1],
    duration: 16,
    className:
      'absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl',
  },
];

function CustomerSessionsPage() {
  const { logout } = useCustomerAuth();

  const [sessions, setSessions] = useState<CustomerSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async (): Promise<void> => {
    try {
      const response = await customerApi.get<unknown>(
        '/customer/auth/sessions',
      );

      if (!isCustomerSessionList(response.data)) {
        throw new Error('Unexpected sessions response');
      }

      setSessions(response.data);
      setError(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function revokeSession(sessionId: string): Promise<void> {
    if (revokingId) return;

    setRevokingId(sessionId);
    setError(null);

    try {
      await customerApi.delete(
        `/customer/auth/sessions/${sessionId}`,
      );

      setSessions((currentSessions) =>
        currentSessions.filter(
          (session) => session.id !== sessionId,
        ),
      );
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6">
      <AnimatedBackground
        wrapperClassName="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        blobs={SESSIONS_BACKGROUND_BLOBS}
      />

      <motion.main
        className="mx-auto w-full max-w-3xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Signed-in devices
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Review and remove devices connected to your customer
              account.
            </p>
          </div>

         
           <StatusLink to="/customer/account">Back to home</StatusLink>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard>
            <Card.Header>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Card.Title className="text-white">
                    Your sessions
                  </Card.Title>

                  <Card.Description className="text-slate-400">
                    Review and revoke access from devices you no
                    longer use.
                  </Card.Description>
                </div>

                {!isLoading && !error && (
                  <span className="w-fit shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {sessions.length}{' '}
                    {sessions.length === 1
                      ? 'session'
                      : 'sessions'}
                  </span>
                )}
              </div>
            </Card.Header>

            <Card.Content className="flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="customer-sessions-error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-3 text-sm text-red-200"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  variants={itemVariants}
                  className="flex flex-col items-center justify-center py-12"
                  role="status"
                >
                  <div
                    className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400"
                    aria-hidden="true"
                  />

                  <p className="text-sm text-slate-400">
                    Loading sessions…
                  </p>
                </motion.div>
              )}

              {!isLoading && !error && sessions.length === 0 && (
                <motion.div
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="rounded-xl border border-white/10 bg-black/10 px-6 py-10 text-center"
                >
                  <p className="font-medium text-slate-200">
                    No active sessions found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    There are currently no active sessions on your
                    customer account.
                  </p>
                </motion.div>
              )}

              {!isLoading && (
                <motion.ul
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col gap-3"
                >
                  <AnimatePresence>
                    {sessions.map((session) => (
                      <motion.li
                        key={session.id}
                        layout
                        variants={sessionVariants}
                        exit="exit"
                        whileHover={{ y: -2 }}
                        className="rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-indigo-500/20 hover:bg-white/[0.07]"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                                <span
                                  className="text-lg text-indigo-400"
                                  aria-hidden="true"
                                >
                                  ●
                                </span>
                              </div>

                              <div className="min-w-0">
                                <p
                                  className="truncate text-sm font-semibold text-slate-200"
                                  title={
                                    session.userAgent || 'Unknown device'
                                  }
                                >
                                  {session.userAgent || 'Unknown device'}
                                </p>

                                <p className="mt-0.5 break-all text-xs text-slate-500">
                                  IP: {session.ipAddress || 'Unknown'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                              <div>
                                <p className="text-slate-500">
                                  Signed in
                                </p>

                                <p className="mt-0.5 text-slate-300">
                                  {formatDate(session.createdAt)}
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">
                                  Last used
                                </p>

                                <p className="mt-0.5 text-slate-300">
                                  {formatDate(session.lastUsedAt)}
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">
                                  Expires
                                </p>

                                <p className="mt-0.5 text-slate-300">
                                  {formatDate(session.expiresAt)}
                                </p>
                              </div>
                            </div>

                            {session.current && (
                              <div className="mt-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                                  This device
                                </span>
                              </div>
                            )}
                          </div>

                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="shrink-0"
                          >
                            {session.current ? (
                              <Button
                                type="button"
                                variant="ghost"
                                onPress={() => void logout()}
                                className="border border-red-400/20 text-red-300 hover:bg-red-500/10"
                              >
                                Sign out
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                onPress={() =>
                                  void revokeSession(session.id)
                                }
                                isDisabled={revokingId !== null}
                                isPending={revokingId === session.id}
                                className="border border-red-400/20 text-red-300 hover:bg-red-500/10"
                              >
                                {revokingId === session.id
                                  ? 'Revoking…'
                                  : 'Revoke'}
                              </Button>
                            )}
                          </motion.div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </motion.ul>
              )}
            </Card.Content>
          </GlassCard>
        </motion.div>
      </motion.main>
    </div>
  );
}

export default CustomerSessionsPage;