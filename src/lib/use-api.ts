"use client";

import { useCallback, useEffect, useState } from "react";

interface Result<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Minimal read hook over `api.*`. Enough for a mock-backed frontend; swap the
 * body for TanStack Query if you later need caching, retries or invalidation —
 * every call site keeps the same `{ data, error, loading, reload }` shape.
 *
 * Previous data stays on screen while a new request is in flight
 * (stale-while-revalidate), so filter changes don't flash an empty table.
 *
 * `reload()` is what every write path calls once it succeeds: without it a saved
 * change only appears after a manual refresh, which reads as the save having
 * done nothing.
 */
export function useApi<T>(fn: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<Result<T>>({ data: null, error: null });
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    // Promise.resolve().then() so functions that throw synchronously land here too.
    Promise.resolve()
      .then(fn)
      .then(
        (data) => alive && setState({ data, error: null }),
        (error: Error) => alive && setState({ data: null, error }),
      );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { ...state, loading: state.data === null && state.error === null, reload };
}
