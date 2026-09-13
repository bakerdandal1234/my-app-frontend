import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient, refreshAccessToken } from '../api/client';
import { setAccessToken } from '../api/tokenStore';
import { getErrorMessage } from '../api/errors';
import { useAuth } from '../auth/AuthContext';

/** Mirrors SafeSession from the backend's session.controller.ts. */
interface SessionItem {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt: string;
  revokedAt?: string;
}

function formatDate(value?: string): string {
  return value ? new Date(value).toLocaleString() : '—';
}

function SessionsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  async function loadSessions() {
    setError(null);
    try {
      const res = await apiClient.get<SessionItem[]>('/sessions');
      setSessions(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    setError(null);
    try {
      await apiClient.delete(`/sessions/${id}`);
      await loadSessions();

      // There's no way to tell in advance whether the session we just
      // revoked was this browser's own session (the API doesn't expose
      // that) — so instead of guessing, verify directly: try a silent
      // refresh. The current access token stays valid for a while
      // regardless (revoking a session only invalidates its refresh
      // token), so without this check the user would appear to still be
      // logged in until their next reload or token refresh silently
      // failed. If the refresh fails, this WAS our session — log out
      // immediately instead of leaving the user in a stale, confusing
      // "looks logged in but isn't" state.
      try {
        await refreshAccessToken();
      } catch {
        setAccessToken(null);
        navigate('/login');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeAll() {
    setRevokingAll(true);
    setError(null);
    try {
      await apiClient.delete('/sessions');
      // This always includes the session we're currently using (there's no
      // way to tell which list entry is "this browser" — the API doesn't
      // expose that), so there's nothing left to reconcile: just sign out
      // locally too. logout() will also try POST /auth/logout, which may
      // harmlessly fail since the session is already gone — its `finally`
      // still clears local state either way.
      await logout();
    } catch (err) {
      setError(getErrorMessage(err));
      setRevokingAll(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Sessions</h1>
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            Back to home
          </Link>
        </div>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {sessions === null && !error && <p className="text-slate-500">Loading sessions…</p>}

        {sessions && sessions.length === 0 && <p className="text-slate-500">No sessions found.</p>}

        {sessions && sessions.length > 0 && (
          <>
            <ul className="divide-y divide-slate-200">
              {sessions.map((session) => {
                const isRevoked = !!session.revokedAt;
                return (
                  <li key={session.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {session.userAgent ?? 'Unknown device'}
                      </p>
                      <p className="text-xs text-slate-500">
                        IP: {session.ipAddress ?? 'Unknown'} · Created: {formatDate(session.createdAt)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Last used: {formatDate(session.lastUsedAt)} · Expires:{' '}
                        {formatDate(session.expiresAt)}
                      </p>
                      <p className={`text-xs font-medium ${isRevoked ? 'text-red-600' : 'text-green-600'}`}>
                        {isRevoked ? `Revoked ${formatDate(session.revokedAt)}` : 'Active'}
                      </p>
                    </div>
                    {!isRevoked && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(session.id)}
                        disabled={revokingId === session.id}
                        className="shrink-0 rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {revokingId === session.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {sessions.some((s) => !s.revokedAt) && (
              <button
                type="button"
                onClick={handleRevokeAll}
                disabled={revokingAll}
                className="w-full rounded bg-red-600 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {revokingAll ? 'Revoking all…' : 'Revoke all sessions (log out everywhere)'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SessionsPage;
