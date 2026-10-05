import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { register as registerAccount } from '../../../auth/api';
import { getErrorMessage } from '../../../api/errors';
import AuthPageShell from '../../../components/layout/AuthPageShell';
import GlassCard from '../../../components/shared/GlassCard';
import FormField from '../../../components/shared/FormField';
import PasswordField from '../../../components/shared/PasswordField';
import FormErrorBanner from '../../../components/shared/FormErrorBanner';
import { containerVariants, itemVariants } from '../../../lib/motion-variants';
import { emailSchema, passwordSchema } from '../../../lib/validation';
import StatusLink from '../../../components/shared/StatusLink';
import BackLink from '../../../components/shared/BackLink';
const registerSchema = z
  .object({
    email: emailSchema,

    firstName: z
      .string()
      .trim()
      .min(1, 'First name is required.')
      .max(100, 'First name must be at most 100 characters.'),

    lastName: z
      .string()
      .trim()
      .min(1, 'Last name is required.')
      .max(100, 'Last name must be at most 100 characters.'),

    password: passwordSchema,

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPage() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setApiError(null);

    try {
      await registerAccount({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
      });

      setRegisteredEmail(values.email);
    } catch (err: unknown) {
      setApiError(getErrorMessage(err));
    }
  }

  return (
    <AuthPageShell>
      <AnimatePresence mode="wait">
        {registeredEmail ? (
          <motion.div
            key="success-card"
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
            }}
          >
            <GlassCard className="w-full max-w-sm">
              <Card.Header>
                <Card.Title className="text-white">
                  Check your email
                </Card.Title>
              </Card.Header>

              <Card.Content>
                <p className="text-sm text-slate-300">
                  We sent a verification link to{' '}
                  <strong className="text-white">
                    {registeredEmail}
                  </strong>
                  . Click it to activate your account, then come back and
                  log in.
                </p>
              </Card.Content>

              <Card.Footer>
                <BackLink to="/" fullWidth>
                  Back to home
                </BackLink>
              </Card.Footer>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.form
            key="register-form"
            noValidate
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
                    Create an account
                  </Card.Title>
                </motion.div>
              </Card.Header>

              <Card.Content className="flex flex-col gap-4">
                <FormErrorBanner message={apiError} bannerKey="register-error" />

                {/* Email */}

                <FormField
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  registration={register('email')}
                  error={errors.email}
                />

                {/* First name / Last name */}

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    id="firstName"
                    label="First name"
                    autoComplete="given-name"
                    registration={register('firstName')}
                    error={errors.firstName}
                  />

                  <FormField
                    id="lastName"
                    label="Last name"
                    autoComplete="family-name"
                    registration={register('lastName')}
                    error={errors.lastName}
                  />
                </div>

                {/* Password — live progress bar + one-line hint */}

                <PasswordField
                  id="password"
                  label="Password"
                  autoComplete="new-password"
                  registration={register('password')}
                  error={errors.password}
                  control={control}
                  name="password"
                />

                {/* Confirm password — same component, hint off, just
                    the show/hide toggle + the "match" error. */}

                <PasswordField
                  id="confirmPassword"
                  label="Confirm password"
                  autoComplete="new-password"
                  registration={register('confirmPassword')}
                  error={errors.confirmPassword}
                  control={control}
                  name="confirmPassword"
                  showRequirementHint={false}
                />
              </Card.Content>

              <StatusLink
                to="/"
                action={
                  <Button
                    type="submit"
                    fullWidth
                    isPending={isSubmitting}
                    isDisabled={isSubmitting}
                    className="shadow-lg shadow-indigo-500/25"
                  >
                    {isSubmitting ? 'Creating account…' : 'Create account'}
                  </Button>
                }
              >
                Back to home
              </StatusLink>
            </GlassCard>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthPageShell>
  );
}

export default RegisterPage;
