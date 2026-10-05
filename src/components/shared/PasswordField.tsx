import { useState } from 'react';
import {
  useWatch,
  type Control,
  type FieldError,
  type FieldPathByValue,
  type FieldValues,
  type UseFormRegisterReturn,
} from 'react-hook-form';
import { InputGroup, Label } from '@heroui/react';
import { motion } from 'framer-motion';
import { Check, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { itemVariants } from '../../lib/motion-variants';
import { PASSWORD_REQUIREMENTS, type PasswordRequirement } from '../../lib/validation';

interface PasswordFieldProps<T extends FieldValues> {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  autoComplete?: string;
  disabled?: boolean;
  /** Only used to read the live value for the hint — the input itself
   *  is still bound via `registration`, same as FormField. */
  control: Control<T>;
  name: FieldPathByValue<T, string>;
  /** Show the live progress bar + one-line requirement hint. Turn off
   *  for confirmPassword/currentPassword, where only `error` applies. */
  showRequirementHint?: boolean;
}

type ScoredRequirement = PasswordRequirement & { passed: boolean };

interface PasswordHintState {
  rules: ScoredRequirement[];
  nextRequirement: ScoredRequirement | undefined;
  isComplete: boolean;
  progress: number;
}

/** Pure helper so the component body stays focused on rendering. */
function getPasswordHintState(passwordValue: string, enabled: boolean): PasswordHintState {
  if (!enabled) {
    return { rules: [], nextRequirement: undefined, isComplete: false, progress: 0 };
  }

  const rules = PASSWORD_REQUIREMENTS.map((rule) => ({ ...rule, passed: rule.test(passwordValue) }));
  const metCount = rules.filter((rule) => rule.passed).length;
  const nextRequirement = rules.find((rule) => !rule.passed);

  return {
    rules,
    nextRequirement,
    isComplete: rules.length > 0 && !nextRequirement,
    progress: rules.length > 0 ? metCount / rules.length : 0,
  };
}

// zod issue codes produced by passwordSchema's .min()/.max()/.regex() chain
// (lib/validation.ts) — react-hook-form's zodResolver preserves the issue
// `code` as `error.type`, so matching on it (rather than the message text)
// survives any future rewording of the messages.
const MIN_LENGTH_ISSUE_TYPE = 'too_small';
const COMPLEXITY_ISSUE_TYPE = 'invalid_string';

function PasswordField<T extends FieldValues>({
  id,
  label,
  registration,
  error,
  autoComplete,
  disabled,
  control,
  name,
  showRequirementHint = true,
}: PasswordFieldProps<T>) {
  const [isVisible, setIsVisible] = useState(false);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const watchedValue = useWatch({ control, name });
  const passwordValue = typeof watchedValue === 'string' ? watchedValue : '';

  const { rules, nextRequirement, isComplete, progress } = getPasswordHintState(
    passwordValue,
    showRequirementHint,
  );

  // The min-length / complexity issues duplicate what the hint line
  // already says, so hide those two specifically. The max-length issue
  // (too_big) isn't covered by the hint, so it always shows if it fires.
  const hideSchemaError =
    showRequirementHint &&
    !isComplete &&
    (error?.type === MIN_LENGTH_ISSUE_TYPE || error?.type === COMPLEXITY_ISSUE_TYPE);

  const describedBy = [
    showRequirementHint ? hintId : null,
    !hideSchemaError && error?.message ? errorId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-1">
      <Label htmlFor={id} isInvalid={!!error} className="text-slate-200">
        {label}
      </Label>

      <InputGroup fullWidth isDisabled={disabled ?? registration.disabled} isInvalid={!!error}>
        <InputGroup.Prefix>
          <LockKeyhole aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
        </InputGroup.Prefix>
        <InputGroup.Input
          id={id}
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          {...registration}
          disabled={disabled ?? registration.disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
        />
        <InputGroup.Suffix>
          <button
            type="button"
            onClick={() => setIsVisible((v) => !v)}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            className="
              flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
              text-slate-400 transition-colors hover:bg-slate-700/60
              hover:text-slate-200 focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-indigo-500
            "
          >
            {isVisible ? (
              <EyeOff aria-hidden="true" size={18} />
            ) : (
              <Eye aria-hidden="true" size={18} />
            )}
          </button>
        </InputGroup.Suffix>
      </InputGroup>

      {showRequirementHint && rules.length > 0 && (
        <div id={hintId} className="space-y-1.5 pt-1">
          <div
            aria-hidden="true"
            className="h-1 w-full overflow-hidden rounded-full bg-slate-700"
          >
            <div
              className={`
                h-full rounded-full transition-all duration-300 ease-out
                ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}
              `}
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <p
            aria-live="polite"
            className={`
              flex items-center gap-1.5 text-xs
              ${isComplete ? 'text-emerald-400' : 'text-slate-400'}
            `}
          >
            {isComplete ? (
              <>
                <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                Looks good
              </>
            ) : (
              passwordValue && nextRequirement?.label
            )}
          </p>
        </div>
      )}

      {!hideSchemaError && error?.message && (
        <p id={errorId} className="text-xs text-red-400">
          {error.message}
        </p>
      )}
    </motion.div>
  );
}

export default PasswordField;
