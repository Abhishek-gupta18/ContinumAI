import { useCallback, useEffect, useRef, useState } from 'react';
import { getMyProviders, putMyProvider, deleteMyProvider, putMyProviderOrder } from '../../api/endpoints';
import { ApiError } from '../../api/http';
import type { ProviderKeyRow } from '../../api/types';
import { buildPutBody, describeApiError, moveItem, type ProviderFormValues } from './logic';

export type PageStatus = 'loading' | 'ready' | 'error';

export interface ProviderKeysHook {
  status: PageStatus;
  pageError: string;
  rows: ProviderKeyRow[];
  actionError: string;
  pending: boolean;
  disarm: () => void;
  refresh: () => Promise<void>;
  create: (values: ProviderFormValues) => Promise<boolean>;
  update: (name: string, values: ProviderFormValues, original: { label: string; model: string; base_url: string | null; enabled: boolean }) => Promise<boolean>;
  remove: (name: string) => Promise<boolean>;
  setEnabled: (row: ProviderKeyRow, enabled: boolean) => Promise<void>;
  reorder: (index: number, delta: -1 | 1) => Promise<void>;
}

export function useProviderKeys(): ProviderKeysHook {
  const [status, setStatus] = useState<PageStatus>('loading');
  const [pageError, setPageError] = useState('');
  const [rows, setRows] = useState<ProviderKeyRow[]>([]);
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState(false);
  const rowsRef = useRef<ProviderKeyRow[]>([]);
  rowsRef.current = rows;

  const refresh = useCallback(async () => {
    try {
      const resp = await getMyProviders();
      setRows(resp.providers);
      setStatus('ready');
      setPageError('');
    } catch (err) {
      // 401 is left to the global handler; anything else is a page state.
      setStatus('error');
      setPageError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (work: () => Promise<unknown>): Promise<boolean> => {
      setPending(true);
      setActionError('');
      try {
        await work();
        await refresh();
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return false; // global handler signs out
        }
        setActionError(describeApiError(err));
        return false;
      } finally {
        setPending(false);
      }
    },
    [refresh],
  );

  const create = useCallback(
    (values: ProviderFormValues) => run(() => putMyProvider(values.name, buildPutBody(values, 'create'))),
    [run],
  );

  const update = useCallback(
    (name: string, values: ProviderFormValues, original: { label: string; model: string; base_url: string | null; enabled: boolean }) =>
      run(() => putMyProvider(name, buildPutBody(values, 'edit', original))),
    [run],
  );

  const remove = useCallback((name: string) => run(() => deleteMyProvider(name)), [run]);

  const setEnabled = useCallback(
    async (row: ProviderKeyRow, enabled: boolean) => {
      await run(() => putMyProvider(row.name, { kind: row.kind, enabled }));
    },
    [run],
  );

  const reorder = useCallback(
    async (index: number, delta: -1 | 1) => {
      const names = rowsRef.current.map((r) => r.name);
      const order = moveItem(names, index, delta);
      if (order[index] === names[index]) return;
      await run(() => putMyProviderOrder(order));
    },
    [run],
  );

  const disarm = useCallback(() => setActionError(''), []);

  return {
    status,
    pageError,
    rows,
    actionError,
    pending,
    disarm,
    refresh,
    create,
    update,
    remove,
    setEnabled,
    reorder,
  };
}
