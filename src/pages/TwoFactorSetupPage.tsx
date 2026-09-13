import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input } from '@heroui/react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../auth/AuthContext';

/** Mirrors Verify2faDto (auth/dto/verify-2fa.dto.ts): @Length(6, 6). */
const codeSchema = z.object({
  code: z
    .string()
    .length(6, 'Enter the 6-digit code from your authenticator app.')
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
});
type CodeValues = z.infer<typeof codeSchema>;

interface GenerateResponse {
  qrCodeDataUrl: string;
  secret: string;
}

function TwoFactorSetupPage() {
  const { user, setUser } = useAuth();

  // Only populated once "Enable 2FA" has been clicked and /2fa/generate
  // has returned — this is what switches the enable flow into its
  // QR-code-plus-code-entry step.
  const [setupData, setSetupData] = useState<GenerateResponse | null>(null);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const enableForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });
  const disableForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  async function startEnableFlow() {
    setApiError(null);
    setSuccessMessage(null);
    setIsGenerating(true);
    try {
      const res = await apiClient.post<GenerateResponse>('/auth/2fa/generate');
      setSetupData(res.data);
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  }

  async function onSubmitEnable(values: CodeValues) {
    if (!user) return;
    setApiError(null);
    try {
      await apiClient.post('/auth/2fa/enable', { code: values.code });
      setUser({ ...user, isTwoFactorEnabled: true });
      setSetupData(null);
      enableForm.reset();
      setSuccessMessage('Two-factor authentication is now enabled.');
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  async function onSubmitDisable(values: CodeValues) {
    if (!user) return;
    setApiError(null);
    try {
      await apiClient.post('/auth/2fa/disable', { code: values.code });
      setUser({ ...user, isTwoFactorEnabled: false });
      setShowDisableForm(false);
      disableForm.reset();
      setSuccessMessage('Two-factor authentication has been disabled.');
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  function cancelSetup() {
    setSetupData(null);
    setApiError(null);
    enableForm.reset();
  }

  if (!user) return null; // ProtectedRoute guarantees this won't render logged out, but keeps TS happy.

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <Card.Title>Two-factor authentication</Card.Title>
        </Card.Header>

        <Card.Content className="flex flex-col gap-4">
          {apiError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {apiError}
            </p>
          )}
          {successMessage && (
            <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
              {successMessage}
            </p>
          )}

          {/* Case 1: 2FA already enabled, nothing else in progress. */}
          {user.isTwoFactorEnabled && !showDisableForm && (
            <>
              <p className="text-sm text-muted">
                Two-factor authentication is currently <strong>enabled</strong> on your account.
              </p>
              <Button
                type="button"
                variant="danger"
                fullWidth
                onPress={() => {
                  setApiError(null);
                  setSuccessMessage(null);
                  setShowDisableForm(true);
                }}
              >
                Disable 2FA
              </Button>
            </>
          )}

          {/* Case 2: disabling — needs a current code to confirm. */}
          {user.isTwoFactorEnabled && showDisableForm && (
            <form onSubmit={disableForm.handleSubmit(onSubmitDisable)} className="flex flex-col gap-4">
              <p className="text-sm text-muted">
                Enter a current 6-digit code from your authenticator app to disable 2FA.
              </p>
              <div className="flex flex-col gap-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  fullWidth
                  className="tracking-widest"
                  {...disableForm.register('code')}
                />
                {disableForm.formState.errors.code && (
                  <p className="text-xs text-red-600">{disableForm.formState.errors.code.message}</p>
                )}
              </div>
              <Button type="submit" variant="danger" fullWidth isPending={disableForm.formState.isSubmitting}>
                {disableForm.formState.isSubmitting ? 'Disabling…' : 'Confirm disable'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onPress={() => {
                  setShowDisableForm(false);
                  disableForm.reset();
                }}
              >
                Cancel
              </Button>
            </form>
          )}

          {/* Case 3: not enabled, nothing in progress. */}
          {!user.isTwoFactorEnabled && !setupData && (
            <>
              <p className="text-sm text-muted">
                Add an extra layer of security by requiring a code from an authenticator app
                (Google Authenticator, Authy, etc.) at login.
              </p>
              <Button type="button" fullWidth isPending={isGenerating} onPress={startEnableFlow}>
                {isGenerating ? 'Preparing…' : 'Enable 2FA'}
              </Button>
            </>
          )}

          {/* Case 4: enabling — scan QR, then confirm with a code. */}
          {!user.isTwoFactorEnabled && setupData && (
            <form onSubmit={enableForm.handleSubmit(onSubmitEnable)} className="flex flex-col gap-4">
              <p className="text-sm text-muted">
                Scan this QR code with your authenticator app, then enter the 6-digit code it
                shows.
              </p>
              <img
                src={setupData.qrCodeDataUrl}
                alt="Two-factor authentication QR code"
                className="mx-auto h-40 w-40"
              />
              <p className="break-all text-center text-xs text-muted">
                Can&apos;t scan it? Enter this key manually: {setupData.secret}
              </p>
              <div className="flex flex-col gap-1">
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  fullWidth
                  className="tracking-widest"
                  {...enableForm.register('code')}
                />
                {enableForm.formState.errors.code && (
                  <p className="text-xs text-red-600">{enableForm.formState.errors.code.message}</p>
                )}
              </div>
              <Button type="submit" fullWidth isPending={enableForm.formState.isSubmitting}>
                {enableForm.formState.isSubmitting ? 'Confirming…' : 'Confirm & enable'}
              </Button>
              <Button type="button" variant="ghost" fullWidth onPress={cancelSetup}>
                Cancel
              </Button>
            </form>
          )}
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

export default TwoFactorSetupPage;
