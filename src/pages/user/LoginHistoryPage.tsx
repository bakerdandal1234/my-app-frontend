import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';
import { getLoginHistory } from '../../auth/api';
import type { LoginHistoryItem } from '../../auth/contracts';
import { getErrorMessage } from '../../api/errors';
import { getAccessToken, getAuthVersion, subscribeToAccessToken } from '../../api/tokenStore';
import AnimatedBackground from '../../components/layout/AnimatedBackground';
import BackLink from '../../components/shared/BackLink';
import FormErrorBanner from '../../components/shared/FormErrorBanner';
import GlassCard from '../../components/shared/GlassCard';
import { containerVariants, itemVariants } from '../../lib/motion-variants';

interface HistoryRequest {
  authVersion: number;
  controller: AbortController;
}

function LoginHistoryPage() {
  const [history, setHistory] = useState<LoginHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(false);
  const requestRef = useRef<HistoryRequest | null>(null);

  const isCurrent = useCallback((request: HistoryRequest): boolean => (
    mountedRef.current &&
    requestRef.current === request &&
    request.authVersion === getAuthVersion() &&
    !request.controller.signal.aborted
  ), []);

  const reload = useCallback(async (): Promise<void> => {
    if (!mountedRef.current || !getAccessToken()) return;
    requestRef.current?.controller.abort();
    const request: HistoryRequest = {
      authVersion: getAuthVersion(),
      controller: new AbortController(),
    };
    requestRef.current = request;
    setHistory(null);
    setError(null);
    setIsLoading(true);

    try {
      const entries = await getLoginHistory({ signal: request.controller.signal });
      if (isCurrent(request)) setHistory(entries);
    } catch (loadError: unknown) {
      if (isCurrent(request)) setError(getErrorMessage(loadError));
    } finally {
      if (isCurrent(request)) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  }, [isCurrent]);

  useEffect(() => {
    mountedRef.current = true;
    let observedAuthVersion = getAuthVersion();
    const unsubscribe = subscribeToAccessToken(() => {
      const authVersion = getAuthVersion();
      if (authVersion === observedAuthVersion) return;
      observedAuthVersion = authVersion;
      requestRef.current?.controller.abort();
      requestRef.current = null;
      setHistory(null);
      setError(null);
      setIsLoading(false);
      if (getAccessToken()) void reload();
    });

    if (getAccessToken()) void reload();
    else setIsLoading(false);

    return () => {
      mountedRef.current = false;
      unsubscribe();
      requestRef.current?.controller.abort();
      requestRef.current = null;
    };
  }, [reload]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <AnimatedBackground />
      <motion.main
        className="relative mx-auto w-full max-w-3xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          variants={itemVariants}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Login history</h1>
            <p className="mt-1 text-sm text-slate-400">
              Review recent sign-in attempts for your account.
            </p>
          </div>
          <BackLink to="/profile">Back to profile</BackLink>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GlassCard>
            <Card.Header>
              <div className="flex w-full items-center justify-between gap-4">
                <div>
                  <Card.Title className="text-white">Recent activity</Card.Title>
                  <Card.Description className="text-slate-400">
                    Your 20 most recent sign-in attempts.
                  </Card.Description>
                </div>
                <Button type="button" variant="secondary" isDisabled={isLoading} onPress={() => { void reload(); }}>
                  Refresh
                </Button>
              </div>
            </Card.Header>

            <Card.Content className="flex flex-col gap-4" aria-busy={isLoading}>
              <FormErrorBanner message={error} bannerKey="login-history-error" />
              {error && (
                <Button type="button" variant="secondary" isDisabled={isLoading} onPress={() => { void reload(); }}>
                  Retry loading login history
                </Button>
              )}

              {isLoading && (
                <div role="status" className="flex flex-col items-center justify-center py-12">
                  <div aria-hidden="true" className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
                  <p className="text-sm text-slate-400">Loading login history…</p>
                </div>
              )}

              {!isLoading && history?.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-black/10 px-6 py-10 text-center">
                  <p className="font-medium text-slate-200">No login activity found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    There are no recorded sign-in attempts for your account yet.
                  </p>
                </div>
              )}

              {!isLoading && history && history.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {history.map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <time dateTime={entry.createdAt} className="text-sm text-slate-200">
                          {new Date(entry.createdAt).toLocaleString()}
                        </time>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${entry.success
                          ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                          : 'border-red-400/20 bg-red-500/10 text-red-300'}`}>
                          {entry.success ? 'Successful' : 'Failed'}
                        </span>
                      </div>
                      <dl className="grid gap-3 text-sm">
                        <div>
                          <dt className="text-xs text-slate-500">IP address</dt>
                          <dd className="mt-1 break-all font-mono text-slate-300">{entry.ipAddress || 'Not available'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Browser / device</dt>
                          <dd className="mt-1 break-words text-slate-300">{entry.userAgent || 'Not available'}</dd>
                        </div>
                        {!entry.success && (
                          <div>
                            <dt className="text-xs text-slate-500">Failure reason</dt>
                            <dd className="mt-1 break-words text-red-300">{entry.failureReason || 'Not available'}</dd>
                          </div>
                        )}
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Content>
          </GlassCard>
        </motion.div>
      </motion.main>
    </div>
  );
}

export default LoginHistoryPage;
