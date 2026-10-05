import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getErrorMessage } from '../../api/errors';
import { getAuthVersion, subscribeToAccessToken } from '../../api/tokenStore';
import { emailSchema, loginPasswordSchema } from '../../lib/validation';
import { useAuth } from '../AuthContext';
import { login } from '../api';

const credentialsSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

interface LoginOperation {
  version: number;
  active: boolean;
  submitting: boolean;
  awaitingTwoFactor: boolean;
  expectedToken: string | null;
}

function isCurrentOperation(operation: LoginOperation, current: LoginOperation | null): boolean {
  return operation === current && operation.active && operation.version === getAuthVersion();
}

export function useLogin() {
  const navigate = useNavigate();
  const { establishSession, isLoading } = useAuth();
  const mounted = useRef(false);
  const activeOperation = useRef<LoginOperation | null>(null);

  // Held only in memory, only for the duration of the 2FA step.
  const [pendingCredentials, setPendingCredentials] =
    useState<CredentialsValues | null>(null);

  const [apiError, setApiError] = useState<string | null>(null);

  const credentialsForm = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    mode: 'onChange',

    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = subscribeToAccessToken((token) => {
      const operation = activeOperation.current;
      const version = getAuthVersion();
      if (!operation?.active || operation.version === version) return;

      // Only our own synchronous publication may advance this operation.
      if (operation.expectedToken !== null && token === operation.expectedToken && version === operation.version + 1) {
        operation.version = version;
        operation.expectedToken = null;
        return;
      }

      operation.active = false;
      activeOperation.current = null;
      setPendingCredentials(null);
      setApiError('Your session changed. Please start signing in again.');
    });

    return () => {
      mounted.current = false;
      if (activeOperation.current) activeOperation.current.active = false;
      activeOperation.current = null;
      unsubscribe();
    };
  }, []);

  async function completeLogin(
    operation: LoginOperation,
    credentials: CredentialsValues,
    twoFactorCode?: string,
  ): Promise<void> {
    operation.submitting = true;
    setApiError(null);

    try {
      const response = await login({ ...credentials, twoFactorCode });
      if (!isCurrentOperation(operation, activeOperation.current)) return;

      if (response.twoFactorRequired === true) {
        operation.awaitingTwoFactor = true;
        setPendingCredentials(credentials);
        return;
      }

      operation.expectedToken = response.accessToken;
      const establishing = establishSession(response.accessToken);
      operation.expectedToken = null;
      await establishing;
      if (!isCurrentOperation(operation, activeOperation.current)) return;

      operation.active = false;
      activeOperation.current = null;
      setPendingCredentials(null);
      navigate('/home');
    } catch (err: unknown) {
      if (!isCurrentOperation(operation, activeOperation.current)) return;
      setApiError(getErrorMessage(err));
      if (!operation.awaitingTwoFactor) {
        operation.active = false;
        activeOperation.current = null;
      }
    } finally {
      operation.expectedToken = null;
      operation.submitting = false;
    }
  }

  async function onSubmitCredentials(values: CredentialsValues): Promise<void> {
    if (!mounted.current || isLoading || activeOperation.current?.submitting) return;
    if (activeOperation.current) activeOperation.current.active = false;

    const operation: LoginOperation = {
      version: getAuthVersion(),
      active: true,
      submitting: false,
      awaitingTwoFactor: false,
      expectedToken: null,
    };
    activeOperation.current = operation;
    await completeLogin(operation, values);
  }

  async function onSubmitTwoFactor(code: string): Promise<void> {
    const operation = activeOperation.current;
    if (!mounted.current || isLoading || !operation || !pendingCredentials || operation.submitting) return;
    if (!isCurrentOperation(operation, activeOperation.current)) return;
    await completeLogin(operation, pendingCredentials, code);
  }

  function backToCredentials() {
    if (activeOperation.current) activeOperation.current.active = false;
    activeOperation.current = null;
    setPendingCredentials(null);
    setApiError(null);
  }

  return {
    credentialsForm,
    isLoading,
    apiError,
    requiresTwoFactor: pendingCredentials !== null,
    onSubmitCredentials,
    onSubmitTwoFactor,
    backToCredentials,
  };
}
