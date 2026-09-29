import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getErrorMessage } from '../api/errors';
import { getAuthVersion, subscribeToAccessToken } from '../api/tokenStore';
import { verifyEmail } from './api';
import { useAuth } from './AuthContext';
import type { MessageResponse } from './contracts';

type EmailVerificationState =
  | { status: 'loading'; message: null }
  | { status: 'success' | 'error'; message: string };

interface VerificationRequest {
  token: string;
  authVersion: number;
  promise: Promise<MessageResponse>;
}

interface VerificationResult {
  token: string;
  authVersion: number;
  status: 'success' | 'error';
  message: string;
}

export function useEmailVerification(token: string | null): EmailVerificationState {
  const { isLoading } = useAuth();
  const authVersion = useSyncExternalStore(
    subscribeToAccessToken,
    getAuthVersion,
    getAuthVersion,
  );
  const requestRef = useRef<VerificationRequest | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    setResult(null);

    if (!token) {
      requestRef.current = null;
      return;
    }

    // Bootstrap may invalidate an expired session before anonymous verification
    // starts. Wait until that identity decision has finished.
    if (isLoading || authVersion !== getAuthVersion()) return;

    // Email tokens are consumed once. StrictMode can subscribe again to the
    // same promise without resending it; only this mounted hook retains it.
    let request = requestRef.current;
    if (request?.token === token && request.authVersion !== authVersion) {
      setResult({
        token,
        authVersion,
        status: 'error',
        message: 'Your session changed. Reopen this verification link to continue.',
      });
      return;
    }

    if (!request || request.token !== token || request.authVersion !== authVersion) {
      request = { token, authVersion, promise: verifyEmail(token) };
      requestRef.current = request;
    }

    let active = true;

    void request.promise.then(
      (response) => {
        if (!active || authVersion !== getAuthVersion()) return;
        setResult({
          token,
          authVersion,
          status: 'success',
          message: response.message ?? 'Your email has been verified.',
        });
      },
      (error: unknown) => {
        if (!active || authVersion !== getAuthVersion()) return;
        setResult({
          token,
          authVersion,
          status: 'error',
          message: getErrorMessage(error),
        });
      },
    );

    return () => {
      active = false;
    };
  }, [token, authVersion, isLoading]);

  if (!token) {
    return { status: 'error', message: 'This verification link is missing its token.' };
  }

  if (isLoading || !result || result.token !== token || result.authVersion !== authVersion) {
    return { status: 'loading', message: null };
  }

  return { status: result.status, message: result.message };
}
