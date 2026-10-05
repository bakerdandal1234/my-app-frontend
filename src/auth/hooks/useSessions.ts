import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage, isAuthRejection } from '../../api/errors';
import {
  getAccessToken,
  getAuthVersion,
  setAccessToken,
  subscribeToAccessToken,
} from '../../api/tokenStore';
import { useAuth } from '../AuthContext';
import {
  getSessions,
  refreshAccessToken,
  revokeAllSessions as revokeAllSessionsRequest,
  revokeSession as revokeSessionRequest,
} from '../api';
import type { SessionItem } from '../contracts';

interface SessionsOperation {
  kind: 'load' | 'revoke' | 'revokeAll';
  authVersion: number;
  controller: AbortController;
}

interface UseSessionsResult {
  sessions: SessionItem[] | null;
  error: string | null;
  isLoading: boolean;
  revokingId: string | null;
  revokingAll: boolean;
  reload: () => Promise<void>;
  revoke: (sessionId: string) => Promise<void>;
  revokeAll: () => Promise<void>;
}

export function useSessions(): UseSessionsResult {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const mountedRef = useRef(false);
  const operationRef = useRef<SessionsOperation | null>(null);

  const isCurrent = useCallback((operation: SessionsOperation): boolean => (
    mountedRef.current &&
    operationRef.current === operation &&
    operation.authVersion === getAuthVersion() &&
    !operation.controller.signal.aborted
  ), []);

  const beginOperation = useCallback((
    kind: SessionsOperation['kind'],
  ): SessionsOperation | null => {
    if (!mountedRef.current || !getAccessToken()) return null;
    if (operationRef.current && operationRef.current.kind !== 'load') return null;

    operationRef.current?.controller.abort();
    const operation: SessionsOperation = {
      kind,
      authVersion: getAuthVersion(),
      controller: new AbortController(),
    };
    operationRef.current = operation;
    setError(null);
    setIsLoading(false);
    return operation;
  }, []);

  const finishOperation = useCallback((operation: SessionsOperation): void => {
    if (!isCurrent(operation)) return;
    operationRef.current = null;
    setIsLoading(false);
    setRevokingId(null);
    setRevokingAll(false);
  }, [isCurrent]);

  const loadSessions = useCallback(async (operation: SessionsOperation): Promise<void> => {
    if (!isCurrent(operation)) return;
    setIsLoading(true);

    try {
      const loadedSessions = await getSessions({ signal: operation.controller.signal });
      if (isCurrent(operation)) setSessions(loadedSessions);
    } catch (loadError: unknown) {
      if (isCurrent(operation)) setError(getErrorMessage(loadError));
    } finally {
      if (isCurrent(operation)) setIsLoading(false);
    }
  }, [isCurrent]);

  const reload = useCallback(async (): Promise<void> => {
    const operation = beginOperation('load');
    if (!operation) return;
    try {
      await loadSessions(operation);
    } finally {
      finishOperation(operation);
    }
  }, [beginOperation, finishOperation, loadSessions]);

  useEffect(() => {
    mountedRef.current = true;
    let observedAuthVersion = getAuthVersion();

    const unsubscribe = subscribeToAccessToken(() => {
      const authVersion = getAuthVersion();
      if (authVersion === observedAuthVersion) return;
      observedAuthVersion = authVersion;
      operationRef.current?.controller.abort();
      operationRef.current = null;
      setSessions(null);
      setError(null);
      setIsLoading(false);
      setRevokingId(null);
      setRevokingAll(false);
      if (getAccessToken()) void reload();
    });

    if (getAccessToken()) void reload();
    else setIsLoading(false);

    return () => {
      mountedRef.current = false;
      unsubscribe();
      operationRef.current?.controller.abort();
      operationRef.current = null;
    };
  }, [reload]);

  const revoke = useCallback(async (sessionId: string): Promise<void> => {
    const operation = beginOperation('revoke');
    if (!operation) return;
    setRevokingId(sessionId);

    try {
      await revokeSessionRequest(sessionId);
      if (!isCurrent(operation)) return;
      await loadSessions(operation);
      if (!isCurrent(operation)) return;

      // A network failure cannot establish that this browser's session ended.
      try {
        await refreshAccessToken();
      } catch (refreshError: unknown) {
        if (!isCurrent(operation)) return;
        if (isAuthRejection(refreshError)) {
          setAccessToken(null);
          navigate('/login');
        } else {
          setError(getErrorMessage(refreshError));
        }
      }
    } catch (revokeError: unknown) {
      if (isCurrent(operation)) setError(getErrorMessage(revokeError));
    } finally {
      finishOperation(operation);
    }
  }, [beginOperation, finishOperation, isCurrent, loadSessions, navigate]);

  const revokeAll = useCallback(async (): Promise<void> => {
    const operation = beginOperation('revokeAll');
    if (!operation) return;
    setRevokingAll(true);

    try {
      await revokeAllSessionsRequest();
      if (!isCurrent(operation)) return;
      await logout();
    } catch (revokeError: unknown) {
      if (isCurrent(operation)) setError(getErrorMessage(revokeError));
    } finally {
      finishOperation(operation);
    }
  }, [beginOperation, finishOperation, isCurrent, logout]);

  return { sessions, error, isLoading, revokingId, revokingAll, reload, revoke, revokeAll };
}
