import { useState } from 'react';
import {  useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';
import { resetPassword } from '../../../auth/api';
import { getErrorMessage } from '../../../api/errors';
import AuthPageShell from '../../../components/layout/AuthPageShell';
import GlassCard from '../../../components/shared/GlassCard';
import PasswordField from '../../../components/shared/PasswordField';
import FormErrorBanner from '../../../components/shared/FormErrorBanner';
import { containerVariants, itemVariants } from '../../../lib/motion-variants';
import { passwordSchema } from '../../../lib/validation';
import StatusLink from '../../../components/shared/StatusLink';
import BackLink from '../../../components/shared/BackLink';
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

  return <ResetPasswordForm key={token ?? ''} token={token} />;
}

// Each reset link owns its form state, including results from pending requests.
function ResetPasswordForm({ token }: { token: string | null }) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: ResetPasswordValues): Promise<void> {
    if (!token) return;

    setApiError(null);

    try {
      await resetPassword({
        token,
        newPassword: values.newPassword,
      });

      setSuccess(true);
    } catch (err: unknown) {
      setApiError(getErrorMessage(err));
    }
  }

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
              <BackLink to="/forgot-password" fullWidth>
                Request a new link
              </BackLink>
            </Card.Footer>
          </GlassCard>
        </motion.div>
      </AuthPageShell>
    );
  }

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
              <BackLink to="/login" fullWidth>
                Back to login
              </BackLink>
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
                Reset password
              </Card.Title>

              <Card.Description className="text-slate-400">
                Create a new secure password for your account.
              </Card.Description>
            </motion.div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            <FormErrorBanner message={apiError} bannerKey="reset-password-error" />

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
            to="/login"
            text="Remember your password?"
            action={
              <Button
                type="submit"
                fullWidth
                isPending={isSubmitting}
                isDisabled={isSubmitting}
              >
                {isSubmitting ? 'Updating…' : 'Update password'}
              </Button>
            }
          >
            Back to login
          </StatusLink>
        </GlassCard>
      </motion.form>
    </AuthPageShell>
  );
}

export default ResetPasswordPage;
