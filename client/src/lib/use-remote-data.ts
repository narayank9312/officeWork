import { useCallback, useEffect, useState } from 'react';

interface RemoteData<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  retry: () => void;
}

export function useRemoteData<T>(loader: (signal: AbortSignal) => Promise<T>): RemoteData<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    loader(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : 'Something went wrong.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [loader, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { data, error, loading, retry };
}
