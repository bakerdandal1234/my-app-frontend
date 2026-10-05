import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email is required.')
  .email('Please enter a valid email address.');

// Login accepts existing credentials without applying the new-password policy.
export const loginPasswordSchema = z.string().min(1, 'Password is required.');

/** Mirrors the backend's CreateUserDto/ResetPasswordDto/ChangePasswordDto @Matches() rule. */
export const PASSWORD_RULE =
  /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_MIN_LENGTH_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
export const PASSWORD_MAX_LENGTH_MESSAGE = `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
export const PASSWORD_COMPLEXITY_MESSAGE =
  'Password must contain an uppercase letter, a lowercase letter, and a number or symbol.';

export interface PasswordRequirement {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

/** Checked live as the user types; each line disappears once satisfied. */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'length',
    label: `Must be at least ${PASSWORD_MIN_LENGTH} characters`,
    test: (value) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'uppercase',
    label: 'Must contain an uppercase letter',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: 'lowercase',
    label: 'Must contain a lowercase letter',
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: 'number-or-symbol',
    label: 'Must contain a number or symbol',
    test: (value) => /[\d\W]/.test(value),
  },
];

/**
 * The password rule shared by register, reset-password and
 * change-password. Each page still owns its own object() wrapper (some
 * need confirmPassword/currentPassword alongside it), so this is just the
 * single-field schema, not the whole form schema.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE)
  .max(PASSWORD_MAX_LENGTH, PASSWORD_MAX_LENGTH_MESSAGE)
  .regex(PASSWORD_RULE, PASSWORD_COMPLEXITY_MESSAGE);

/** Mirrors the backend's LoginDto/Verify2faDto @Length(6, 6) rule for TOTP codes. */
export const TWO_FACTOR_CODE_REGEX = /^\d{6}$/;

export const TWO_FACTOR_CODE_MESSAGE =
  'Enter the 6-digit code from your authenticator app.';

export const twoFactorCodeSchema = z
  .string()
  .length(6, TWO_FACTOR_CODE_MESSAGE)
  .regex(TWO_FACTOR_CODE_REGEX, TWO_FACTOR_CODE_MESSAGE);
