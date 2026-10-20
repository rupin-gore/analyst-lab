import { useEffect, useRef, useState } from 'react';
import CodeEditor from '../components/CodeEditor';
import { ErrorBox, Spinner } from '../components/ui';
import { python, type CellOutput } from '../engines/pyodide';
import { gradePythonTests } from '../graders/python';
import { absoluteDatasetUrl, getManifest } from '../lib/datasets';
import { loadDraft, saveDraft } from '../lib/progress';
import type { WorkspaceProps } from './types';

interface NbCell {
  id: number;
  code: string;
  output?: CellOutput;
  running?: boolean;
}

let nextId = 1;
const toCells = (codes: string[]): NbCell[] => codes.map((code) => ({ id: nextId++, code }));
/** Starter and solution files split into notebook cells on lines that are exactly "# %%". */
const splitCells = (src: string) => src.split(/^# %%.*$/m).map((s) => s.trim()).filter(Boolean);

export default function PythonWorkspace({ lab, storageKey, onGraded, solutionUnlocked }: WorkspaceProps) {
  const [cells, setCells] = useState<NbCell[]>(() => toCells(loadDraft<string[]>(storageKey) ?? splitCells(lab.starter ?? '# Your code here\n')));
  const [status, setStatus] = useState<'loading' | 'ready' | 'busy' | 'error'>('loading');
  const [loadingText, setLoadingText] = useState('Starting Python…');
  const [bootError, setBootError] = useState<string | null>(null);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;

  useEffect(() => {
    saveDraft(storageKey, cells.map((c) => c.code));
  }, [storageKey, cells]);

  useEffect(() => {
    let cancelled = false;
    const off = python.onStatus(setLoadingText);
    (async () => {
      try {
        const files: { name: string; url: string }[] = [];
        for (const ref of lab.data) {
          const m = await getManifest(ref.dataset);
          for (const t of ref.tables) files.push({ name: t, url: absoluteDatasetUrl(ref.dataset, m.tables[t].file) });
        }
        await python.setFiles(files);
        if (!cancelled) setStatus('ready');
      } catch (e) {
        if (!cancelled) {
          setBootError(String(e));
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
      off();
    };
  }, [lab.data]);

  const update = (id: number, patch: Partial<NbCell>) => setCells((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const runCell = async (id: number) => {
    const cell = cellsRef.current.find((c) => c.id === id);
    if (!cell) return;
    update(id, { running: true });
    setStatus('busy');
    try {
      update(id, { output: await python.run(cell.code), running: false });
    } catch (e) {
      update(id, { output: { stdout: '', display: null, error: String(e) }, running: false });
    } finally {
      setStatus('ready');
    }
  };

  const runAll = async () => {
    await python.reset();
    for (const c of cellsRef.current) await runCell(c.id);
  };

  const submit = async () => {
    setStatus('busy');
    try {
      const res = await python.test(cellsRef.current.map((c) => c.code), lab.tests!);
      const grade = gradePythonTests(res.tests);
      if (res.errors.length) grade.details.unshift(...res.errors);
      onGraded(grade);
    } catch (e) {
      onGraded({ passed: false, summary: 'Grading failed to run.', details: [String(e)] });
    } finally {
      setStatus('ready');
    }
  };

  if (status === 'loading') return <Spinner label={loadingText} />;
  if (status === 'error') return <ErrorBox text={`Could not start Python: ${bootError}`} />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Tables are preloaded as DataFrames ({lab.data.flatMap((d) => d.tables).join(', ')}). <code>pd</code> and <code>np</code> are imported. Cells share
        variables, like Jupyter.
      </p>
      {cells.map((c, i) => (
        <div key={c.id} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono">In [{i + 1}]</span>
            <span className="flex gap-1">
              <button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => runCell(c.id)} disabled={status !== 'ready'} aria-label={`Run cell ${i + 1}`}>
                ▶ Run
              </button>
              {cells.length > 1 && (
                <button className="btn-ghost px-2 py-0.5 text-xs" onClick={() => setCells((cs) => cs.filter((x) => x.id !== c.id))} aria-label={`Delete cell ${i + 1}`}>
                  ✕
                </button>
              )}
            </span>
          </div>
          <CodeEditor
            value={c.code}
            onChange={(v) => update(c.id, { code: v })}
            language="python"
            onRun={() => runCell(c.id)}
            ariaLabel={`Python cell ${i + 1}`}
            height={Math.min(320, Math.max(90, c.code.split('\n').length * 20 + 24))}
          />
          {c.running && <p className="text-xs text-slate-500">Running…</p>}
          {c.output && (
            <div className="space-y-1">
              {c.output.stdout && <pre className="overflow-auto rounded bg-slate-100 p-2 font-mono text-xs dark:bg-slate-900">{c.output.stdout}</pre>}
              {c.output.display?.kind === 'text' && (
                <pre className="overflow-auto rounded bg-slate-100 p-2 font-mono text-xs dark:bg-slate-900">{c.output.display.text}</pre>
              )}
              {c.output.display?.kind === 'html' && (
                // pandas to_html escapes cell contents; this is the learner's own data.
                <div className="df-output max-h-80 overflow-auto" dangerouslySetInnerHTML={{ __html: c.output.display.text }} />
              )}
              {c.output.error && <ErrorBox text={c.output.error} />}
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={() => setCells((cs) => [...cs, ...toCells([''])])}>
          + Cell
        </button>
        <button className="btn-secondary" onClick={runAll} disabled={status !== 'ready'}>
          Run all
        </button>
        <button className="btn-primary" onClick={submit} disabled={status !== 'ready'}>
          Submit for grading
        </button>
        {solutionUnlocked && (
          <button className="btn-ghost" onClick={() => setCells(toCells(splitCells(lab.solution)))}>
            Load reference solution
          </button>
        )}
        {status === 'busy' && <span className="text-sm text-slate-500">Running…</span>}
      </div>
    </div>
  );
}
