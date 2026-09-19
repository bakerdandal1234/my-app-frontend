import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@heroui/react';
import { motion } from 'framer-motion';
import { customerApi } from '../../customer/api/customerClient';
import { useCustomerAuth } from '../../customer/CustomerAuthContext';
import { getErrorMessage } from '../../api/errors';
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

// containerVariants / itemVariants now come from the shared
// ../../lib/motion-variants (this "status page" family is also used by
// VerifyEmailPage and OAuthCallbackPage). The matching statusIconVariants
// is used inside StatusIconHeader.

const CUSTOMER_OAUTH_CALLBACK_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none absolute inset-0 overflow-hidden';

const CUSTOMER_OAUTH_CALLBACK_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
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

const CUSTOMER_OAUTH_CALLBACK_BACKGROUND_PULSE_BLOB: AnimatedBackgroundPulseBlob =
  {
    opacity: [0.1, 0.25, 0.1],
    scale: [1, 1.08, 1],
    duration: 9,
    className:
      'absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl',
  };

/**
 * Where the backend's customer Google callback sends the browser.
 *
 * The URL carries ONLY an opaque, single-use, short-lived code (or an
 * `error` keyword). The other half of the handoff — customer_oauth_binding
 * — is an httpOnly cookie the customer never sees, and `customerApi` sends
 * it because it is created with `withCredentials: true`. Nothing is ever
 * displayed to the customer except a spinner, an error, or the 2FA prompt —
 * no JSON, no code to copy, no cookie to paste.
 */

/**
 * Redeemed codes, module-scoped on purpose.
 *
 * The exchange code is single-use, and React.StrictMode (see main.tsx)
 * mounts every effect twice in development — setup, cleanup, setup again —
 * specifically to catch missing cleanup logic. A per-effect `cancelled`
 * flag set by that synthetic cleanup would mark the ONE invocation that
 * actually made the request as cancelled by the time its response arrives,
 * silently swallowing establishSession()/navigate() even though the
 * exchange itself succeeded. Guarding on the code itself here — rather than
 * on a cleanup flag — is what lets the in-flight request finish and
 * navigate normally regardless of how many times the effect fires.
 */
const redeemedCodes = new Set<string>();

function isAccessTokenBody(data: unknown): data is { accessToken: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as Record<string, unknown>).accessToken === 'string'
  );
}

function isTwoFactorRequiredBody(
  data: unknown,
): data is { twoFactorRequired: true } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).twoFactorRequired === true
  );
}

/** The backend only ever sends a closed set of opaque keywords. */
function describeCallbackError(keyword: string): string {
  switch (keyword) {
    case 'email_in_use':
      return 'An account already uses this email address. Please contact support so it can be linked to your Google account.';
    case 'account_unavailable':
      return 'This account is temporarily unavailable. Please try again later.';
    case 'google_verification_failed':
      return 'Google could not confirm a verified email address for this account. Please verify your email with Google and try again.';
    default:
      return 'We could not complete your sign-in. Please try again.';
  }
}

function CustomerOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { establishSession } = useCustomerAuth();

  const code = searchParams.get('code');
  const callbackError = searchParams.get('error');

  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (callbackError) {
      setError(describeCallbackError(callbackError));
      return;
    }

    if (!code) {
      setError('This sign-in link is missing its code.');
      return;
    }

    if (redeemedCodes.has(code)) {
      return;
    }

    redeemedCodes.add(code);

    (async () => {
      try {
        // withCredentials (see customerClient) is what carries the
        // httpOnly binding cookie along with this request.
        const response = await customerApi.post<unknown>(
          '/customer/auth/oauth/exchange',
          { code },
        );

        if (isTwoFactorRequiredBody(response.data)) {
          setNeedsTwoFactor(true);
          return;
        }

        if (!isAccessTokenBody(response.data)) {
          setError('We could not complete your sign-in. Please try again.');
          return;
        }

        await establishSession(response.data.accessToken);
        navigate('/customer/account', { replace: true });
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      }
    })();

    // establishSession/navigate are stable across renders (from context /
    // react-router); only `code`/`callbackError` actually changing should
    // re-run this. No cleanup: redeemedCodes above is what prevents a
    // duplicate redemption, not effect teardown — see the comment on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, callbackError]);

  async function submitTwoFactor(): Promise<void> {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await customerApi.post<unknown>(
        '/customer/auth/2fa/verify',
        { code: twoFactorCode },
      );

      if (!isAccessTokenBody(response.data)) {
        setError('We could not complete your sign-in. Please try again.');
        return;
      }

      await establishSession(response.data.accessToken);
      navigate('/customer/account', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (needsTwoFactor) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">
        <AnimatedBackground
          wrapperClassName={CUSTOMER_OAUTH_CALLBACK_BACKGROUND_WRAPPER_CLASSNAME}
          blobs={CUSTOMER_OAUTH_CALLBACK_BACKGROUND_BLOBS}
          pulseBlob={CUSTOMER_OAUTH_CALLBACK_BACKGROUND_PULSE_BLOB}
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

            <StatusLink to="/customer/login">
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
          wrapperClassName={CUSTOMER_OAUTH_CALLBACK_BACKGROUND_WRAPPER_CLASSNAME}
          blobs={CUSTOMER_OAUTH_CALLBACK_BACKGROUND_BLOBS}
          pulseBlob={CUSTOMER_OAUTH_CALLBACK_BACKGROUND_PULSE_BLOB}
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

            <StatusLink to="/customer/login">
              Back to sign in
            </StatusLink>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return <FullPageLoading label="Signing you in…" />;
}

export default CustomerOAuthCallbackPage;
