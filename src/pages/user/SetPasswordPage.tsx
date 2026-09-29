import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';

import { setPassword } from '../../auth/api';
import { useAuth } from '../../auth/AuthContext';
import { getErrorMessage } from '../../api/errors';
import { getAuthVersion, setAccessToken } from '../../api/tokenStore';
import { useToast } from '../../ui/ToastContext';
import AuthPageShell from '../../components/layout/AuthPageShell';
import GlassCard from '../../components/shared/GlassCard';
import FormField from '../../components/shared/FormField';
import FormErrorBanner from '../../components/shared/FormErrorBanner';
import { containerVariants, itemVariants } from '../../lib/motion-variants';
import { passwordSchema } from '../../lib/validation';

const setPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type SetPasswordValues = z.infer<typeof setPasswordSchema>;

function SetPasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const authVersion = getAuthVersion();
  const { showToast } = useToast();
  const [apiError, setApiError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const submittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  async function onSubmit(values: SetPasswordValues): Promise<void> {
    if (!user || user.hasPassword || submittingRef.current || authVersion !== getAuthVersion()) return;
    submittingRef.current = true;
    setApiError(null);

    try {
      await setPassword(values.newPassword);
      if (authVersion !== getAuthVersion()) return;

      // The server revoked this session; clear it even if the form was closed.
      setAccessToken(null);
      if (mountedRef.current) {
        showToast('Password set. Please log in again with your new password.');
        navigate('/login', { replace: true });
      }
    } catch (error: unknown) {
      if (mountedRef.current && authVersion === getAuthVersion()) {
        setApiError(getErrorMessage(error));
      }
    } finally {
      submittingRef.current = false;
    }
  }

  if (!user) return null;
  if (user.hasPassword) {
    return <Navigate to="/settings/change-password" replace />;
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
              <Card.Title className="text-white">Set a password</Card.Title>
              <Card.Description className="text-slate-400">
                Add a password so you can also log in with your email.
              </Card.Description>
            </motion.div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            <FormErrorBanner message={apiError} bannerKey="set-password-error" />
            <FormField
              id="newPassword"
              label="New password"
              type="password"
              autoComplete="new-password"
              registration={register('newPassword')}
              error={errors.newPassword}
              disabled={isSubmitting}
              helperText="8+ characters, with uppercase, lowercase, and a number or symbol."
            />
            <FormField
              id="confirmPassword"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              registration={register('confirmPassword')}
              error={errors.confirmPassword}
              disabled={isSubmitting}
            />
            <motion.p variants={itemVariants} className="text-xs text-slate-400">
              Setting a password signs out all active sessions. You will need to log in again.
            </motion.p>
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
                isDisabled={isSubmitting}
              >
                {isSubmitting ? 'Setting password…' : 'Set password'}
              </Button>
            </motion.div>
            <motion.p variants={itemVariants} className="text-center text-sm text-slate-400">
              <Link to="/profile" className="text-indigo-400 transition-colors hover:text-indigo-300 hover:underline">
                Back to profile
              </Link>
            </motion.p>
          </Card.Footer>
        </GlassCard>
      </motion.form>
    </AuthPageShell>
  );
}

export default SetPasswordPage;
