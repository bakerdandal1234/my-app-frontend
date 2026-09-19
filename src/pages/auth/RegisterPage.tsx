
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Label } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import AnimatedBackground from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import { containerVariants, itemVariants } from '../../lib/motion-variants';

/** Mirrors the backend's CreateUserDto @Matches() rule. */
const PASSWORD_RULE = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

const PASSWORD_MESSAGE =
  'Password must be 8-128 characters and contain an uppercase letter, a lowercase letter, and a number or symbol.';

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('Please enter a valid email address.'),

    firstName: z
      .string()
      .max(100, 'First name must be at most 100 characters.')
      .min(3, 'First name is required.'),

    lastName: z
      .string()
      .max(100, 'Last name must be at most 100 characters.')
      .min(3, 'Last name is required.'),

    password: z
      .string()
      .min(8, PASSWORD_MESSAGE)
      .max(128, PASSWORD_MESSAGE)
      .regex(PASSWORD_RULE, PASSWORD_MESSAGE),

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
        ...(values.firstName ? { firstName: values.firstName } : {}),
        ...(values.lastName ? { lastName: values.lastName } : {}),
      });

      setRegisteredEmail(values.email);
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <AnimatedBackground />

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
            onSubmit={handleSubmit(onSubmit,(errors)=>console.log('❌ ZOD FAILED:', errors))} 
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
                {apiError && (
                  <motion.p
                    initial={{
                      opacity: 0,
                      y: -10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="rounded border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm text-red-200"
                    role="alert"
                  >
                    {apiError}
                  </motion.p>
                )}

                {/* Email */}

                <motion.div
                  variants={itemVariants}
                  className="flex flex-col gap-1"
                >
                  <Label
                    htmlFor="email"
                    isInvalid={!!errors.email}
                    className="text-slate-200"
                  >
                    Email
                  </Label>

                  <Input
                    id="email"
                    type="text"
                    fullWidth
                    {...register('email')}
                  />

                  {errors.email && (
                    <p className="text-xs text-red-400">
                      {errors.email.message}
                    </p>
                  )}
                </motion.div>

                {/* First name / Last name */}

                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    variants={itemVariants}
                    className="flex flex-col gap-1"
                  >
                    <Label
                      htmlFor="firstName"
                      isInvalid={!!errors.firstName}
                      className="text-slate-200"
                    >
                      First name
                    </Label>

                    <Input
                      id="firstName"
                      type="text"
                      fullWidth
                      {...register('firstName')}
                    />

                    {errors.firstName && (
                      <p className="text-xs text-red-400">
                        {errors.firstName.message}
                      </p>
                    )}
                  </motion.div>

                  <motion.div
                    variants={itemVariants}
                    className="flex flex-col gap-1"
                  >
                    <Label
                      htmlFor="lastName"
                      isInvalid={!!errors.lastName}
                      className="text-slate-200"
                    >
                      Last name
                    </Label>

                    <Input
                      id="lastName"
                      type="text"
                      fullWidth
                      {...register('lastName')}
                    />

                    {errors.lastName && (
                      <p className="text-xs text-red-400">
                        {errors.lastName.message}
                      </p>
                    )}
                  </motion.div>
                </div>

                {/* Password */}

                <motion.div
                  variants={itemVariants}
                  className="flex flex-col gap-1"
                >
                  <Label
                    htmlFor="password"
                    isInvalid={!!errors.password}
                    className="text-slate-200"
                  >
                    Password
                  </Label>

                  <Input
                    id="password"
                    type="password"
                    fullWidth
                    {...register('password')}
                  />

                  <p className="text-xs text-slate-400">
                    8+ characters, with uppercase, lowercase, and a number or
                    symbol.
                  </p>

                  {errors.password && (
                    <p className="text-xs text-red-400">
                      {errors.password.message}
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
                    Confirm password
                  </Label>

                  <Input
                    id="confirmPassword"
                    type="password"
                    fullWidth
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
    </div>
  );
}

export default RegisterPage;

