import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/errors';
import { getAuthVersion, subscribeToAccessToken } from '../../api/tokenStore';
import { useAuth } from '../AuthContext';
import { exchangeOAuthCode, verifyTwoFactorLogin } from '../api';

interface OAuthFlow {
  version: number;
  active: boolean;
  submitting: boolean;
  expectedToken: string | null;
}

interface OAuthState {
  status: 'loading' | 'challenge' | 'error' | 'success';
  error: string | null;
  canRetry: boolean;
}

interface ExchangeRequest {
  code: string;
  version: number;
  promise: ReturnType<typeof exchangeOAuthCode>;
}

function isCurrentFlow(flow: OAuthFlow, active: OAuthFlow | null): boolean {
  return flow === active && flow.active && flow.version === getAuthVersion();
}

export function useOAuthCallback(code: string | null, needsTwoFactor: boolean) {
  const navigate = useNavigate();
  const { establishSession, isLoading } = useAuth();
  const callbacks = useRef({ establishSession, navigate });
  const activeFlow = useRef<OAuthFlow | null>(null);
  const exchangeRequest = useRef<ExchangeRequest | null>(null);
  const [ready, setReady] = useState(!isLoading);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<OAuthState>({
    status: 'loading', error: null, canRetry: false,
  });

  useEffect(() => {
    callbacks.current = { establishSession, navigate };
  }, [establishSession, navigate]);

  // Wait for the initial silent refresh, but do not restart our own sign-in.
  useEffect(() => {
    if (!isLoading) setReady(true);
  }, [isLoading]);

  const finishSignIn = useCallback(async (flow: OAuthFlow, accessToken: string) => {
    if (!isCurrentFlow(flow, activeFlow.current)) return;
    // establishSession publishes its token synchronously, before loading /me.
    flow.expectedToken = accessToken;
    const establishing = callbacks.current.establishSession(accessToken);
    flow.expectedToken = null;
    await establishing;
    if (!isCurrentFlow(flow, activeFlow.current)) return;
    setState({ status: 'success', error: null, canRetry: false });
    callbacks.current.navigate('/home', { replace: true });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const flow: OAuthFlow = {
      version: getAuthVersion(), active: true, submitting: false, expectedToken: null,
    };
    activeFlow.current = flow;
    const unsubscribe = subscribeToAccessToken((token) => {
      const version = getAuthVersion();
      if (!flow.active || version === flow.version) return;
      if (flow.expectedToken !== null && token === flow.expectedToken && version === flow.version + 1) {
        flow.version = version;
        flow.expectedToken = null;
        return;
      }
      flow.active = false;
      setState({
        status: 'error',
        error: 'Your session changed. Please start signing in again.',
        canRetry: false,
      });
    });

    if (needsTwoFactor) {
      setState({ status: 'challenge', error: null, canRetry: false });
    } else if (!code) {
      setState({ status: 'error', error: 'This sign-in link is missing its code.', canRetry: false });
    } else {
      setState({ status: 'loading', error: null, canRetry: false });
      // Keep one promise for this code/version across StrictMode effect replay.
      if (exchangeRequest.current?.code !== code || exchangeRequest.current.version !== flow.version) {
        exchangeRequest.current = { code, version: flow.version, promise: exchangeOAuthCode(code) };
      }
      const request = exchangeRequest.current;
      void (async () => {
        try {
          const response = await request.promise;
          await finishSignIn(flow, response.accessToken);
        } catch (error: unknown) {
          if (isCurrentFlow(flow, activeFlow.current)) {
            setState({ status: 'error', error: getErrorMessage(error), canRetry: true });
          }
        }
      })();
    }

    return () => {
      flow.active = false;
      unsubscribe();
      if (activeFlow.current === flow) activeFlow.current = null;
    };
  }, [code, needsTwoFactor, ready, attempt, finishSignIn]);

  async function submitTwoFactor(authenticationCode: string): Promise<void> {
    const flow = activeFlow.current;
    if (!flow || !needsTwoFactor || flow.submitting || !isCurrentFlow(flow, activeFlow.current)) return;
    flow.submitting = true;
    setState({ status: 'challenge', error: null, canRetry: false });
    try {
      const response = await verifyTwoFactorLogin(authenticationCode);
      await finishSignIn(flow, response.accessToken);
    } catch (error: unknown) {
      if (isCurrentFlow(flow, activeFlow.current)) {
        setState({ status: 'challenge', error: getErrorMessage(error), canRetry: false });
      }
    } finally {
      flow.submitting = false;
    }
  }

  function retry(): void {
    const flow = activeFlow.current;
    if (!flow || !state.canRetry || !isCurrentFlow(flow, activeFlow.current)) return;
    flow.active = false;
    exchangeRequest.current = null;
    setState({ status: 'loading', error: null, canRetry: false });
    setAttempt((value) => value + 1);
  }

  function cancel(): void {
    if (activeFlow.current) activeFlow.current.active = false;
    callbacks.current.navigate('/login', { replace: true });
  }

  return { ...state, submitTwoFactor, retry, cancel };
}
