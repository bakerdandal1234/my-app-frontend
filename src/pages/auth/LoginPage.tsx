import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { motion } from 'framer-motion';
import { apiClient } from '../../api/client';
import { API_URL } from '../../api/config';
import { getErrorMessage } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import AuthPageShell from '../../components/layout/AuthPageShell';
import GlassCard from '../../components/shared/GlassCard';
import FormField from '../../components/shared/FormField';
import FormErrorBanner from '../../components/shared/FormErrorBanner';
import { containerVariants, itemVariants } from '../../lib/motion-variants';
import { twoFactorCodeSchema } from '../../lib/validation';
import {
  isAccessTokenResponse,
  isTwoFactorRequiredResponse,
} from '../../api/guards';

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
  twoFactorCode: twoFactorCodeSchema,
});

type TwoFactorValues = z.infer<typeof twoFactorSchema>;

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
    const response = await apiClient.post<unknown>('/auth/login', {
      email,
      password,
      ...(twoFactorCode ? { twoFactorCode } : {}),
    });

    if (isTwoFactorRequiredResponse(response.data)) {
      setPendingCredentials({ email, password });
      return;
    }

    if (!isAccessTokenResponse(response.data)) {
      throw new Error('Unexpected login response');
    }

    await establishSession(response.data.accessToken);
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
      <AuthPageShell>
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
              <FormErrorBanner message={apiError} bannerKey="two-factor-error" />

              <FormField
                id="twoFactorCode"
                label="Authentication code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                inputClassName="tracking-widest"
                registration={twoFactorForm.register('twoFactorCode')}
                error={twoFactorForm.formState.errors.twoFactorCode}
              />
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
      </AuthPageShell>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * LOGIN STEP
   * --------------------------------------------------------------------------
   */

  return (
    <AuthPageShell>
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
            <FormErrorBanner message={apiError} bannerKey="login-error" />

            <FormField
              id="email"
              label="Email"
              type="email"
              registration={credentialsForm.register('email')}
              error={credentialsForm.formState.errors.email}
            />

            <FormField
              id="password"
              label="Password"
              type="password"
              registration={credentialsForm.register('password')}
              error={credentialsForm.formState.errors.password}
            />

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
    </AuthPageShell>
  );
}

export default LoginPage;
