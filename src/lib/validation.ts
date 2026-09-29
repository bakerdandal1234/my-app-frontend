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

export const PASSWORD_MESSAGE =
  'Password must be 8-128 characters and contain an uppercase letter, a lowercase letter, and a number or symbol.';

/**
 * The password rule shared by register, reset-password and
 * change-password. Each page still owns its own object() wrapper (some
 * need confirmPassword/currentPassword alongside it), so this is just the
 * single-field schema, not the whole form schema.
 */
export const passwordSchema = z
  .string()
  .min(8, PASSWORD_MESSAGE)
  .max(128, PASSWORD_MESSAGE)
  .regex(PASSWORD_RULE, PASSWORD_MESSAGE);

/** Mirrors the backend's LoginDto/Verify2faDto @Length(6, 6) rule for TOTP codes. */
export const TWO_FACTOR_CODE_REGEX = /^\d{6}$/;

export const TWO_FACTOR_CODE_MESSAGE =
  'Enter the 6-digit code from your authenticator app.';

export const twoFactorCodeSchema = z
  .string()
  .length(6, TWO_FACTOR_CODE_MESSAGE)
  .regex(TWO_FACTOR_CODE_REGEX, TWO_FACTOR_CODE_MESSAGE);
