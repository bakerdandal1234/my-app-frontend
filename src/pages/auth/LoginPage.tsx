import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';
import { getErrorMessage } from '../../api/errors';
import { getAuthVersion, subscribeToAccessToken } from '../../api/tokenStore';
import { useAuth } from '../../auth/AuthContext';
import {
  login,
  startUserGoogleLogin,
  startUserGithubLogin,
} from '../../auth/api';
import AuthPageShell from '../../components/layout/AuthPageShell';
import GlassCard from '../../components/shared/GlassCard';
import FormField from '../../components/shared/FormField';
import FormErrorBanner from '../../components/shared/FormErrorBanner';
import TwoFactorChallengeForm from '../../components/shared/TwoFactorChallengeForm';
import { containerVariants, itemVariants } from '../../lib/motion-variants';
import {
  emailSchema,
  loginPasswordSchema,
} from '../../lib/validation';

const credentialsSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

interface LoginOperation {
  version: number;
  active: boolean;
  submitting: boolean;
  awaitingTwoFactor: boolean;
  expectedToken: string | null;
}

function isCurrentOperation(operation: LoginOperation, current: LoginOperation | null): boolean {
  return operation === current && operation.active && operation.version === getAuthVersion();
}

function LoginPage() {
  const navigate = useNavigate();
  const { establishSession, isLoading } = useAuth();
  const mounted = useRef(false);
  const activeOperation = useRef<LoginOperation | null>(null);

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

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = subscribeToAccessToken((token) => {
      const operation = activeOperation.current;
      const version = getAuthVersion();
      if (!operation?.active || operation.version === version) return;

      // Only our own synchronous publication may advance this operation.
      if (operation.expectedToken !== null && token === operation.expectedToken && version === operation.version + 1) {
        operation.version = version;
        operation.expectedToken = null;
        return;
      }

      operation.active = false;
      activeOperation.current = null;
      setPendingCredentials(null);
      setApiError('Your session changed. Please start signing in again.');
    });

    return () => {
      mounted.current = false;
      if (activeOperation.current) activeOperation.current.active = false;
      activeOperation.current = null;
      unsubscribe();
    };
  }, []);

  async function completeLogin(
    operation: LoginOperation,
    credentials: CredentialsValues,
    twoFactorCode?: string,
  ): Promise<void> {
    operation.submitting = true;
    setApiError(null);

    try {
      const response = await login({ ...credentials, twoFactorCode });
      if (!isCurrentOperation(operation, activeOperation.current)) return;

      if (response.twoFactorRequired === true) {
        operation.awaitingTwoFactor = true;
        setPendingCredentials(credentials);
        return;
      }

      operation.expectedToken = response.accessToken;
      const establishing = establishSession(response.accessToken);
      operation.expectedToken = null;
      await establishing;
      if (!isCurrentOperation(operation, activeOperation.current)) return;

      operation.active = false;
      activeOperation.current = null;
      setPendingCredentials(null);
      navigate('/home');
    } catch (err: unknown) {
      if (!isCurrentOperation(operation, activeOperation.current)) return;
      setApiError(getErrorMessage(err));
      if (!operation.awaitingTwoFactor) {
        operation.active = false;
        activeOperation.current = null;
      }
    } finally {
      operation.expectedToken = null;
      operation.submitting = false;
    }
  }

  async function onSubmitCredentials(values: CredentialsValues): Promise<void> {
    if (!mounted.current || isLoading || activeOperation.current?.submitting) return;
    if (activeOperation.current) activeOperation.current.active = false;

    const operation: LoginOperation = {
      version: getAuthVersion(),
      active: true,
      submitting: false,
      awaitingTwoFactor: false,
      expectedToken: null,
    };
    activeOperation.current = operation;
    await completeLogin(operation, values);
  }

  async function onSubmitTwoFactor(code: string): Promise<void> {
    const operation = activeOperation.current;
    if (!mounted.current || isLoading || !operation || !pendingCredentials || operation.submitting) return;
    if (!isCurrentOperation(operation, activeOperation.current)) return;
    await completeLogin(operation, pendingCredentials, code);
  }

  function backToCredentials() {
    if (activeOperation.current) activeOperation.current.active = false;
    activeOperation.current = null;
    setPendingCredentials(null);
    setApiError(null);
  }

  if (pendingCredentials) {
    return (
      <AuthPageShell>
        <TwoFactorChallengeForm
          error={apiError}
          onSubmit={onSubmitTwoFactor}
          onCancel={backToCredentials}
        />
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <motion.form
        onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)}
        noValidate
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
              autoComplete="email"
              registration={credentialsForm.register('email')}
              error={credentialsForm.formState.errors.email}
            />

            <FormField
              id="password"
              label="Password"
              type="password"
              autoComplete="current-password"
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
                isDisabled={isLoading || credentialsForm.formState.isSubmitting}
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

            <motion.div
              variants={itemVariants}
              className="w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                type="button"
                variant="danger"
                fullWidth
                onPress={startUserGoogleLogin}
                isDisabled={credentialsForm.formState.isSubmitting}
              >
                Continue with Google
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
                variant="danger"
                fullWidth
                onPress={startUserGithubLogin}
                isDisabled={credentialsForm.formState.isSubmitting}
              >
                Continue with GitHub
              </Button>
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
