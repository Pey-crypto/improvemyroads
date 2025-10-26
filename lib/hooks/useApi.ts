"use client";

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

export function useApi<T>(url: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetcher = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const method = (options?.method || 'GET').toUpperCase();
      let res: T;
      if (method === 'GET') {
        res = await api.get<T>(url);
      } else if (method === 'POST') {
        res = await api.post<T>(url, (options as RequestInit | undefined)?.body as unknown);
      } else if (method === 'PUT') {
        res = await api.put<T>(url, (options as RequestInit | undefined)?.body as unknown);
      } else if (method === 'DELETE') {
        res = await api.delete<T>(url);
      } else {
        res = await api.get<T>(url);
      }
      setData(res);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error('Request failed');
      setError(err);
      toast.error(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetcher();
  }, [fetcher, url]);

  return { data, loading, error, refetch: fetcher } as const;
}
