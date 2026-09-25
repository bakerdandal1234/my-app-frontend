import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import AuthPageShell from '../../components/layout/AuthPageShell';
import GlassCard from '../../components/shared/GlassCard';
import FormField from '../../components/shared/FormField';
import FormErrorBanner from '../../components/shared/FormErrorBanner';
import { containerVariants, itemVariants } from '../../lib/motion-variants';

/** Mirrors ForgotPasswordDto (auth/dto/forgot-password.dto.ts). */
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required.')
    .email('Please enter a valid email address.'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordPage() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setApiError(null);

    try {
      await apiClient.post('/auth/forgot-password', values);

      // The backend always returns the same generic response whether or
      // not the email is registered (to avoid leaking account existence).
      setSubmitted(true);
    } catch (err) {
      // Genuine failure such as network error or server error.
      setApiError(getErrorMessage(err));
    }
  }

  if (submitted) {
    return (
      <AuthPageShell>
        <motion.div
          className="w-full max-w-sm"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <GlassCard>
            <Card.Header>
              <motion.div variants={itemVariants}>
                <Card.Title className="text-white">
                  Check your email
                </Card.Title>

                <Card.Description className="text-slate-400">
                  We&apos;ve sent password reset instructions if an account
                  exists for that email.
                </Card.Description>
              </motion.div>
            </Card.Header>

            <Card.Content>
              <motion.div
                variants={itemVariants}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"
              >
                <p className="text-sm text-emerald-300">
                  Please check your inbox and follow the reset link.
                </p>
              </motion.div>
            </Card.Content>

            <Card.Footer>
              <motion.div
                variants={itemVariants}
                className="w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/login"
                  className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
                >
                  Back to login
                </Link>
              </motion.div>
            </Card.Footer>
          </GlassCard>
        </motion.div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <GlassCard>
          <Card.Header>
            <motion.div variants={itemVariants}>
              <Card.Title className="text-white">
                Forgot password?
              </Card.Title>

              <Card.Description className="text-slate-400">
                Enter your email and we&apos;ll send you a link to reset your
                password.
              </Card.Description>
            </motion.div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            <FormErrorBanner message={apiError} bannerKey="forgot-password-error" />

            <FormField
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              registration={register('email')}
              error={errors.email}
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
                isPending={isSubmitting}
              >
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="text-center text-sm text-slate-400"
            >
              Remember your password?{' '}
              <Link
                to="/login"
                className="text-indigo-400 hover:underline"
              >
                Back to login
              </Link>
            </motion.p>
          </Card.Footer>
        </GlassCard>
      </motion.form>
    </AuthPageShell>
  );
}

export default ForgotPasswordPage;
