import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';

import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import { setAccessToken } from '../../api/tokenStore';
import { useToast } from '../../ui/ToastContext';
import AuthPageShell from '../../components/layout/AuthPageShell';
import GlassCard from '../../components/shared/GlassCard';
import FormField from '../../components/shared/FormField';
import FormErrorBanner from '../../components/shared/FormErrorBanner';
import { containerVariants, itemVariants } from '../../lib/motion-variants';
import { passwordSchema } from '../../lib/validation';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

function ChangePasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [apiError, setApiError] = useState<string | null>(null);

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
      await apiClient.post<unknown>(
        '/auth/change-password',
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        },
      );

      // The backend revoked every session, including this one. Drop the
      // local session too, instead of showing a signed-in UI until the next
      // request fails with a 401.
      setAccessToken(null);
      showToast('Password changed. Please log in again with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
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
                Change password
              </Card.Title>

              <Card.Description className="text-slate-400">
                Update your password to keep your account secure.
              </Card.Description>
            </motion.div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            <FormErrorBanner message={apiError} bannerKey="change-password-error" />

            <FormField
              id="currentPassword"
              label="Current password"
              type="password"
              autoComplete="current-password"
              registration={register('currentPassword')}
              error={errors.currentPassword}
            />

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
                to="/home"
                className="text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
              >
                Back to home
              </Link>
            </motion.p>
          </Card.Footer>
        </GlassCard>
      </motion.form>
    </AuthPageShell>
  );
}

export default ChangePasswordPage;
