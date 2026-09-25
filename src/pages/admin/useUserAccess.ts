import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import { isUserAccess, type UserAccess } from '../../api/guards';

interface UseUserAccessResult {
  access: UserAccess | null;
  accessError: string | null;
  isMutating: boolean;
  /**
   * Runs `mutation` (an assign/remove-role call), then reloads access on
   * success. Returns whether it succeeded, so the caller can show its own
   * toast with the right message (the hook doesn't know "assigned" from
   * "removed").
   */
  mutate: (mutation: () => Promise<unknown>) => Promise<boolean>;
}

/**
 * Loads GET /authorization/users/:userId/access for one user and exposes
 * a mutate() for role assign/remove that reloads it afterward.
 *
 * Only meant to be used by a component that mounts for exactly one userId
 * and unmounts when the access panel closes or switches to a different
 * user (see AdminUserRow) — that mount/unmount boundary is what used to
 * be tracked by hand with four refs (selectionRef, accessRequestIdRef,
 * mutationPendingRef, mountedRef) in the original single-page version.
 * Here, closing/switching the panel unmounts this hook's component, which
 * aborts the in-flight request via AbortController and drops any state
 * update that would otherwise land on a closed or stale panel.
 */
export function useUserAccess(userId: string): UseUserAccessResult {
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  // Guards against a double-click firing a second mutation while the
  // first is still in flight (isMutating alone can't, since it's only
  // visible after the next render).
  const mutationPendingRef = useRef(false);

  const load = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      setAccess(null);
      setAccessError(null);

      try {
        const response = await apiClient.get<unknown>(
          `/authorization/users/${userId}/access`,
          { signal },
        );

        if (
          !isUserAccess(response.data) ||
          response.data.userId !== userId
        ) {
          throw new Error('Unexpected user access response');
        }

        setAccess(response.data);
      } catch (err: unknown) {
        if (signal.aborted) return;
        setAccessError(getErrorMessage(err));
      }
    },
    [userId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    return () => {
      controller.abort();
    };
  }, [load]);

  const mutate = useCallback(
    async (mutation: () => Promise<unknown>): Promise<boolean> => {
      if (mutationPendingRef.current) return false;

      mutationPendingRef.current = true;
      setIsMutating(true);
      setAccessError(null);

      try {
        await mutation();

        const controller = new AbortController();
        await load(controller.signal);

        return true;
      } catch (err: unknown) {
        setAccessError(getErrorMessage(err));
        return false;
      } finally {
        mutationPendingRef.current = false;
        setIsMutating(false);
      }
    },
    [load],
  );

  return { access, accessError, isMutating, mutate };
}
