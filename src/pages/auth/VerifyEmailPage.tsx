import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Spinner } from '@heroui/react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
  type AnimatedBackgroundPulseBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import StatusIconHeader from '../../components/shared/StatusIconHeader';
import StatusLink from '../../components/shared/StatusLink';
import {
  statusContainerVariants as containerVariants,
  statusItemVariants as itemVariants,
  statusIconVariants as iconVariants,
} from '../../lib/motion-variants';
import { isMessageResponse } from '../../api/guards';
type Status = 'loading' | 'success' | 'error';

// containerVariants / itemVariants / iconVariants now come from the shared
// ../../lib/motion-variants (this "status page" family is also used by
// OAuthCallbackPage and CustomerOAuthCallbackPage).

const errorVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

const VERIFY_EMAIL_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none absolute inset-0 overflow-hidden';

const VERIFY_EMAIL_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
  {
    x: [0, 50, 0],
    y: [0, 35, 0],
    scale: [1, 1.15, 1],
    duration: 14,
    className:
      'absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl',
  },
  {
    x: [0, -40, 0],
    y: [0, -30, 0],
    scale: [1, 1.1, 1],
    duration: 16,
    className:
      'absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl',
  },
];

const VERIFY_EMAIL_BACKGROUND_PULSE_BLOB: AnimatedBackgroundPulseBlob = {
  opacity: [0.15, 0.3, 0.15],
  scale: [1, 1.05, 1],
  duration: 8,
  className:
    'absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl',
};

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }

    // The backend clears the token on first use, so a second request for the
    // same token gets a 400. StrictMode (dev) runs effects twice, so send the
    // request once per token and let its result through.
    if (requestedTokenRef.current === token) return;
    requestedTokenRef.current = token;

    (async () => {
      try {
        const res = await apiClient.get<unknown>(
          '/auth/verify-email',
          { params: { token } },
        );

        if (requestedTokenRef.current !== token) return;

        if (!isMessageResponse(res.data)) {
          throw new Error('Unexpected email verification response');
        }

        setStatus('success');
        setMessage(
          res.data.message ?? 'Your email has been verified.',
        );
      } catch (err: unknown) {
        if (requestedTokenRef.current !== token) return;

        setStatus('error');
        setMessage(getErrorMessage(err));
      }
    })();
  }, [token]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">
      <AnimatedBackground
        wrapperClassName={VERIFY_EMAIL_BACKGROUND_WRAPPER_CLASSNAME}
        blobs={VERIFY_EMAIL_BACKGROUND_BLOBS}
        pulseBlob={VERIFY_EMAIL_BACKGROUND_PULSE_BLOB}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        <GlassCard>
          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <motion.div
                key="loading"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
              >
                <Card.Content className="flex flex-col items-center gap-5 px-6 py-10 text-center">
                  <motion.div
                    variants={iconVariants}
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/10"
                  >
                    <Spinner size="lg" color="accent" />
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <h1 className="text-xl font-semibold text-white">
                      Verifying your email
                    </h1>

                    <p className="mt-2 text-sm text-slate-400">
                      Please wait while we verify your email address…
                    </p>
                  </motion.div>
                </Card.Content>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                key="success"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
              >
                <StatusIconHeader
                  circleClassName="border-emerald-400/20 bg-emerald-500/10"
                  icon={
                    <svg
                      className="h-8 w-8 text-emerald-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  }
                  title="Email verified"
                  description="Your email address has been successfully verified."
                />

                <Card.Content className="px-6 py-5">
                  <motion.div
                    variants={itemVariants}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-300"
                  >
                    {message}
                  </motion.div>
                </Card.Content>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                key="error"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
              >
                <StatusIconHeader
                  circleClassName="border-red-400/20 bg-red-500/10"
                  icon={
                    <svg
                      className="h-8 w-8 text-red-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M15 9 9 15" />
                      <path d="m9 9 6 6" />
                    </svg>
                  }
                  title="Verification failed"
                  description="We couldn't verify your email address."
                />

                <Card.Content className="px-6 py-5">
                  <AnimatePresence mode="wait">
                    {message && (
                      <motion.p
                        key={message}
                        variants={errorVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                        role="alert"
                      >
                        {message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </Card.Content>
              </motion.div>
            )}
          </AnimatePresence>

          <StatusLink to="/">Back to home</StatusLink>
        </GlassCard>
      </motion.div>
    </div>
  );
}

export default VerifyEmailPage;