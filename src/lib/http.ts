// Tiny data-fetching helpers on top of the shared axios client (which already handles the access
// token, silent refresh and cookies). Used by the account, seller and admin screens.
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/api';
import { friendlyError } from './errors';

export const errorMessage = (err: unknown, fallback?: string): string => friendlyError(err, fallback);

export async function request<T = unknown>(method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, body?: unknown): Promise<T> {
  const res = await api.request({ method, url, data: body });
  return res.data as T;
}

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** GET `url` (skipped when null). `reload()` refetches; changing `url` refetches automatically. */
export function useFetch<T = any>(url: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, loading: !!url, error: null });
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get(url);
      if (id === seq.current) setState({ data: res.data as T, loading: false, error: null });
    } catch (err) {
      if (id === seq.current) setState({ data: null, loading: false, error: errorMessage(err, 'Could not load this page.') });
    }
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}

/** Wraps an async action with loading + toast-friendly error handling. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> => {
    setBusy(true);
    try {
      return { ok: true, value: await fn() };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, run };
}

export const downloadFile = async (url: string, filename: string) => {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
};

export const uploadEvidence = async (files: FileList | File[]): Promise<{ url: string; public_id?: string; mime?: string }[]> => {
  const form = new FormData();
  Array.from(files).forEach((f) => form.append('files', f));
  const res = await api.post('/uploads/evidence', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data.data;
};
