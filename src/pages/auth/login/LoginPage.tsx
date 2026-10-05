import { Link } from 'react-router-dom';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';
import { startUserGoogleLogin, startUserGithubLogin } from '../../../auth/api';
import { useLogin } from '../../../auth/hooks/useLogin';
import AuthPageShell from '../../../components/layout/AuthPageShell';
import GlassCard from '../../../components/shared/GlassCard';
import FormField from '../../../components/shared/FormField';
import FormErrorBanner from '../../../components/shared/FormErrorBanner';
import TwoFactorChallengeForm from '../../../components/shared/TwoFactorChallengeForm';
import { containerVariants, itemVariants } from '../../../lib/motion-variants';

function LoginPage() {
  const {
    credentialsForm,
    isLoading,
    apiError,
    requiresTwoFactor,
    onSubmitCredentials,
    onSubmitTwoFactor,
    backToCredentials,
  } = useLogin();

  if (requiresTwoFactor) {
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
