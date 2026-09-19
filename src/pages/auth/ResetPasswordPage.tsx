import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Label } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import AnimatedBackground from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import { containerVariants, itemVariants, errorVariants } from '../../lib/motion-variants';

/** Mirrors ResetPasswordDto (auth/dto/reset-password.dto.ts). */
const PASSWORD_RULE =
  /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

const PASSWORD_MESSAGE =
  'Password must be 8-128 characters and contain an uppercase letter, a lowercase letter, and a number or symbol.';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, PASSWORD_MESSAGE)
      .max(128, PASSWORD_MESSAGE)
      .regex(PASSWORD_RULE, PASSWORD_MESSAGE),
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
        <AnimatedBackground />

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
                className="rounded border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm text-red-200"
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
      </div>
    );
  }

  // ------------------------------------------
  // Success
  // ------------------------------------------

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
        <AnimatedBackground />

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
      </div>
    );
  }

  // ------------------------------------------
  // Reset password form
  // ------------------------------------------

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <AnimatedBackground />

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
            <AnimatePresence mode="wait">
              {apiError && (
                <motion.p
                  key="reset-password-error"
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

            {/* New password */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col gap-1"
            >
              <Label
                htmlFor="newPassword"
                isInvalid={!!errors.newPassword}
                className="text-slate-200"
              >
                New password
              </Label>

              <Input
                id="newPassword"
                type="password"
                fullWidth
                autoComplete="new-password"
                {...register('newPassword')}
              />

              <p className="text-xs leading-relaxed text-slate-400">
                8+ characters, with uppercase, lowercase, and a number or
                symbol.
              </p>

              {errors.newPassword && (
                <p className="text-xs text-red-400">
                  {errors.newPassword.message}
                </p>
              )}
            </motion.div>

            {/* Confirm password */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col gap-1"
            >
              <Label
                htmlFor="confirmPassword"
                isInvalid={!!errors.confirmPassword}
                className="text-slate-200"
              >
                Confirm new password
              </Label>

              <Input
                id="confirmPassword"
                type="password"
                fullWidth
                autoComplete="new-password"
                {...register('confirmPassword')}
              />

              {errors.confirmPassword && (
                <p className="text-xs text-red-400">
                  {errors.confirmPassword.message}
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
    </div>
  );
}

export default ResetPasswordPage;