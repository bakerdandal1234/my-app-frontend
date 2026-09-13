import { isAxiosError } from 'axios';

interface BackendErrorBody {
  message?: string | string[];
}

/**
 * Runtime type guard for the backend's error body — axios types
 * `response.data` as `any` internally, so we validate the shape before
 * trusting it instead of blindly asserting it (see CLAUDE.md rule 3: don't
 * blindly trust API responses). The one cast inside is safe: it only
 * narrows `unknown` to a plain object so we can *check* a property exists
 * and has the right type — it never assumes the property's value is
 * correct without verifying it first.
 */
function isBackendErrorBody(data: unknown): data is BackendErrorBody {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const message = (data as Record<string, unknown>).message;
  return (
    message === undefined ||
    typeof message === 'string' ||
    (Array.isArray(message) && message.every((item) => typeof item === 'string'))
  );
}

/**
 * The backend's global HttpExceptionFilter returns { message, statusCode,
 * path, timestamp }, where `message` is either a plain string (most
 * handwritten exceptions) or a string[] (class-validator's ValidationPipe
 * errors, one entry per failed rule). This normalizes both into one string
 * for display.
 */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error) && isBackendErrorBody(error.response?.data)) {
    const { message } = error.response!.data;
    if (Array.isArray(message)) {
      return message.join(' ');
    }
    if (typeof message === 'string') {
      return message;
    }
  }
  return 'Something went wrong. Please try again.';
}
