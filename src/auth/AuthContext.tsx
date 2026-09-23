import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, refreshAccessToken } from '../api/client';
import { getAccessToken, setAccessToken, subscribeToAccessToken } from '../api/tokenStore';
import {
  isAuthUser,
  isUserAccess,
  type AuthUser,
} from '../api/guards';
/**
 * Widened as pages need more fields from GET /users/me. Now covers the
 * full set of non-excluded fields on the User entity (see backend
 * users/entities/user.entity.ts) needed by the Profile page (Phase 9) and
 * the 2FA page (Phase 8) — everything @Exclude()'d there (password,
 * tokens, lockout counters) never reaches this type in the first place.
 */
export type { AuthUser } from '../api/guards';

/** Mirrors GET /users/me/access's response shape. */
interface AccessInfo {
  roles: string[];
  permissions: string[];
}

const EMPTY_ACCESS: AccessInfo = { roles: [], permissions: [] };

interface AuthContextValue {
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  /** Convenience check against `permissions` — e.g. hasPermission('roles:read'). */
  hasPermission: (permission: string) => boolean;
  isAuthenticated: boolean;
  /** True only during the initial silent-refresh attempt on app load. */
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  /** Revokes the current session on the backend, clears local state, and redirects to "/". */
  logout: () => Promise<void>;
  /**
   * Stores a freshly-obtained access token and loads the current user's
   * profile + roles/permissions. Shared by every flow that ends with "I now
   * have an accessToken and need to become logged in" — password login,
   * the 2FA step, and the OAuth exchange callback — so they can't drift out
   * of sync with each other.
   */
  establishSession: (accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [accessToken, setLocalAccessToken] = useState<string | null>(getAccessToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [access, setAccess] = useState<AccessInfo>(EMPTY_ACCESS);
  const [isLoading, setIsLoading] = useState(true);

  // tokenStore is mutated directly by apiClient's interceptors (background
  // refresh, or forced logout when a refresh ultimately fails) — this keeps
  // React state in sync with those out-of-band changes. This is also what
  // implements "auto-logout on refresh failure": whenever the interceptor
  // gives up and calls setAccessToken(null), this listener clears `user`
  // (and now `access`) too, so isAuthenticated flips to false without any
  // extra plumbing.
  useEffect(() => {
    return subscribeToAccessToken((token) => {
      setLocalAccessToken(token);
      if (!token) {
        setUser(null);
        setAccess(EMPTY_ACCESS);
      }
    });
  }, []);

  async function loadAccess(): Promise<void> {
    try {
      const response = await apiClient.get<unknown>('/users/me/access');

      if (!isUserAccess(response.data)) {
        throw new Error('Unexpected access response');
      }

      setAccess({
        roles: response.data.roles,
        permissions: response.data.permissions,
      });
    } catch {
      setAccess(EMPTY_ACCESS);
    }
  }

  // On first mount: try to restore a session from the httpOnly
  // refresh_token cookie. The access token only ever lives in memory
  // (see tokenStore.ts), so it's gone after every full page reload —
  // without this, an already-logged-in user would see a login screen
  // flash on every refresh.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await refreshAccessToken();
        if (cancelled) return;
        const me = await apiClient.get<unknown>('/users/me');
        if (cancelled) return;
        if (!isAuthUser(me.data)) {
          throw new Error('Unexpected user response');
        }
        setUser(me.data);
        await loadAccess();
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          setAccess(EMPTY_ACCESS);
        }
      } finally {
         if (!cancelled) {
        setIsLoading(false);
      }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function establishSession(newAccessToken: string): Promise<void> {
    setAccessToken(newAccessToken);

    try {
      const me = await apiClient.get<unknown>('/users/me');

      if (!isAuthUser(me.data)) {
        throw new Error('Unexpected user response');
      }

      setUser(me.data);
      await loadAccess();
    } catch (error: unknown) {
      // لا نحتفظ بجلسة محلية غير مكتملة عند فشل تحميل المستخدم.
      setAccessToken(null);
      setUser(null);
      setAccess(EMPTY_ACCESS);
      throw error;
    }
  }

  async function logout(): Promise<void> {
    try {
      // Reads the refresh_token cookie server-side to revoke that one
      // session; the bearer access token (attached automatically by
      // apiClient's request interceptor) identifies the caller.
      await apiClient.post('/auth/logout');
    } catch {
      // Even if this fails (network issue, session already gone, etc.)
      // there's nothing more the user can do about it — proceed to clear
      // local state regardless so the UI still reflects "logged out".
    } finally {
      setAccessToken(null); // subscribeToAccessToken listener above clears `user`/`access`
      navigate('/');
    }
  }

  function hasPermission(permission: string): boolean {
    return access.permissions.includes(permission);
  }

  const value: AuthContextValue = {
    user,
    roles: access.roles,
    permissions: access.permissions,
    hasPermission,
    isAuthenticated: !!accessToken && !!user,
    isLoading,
    setUser,
    logout,
    establishSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
