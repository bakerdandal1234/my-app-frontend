

import { isAxiosError } from 'axios';

interface BackendErrorBody {
  message?: string | string[];
}

/**
 * جسم استجابة الخطأ بيانات خارجية أيضًا.
 * نفحصه دون تحويل نوعه باستخدام as أو افتراض وجود response.
 */
function isBackendErrorBody(
  data: unknown,
): data is BackendErrorBody {
  if (
    typeof data !== 'object' ||
    data === null ||
    Array.isArray(data)
  ) {
    return false;
  }

  if (!('message' in data)) {
    return true;
  }

  return (
    data.message === undefined ||
    typeof data.message === 'string' ||
    (
      Array.isArray(data.message) &&
      data.message.every(
        (item: unknown) => typeof item === 'string',
      )
    )
  );
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError<unknown, unknown>(error)) {
    const data = error.response?.data;

    if (isBackendErrorBody(data)) {
      if (typeof data.message === 'string') {
        return data.message;
      }

      if (Array.isArray(data.message)) {
        return data.message.join(' ');
      }
    }
  }

  return 'Something went wrong. Please try again.';
}

/**
 * True when the server rejected the credentials themselves (401/403), as
 * opposed to a network drop, a 5xx or an unexpected response shape.
 */
export function isAuthRejection(error: unknown): boolean {
  if (!isAxiosError<unknown, unknown>(error)) return false;
  const status = error.response?.status;
  return status === 401 || status === 403;
}