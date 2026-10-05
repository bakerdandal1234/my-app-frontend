import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../../../api/errors';
import { getUserAccess } from '../../../auth/authorization/authorization-api';
import type { UserAccess } from '../../../auth/authorization/authorization-contracts';
import { getAuthVersion, subscribeToAccessToken } from '../../../api/tokenStore';

interface AccessScope {
  userId: string;
  authVersion: number;
  active: boolean;
  ready: boolean;
  mutating: boolean;
  needsRefresh: boolean;
  controller: AbortController | null;
}

interface AccessMutation {
  request: () => Promise<void>;
  onSaved: () => void;
}

export function useUserAccess(userId: string) {
  const [authVersion, setAuthVersion] = useState(getAuthVersion);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const scopeRef = useRef<AccessScope | null>(null);

  const isCurrent = useCallback((scope: AccessScope) =>
    scope.active &&
    scopeRef.current === scope &&
    getAuthVersion() === scope.authVersion, []);

  const loadAccess = useCallback(async (scope: AccessScope): Promise<void> => {
    if (!isCurrent(scope)) return;
    scope.controller?.abort();
    const controller = new AbortController();
    scope.controller = controller;
    scope.ready = false;
    setAccess(null);
    setAccessError(null);
    setIsLoading(true);

    try {
      const nextAccess = await getUserAccess(scope.userId, { signal: controller.signal });
      if (!isCurrent(scope) || controller.signal.aborted) return;
      scope.ready = true;
      scope.needsRefresh = false;
      setAccess(nextAccess);
    } catch (error: unknown) {
      if (!isCurrent(scope) || controller.signal.aborted) return;
      const message = getErrorMessage(error);
      setAccessError(scope.needsRefresh
        ? `Role change saved, but access could not be refreshed. ${message}`
        : message);
    } finally {
      if (isCurrent(scope) && !controller.signal.aborted) setIsLoading(false);
    }
  }, [isCurrent]);

  useEffect(() => subscribeToAccessToken(() => {
    setAuthVersion(getAuthVersion());
  }), []);

  useEffect(() => {
    const scope: AccessScope = {
      userId, authVersion, active: true, ready: false, mutating: false,
      needsRefresh: false, controller: null,
    };
    scopeRef.current = scope;
    setMutationError(null);
    setIsMutating(false);
    void loadAccess(scope);

    return () => {
      scope.active = false;
      scope.controller?.abort();
    };
  }, [userId, authVersion, loadAccess]);

  const reload = useCallback(async (): Promise<void> => {
    const scope = scopeRef.current;
    if (!scope || !isCurrent(scope) || scope.mutating) return;
    await loadAccess(scope);
  }, [isCurrent, loadAccess]);

  async function mutate({ request, onSaved }: AccessMutation): Promise<void> {
    const scope = scopeRef.current;
    if (!scope || scope.userId !== userId || !isCurrent(scope) ||
        !scope.ready || scope.mutating) return;

    scope.mutating = true;
    setIsMutating(true);
    setMutationError(null);
    try {
      await request();
    } catch (error: unknown) {
      if (isCurrent(scope)) {
        setMutationError(getErrorMessage(error));
        scope.mutating = false;
        setIsMutating(false);
      }
      return;
    }

    if (!isCurrent(scope)) return;
    scope.needsRefresh = true;
    onSaved();
    await loadAccess(scope);
    if (isCurrent(scope)) {
      scope.mutating = false;
      setIsMutating(false);
    }
  }

  return { access, accessError, mutationError, isLoading, isMutating, reload, mutate };
}
