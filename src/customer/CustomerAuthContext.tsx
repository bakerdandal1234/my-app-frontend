import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  customerApi,
  refreshCustomerAccessToken,
} from './api/customerClient';
import {
  getCustomerAccessToken,
  setCustomerAccessToken,
  subscribeToCustomerAccessToken,
} from './api/customerTokenStore';

/** Mirrors the backend's CustomerPrincipal (GET /customer/auth/me). */
export interface CustomerAccount {
  accountId: string;
  customerId: string;
  sessionId: string;
  email: string;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
}

function isCustomerAccount(data: unknown): data is CustomerAccount {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const value = data as Record<string, unknown>;

  return (
    typeof value.accountId === 'string' &&
    typeof value.customerId === 'string' &&
    typeof value.sessionId === 'string' &&
    typeof value.email === 'string' &&
    typeof value.isEmailVerified === 'boolean' &&
    typeof value.isTwoFactorEnabled === 'boolean'
  );
}

interface CustomerAuthContextValue {
  account: CustomerAccount | null;
  isAuthenticated: boolean;
  /** True only during the initial silent-refresh attempt on mount. */
  isLoading: boolean;
  /**
   * "I now hold a customer access token" — used by the OAuth callback page
   * and by the 2FA step, so both end up in exactly the same state.
   */
  establishSession: (accessToken: string) => Promise<void>;
  refreshAccount: () => Promise<void>;
  logout: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(
  undefined,
);

/**
 * Provides the customer session. Mounted only under the /customer routes so
 * that browsing the staff side never fires a customer refresh call (and
 * vice versa) — the two sessions are independent and can be held at the
 * same time in one browser.
 */
export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // On the callback page the session is established by redeeming the code,
  // so a silent refresh there would be a guaranteed 401 (no refresh cookie
  // exists yet) racing the exchange that is about to create one.
  const isCallbackPage = pathname.endsWith('/oauth/callback');
  const [accessToken, setLocalAccessToken] = useState<string | null>(
    getCustomerAccessToken(),
  );
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keeps React in sync with out-of-band changes made by the interceptors
  // (a background refresh, or a forced logout when refreshing finally fails).
  useEffect(() => {
    return subscribeToCustomerAccessToken((token) => {
      setLocalAccessToken(token);

      if (!token) {
        setAccount(null);
      }
    });
  }, []);

  const loadAccount = useCallback(async (): Promise<void> => {
    const response = await customerApi.get<unknown>('/customer/auth/me');

    if (!isCustomerAccount(response.data)) {
      throw new Error('Unexpected account response');
    }

    setAccount(response.data);
  }, []);

  const establishSession = useCallback(
    async (newAccessToken: string): Promise<void> => {
      setCustomerAccessToken(newAccessToken);
      await loadAccount();
    },
    [loadAccount],
  );

  // On mount: try to restore the session from the httpOnly refresh cookie.
  useEffect(() => {
    if (isCallbackPage) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await refreshCustomerAccessToken();

        if (cancelled) return;

        await loadAccount();
      } catch {
        // No valid customer session cookie. Expected for a visitor who has
        // not signed in yet — not an error worth surfacing.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadAccount, isCallbackPage]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await customerApi.post('/customer/auth/logout');
    } catch {
      // Nothing the customer can do about a failed revoke; clear locally
      // regardless so the UI reflects "signed out".
    } finally {
      setCustomerAccessToken(null);
      navigate('/customer/login', { replace: true });
    }
  }, [navigate]);

  const value: CustomerAuthContextValue = {
    account,
    isAuthenticated: !!accessToken && !!account,
    isLoading,
    establishSession,
    refreshAccount: loadAccount,
    logout,
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const context = useContext(CustomerAuthContext);

  if (!context) {
    throw new Error(
      'useCustomerAuth must be used within a CustomerAuthProvider',
    );
  }

  return context;
}
