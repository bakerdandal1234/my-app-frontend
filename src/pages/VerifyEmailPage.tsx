import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, Spinner } from '@heroui/react';
import { apiClient } from '../api/client';
import { getErrorMessage } from '../api/errors';

type Status = 'loading' | 'success' | 'error';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await apiClient.get<{ message?: string }>('/auth/verify-email', {
          params: { token },
        });
        if (cancelled) return;
        setStatus('success');
        setMessage(res.data?.message ?? 'Your email has been verified.');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage(getErrorMessage(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-sm">
        {status === 'loading' && (
          <Card.Content className="flex flex-col items-center gap-3 py-4">
            <Spinner size="lg" />
            <p className="text-sm text-muted">Verifying your email…</p>
          </Card.Content>
        )}

        {status === 'success' && (
          <>
            <Card.Header>
              <Card.Title>Email verified</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-sm text-muted">{message}</p>
            </Card.Content>
          </>
        )}

        {status === 'error' && (
          <>
            <Card.Header>
              <Card.Title>Verification failed</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {message}
              </p>
            </Card.Content>
          </>
        )}

        <Card.Footer>
          <Link to="/" className="text-sm text-accent hover:underline">
            Back to home
          </Link>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default VerifyEmailPage;
