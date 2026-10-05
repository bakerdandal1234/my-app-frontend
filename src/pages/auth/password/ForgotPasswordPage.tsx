import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';
import { requestPasswordReset } from '../../../auth/api';
import { getErrorMessage } from '../../../api/errors';
import AuthPageShell from '../../../components/layout/AuthPageShell';
import GlassCard from '../../../components/shared/GlassCard';
import FormField from '../../../components/shared/FormField';
import FormErrorBanner from '../../../components/shared/FormErrorBanner';
import { containerVariants, itemVariants } from '../../../lib/motion-variants';
import { emailSchema } from '../../../lib/validation';
import StatusLink from '../../../components/shared/StatusLink';
import BackLink  from '../../../components/shared/BackLink';
/** Mirrors ForgotPasswordDto (auth/dto/forgot-password.dto.ts). */
const forgotPasswordSchema = z.object({
  email: emailSchema,
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

  async function onSubmit(values: ForgotPasswordValues): Promise<void> {
    setApiError(null);

    try {
      await requestPasswordReset(values.email);

      // The backend always returns the same generic response whether or
      // not the email is registered (to avoid leaking account existence).
      setSubmitted(true);
    } catch (err: unknown) {
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
              inputMode="email"
              registration={register('email')}
              error={errors.email}
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
                {isSubmitting ? 'Sending…' : 'Send reset link'}
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

export default ForgotPasswordPage;
