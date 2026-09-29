import type { HTMLInputTypeAttribute, ReactNode } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { Input, Label } from '@heroui/react';
import { motion } from 'framer-motion';
import { itemVariants } from '../../lib/motion-variants';

interface FormFieldProps {
  id: string;
  label: string;
  type?: HTMLInputTypeAttribute;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  helperText?: ReactNode;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel' | 'url' | 'search' | 'none' | 'decimal';
  maxLength?: number;
  disabled?: boolean;
  /** Extra classes for the <Input> itself (e.g. "tracking-widest" for a code field). */
  inputClassName?: string;
}

/** A registered input with an accessible label, hint, and validation message. */
function FormField({
  id,
  label,
  type = 'text',
  registration,
  error,
  helperText,
  autoComplete,
  inputMode,
  maxLength,
  disabled,
  inputClassName,
}: FormFieldProps) {
  const helperId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [
    helperText ? helperId : null,
    error?.message ? errorId : null,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <motion.div variants={itemVariants} className="flex flex-col gap-1">
      <Label htmlFor={id} isInvalid={!!error} className="text-slate-200">
        {label}
      </Label>

      <Input
        id={id}
        type={type}
        fullWidth
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        className={inputClassName}
        {...registration}
        disabled={disabled ?? registration.disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
      />

      {helperText && (
        <p id={helperId} className="text-xs leading-relaxed text-slate-400">
          {helperText}
        </p>
      )}

      {error?.message && <p id={errorId} className="text-xs text-red-400">{error.message}</p>}
    </motion.div>
  );
}

export default FormField;
