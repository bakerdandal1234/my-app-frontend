import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@heroui/react';
import { motion } from 'framer-motion';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import FullPageLoading from '../../ui/FullPageLoading';
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
} from '../../lib/motion-variants';
import { isAccessTokenResponse } from '../../api/guards';
import { TWO_FACTOR_CODE_REGEX } from '../../lib/validation';
// containerVariants / itemVariants now come from the shared
// ../../lib/motion-variants (this "status page" family is also used by
// VerifyEmailPage). The matching statusIconVariants is used inside
// StatusIconHeader.

const OAUTH_CALLBACK_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none absolute inset-0 overflow-hidden';

const OAUTH_CALLBACK_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
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

const OAUTH_CALLBACK_BACKGROUND_PULSE_BLOB: AnimatedBackgroundPulseBlob = {
  opacity: [0.1, 0.25, 0.1],
  scale: [1, 1.08, 1],
  duration: 9,
  className:
    'absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl',
};

/**
 * Lands here after the backend's Google/GitHub callback redirects to
 * FRONTEND_URL/oauth/callback?code=... (see backend README "OAuth"). Only
 * an opaque, short-lived (60 s) code is in the URL — never an
 * access/refresh token. The refresh_token/csrf_token cookies were already
 * set by that redirect, so this page's only job is exchanging the code for
 * an access token.
 */
function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const needsTwoFactor = searchParams.get('twoFactorRequired') === 'true';
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { establishSession } = useAuth();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (needsTwoFactor) return;
    if (!code) {
      setError('This sign-in link is missing its code.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await apiClient.post<unknown>(
          '/auth/oauth/exchange',
          { code },
        );

        if (cancelled) return;
        if (!isAccessTokenResponse(res.data)) {
          throw new Error('Unexpected OAuth response');
        }
        await establishSession(res.data.accessToken);
        navigate('/home');
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };

    // establishSession/navigate are deliberately left out of the deps so
    // that only a new `code` re-runs this request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, needsTwoFactor]);

  async function submitTwoFactor(): Promise<void> {
    if (isSubmitting || !TWO_FACTOR_CODE_REGEX.test(twoFactorCode)) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await apiClient.post<unknown>(
        '/auth/2fa/verify',
        { code: twoFactorCode },
        { _retry: true },
      );
      if (!isAccessTokenResponse(response.data)) {
        throw new Error('Unexpected two-factor response');
      }
      await establishSession(response.data.accessToken);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (needsTwoFactor) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">
        <AnimatedBackground
          wrapperClassName={OAUTH_CALLBACK_BACKGROUND_WRAPPER_CLASSNAME}
          blobs={OAUTH_CALLBACK_BACKGROUND_BLOBS}
          pulseBlob={OAUTH_CALLBACK_BACKGROUND_PULSE_BLOB}
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-md"
        >
          <GlassCard>
            <StatusIconHeader
              circleClassName="border-indigo-400/20 bg-indigo-500/10"
              icon={
                <svg
                  className="h-8 w-8 text-indigo-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
              title="Two-step verification"
              description="Enter the 6-digit code from your authenticator app to finish signing in."
            />

            <Card.Content className="px-6 py-5">
              <motion.form
                variants={itemVariants}
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitTwoFactor();
                }}
              >
                <input
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-indigo-400"
                  value={twoFactorCode}
                  onChange={(event) =>
                    setTwoFactorCode(
                      event.target.value.replace(/\D/g, '').slice(0, 6),
                    )
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  aria-label="Authentication code"
                  autoFocus
                />

                {error && (
                  <p
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={twoFactorCode.length !== 6 || isSubmitting}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Verifying…' : 'Verify and continue'}
                </button>
              </motion.form>
            </Card.Content>

            <StatusLink to="/login">
              Back to sign in
            </StatusLink>
          </GlassCard>
        </motion.div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">
        <AnimatedBackground
          wrapperClassName={OAUTH_CALLBACK_BACKGROUND_WRAPPER_CLASSNAME}
          blobs={OAUTH_CALLBACK_BACKGROUND_BLOBS}
          pulseBlob={OAUTH_CALLBACK_BACKGROUND_PULSE_BLOB}
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-md"
        >
          <GlassCard>
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
              title="Sign-in failed"
              description="We couldn't complete your sign-in."
            />

            <Card.Content className="px-6 py-5">
              <motion.p
                variants={itemVariants}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                role="alert"
              >
                {error}
              </motion.p>
            </Card.Content>

            <StatusLink to="/login">Back to login</StatusLink>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return <FullPageLoading label="Signing you in…" />;
}

export default OAuthCallbackPage;