import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Label } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../auth/AuthContext';

/** Mirrors LoginDto (auth/dto/login.dto.ts): email + password required. */
const credentialsSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
type CredentialsValues = z.infer<typeof credentialsSchema>;

/** Mirrors LoginDto's optional twoFactorCode: @Length(6, 6). */
const twoFactorSchema = z.object({
  twoFactorCode: z
    .string()
    .length(6, 'Enter the 6-digit code from your authenticator app.')
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
});
type TwoFactorValues = z.infer<typeof twoFactorSchema>;

/** POST /auth/login returns either shape — see AuthService.login(). */
interface LoginResponse {
  accessToken?: string;
  twoFactorRequired?: true;
}

const API_URL = import.meta.env.VITE_API_URL as string;

function LoginPage() {
  const navigate = useNavigate();
  const { establishSession } = useAuth();

  // Held only in memory, only for the duration of the 2FA step — never
  // sent anywhere except back to POST /auth/login alongside the code.
  const [pendingCredentials, setPendingCredentials] = useState<CredentialsValues | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const credentialsForm = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const twoFactorForm = useForm<TwoFactorValues>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { twoFactorCode: '' },
  });

  async function completeLogin(email: string, password: string, twoFactorCode?: string) {
    const res = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
      ...(twoFactorCode ? { twoFactorCode } : {}),
    });

    if (res.data.twoFactorRequired) {
      // Password was correct; the backend needs a 2FA code next. Switch to
      // the code-entry step without re-asking for credentials.
      setPendingCredentials({ email, password });
      return;
    }

    // Full success: the refresh_token/csrf_token cookies are already set by
    // the backend response (withCredentials: true on apiClient handles
    // that automatically) — establishSession stores the access token and
    // loads the profile, shared with the OAuth callback flow.
    //
    // accessToken is optional on LoginResponse (the twoFactorRequired
    // branch above never carries one), so we don't blindly trust it's
    // present here just because that branch was false — an unexpected/
    // malformed backend response gets a clear error instead of silently
    // sending "Authorization: Bearer undefined".
    if (!res.data.accessToken) {
      throw new Error('The server did not return an access token.');
    }
    await establishSession(res.data.accessToken);
    navigate('/');
  }

  async function onSubmitCredentials(values: CredentialsValues) {
    setApiError(null);
    try {
      await completeLogin(values.email, values.password);
    } catch (err) {
      // Surfaces whatever the backend says verbatim: generic "Invalid email
      // or password", the account-lockout message with minutes remaining,
      // etc. — see AuthService.login() for the exact wording per case.
      setApiError(getErrorMessage(err));
    }
  }

  async function onSubmitTwoFactor(values: TwoFactorValues) {
    if (!pendingCredentials) return;
    setApiError(null);
    try {
      await completeLogin(pendingCredentials.email, pendingCredentials.password, values.twoFactorCode);
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  function backToCredentials() {
    setPendingCredentials(null);
    setApiError(null);
    twoFactorForm.reset();
  }

  if (pendingCredentials) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <form
          onSubmit={twoFactorForm.handleSubmit(onSubmitTwoFactor)}
          className="w-full max-w-sm"
        >
          <Card>
            <Card.Header>
              <Card.Title>Two-factor authentication</Card.Title>
              <Card.Description>Enter the 6-digit code from your authenticator app.</Card.Description>
            </Card.Header>

            <Card.Content className="flex flex-col gap-4">
              {apiError && (
                <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {apiError}
                </p>
              )}

              <div className="flex flex-col gap-1">
                <Label htmlFor="twoFactorCode" isInvalid={!!twoFactorForm.formState.errors.twoFactorCode}>
                  Authentication code
                </Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  fullWidth
                  className="tracking-widest"
                  {...twoFactorForm.register('twoFactorCode')}
                />
                {twoFactorForm.formState.errors.twoFactorCode && (
                  <p className="text-xs text-red-600">
                    {twoFactorForm.formState.errors.twoFactorCode.message}
                  </p>
                )}
              </div>
            </Card.Content>

            <Card.Footer className="flex flex-col gap-2">
              <Button
                type="submit"
                fullWidth
                isPending={twoFactorForm.formState.isSubmitting}
              >
                {twoFactorForm.formState.isSubmitting ? 'Verifying…' : 'Verify'}
              </Button>
              <Button type="button" variant="ghost" fullWidth onPress={backToCredentials}>
                Use a different account
              </Button>
            </Card.Footer>
          </Card>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <form onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)} className="w-full max-w-sm">
        <Card>
          <Card.Header>
            <Card.Title>Log in</Card.Title>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            {apiError && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {apiError}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <Label htmlFor="email" isInvalid={!!credentialsForm.formState.errors.email}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                fullWidth
                {...credentialsForm.register('email')}
              />
              {credentialsForm.formState.errors.email && (
                <p className="text-xs text-red-600">{credentialsForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="password" isInvalid={!!credentialsForm.formState.errors.password}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                fullWidth
                {...credentialsForm.register('password')}
              />
              {credentialsForm.formState.errors.password && (
                <p className="text-xs text-red-600">{credentialsForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="text-right text-sm">
              <Link to="/forgot-password" className="text-accent hover:underline">
                Forgot password?
              </Link>
            </div>
          </Card.Content>

          <Card.Footer className="flex flex-col gap-3">
            <Button type="submit" fullWidth isPending={credentialsForm.formState.isSubmitting}>
              {credentialsForm.formState.isSubmitting ? 'Logging in…' : 'Log in'}
            </Button>

            <div className="flex w-full items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted">or continue with</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/*
              Plain <a> tags, not the Button component: these must trigger a
              real full-page browser navigation to the backend (a different
              origin), which then redirects on to Google/GitHub's consent
              screen — not an SPA route (see backend README "OAuth").
              buttonVariants() (from @heroui/styles) generates the exact
              same className Button itself uses internally, so these look
              identical to a real Button without the ref-type mismatch that
              comes from forcing Button's `render` prop to emit an <a>.
            */}
            <a
              href={`${API_URL}/auth/google`}
              className={buttonVariants({ variant: 'tertiary', fullWidth: true })}
            >
              Continue with Google
            </a>
            <a
              href={`${API_URL}/auth/github`}
              className={buttonVariants({ variant: 'tertiary', fullWidth: true })}
            >
              Continue with GitHub
            </a>

            <p className="text-center text-sm text-muted">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-accent hover:underline">
                Create one
              </Link>
            </p>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}

export default LoginPage;
