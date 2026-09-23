import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@heroui/react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { apiClient, refreshAccessToken } from '../../api/client';
import { setAccessToken } from '../../api/tokenStore';
import { getErrorMessage } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import { containerVariants, itemVariants, errorVariants } from '../../lib/motion-variants';
import BackLink from '../../components/shared/BackLink';
import {
  isSessionItemArray,
  type SessionItem,
} from '../../api/guards';
/** Mirrors SafeSession from the backend's session.controller.ts. */



function formatDate(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}
// --- Motion Variants ---
// containerVariants / itemVariants / errorVariants now come from the
// shared ../../lib/motion-variants (consolidated from a near-identical
// local copy with a barely perceptible timing/offset difference —
// approved as part of the UI dedup pass).

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
};

const SESSIONS_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none fixed inset-0 -z-10 overflow-hidden';

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

function SessionsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] =
    useState<SessionItem[] | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] =
    useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  async function loadSessions(): Promise<void> {
    setError(null);

    try {
      const res = await apiClient.get<unknown>('/sessions');

      if (!isSessionItemArray(res.data)) {
        throw new Error('Unexpected sessions response');
      }

      setSessions(res.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    setError(null);

    try {
      await apiClient.delete(`/sessions/${id}`);
      await loadSessions();

      try {
        await refreshAccessToken();
      } catch {
        setAccessToken(null);
        navigate('/login');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeAll() {
    setRevokingAll(true);
    setError(null);

    try {
      await apiClient.delete('/sessions');

      await logout();
    } catch (err) {
      setError(getErrorMessage(err));
      setRevokingAll(false);
    }
  }

  const activeSessions =
    sessions?.filter((session) => !session.revokedAt) ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <AnimatedBackground
        wrapperClassName={SESSIONS_BACKGROUND_WRAPPER_CLASSNAME}
        blobs={SESSIONS_BACKGROUND_BLOBS}
      />

      <motion.main
        className="mx-auto w-full max-w-3xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Sessions
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Manage the devices currently signed in to your
              account.
            </p>
          </div>

          <BackLink to="/home">Back to home</BackLink>
        </motion.div>

        {/* Main Card */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <Card.Header>
              <div className="flex w-full items-center justify-between">
                <div>
                  <Card.Title className="text-white">
                    Your sessions
                  </Card.Title>

                  <Card.Description className="text-slate-400">
                    Review and revoke access from devices you no
                    longer use.
                  </Card.Description>
                </div>

                {sessions && (
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {activeSessions.length}{' '}
                    {activeSessions.length === 1
                      ? 'active session'
                      : 'active sessions'}
                  </div>
                )}
              </div>
            </Card.Header>

            <Card.Content className="flex flex-col gap-4">
              {/* Error */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="sessions-error"
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

              {/* Loading */}
              {sessions === null && !error && (
                <motion.div
                  variants={itemVariants}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />

                  <p className="text-sm text-slate-400">
                    Loading sessions…
                  </p>
                </motion.div>
              )}

              {/* Empty */}
              {sessions && sessions.length === 0 && (
                <motion.div
                  variants={itemVariants}
                  className="rounded-xl border border-white/10 bg-black/10 px-6 py-10 text-center"
                >
                  <p className="font-medium text-slate-200">
                    No sessions found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    There are currently no active sessions on
                    your account.
                  </p>
                </motion.div>
              )}

              {/* Sessions */}
              {sessions && sessions.length > 0 && (
                <motion.ul
                  className="flex flex-col gap-3"
                  variants={containerVariants}
                >
                  {sessions.map((session) => {
                    const isRevoked = !!session.revokedAt;

                    return (
                      <motion.li
                        key={session.id}
                        variants={sessionVariants}
                        whileHover={
                          !isRevoked
                            ? {
                              y: -2,
                            }
                            : undefined
                        }
                        className={`rounded-xl border p-4 transition-colors ${isRevoked
                            ? 'border-white/5 bg-black/10 opacity-70'
                            : 'border-white/10 bg-white/5 hover:border-indigo-500/20 hover:bg-white/[0.07]'
                          }`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          {/* Session information */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isRevoked
                                    ? 'bg-slate-500/10'
                                    : 'bg-indigo-500/10'
                                  }`}
                              >
                                <span
                                  className={`text-lg ${isRevoked
                                      ? 'text-slate-500'
                                      : 'text-indigo-400'
                                    }`}
                                >
                                  {isRevoked ? '×' : '●'}
                                </span>
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-200">
                                  {session.userAgent ??
                                    'Unknown device'}
                                </p>

                                <p className="mt-0.5 text-xs text-slate-500">
                                  IP:{' '}
                                  {session.ipAddress ??
                                    'Unknown'}
                                </p>
                              </div>
                            </div>

                            {/* Session metadata */}
                            <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                              <div>
                                <p className="text-slate-500">
                                  Created
                                </p>

                                <p className="mt-0.5 text-slate-300">
                                  {formatDate(
                                    session.createdAt,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">
                                  Last used
                                </p>

                                <p className="mt-0.5 text-slate-300">
                                  {formatDate(
                                    session.lastUsedAt,
                                  )}
                                </p>
                              </div>

                              <div>
                                <p className="text-slate-500">
                                  Expires
                                </p>

                                <p className="mt-0.5 text-slate-300">
                                  {formatDate(
                                    session.expiresAt,
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Status */}
                            <div className="mt-4">
                              {isRevoked ? (
                                <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
                                  Revoked{' '}
                                  {formatDate(
                                    session.revokedAt,
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  Active
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Revoke */}
                          {!isRevoked && (
                            <div className="shrink-0">
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                isPending={
                                  revokingId === session.id
                                }
                                onPress={() =>
                                  handleRevoke(session.id)
                                }
                              >
                                {revokingId === session.id
                                  ? 'Revoking…'
                                  : 'Revoke'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </motion.li>
                    );
                  })}
                </motion.ul>
              )}
            </Card.Content>

            {/* Revoke all */}
            {sessions && sessions.length > 0 && (
              <Card.Footer>
                {sessions.some(
                  (session) => !session.revokedAt,
                ) && (
                    <motion.div
                      variants={itemVariants}
                      className="w-full"
                    >
                      <Button
                        type="button"
                        variant="danger"
                        fullWidth
                        isPending={revokingAll}
                        onPress={handleRevokeAll}
                      >
                        {revokingAll
                          ? 'Revoking all…'
                          : 'Revoke all sessions (log out everywhere)'}
                      </Button>
                    </motion.div>
                  )}
              </Card.Footer>
            )}
          </GlassCard>
        </motion.div>
      </motion.main>
    </div>
  );
}

export default SessionsPage;