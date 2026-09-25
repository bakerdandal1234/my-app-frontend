import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import AuthPageShell from '../../components/layout/AuthPageShell';
import GlassCard from '../../components/shared/GlassCard';
import FormField from '../../components/shared/FormField';
import FormErrorBanner from '../../components/shared/FormErrorBanner';
import { containerVariants, itemVariants } from '../../lib/motion-variants';
import { passwordSchema } from '../../lib/validation';

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('Please enter a valid email address.'),

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
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode:"onChange",
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
      await apiClient.post('/auth/register', {
        email: values.email,
        password: values.password,
        // Both are required by CreateUserDto (@IsNotEmpty) and validated as
        // non-empty above, so they are always sent — no conditional spread.
        firstName: values.firstName,
        lastName: values.lastName,
      });

      setRegisteredEmail(values.email);
    } catch (err) {
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
                <Link
                  to="/"
                  className="text-sm text-indigo-400 hover:underline"
                >
                  Back to home
                </Link>
              </Card.Footer>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.form
            key="register-form"
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
                  type="text"
                  registration={register('email')}
                  error={errors.email}
                />

                {/* First name / Last name */}

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    id="firstName"
                    label="First name"
                    registration={register('firstName')}
                    error={errors.firstName}
                  />

                  <FormField
                    id="lastName"
                    label="Last name"
                    registration={register('lastName')}
                    error={errors.lastName}
                  />
                </div>

                {/* Password */}

                <FormField
                  id="password"
                  label="Password"
                  type="password"
                  registration={register('password')}
                  error={errors.password}
                  helperText="8+ characters, with uppercase, lowercase, and a number or symbol."
                />

                {/* Confirm password */}

                <FormField
                  id="confirmPassword"
                  label="Confirm password"
                  type="password"
                  registration={register('confirmPassword')}
                  error={errors.confirmPassword}
                />
              </Card.Content>

              <Card.Footer className="flex flex-col gap-3">
                {/* Submit button */}

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
                    className="shadow-lg shadow-indigo-500/25"
                  >
                    {isSubmitting
                      ? 'Creating account…'
                      : 'Create account'}
                  </Button>
                </motion.div>

                {/* Back to home */}

                <motion.p
                  variants={itemVariants}
                  className="text-center text-sm text-slate-400"
                >
                  <Link
                    to="/"
                    className="text-indigo-400 hover:underline"
                  >
                    Back to home
                  </Link>
                </motion.p>
              </Card.Footer>
            </GlassCard>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthPageShell>
  );
}

export default RegisterPage;
