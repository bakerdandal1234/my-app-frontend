import { isAxiosError } from 'axios';
import { InvalidApiResponseError, isArrayOf, isRecord, isString } from './validation';

interface BackendErrorBody {
  message?: string | string[];
}

function isBackendErrorBody(body: unknown): body is BackendErrorBody {
  return isRecord(body) && (
    body.message === undefined ||
    isString(body.message) ||
    isArrayOf(body.message, isString)
  );
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof InvalidApiResponseError) return error.message;
  const body: unknown = isAxiosError<unknown, unknown>(error)
    ? error.response?.data
    : undefined;
  if (isBackendErrorBody(body)) {
    if (Array.isArray(body.message)) return body.message.join(' ');
    if (typeof body.message === 'string') return body.message;
  }
  return 'Something went wrong. Please try again.';
}

/** Use for session endpoints; a normal resource's 403 is not a logout signal. */
export function isAuthRejection(error: unknown): boolean {
  if (!isAxiosError<unknown, unknown>(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}
