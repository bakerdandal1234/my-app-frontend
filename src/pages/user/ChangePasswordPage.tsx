import { useState } from 'react';
import {  useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';

import { changePassword } from '../../auth/api';
import { getErrorMessage } from '../../api/errors';
import { getAuthVersion, setAccessToken } from '../../api/tokenStore';
import { useToast } from '../../ui/ToastContext';
import AuthPageShell from '../../components/layout/AuthPageShell';
import GlassCard from '../../components/shared/GlassCard';
import PasswordField from '../../components/shared/PasswordField';
import FormErrorBanner from '../../components/shared/FormErrorBanner';
import { containerVariants, itemVariants } from '../../lib/motion-variants';
import { passwordSchema } from '../../lib/validation';
import StatusLink from '../../components/shared/StatusLink';
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ChangePasswordValues): Promise<void> {
    const authVersion = getAuthVersion();
    setApiError(null);

    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (authVersion !== getAuthVersion()) return;

      // The backend revoked this session along with the account's other sessions.
      setAccessToken(null);
      showToast('Password changed. Please log in again with your new password.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      if (authVersion === getAuthVersion()) {
        setApiError(getErrorMessage(err));
      }
    }
  }

  return (
    <AuthPageShell>
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
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
                Change password
              </Card.Title>

              <Card.Description className="text-slate-400">
                Update your password to keep your account secure.
              </Card.Description>
            </motion.div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            <FormErrorBanner message={apiError} bannerKey="change-password-error" />

            <PasswordField
              id="currentPassword"
              label="Current password"
              autoComplete="current-password"
              registration={register('currentPassword')}
              error={errors.currentPassword}
              control={control}
              name="currentPassword"
              showRequirementHint={false}
            />

            <PasswordField
              id="newPassword"
              label="New password"
              autoComplete="new-password"
              registration={register('newPassword')}
              error={errors.newPassword}
              control={control}
              name="newPassword"
            />

            <PasswordField
              id="confirmPassword"
              label="Confirm new password"
              autoComplete="new-password"
              registration={register('confirmPassword')}
              error={errors.confirmPassword}
              control={control}
              name="confirmPassword"
              showRequirementHint={false}
            />
          </Card.Content>

          <StatusLink
            to="/home"
            action={
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isPending={isSubmitting}
                isDisabled={isSubmitting}
              >
                {isSubmitting ? 'Changing password…' : 'Change password'}
              </Button>
            }
          >
            Back to home
          </StatusLink>
        </GlassCard>
      </motion.form>
    </AuthPageShell>
  );
}

export default ChangePasswordPage;
