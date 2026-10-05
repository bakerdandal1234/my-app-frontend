import { useLayoutEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../../api/errors';
import {
  getAccessToken,
  getAuthVersion,
  subscribeToAccessToken,
} from '../../api/tokenStore';
import { useAuth } from '../AuthContext';
import {
  disableTwoFactor,
  enableTwoFactor,
  generateTwoFactorSetup,
} from '../api';
import type { TwoFactorSetupResponse } from '../contracts';

type SetupOperation = 'generate' | 'enable' | 'disable';

interface SetupState {
  version: number;
  userId: string | null;
  setupData: TwoFactorSetupResponse | null;
  showDisableForm: boolean;
  pending: SetupOperation | null;
  failedOperation: SetupOperation | null;
  error: string | null;
  successMessage: string | null;
}

interface SetupRequest {
  id: number;
  version: number;
  userId: string;
}

function emptySetup(version: number, userId: string | null): SetupState {
  return {
    version,
    userId,
    setupData: null,
    showDisableForm: false,
    pending: null,
    failedOperation: null,
    error: null,
    successMessage: null,
  };
}

export function useTwoFactorSetup(resetCodes: () => void) {
  const { user, setUser } = useAuth();
  const version = getAuthVersion();
  const userId = user?.id ?? null;
  const mounted = useRef(false);
  const requestSequence = useRef(0);
  const pendingRequest = useRef<SetupRequest | null>(null);
  const latest = useRef({ user, setUser, resetCodes });
  const [state, setState] = useState(() => emptySetup(version, userId));

  useLayoutEffect(() => {
    latest.current = { user, setUser, resetCodes };
  });

  useLayoutEffect(() => {
    mounted.current = true;
    let observedVersion = getAuthVersion();
    requestSequence.current += 1;
    pendingRequest.current = null;
    setState(emptySetup(observedVersion, userId));

    const unsubscribe = subscribeToAccessToken(() => {
      const currentVersion = getAuthVersion();
      // A refresh changes credentials without changing the setup's owner.
      if (currentVersion === observedVersion) return;
      observedVersion = currentVersion;
      requestSequence.current += 1;
      pendingRequest.current = null;
      setState(emptySetup(currentVersion, null));
      latest.current.resetCodes();
    });

    return () => {
      mounted.current = false;
      requestSequence.current += 1;
      pendingRequest.current = null;
      unsubscribe();
    };
  }, [userId]);

  function isCurrentSession(): boolean {
    return mounted.current &&
      userId !== null &&
      version === getAuthVersion() &&
      latest.current.user?.id === userId &&
      getAccessToken() !== null;
  }

  function isCurrentRequest(request: SetupRequest): boolean {
    return mounted.current &&
      request.id === requestSequence.current &&
      request.version === getAuthVersion() &&
      latest.current.user?.id === request.userId &&
      getAccessToken() !== null;
  }

  function publish(request: SetupRequest, patch: Partial<SetupState>): void {
    if (!isCurrentRequest(request)) return;
    setState((current) => isCurrentRequest(request)
      ? { ...current, ...patch }
      : current);
  }

  function beginRequest(operation: SetupOperation): SetupRequest | null {
    if (!user || !isCurrentSession() || pendingRequest.current) return null;
    const request = { id: ++requestSequence.current, version, userId: user.id };
    pendingRequest.current = request;
    publish(request, {
      version,
      userId: user.id,
      pending: operation,
      failedOperation: null,
      error: null,
      successMessage: null,
      ...(operation === 'generate' ? { setupData: null } : {}),
    });
    return request;
  }

  function finishRequest(request: SetupRequest): void {
    publish(request, { pending: null });
    if (pendingRequest.current === request) pendingRequest.current = null;
  }

  async function generateSetup(): Promise<void> {
    if (user?.isTwoFactorEnabled) return;
    const request = beginRequest('generate');
    if (!request) return;
    latest.current.resetCodes();

    try {
      const setupData = await generateTwoFactorSetup();
      publish(request, { setupData });
    } catch (error: unknown) {
      if (isCurrentRequest(request)) {
        publish(request, { error: getErrorMessage(error), failedOperation: 'generate' });
      }
    } finally {
      finishRequest(request);
    }
  }

  async function changeStatus(operation: 'enable' | 'disable', code: string): Promise<void> {
    if (!user || !isCurrentSession()) return;
    if (operation === 'enable' && (user.isTwoFactorEnabled || !state.setupData)) return;
    if (operation === 'disable' && !user.isTwoFactorEnabled) return;
    const request = beginRequest(operation);
    if (!request) return;

    try {
      if (operation === 'enable') await enableTwoFactor(code);
      else await disableTwoFactor(code);

      if (!isCurrentRequest(request)) return;
      const currentUser = latest.current.user;
      if (!currentUser) return;
      latest.current.setUser({ ...currentUser, isTwoFactorEnabled: operation === 'enable' });
      publish(request, {
        setupData: null,
        showDisableForm: false,
        successMessage: operation === 'enable'
          ? 'Two-factor authentication is now enabled.'
          : 'Two-factor authentication has been disabled.',
      });
      latest.current.resetCodes();
    } catch (error: unknown) {
      if (isCurrentRequest(request)) {
        publish(request, { error: getErrorMessage(error), failedOperation: operation });
      }
    } finally {
      finishRequest(request);
    }
  }

  function openDisableForm(): void {
    if (!user?.isTwoFactorEnabled || !isCurrentSession() || pendingRequest.current) return;
    requestSequence.current += 1;
    setState({ ...emptySetup(version, userId), showDisableForm: true });
    latest.current.resetCodes();
  }

  function cancel(): void {
    if (!isCurrentSession() || pendingRequest.current) return;
    requestSequence.current += 1;
    setState(emptySetup(version, userId));
    latest.current.resetCodes();
  }

  const visibleState = state.version === version && state.userId === userId
    ? state
    : emptySetup(version, userId);

  return {
    user,
    setupData: visibleState.setupData,
    showDisableForm: visibleState.showDisableForm,
    apiError: visibleState.error,
    successMessage: visibleState.successMessage,
    isGenerating: visibleState.pending === 'generate',
    isEnabling: visibleState.pending === 'enable',
    isDisabling: visibleState.pending === 'disable',
    isBusy: visibleState.pending !== null,
    canRetryGeneration: visibleState.failedOperation === 'generate',
    generateSetup,
    enable: (code: string) => changeStatus('enable', code),
    disable: (code: string) => changeStatus('disable', code),
    openDisableForm,
    cancel,
  };
}
