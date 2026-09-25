import type { ReactNode } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { Input, Label } from '@heroui/react';
import { motion } from 'framer-motion';
import { itemVariants } from '../../lib/motion-variants';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  helperText?: ReactNode;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel' | 'url' | 'search' | 'none' | 'decimal';
  maxLength?: number;
  /** Extra classes for the <Input> itself (e.g. "tracking-widest" for a code field). */
  inputClassName?: string;
}

/**
 * The "Label + Input + optional helper text + validation error" block
 * repeated for every field across the auth and settings forms (email,
 * password, first/last name, 2FA code…). Wraps itemVariants the same way
 * each page's copy did, so it drops straight into an existing
 * motion-staggered form with no visual change.
 */
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
  inputClassName,
}: FormFieldProps) {
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
      />

      {helperText && (
        <p className="text-xs leading-relaxed text-slate-400">
          {helperText}
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error.message}</p>}
    </motion.div>
  );
}

export default FormField;
