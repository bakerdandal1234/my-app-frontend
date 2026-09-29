import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card } from '@heroui/react';
import { motion } from 'framer-motion';
import { twoFactorCodeSchema } from '../../lib/validation';
import { containerVariants, itemVariants } from '../../lib/motion-variants';
import GlassCard from './GlassCard';
import FormField from './FormField';
import FormErrorBanner from './FormErrorBanner';

const challengeSchema = z.object({ code: twoFactorCodeSchema });
type ChallengeValues = z.infer<typeof challengeSchema>;

interface TwoFactorChallengeFormProps {
  error: string | null;
  onSubmit: (code: string) => Promise<void>;
  onCancel: () => void;
  cancelLabel?: string;
}

function TwoFactorChallengeForm({
  error,
  onSubmit,
  onCancel,
  cancelLabel = 'Use a different account',
}: TwoFactorChallengeFormProps) {
  const inputId = useId();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<ChallengeValues>({
      resolver: zodResolver(challengeSchema),
      defaultValues: { code: '' },
    });

  return (
    <motion.form
      noValidate
      onSubmit={handleSubmit(({ code }) => onSubmit(code))}
      className="w-full max-w-sm"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <GlassCard>
        <Card.Header>
          <motion.div variants={itemVariants}>
            <Card.Title className="text-white">Two-factor authentication</Card.Title>
            <Card.Description className="text-slate-400">
              Enter the 6-digit code from your authenticator app to finish signing in.
            </Card.Description>
          </motion.div>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4">
          <FormErrorBanner message={error} />
          <FormField
            id={inputId}
            label="Authentication code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            inputClassName="tracking-widest"
            registration={register('code')}
            error={errors.code}
            disabled={isSubmitting}
          />
        </Card.Content>
        <Card.Footer className="flex flex-col gap-3">
          <Button type="submit" fullWidth isPending={isSubmitting} isDisabled={isSubmitting}>
            {isSubmitting ? 'Verifying…' : 'Verify and continue'}
          </Button>
          <Button type="button" variant="ghost" fullWidth onPress={onCancel}>
            {cancelLabel}
          </Button>
        </Card.Footer>
      </GlassCard>
    </motion.form>
  );
}

export default TwoFactorChallengeForm;
