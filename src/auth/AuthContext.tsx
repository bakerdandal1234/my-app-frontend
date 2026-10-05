import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage, isAuthRejection } from '../api/errors';
import {
  getAccessToken,
  getAuthVersion,
  setAccessToken,
  subscribeToAccessToken,
} from '../api/tokenStore';
import { useToast } from '../ui/ToastContext';
import { getCurrentUser, logoutSession, refreshAccessToken } from './api';
import { getCurrentUserAccess } from './authorization/authorization-api';
import type { AuthUser } from './contracts';

export type { AuthUser } from './contracts';

type AccessStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AccessState {
  status: AccessStatus;
  roles: string[];
  permissions: string[];
  error: string | null;
}

const EMPTY_ACCESS: AccessState = {
  status: 'idle',
  roles: [],
  permissions: [],
  error: null,
};

interface AuthState {
  version: number;
  user: AuthUser | null;
  isLoading: boolean;
  access: AccessState;
}

interface AuthRequest {
  version: number;
  controller: AbortController;
}

function isCurrentRequest(request: AuthRequest, active: AuthRequest | null): boolean {
  return request === active &&
    request.version === getAuthVersion() &&
    !request.controller.signal.aborted;
}

interface AuthContextValue {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  isAuthenticated: boolean;
  /** True while restoring or establishing the current user's identity. */
  isLoading: boolean;
  accessStatus: AccessStatus;
  accessError: string | null;
  retryAccess: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  establishSession: (accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const mounted = useRef(false);
  const sessionRequest = useRef<AuthRequest | null>(null);
  const accessRequest = useRef<AuthRequest | null>(null);
  const [state, setState] = useState<AuthState>(() => ({
    version: getAuthVersion(),
    user: null,
    isLoading: true,
    access: EMPTY_ACCESS,
  }));

  const cancelRequests = useCallback(() => {
    sessionRequest.current?.controller.abort();
    accessRequest.current?.controller.abort();
    sessionRequest.current = null;
    accessRequest.current = null;
  }, []);

  const beginSession = useCallback((): AuthRequest => {
    cancelRequests();
    const request = {
      version: getAuthVersion(),
      controller: new AbortController(),
    };
    sessionRequest.current = request;
    setState({
      version: request.version,
      user: null,
      isLoading: true,
      access: EMPTY_ACCESS,
    });
    return request;
  }, [cancelRequests]);

  const loadAccess = useCallback(async (
    userId: string,
    version: number,
  ): Promise<void> => {
    if (!mounted.current || version !== getAuthVersion()) return;

    accessRequest.current?.controller.abort();
    const request = { version, controller: new AbortController() };
    accessRequest.current = request;

    function publishAccess(access: AccessState): void {
      setState((current) => {
        if (
          !isCurrentRequest(request, accessRequest.current) ||
          current.version !== version ||
          current.user?.id !== userId
        ) return current;
        return { ...current, access };
      });
    }

    publishAccess({ ...EMPTY_ACCESS, status: 'loading' });
    try {
      const access = await getCurrentUserAccess(userId, {
        signal: request.controller.signal,
      });
      if (!isCurrentRequest(request, accessRequest.current)) return;
      publishAccess({
        status: 'ready',
        roles: access.roles,
        permissions: access.permissions,
        error: null,
      });
    } catch (error: unknown) {
      if (!isCurrentRequest(request, accessRequest.current)) return;
      // Authorization failures do not invalidate an already verified identity.
      publishAccess({
        ...EMPTY_ACCESS,
        status: 'error',
        error: getErrorMessage(error),
      });
    }
  }, []);

  const loadSession = useCallback(async (request: AuthRequest): Promise<void> => {
    const user = await getCurrentUser({ signal: request.controller.signal });
    if (!isCurrentRequest(request, sessionRequest.current)) {
      throw new Error('Authentication was superseded');
    }

    setState((current) => isCurrentRequest(request, sessionRequest.current)
      ? { ...current, user, isLoading: false }
      : current);
    await loadAccess(user.id, request.version);

    if (!isCurrentRequest(request, sessionRequest.current)) {
      throw new Error('Authentication was superseded');
    }
  }, [loadAccess]);

  useEffect(() => {
    mounted.current = true;
    let observedVersion = getAuthVersion();
    const unsubscribe = subscribeToAccessToken((token) => {
      const version = getAuthVersion();
      // Refresh rotates the token within the same session, preserving its data.
      if (token !== null && version === observedVersion) return;
      observedVersion = version;
      cancelRequests();
      setState({ version, user: null, isLoading: false, access: EMPTY_ACCESS });
    });

    const request = beginSession();
    void (async () => {
      try {
        await refreshAccessToken();
        if (!isCurrentRequest(request, sessionRequest.current)) return;
        await loadSession(request);
      } catch (error: unknown) {
        if (!isCurrentRequest(request, sessionRequest.current)) return;
        if (!isAuthRejection(error)) {
          console.error('Session restore failed:', getErrorMessage(error));
        }
        setAccessToken(null);
      }
    })();

    return () => {
      mounted.current = false;
      unsubscribe();
      cancelRequests();
    };
  }, [beginSession, cancelRequests, loadSession]);

  async function establishSession(newAccessToken: string): Promise<void> {
    if (!mounted.current) throw new Error('AuthProvider is not mounted');
    if (state.version !== getAuthVersion()) {
      throw new Error('Authentication was superseded');
    }
    setAccessToken(newAccessToken);
    const request = beginSession();

    try {
      await loadSession(request);
    } catch (error: unknown) {
      if (isCurrentRequest(request, sessionRequest.current)) setAccessToken(null);
      throw error;
    }
  }

  async function retryAccess(): Promise<void> {
    if (state.user && state.version === getAuthVersion() && getAccessToken()) {
      await loadAccess(state.user.id, state.version);
    }
  }

  function setUser(user: AuthUser | null): void {
    if (!mounted.current || state.version !== getAuthVersion() || !getAccessToken()) return;
    setState((current) => {
      if (current.version !== state.version || current.version !== getAuthVersion()) return current;
      if (user && user.id !== current.user?.id) return current;
      return { ...current, user, access: user ? current.access : EMPTY_ACCESS };
    });
  }

  async function logout(): Promise<void> {
    if (!mounted.current || state.version !== getAuthVersion()) return;
    const revocation = logoutSession();
    const version = getAuthVersion();
    try {
      await revocation;
    } catch (error: unknown) {
      if (mounted.current && version === getAuthVersion()) {
        showToast(
          'Signed out locally, but the server session could not be revoked. ' + getErrorMessage(error),
          'error',
        );
      }
    } finally {
      if (mounted.current && version === getAuthVersion()) navigate('/');
    }
  }

  const isCurrentVersion = state.version === getAuthVersion();
  const user = isCurrentVersion ? state.user : null;
  const isAuthenticated = !!getAccessToken() && !!user;
  const access = isAuthenticated ? state.access : EMPTY_ACCESS;

  function hasPermission(permission: string): boolean {
    return state.version === getAuthVersion() &&
      !!getAccessToken() &&
      !!state.user &&
      state.access.status === 'ready' &&
      state.access.permissions.includes(permission);
  }

  const value: AuthContextValue = {
    user,
    roles: access.roles,
    permissions: access.permissions,
    hasPermission,
    isAuthenticated,
    isLoading: isCurrentVersion && state.isLoading,
    accessStatus: access.status,
    accessError: access.error,
    retryAccess,
    setUser,
    logout,
    establishSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
