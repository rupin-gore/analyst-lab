import { useCallback, useEffect, useState } from 'react';
import type { DataRef } from '../content/types';
import { loadTables, runQuery } from '../engines/duckdb';
import type { ResultSet } from '../graders/types';

export type EngineStatus = 'loading' | 'ready' | 'busy' | 'error';

/** Boots DuckDB-WASM (lazily, on the first SQL page) and loads the lab's tables. */
export function useSql(refs: DataRef[]) {
  const [status, setStatus] = useState<EngineStatus>('loading');
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    loadTables(refs)
      .then(() => !cancelled && setStatus('ready'))
      .catch((e) => {
        if (cancelled) return;
        setBootError(String(e));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [refs]);

  const run = useCallback(async (sql: string): Promise<ResultSet> => {
    setStatus('busy');
    try {
      return await runQuery(sql);
    } finally {
      setStatus('ready');
    }
  }, []);

  /** Reloads clean tables, then runs the reference and the learner's query. */
  const runBoth = useCallback(
    async (reference: string, mine: string): Promise<{ expected: ResultSet; actual: ResultSet }> => {
      setStatus('busy');
      try {
        await loadTables(refs);
        const expected = await runQuery(reference);
        await loadTables(refs);
        const actual = await runQuery(mine);
        return { expected, actual };
      } finally {
        setStatus('ready');
      }
    },
    [refs],
  );

  return { status, bootError, run, runBoth };
}
