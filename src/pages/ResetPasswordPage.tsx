import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Label } from '@heroui/react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../api/errors';

/** Mirrors ResetPasswordDto (auth/dto/reset-password.dto.ts): same password rule as registration. */
const PASSWORD_RULE = /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;
const PASSWORD_MESSAGE =
  'Password must be 8-128 characters and contain an uppercase letter, a lowercase letter, and a number or symbol.';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, PASSWORD_MESSAGE).max(128, PASSWORD_MESSAGE).regex(PASSWORD_RULE, PASSWORD_MESSAGE),
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

  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Defensive: if the token in the URL actually changes without a full page
  // reload (e.g. testing multiple links in one tab), don't carry over a
  // stale success/error state from a previous token's attempt.
  useEffect(() => {
    setSuccess(false);
    setApiError(null);
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setApiError(null);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword: values.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-sm">
          <Card.Header>
            <Card.Title>Invalid link</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              This password reset link is missing its token.
            </p>
          </Card.Content>
          <Card.Footer>
            <Link to="/forgot-password" className="text-sm text-accent hover:underline">
              Request a new link
            </Link>
          </Card.Footer>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-sm">
          <Card.Header>
            <Card.Title>Password updated</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-sm text-muted">
              Your password has been changed. All of your other sessions have been signed out for
              security — please log in again.
            </p>
          </Card.Content>
          <Card.Footer>
            <Link to="/login" className="text-sm text-accent hover:underline">
              Go to login
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
            <Card.Title>Reset password</Card.Title>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            {apiError && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {apiError}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="newPassword" isInvalid={!!errors.newPassword}>
                New password
              </Label>
              <Input id="newPassword" type="password" fullWidth {...register('newPassword')} />
              <p className="text-xs text-muted">
                8+ characters, with uppercase, lowercase, and a number or symbol.
              </p>
              {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword.message}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="confirmPassword" isInvalid={!!errors.confirmPassword}>
                Confirm new password
              </Label>
              <Input id="confirmPassword" type="password" fullWidth {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </Card.Content>

          <Card.Footer>
            <Button type="submit" fullWidth isPending={isSubmitting}>
              {isSubmitting ? 'Updating…' : 'Update password'}
            </Button>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}

export default ResetPasswordPage;
