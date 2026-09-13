import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import FullPageLoading from '../ui/FullPageLoading';

/**
 * Lands here after the backend's Google/GitHub callback redirects to
 * FRONTEND_URL/oauth/callback?code=... (see backend README "OAuth"). Only
 * an opaque, short-lived, single-use code is in the URL — never an
 * access/refresh token. The refresh_token/csrf_token cookies were already
 * set by that redirect, so this page's only job is exchanging the code for
 * an access token.
 */
function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const navigate = useNavigate();
  const { establishSession } = useAuth();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('This sign-in link is missing its code.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await apiClient.post<{ accessToken: string }>('/auth/oauth/exchange', {
          code,
        });
        if (cancelled) return;
        await establishSession(res.data.accessToken);
        navigate('/');
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      }
    })();

    return () => {
      cancelled = true;
    };
    // establishSession/navigate are stable across renders (from context /
    // react-router); only `code` actually changing should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-bold text-slate-800">Sign-in failed</h1>
          <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
          <Link to="/login" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return <FullPageLoading label="Signing you in…" />;
}

export default OAuthCallbackPage;
