
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Label } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import AnimatedBackground from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import { containerVariants, itemVariants, errorVariants } from '../../lib/motion-variants';

/** Mirrors LoginDto (auth/dto/login.dto.ts): email + password required. */
const credentialsSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Please enter a valid email address.'),

  password: z.string().min(1, 'Password is required.'),
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

/** Mirrors LoginDto's optional twoFactorCode: @Length(6, 6). */
const twoFactorSchema = z.object({
  twoFactorCode: z
    .string()
    .length(6, 'Enter the 6-digit code from your authenticator app.')
    .regex(
      /^\d{6}$/,
      'Enter the 6-digit code from your authenticator app.',
    ),
});

type TwoFactorValues = z.infer<typeof twoFactorSchema>;

/** POST /auth/login returns either shape — see AuthService.login(). */
interface LoginResponse {
  accessToken?: string;
  twoFactorRequired?: true;
}

const API_URL = import.meta.env.VITE_API_URL as string;

function LoginPage() {
  const navigate = useNavigate();
  const { establishSession } = useAuth();

  // Held only in memory, only for the duration of the 2FA step.
  const [pendingCredentials, setPendingCredentials] =
    useState<CredentialsValues | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);

  const credentialsForm = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    mode: 'onChange',

    defaultValues: {
      email: '',
      password: '',
    },
  });

  const twoFactorForm = useForm<TwoFactorValues>({
    resolver: zodResolver(twoFactorSchema),

    defaultValues: {
      twoFactorCode: '',
    },
  });

  async function completeLogin(
    email: string,
    password: string,
    twoFactorCode?: string,
  ) {
    const res = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
      ...(twoFactorCode ? { twoFactorCode } : {}),
    });

    if (res.data.twoFactorRequired) {
      setPendingCredentials({
        email,
        password,
      });

      return;
    }

    if (!res.data.accessToken) {
      throw new Error('The server did not return an access token.');
    }

    await establishSession(res.data.accessToken);

    navigate('/home');
  }

  async function onSubmitCredentials(values: CredentialsValues) {
    setApiError(null);

    try {
      await completeLogin(values.email, values.password);
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  async function onSubmitTwoFactor(values: TwoFactorValues) {
    if (!pendingCredentials) return;

    setApiError(null);

    try {
      await completeLogin(
        pendingCredentials.email,
        pendingCredentials.password,
        values.twoFactorCode,
      );
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  function backToCredentials() {
    setPendingCredentials(null);
    setApiError(null);
    twoFactorForm.reset();
  }

  /*
   * --------------------------------------------------------------------------
   * 2FA STEP
   * --------------------------------------------------------------------------
   */

  if (pendingCredentials) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
        <AnimatedBackground />

        <motion.form
          onSubmit={twoFactorForm.handleSubmit(onSubmitTwoFactor)}
          className="w-full max-w-sm"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <GlassCard>
            <Card.Header>
              <motion.div variants={itemVariants}>
                <Card.Title className="text-white">
                  Two-factor authentication
                </Card.Title>

                <Card.Description className="text-slate-400">
                  Enter the 6-digit code from your authenticator app.
                </Card.Description>
              </motion.div>
            </Card.Header>

            <Card.Content className="flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {apiError && (
                  <motion.p
                    key="two-factor-error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="rounded border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm text-red-200"
                    role="alert"
                  >
                    {apiError}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.div
                variants={itemVariants}
                className="flex flex-col gap-1"
              >
                <Label
                  htmlFor="twoFactorCode"
                  isInvalid={
                    !!twoFactorForm.formState.errors.twoFactorCode
                  }
                  className="text-slate-200"
                >
                  Authentication code
                </Label>

                <Input
                  id="twoFactorCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  fullWidth
                  className="tracking-widest"
                  {...twoFactorForm.register('twoFactorCode')}
                />

                {twoFactorForm.formState.errors.twoFactorCode && (
                  <p className="text-xs text-red-400">
                    {
                      twoFactorForm.formState.errors.twoFactorCode
                        .message
                    }
                  </p>
                )}
              </motion.div>
            </Card.Content>

            <Card.Footer className="flex flex-col gap-3">
              <motion.div
                variants={itemVariants}
                className="w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  fullWidth
                  isPending={twoFactorForm.formState.isSubmitting}
                >
                  {twoFactorForm.formState.isSubmitting
                    ? 'Verifying…'
                    : 'Verify'}
                </Button>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onPress={backToCredentials}
                >
                  Use a different account
                </Button>
              </motion.div>
            </Card.Footer>
          </GlassCard>
        </motion.form>
      </div>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * LOGIN STEP
   * --------------------------------------------------------------------------
   */

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <AnimatedBackground />

      <motion.form
        onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)}
        className="w-full max-w-sm"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <GlassCard>
          <Card.Header>
            <motion.div variants={itemVariants}>
              <Card.Title className="text-white">
                Log in
              </Card.Title>
            </motion.div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              {apiError && (
                <motion.p
                  key="login-error"
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="rounded border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm text-red-200"
                  role="alert"
                >
                  {apiError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Email */}

            <motion.div
              variants={itemVariants}
              className="flex flex-col gap-1"
            >
              <Label
                htmlFor="email"
                isInvalid={!!credentialsForm.formState.errors.email}
                className="text-slate-200"
              >
                Email
              </Label>

              <Input
                id="email"
                type="email"
                fullWidth
                {...credentialsForm.register('email')}
              />

              {credentialsForm.formState.errors.email && (
                <p className="text-xs text-red-400">
                  {
                    credentialsForm.formState.errors.email
                      .message
                  }
                </p>
              )}
            </motion.div>

            {/* Password */}

            <motion.div
              variants={itemVariants}
              className="flex flex-col gap-1"
            >
              <Label
                htmlFor="password"
                isInvalid={
                  !!credentialsForm.formState.errors.password
                }
                className="text-slate-200"
              >
                Password
              </Label>

              <Input
                id="password"
                type="password"
                fullWidth
                {...credentialsForm.register('password')}
              />

              {credentialsForm.formState.errors.password && (
                <p className="text-xs text-red-400">
                  {
                    credentialsForm.formState.errors.password
                      .message
                  }
                </p>
              )}
            </motion.div>

            {/* Forgot password */}

            <motion.div
              variants={itemVariants}
              className="text-right text-sm"
            >
              <Link
                to="/forgot-password"
                className="text-indigo-400 hover:underline"
              >
                Forgot password?
              </Link>
            </motion.div>
          </Card.Content>

          <Card.Footer className="flex flex-col gap-3">
            {/* Login button */}

            <motion.div
              variants={itemVariants}
              className="w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="submit"
                fullWidth
                isPending={credentialsForm.formState.isSubmitting}
              >
                {credentialsForm.formState.isSubmitting
                  ? 'Logging in…'
                  : 'Log in'}
              </Button>
            </motion.div>

            {/* Divider */}

            <motion.div
              variants={itemVariants}
              className="flex w-full items-center gap-3"
            >
              <div className="h-px flex-1 bg-white/10" />

              <span className="text-xs text-slate-400">
                or continue with
              </span>

              <div className="h-px flex-1 bg-white/10" />
            </motion.div>

            {/* Google */}

            <motion.div
              variants={itemVariants}
              className="w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <a
                href={`${API_URL}/auth/google`}
                className={buttonVariants({
                  variant: 'danger',
                  fullWidth: true,
                })}
              >
                Continue with Google
              </a>
            </motion.div>

            {/* GitHub */}

            <motion.div
              variants={itemVariants}
              className="w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <a
                href={`${API_URL}/auth/github`}
                className={buttonVariants({
                  variant: 'danger',
                  fullWidth: true,
                })}
              >
                Continue with GitHub
              </a>
            </motion.div>

            {/* Register */}

            <motion.p
              variants={itemVariants}
              className="text-center text-sm text-slate-400"
            >
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="text-indigo-400 hover:underline"
              >
                Create one
              </Link>
            </motion.p>
          </Card.Footer>
        </GlassCard>
      </motion.form>
    </div>
  );
}

export default LoginPage;

