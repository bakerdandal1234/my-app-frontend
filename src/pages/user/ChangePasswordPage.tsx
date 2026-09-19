import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const PASSWORD_RULE =
  /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

const PASSWORD_MESSAGE =
  'Password must be 8-128 characters and contain an uppercase letter, a lowercase letter, and a number or symbol.';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),

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

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function ChangePasswordPage() {
  const navigate = useNavigate();

  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setApiError(null);

    try {
      await apiClient.post<{ message?: string }>(
        '/auth/change-password',
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      );

      setSuccess(true);
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  // ----------------------------------------------------
  // Success
  // ----------------------------------------------------

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
                  Password changed
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
                Your password has been changed successfully. All active
                sessions have been signed out for security. Please log in
                again with your new password.
              </motion.p>
            </Card.Content>

            <Card.Footer>
              <motion.div
                variants={itemVariants}
                className="w-full"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  fullWidth
                  variant="primary"
                  onPress={() => navigate('/login')}
                >
                  Go to login
                </Button>
              </motion.div>
            </Card.Footer>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Form
  // ----------------------------------------------------

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
                Change password
              </Card.Title>

              <Card.Description className="text-slate-400">
                Update your password to keep your account secure.
              </Card.Description>
            </motion.div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              {apiError && (
                <motion.p
                  key="change-password-error"
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm text-red-200"
                  role="alert"
                >
                  {apiError}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Current password */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col gap-1"
            >
              <Label
                htmlFor="currentPassword"
                isInvalid={!!errors.currentPassword}
                className="text-slate-200"
              >
                Current password
              </Label>

              <Input
                id="currentPassword"
                type="password"
                fullWidth
                autoComplete="current-password"
                {...register('currentPassword')}
              />

              {errors.currentPassword && (
                <p className="text-xs text-red-400">
                  {errors.currentPassword.message}
                </p>
              )}
            </motion.div>

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
                8+ characters, with uppercase, lowercase, and a number
                or symbol.
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
                variant="primary"
                isPending={isSubmitting}
              >
                {isSubmitting ? 'Changing password…' : 'Change password'}
              </Button>
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="text-center text-sm text-slate-400"
            >
              <Link
                to="/profile"
                className="text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
              >
                Back to profile
              </Link>
            </motion.p>
          </Card.Footer>
        </GlassCard>
      </motion.form>
    </div>
  );
}

export default ChangePasswordPage;