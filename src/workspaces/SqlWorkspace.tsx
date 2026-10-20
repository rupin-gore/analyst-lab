import { useCallback, useEffect, useState } from 'react';
import CodeEditor from '../components/CodeEditor';
import { ErrorBox, ResultTable, Spinner } from '../components/ui';
import { compareResults } from '../graders/sql';
import type { ResultSet } from '../graders/types';
import { loadDraft, saveDraft } from '../lib/progress';
import type { WorkspaceProps } from './types';
import { useSql } from './useSql';

export default function SqlWorkspace({ lab, storageKey, onGraded, solutionUnlocked }: WorkspaceProps) {
  const [code, setCode] = useState<string>(() => loadDraft<string>(storageKey) ?? lab.starter ?? '-- Write your query here\n');
  const [result, setResult] = useState<ResultSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { status, bootError, run, runBoth } = useSql(lab.data);

  useEffect(() => {
    saveDraft(storageKey, code);
  }, [storageKey, code]);

  const onRun = useCallback(async () => {
    if (status !== 'ready') return;
    setError(null);
    try {
      setResult(await run(code));
    } catch (e) {
      setResult(null);
      setError(String((e as Error).message ?? e));
    }
  }, [code, run, status]);

  const onSubmit = async () => {
    setError(null);
    try {
      const { expected, actual } = await runBoth(lab.solution, code);
      setResult(actual);
      onGraded(compareResults(expected, actual, lab.grading.sql));
    } catch (e) {
      setError(String((e as Error).message ?? e));
      onGraded({ passed: false, summary: 'Your query raised an error.', details: ['Fix the error shown under the editor, then submit again.'] });
    }
  };

  if (status === 'loading') return <Spinner label="Starting the SQL engine (DuckDB) and loading tables…" />;
  if (status === 'error') return <ErrorBox text={`Could not start DuckDB: ${bootError}`} />;

  return (
    <div className="space-y-3">
      <CodeEditor value={code} onChange={setCode} language="sql" onRun={onRun} ariaLabel="SQL editor" height={280} />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={onRun} disabled={status !== 'ready'}>
          ▶ Run <kbd className="ml-1 text-xs text-slate-400">Ctrl+Enter</kbd>
        </button>
        <button className="btn-primary" onClick={onSubmit} disabled={status !== 'ready'}>
          Submit for grading
        </button>
        {solutionUnlocked && (
          <button className="btn-ghost" onClick={() => setCode(lab.solution)}>
            Load reference solution
          </button>
        )}
        {status === 'busy' && <span className="text-sm text-slate-500">Running…</span>}
      </div>
      {error && <ErrorBox text={error} />}
      {result && <ResultTable result={result} />}
    </div>
  );
}
