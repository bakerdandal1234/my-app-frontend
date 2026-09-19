import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Label } from '@heroui/react';
import {
  AnimatePresence,
  motion,
  type Variants,
} from 'framer-motion';

import { getErrorMessage } from '../../api/errors';
import { customerApi } from '../../customer/api/customerClient';
import { useCustomerAuth } from '../../customer/CustomerAuthContext';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import {
  containerVariants,
  itemVariants,
  errorVariants,
} from '../../lib/motion-variants';
import StatusLink from '../../components/shared/StatusLink';

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

const qrVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

const TWO_FACTOR_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
  {
    x: [0, 50, 0],
    y: [0, 35, 0],
    scale: [1, 1.15, 1],
    duration: 14,
    className:
      'absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl',
  },
  {
    x: [0, -45, 0],
    y: [0, 45, 0],
    scale: [1, 1.2, 1],
    duration: 16,
    className:
      'absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl',
  },
];

function CustomerSecurityPage() {
  const { account, refreshAccount } = useCustomerAuth();

  const [setupData, setSetupData] =
    useState<GenerateResponse | null>(null);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const enableForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const disableForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  async function startEnableFlow(): Promise<void> {
    setApiError(null);
    setSuccessMessage(null);
    setIsGenerating(true);

    try {
      const response = await customerApi.post<GenerateResponse>(
        '/customer/auth/2fa/generate',
      );

      setSetupData(response.data);
    } catch (error: unknown) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  }

  async function enableTwoFactor(values: CodeValues): Promise<void> {
    setApiError(null);
    setSuccessMessage(null);

    try {
      await customerApi.post('/customer/auth/2fa/enable', {
        code: values.code,
      });

      await refreshAccount();

      setSetupData(null);
      enableForm.reset();
      setSuccessMessage(
        'Two-factor authentication is now enabled.',
      );
    } catch (error: unknown) {
      setApiError(getErrorMessage(error));
    }
  }

  async function disableTwoFactor(values: CodeValues): Promise<void> {
    setApiError(null);
    setSuccessMessage(null);

    try {
      await customerApi.post('/customer/auth/2fa/disable', {
        code: values.code,
      });

      await refreshAccount();

      setShowDisableForm(false);
      disableForm.reset();
      setSuccessMessage(
        'Two-factor authentication has been disabled.',
      );
    } catch (error: unknown) {
      setApiError(getErrorMessage(error));
    }
  }

  function cancelSetup(): void {
    setSetupData(null);
    setApiError(null);
    enableForm.reset();
  }

  function openDisableForm(): void {
    setApiError(null);
    setSuccessMessage(null);
    setShowDisableForm(true);
  }

  function closeDisableForm(): void {
    setShowDisableForm(false);
    setApiError(null);
    disableForm.reset();
  }

  if (!account) return null;

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <AnimatedBackground
        wrapperClassName="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        blobs={TWO_FACTOR_BACKGROUND_BLOBS}
      />

      <motion.main
        className="w-full max-w-lg"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <GlassCard>
          <Card.Header>
            <motion.div variants={itemVariants}>
              <Card.Title className="text-xl text-white">
                Two-factor authentication
              </Card.Title>

              <Card.Description className="mt-1 text-slate-400">
                Add an authenticator code after Google sign-in
                for additional account protection.
              </Card.Description>
            </motion.div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              {apiError && (
                <motion.p
                  key="customer-2fa-error"
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-3 text-sm text-red-200"
                  role="alert"
                >
                  {apiError}
                </motion.p>
              )}

              {successMessage && (
                <motion.p
                  key="customer-2fa-success"
                  variants={errorVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                  role="status"
                >
                  {successMessage}
                </motion.p>
              )}
            </AnimatePresence>

            {account.isTwoFactorEnabled && !showDisableForm && (
              <motion.div
                key="enabled"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-4"
              >
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-lg text-emerald-400">
                      ✓
                    </div>

                    <div>
                      <p className="font-medium text-emerald-300">
                        2FA is enabled
                      </p>

                      <p className="mt-1 text-xs text-emerald-400/70">
                        New Google sign-ins require an
                        authenticator code.
                      </p>
                    </div>
                  </div>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="button"
                    variant="danger"
                    fullWidth
                    onPress={openDisableForm}
                  >
                    Disable 2FA
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {account.isTwoFactorEnabled && showDisableForm && (
              <motion.form
                key="disable"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                onSubmit={disableForm.handleSubmit(disableTwoFactor)}
                className="flex flex-col gap-4"
              >
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="font-medium text-amber-300">
                    Disable two-factor authentication
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-amber-400/70">
                    Enter a current code from your authenticator app.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="customer-disable-2fa-code"
                    isInvalid={!!disableForm.formState.errors.code}
                    className="text-slate-200"
                  >
                    Authentication code
                  </Label>

                  <Input
                    id="customer-disable-2fa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    fullWidth
                    className="tracking-widest"
                    {...disableForm.register('code')}
                  />

                  {disableForm.formState.errors.code && (
                    <p className="text-xs text-red-400">
                      {disableForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    variant="danger"
                    fullWidth
                    isPending={disableForm.formState.isSubmitting}
                  >
                    {disableForm.formState.isSubmitting
                      ? 'Disabling…'
                      : 'Confirm disable'}
                  </Button>
                </motion.div>

                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onPress={closeDisableForm}
                >
                  Cancel
                </Button>
              </motion.form>
            )}

            {!account.isTwoFactorEnabled && !setupData && (
              <motion.div
                key="disabled"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-4"
              >
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                  <p className="font-medium text-indigo-300">
                    Protect your customer account
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-indigo-400/70">
                    Require an authenticator code after Google sign-in.
                  </p>
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="button"
                    fullWidth
                    isPending={isGenerating}
                    onPress={() => void startEnableFlow()}
                  >
                    {isGenerating ? 'Preparing…' : 'Enable 2FA'}
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {!account.isTwoFactorEnabled && setupData && (
              <motion.form
                key="setup"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                onSubmit={enableForm.handleSubmit(enableTwoFactor)}
                className="flex flex-col gap-4"
              >
                <p className="text-sm leading-relaxed text-slate-400">
                  Scan this QR code using Google Authenticator,
                  Authy or another compatible application. Then
                  enter the generated 6-digit code.
                </p>

                <motion.div
                  variants={qrVariants}
                  className="mx-auto rounded-2xl border border-white/10 bg-white p-4 shadow-xl"
                >
                  <img
                    src={setupData.qrCodeDataUrl}
                    alt="Customer two-factor authentication QR code"
                    className="h-44 w-44"
                  />
                </motion.div>

                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className="text-center text-xs text-slate-400">
                    Can&apos;t scan the QR code?
                  </p>

                  <p className="mt-2 break-all text-center font-mono text-xs text-slate-300">
                    {setupData.secret}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="customer-enable-2fa-code"
                    isInvalid={!!enableForm.formState.errors.code}
                    className="text-slate-200"
                  >
                    Authentication code
                  </Label>

                  <Input
                    id="customer-enable-2fa-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    fullWidth
                    className="tracking-widest"
                    {...enableForm.register('code')}
                  />

                  {enableForm.formState.errors.code && (
                    <p className="text-xs text-red-400">
                      {enableForm.formState.errors.code.message}
                    </p>
                  )}
                </div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    fullWidth
                    isPending={enableForm.formState.isSubmitting}
                  >
                    {enableForm.formState.isSubmitting
                      ? 'Confirming…'
                      : 'Confirm & enable'}
                  </Button>
                </motion.div>

                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onPress={cancelSetup}
                >
                  Cancel
                </Button>
              </motion.form>
            )}
          </Card.Content>

          <Card.Footer>
            <motion.div variants={itemVariants} className="w-full">
              {/* <Link
                to="/customer/account"
                className="text-sm text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
              >
                Back to profile
              </Link> */}
               <StatusLink to="/customer/account">Back to home</StatusLink>
            </motion.div>
          </Card.Footer>
        </GlassCard>
      </motion.main>
    </div>
  );
}

export default CustomerSecurityPage;