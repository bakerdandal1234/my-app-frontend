import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Label } from '@heroui/react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../api/errors';

/** Mirrors ForgotPasswordDto (auth/dto/forgot-password.dto.ts). */
const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Please enter a valid email address.'),
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

  async function onSubmit(values: ForgotPasswordValues) {
    setApiError(null);
    try {
      await apiClient.post('/auth/forgot-password', values);
      // The backend always returns the same generic response whether or
      // not the email is registered (to avoid leaking account existence) —
      // so on any successful response, always show the same message.
      setSubmitted(true);
    } catch (err) {
      // A genuine failure here (network error, 500, etc.) — not "email not
      // found", since the backend never reveals that.
      setApiError(getErrorMessage(err));
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-sm">
          <Card.Header>
            <Card.Title>Check your email</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-sm text-muted">
              If an account exists for that email, we&apos;ve sent a link to reset your password.
            </p>
          </Card.Content>
          <Card.Footer>
            <Link to="/login" className="text-sm text-accent hover:underline">
              Back to login
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
            <Card.Title>Forgot password</Card.Title>
            <Card.Description>
              Enter your email and we&apos;ll send you a link to reset your password.
            </Card.Description>
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
              <Input id="email" type="email" fullWidth {...register('email')} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
          </Card.Content>

          <Card.Footer className="flex flex-col gap-3">
            <Button type="submit" fullWidth isPending={isSubmitting}>
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </Button>

            <p className="text-center text-sm text-muted">
              <Link to="/login" className="text-accent hover:underline">
                Back to login
              </Link>
            </p>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;
