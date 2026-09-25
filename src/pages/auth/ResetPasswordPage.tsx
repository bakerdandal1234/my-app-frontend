import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { passwordSchema } from '../../lib/validation';

/** Mirrors ResetPasswordDto (auth/dto/reset-password.dto.ts). */
const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Defensive: reset state when the token changes.
  useEffect(() => {
    setSuccess(false);
    setApiError(null);
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setApiError(null);

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword: values.newPassword,
      });

      setSuccess(true);
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  // ------------------------------------------
  // Missing token
  // ------------------------------------------

  if (!token) {
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
                  Invalid link
                </Card.Title>

                <Card.Description className="text-slate-400">
                  This password reset link is not valid.
                </Card.Description>
              </motion.div>
            </Card.Header>

            <Card.Content>
              <motion.p
                variants={itemVariants}
                className="rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm text-red-200"
                role="alert"
              >
                This password reset link is missing its token.
              </motion.p>
            </Card.Content>

            <Card.Footer>
              <motion.div
                variants={itemVariants}
                className="w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to="/forgot-password"
                  className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
                >
                  Request a new link
                </Link>
              </motion.div>
            </Card.Footer>
          </GlassCard>
        </motion.div>
      </AuthPageShell>
    );
  }

  // ------------------------------------------
  // Success
  // ------------------------------------------

  if (success) {
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
                  Password updated
                </Card.Title>

                <Card.Description className="text-slate-400">
                  Your password has been successfully changed.
                </Card.Description>
              </motion.div>
            </Card.Header>

            <Card.Content>
              <motion.p
                variants={itemVariants}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-300"
              >
                Your password has been changed. All of your other sessions
                have been signed out for security. Please log in again.
              </motion.p>
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
                  Go to login
                </Link>
              </motion.div>
            </Card.Footer>
          </GlassCard>
        </motion.div>
      </AuthPageShell>
    );
  }

  // ------------------------------------------
  // Reset password form
  // ------------------------------------------

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
                Reset password
              </Card.Title>

              <Card.Description className="text-slate-400">
                Create a new secure password for your account.
              </Card.Description>
            </motion.div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            <FormErrorBanner message={apiError} bannerKey="reset-password-error" />

            <FormField
              id="newPassword"
              label="New password"
              type="password"
              autoComplete="new-password"
              registration={register('newPassword')}
              error={errors.newPassword}
              helperText="8+ characters, with uppercase, lowercase, and a number or symbol."
            />

            <FormField
              id="confirmPassword"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              registration={register('confirmPassword')}
              error={errors.confirmPassword}
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
                {isSubmitting ? 'Updating…' : 'Update password'}
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

export default ResetPasswordPage;
