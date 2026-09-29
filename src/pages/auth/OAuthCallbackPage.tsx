import { useSearchParams } from 'react-router-dom';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';
import { useOAuthCallback } from '../../auth/useOAuthCallback';
import AuthPageShell from '../../components/layout/AuthPageShell';
import GlassCard from '../../components/shared/GlassCard';
import FormErrorBanner from '../../components/shared/FormErrorBanner';
import TwoFactorChallengeForm from '../../components/shared/TwoFactorChallengeForm';
import StatusLink from '../../components/shared/StatusLink';
import FullPageLoading from '../../ui/FullPageLoading';
import { statusContainerVariants } from '../../lib/motion-variants';

function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const needsTwoFactor = searchParams.get('twoFactorRequired') === 'true';

  return (
    <OAuthCallbackFlow
      key={JSON.stringify([code, needsTwoFactor])}
      code={code}
      needsTwoFactor={needsTwoFactor}
    />
  );
}

function OAuthCallbackFlow({
  code,
  needsTwoFactor,
}: {
  code: string | null;
  needsTwoFactor: boolean;
}) {
  const { status, error, canRetry, submitTwoFactor, retry, cancel } =
    useOAuthCallback(code, needsTwoFactor);

  if (status === 'challenge') {
    return (
      <AuthPageShell>
        <TwoFactorChallengeForm
          error={error}
          onSubmit={submitTwoFactor}
          onCancel={cancel}
          cancelLabel="Back to sign in"
        />
      </AuthPageShell>
    );
  }

  if (status === 'error') {
    return (
      <AuthPageShell>
        <motion.div
          variants={statusContainerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 w-full max-w-md"
        >
          <GlassCard>
            <Card.Header>
              <Card.Title className="text-white">Sign-in failed</Card.Title>
              <Card.Description className="text-slate-400">
                We couldn&apos;t complete your sign-in.
              </Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-col gap-4">
              <FormErrorBanner message={error} />
              {canRetry && <Button type="button" onPress={retry}>Try again</Button>}
            </Card.Content>
            <StatusLink to="/login">Back to login</StatusLink>
          </GlassCard>
        </motion.div>
      </AuthPageShell>
    );
  }

  return <FullPageLoading label="Signing you in…" />;
}

export default OAuthCallbackPage;
