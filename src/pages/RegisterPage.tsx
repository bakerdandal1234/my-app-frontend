import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Label } from '@heroui/react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../api/errors';

/** Mirrors the backend's CreateUserDto @Matches() rule (see users/dto/create-user.dto.ts). */
const PASSWORD_RULE = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
const PASSWORD_MESSAGE =
  'Password must be 8-128 characters and contain an uppercase letter, a lowercase letter, and a number or symbol.';
/**
 * Mirrors CreateUserDto exactly (email/password/firstName/lastName rules)
 * plus a client-only confirmPassword field for the "do they match" check —
 * confirmPassword is never sent to the backend.
 */
const registerSchema = z
  .object({
    email: z.string().min(1, 'Email is required.').email('Please enter a valid email address.'),
    firstName: z.string().max(100, 'First name must be at most 100 characters.').min(1, 'First name is required.'),
    lastName: z.string().max(100, 'Last name must be at most 100 characters.').min(1, 'Last name is required.'),
    password: z.string().min(8, PASSWORD_MESSAGE).max(128, PASSWORD_MESSAGE).regex(PASSWORD_RULE, PASSWORD_MESSAGE),
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

  if (registeredEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-sm">
          <Card.Header>
            <Card.Title>Check your email</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-sm text-muted">
              We sent a verification link to <strong>{registeredEmail}</strong>. Click it to
              activate your account, then come back and log in.
            </p>
          </Card.Content>
          <Card.Footer>
            <Link to="/" className="text-sm text-accent hover:underline">
              Back to home
            </Link>
          </Card.Footer>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm">
        <Card>
          <Card.Header>
            <Card.Title>Create an account</Card.Title>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            {apiError && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {apiError}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="email" isInvalid={!!errors.email}>
                Email
              </Label>
              <Input id="email" type="text" fullWidth {...register('email')} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="firstName" isInvalid={!!errors.firstName}>
                  First name
                </Label>
                <Input id="firstName" type="text" fullWidth {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="lastName" isInvalid={!!errors.lastName}>
                  Last name
                </Label>
                <Input id="lastName" type="text" fullWidth {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="password" isInvalid={!!errors.password}>
                Password
              </Label>
              <Input id="password" type="password" fullWidth {...register('password')} />
              <p className="text-xs text-muted">
                8+ characters, with uppercase, lowercase, and a number or symbol.
              </p>
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="confirmPassword" isInvalid={!!errors.confirmPassword}>
                Confirm password
              </Label>
              <Input id="confirmPassword" type="password" fullWidth {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </Card.Content>

          <Card.Footer className="flex flex-col gap-3">
            <Button type="submit" fullWidth isPending={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>

            <p className="text-center text-sm text-muted">
              <Link to="/" className="text-accent hover:underline">
                Back to home
              </Link>
            </p>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}

export default RegisterPage;
