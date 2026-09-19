import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, Input, Label } from '@heroui/react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import { containerVariants, itemVariants, errorVariants } from '../../lib/motion-variants';

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

// --- Motion Variants ---
// containerVariants / itemVariants / errorVariants now come from the
// shared ../../lib/motion-variants (consolidated from a near-identical
// local copy with a barely perceptible timing/offset difference —
// approved as part of the UI dedup pass).

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

const TWO_FACTOR_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none fixed inset-0 -z-10 overflow-hidden';

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

function TwoFactorSetupPage() {
  const { user, setUser } = useAuth();

  const [setupData, setSetupData] =
    useState<GenerateResponse | null>(null);

  const [showDisableForm, setShowDisableForm] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const enableForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: '',
    },
  });

  const disableForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      code: '',
    },
  });

  async function startEnableFlow() {
    setApiError(null);
    setSuccessMessage(null);
    setIsGenerating(true);

    try {
      const res = await apiClient.post<GenerateResponse>(
        '/auth/2fa/generate',
      );

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
      await apiClient.post('/auth/2fa/enable', {
        code: values.code,
      });

      setUser({
        ...user,
        isTwoFactorEnabled: true,
      });

      setSetupData(null);
      enableForm.reset();

      setSuccessMessage(
        'Two-factor authentication is now enabled.',
      );
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  async function onSubmitDisable(values: CodeValues) {
    if (!user) return;

    setApiError(null);

    try {
      await apiClient.post('/auth/2fa/disable', {
        code: values.code,
      });

      setUser({
        ...user,
        isTwoFactorEnabled: false,
      });

      setShowDisableForm(false);
      disableForm.reset();

      setSuccessMessage(
        'Two-factor authentication has been disabled.',
      );
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  function cancelSetup() {
    setSetupData(null);
    setApiError(null);
    enableForm.reset();
  }

  if (!user) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <AnimatedBackground
        wrapperClassName={TWO_FACTOR_BACKGROUND_WRAPPER_CLASSNAME}
        blobs={TWO_FACTOR_BACKGROUND_BLOBS}
      />

      <motion.main
        className="w-full max-w-lg"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <GlassCard>
          {/* Header */}
          <Card.Header>
            <motion.div variants={itemVariants}>
              <Card.Title className="text-xl text-white">
                Two-factor authentication
              </Card.Title>

              <Card.Description className="mt-1 text-slate-400">
                Add an extra layer of security to your FlowDesk
                account.
              </Card.Description>
            </motion.div>
          </Card.Header>

          <Card.Content className="flex flex-col gap-4">
            {/* Errors / Success */}
            <AnimatePresence mode="wait">
              {apiError && (
                <motion.p
                  key="2fa-error"
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
                  key="2fa-success"
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

            {/* -------------------------------------- */}
            {/* Case 1: 2FA enabled */}
            {/* -------------------------------------- */}

            {user.isTwoFactorEnabled && !showDisableForm && (
              <motion.div
                variants={itemVariants}
                className="flex flex-col gap-4"
              >
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                      <span className="text-lg text-emerald-400">
                        ✓
                      </span>
                    </div>

                    <div>
                      <p className="font-medium text-emerald-300">
                        2FA is enabled
                      </p>

                      <p className="mt-1 text-xs text-emerald-400/70">
                        Your account has an additional security
                        layer.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-slate-400">
                  Two-factor authentication is currently{' '}
                  <strong className="text-slate-200">
                    enabled
                  </strong>{' '}
                  on your account.
                </p>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
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
                </motion.div>
              </motion.div>
            )}

            {/* -------------------------------------- */}
            {/* Case 2: Disable 2FA */}
            {/* -------------------------------------- */}

            {user.isTwoFactorEnabled && showDisableForm && (
              <motion.form
                variants={itemVariants}
                onSubmit={disableForm.handleSubmit(onSubmitDisable)}
                className="flex flex-col gap-4"
              >
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="font-medium text-amber-300">
                    Disable two-factor authentication
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-amber-400/70">
                    Enter a current authentication code to
                    confirm this security change.
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="disable-code"
                    isInvalid={!!disableForm.formState.errors.code}
                    className="text-slate-200"
                  >
                    Authentication code
                  </Label>

                  <Input
                    id="disable-code"
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
                      {
                        disableForm.formState.errors.code
                          .message
                      }
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
                    isPending={
                      disableForm.formState.isSubmitting
                    }
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
                  onPress={() => {
                    setShowDisableForm(false);
                    disableForm.reset();
                  }}
                >
                  Cancel
                </Button>
              </motion.form>
            )}

            {/* -------------------------------------- */}
            {/* Case 3: 2FA disabled */}
            {/* -------------------------------------- */}

            {!user.isTwoFactorEnabled && !setupData && (
              <motion.div
                variants={itemVariants}
                className="flex flex-col gap-4"
              >
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
                  <p className="font-medium text-indigo-300">
                    Protect your account
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-indigo-400/70">
                    Require an authenticator code whenever you
                    sign in.
                  </p>
                </div>

                <p className="text-sm leading-relaxed text-slate-400">
                  Add an extra layer of security by requiring a
                  code from an authenticator app such as Google
                  Authenticator or Authy at login.
                </p>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="button"
                    fullWidth
                    isPending={isGenerating}
                    onPress={startEnableFlow}
                  >
                    {isGenerating
                      ? 'Preparing…'
                      : 'Enable 2FA'}
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {/* -------------------------------------- */}
            {/* Case 4: Enable 2FA */}
            {/* -------------------------------------- */}

            {!user.isTwoFactorEnabled && setupData && (
              <motion.form
                variants={itemVariants}
                onSubmit={enableForm.handleSubmit(onSubmitEnable)}
                className="flex flex-col gap-4"
              >
                <p className="text-sm leading-relaxed text-slate-400">
                  Scan this QR code with your authenticator app,
                  then enter the 6-digit code it generates.
                </p>

                {/* QR Code */}
                <motion.div
                  variants={qrVariants}
                  className="mx-auto rounded-2xl border border-white/10 bg-white p-4 shadow-xl"
                >
                  <img
                    src={setupData.qrCodeDataUrl}
                    alt="Two-factor authentication QR code"
                    className="h-44 w-44"
                  />
                </motion.div>

                {/* Secret */}
                <div className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <p className="text-center text-xs text-slate-400">
                    Can&apos;t scan the QR code?
                  </p>

                  <p className="mt-2 break-all text-center font-mono text-xs text-slate-300">
                    {setupData.secret}
                  </p>
                </div>

                {/* Code */}
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor="enable-code"
                    isInvalid={!!enableForm.formState.errors.code}
                    className="text-slate-200"
                  >
                    Authentication code
                  </Label>

                  <Input
                    id="enable-code"
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
                      {
                        enableForm.formState.errors.code
                          .message
                      }
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
                    isPending={
                      enableForm.formState.isSubmitting
                    }
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
            <motion.div
              variants={itemVariants}
              className="w-full"
            >
              <Link
                to="/home"
                className="text-sm text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
              >
                Back to home
              </Link>
            </motion.div>
          </Card.Footer>
        </GlassCard>
      </motion.main>
    </div>
  );
}

export default TwoFactorSetupPage;