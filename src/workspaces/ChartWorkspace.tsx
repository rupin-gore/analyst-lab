import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell as PieCell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import CodeEditor from '../components/CodeEditor';
import { ErrorBox, ResultTable, Spinner } from '../components/ui';
import type { ChartType } from '../content/types';
import { gradeChart, type ChartSelection } from '../graders/chart';
import type { ResultSet } from '../graders/types';
import { loadDraft, saveDraft } from '../lib/progress';
import type { WorkspaceProps } from './types';
import { useSql } from './useSql';

const TYPES: ChartType[] = ['bar', 'line', 'area', 'pie', 'scatter'];
/** Indian-style compact numbers: 1.2L, 3.4Cr. */
const compactInr = (v: number) =>
  Math.abs(v) >= 1e7 ? `${(v / 1e7).toFixed(1)}Cr` : Math.abs(v) >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(v);

const PIE_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#64748b'];

interface Draft {
  code: string;
  sel: ChartSelection;
}

export default function ChartWorkspace({ lab, storageKey, onGraded, solutionUnlocked }: WorkspaceProps) {
  const draft = loadDraft<Draft>(storageKey);
  const [code, setCode] = useState(draft?.code ?? lab.starter ?? '-- Write the query that feeds your chart\n');
  const [sel, setSel] = useState<ChartSelection>(draft?.sel ?? { type: 'bar', x: '', y: '' });
  const [result, setResult] = useState<ResultSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { status, bootError, run, runBoth } = useSql(lab.data);

  useEffect(() => {
    saveDraft(storageKey, { code, sel });
  }, [storageKey, code, sel]);

  const onRun = useCallback(async () => {
    if (status !== 'ready') return;
    setError(null);
    try {
      const r = await run(code);
      setResult(r);
      setSel((s) => ({
        ...s,
        x: r.columns.includes(s.x) ? s.x : (r.columns[0] ?? ''),
        y: r.columns.includes(s.y) ? s.y : (r.columns[1] ?? ''),
      }));
    } catch (e) {
      setResult(null);
      setError(String((e as Error).message ?? e));
    }
  }, [code, run, status]);

  const data = useMemo(() => {
    if (!result) return [];
    const xi = result.columns.indexOf(sel.x);
    const yi = result.columns.indexOf(sel.y);
    if (xi < 0 || yi < 0) return [];
    return result.rows.map((r) => ({ x: r[xi] as string | number, y: Number(r[yi]) }));
  }, [result, sel.x, sel.y]);

  const onSubmit = async () => {
    setError(null);
    try {
      const { expected, actual } = await runBoth(lab.solution, code);
      setResult(actual);
      const s = { ...sel };
      if (!actual.columns.includes(s.x)) s.x = actual.columns[0] ?? '';
      if (!actual.columns.includes(s.y)) s.y = actual.columns[1] ?? '';
      setSel(s);
      onGraded(gradeChart(expected, actual, s, lab.grading.chart!));
    } catch (e) {
      setError(String((e as Error).message ?? e));
      onGraded({ passed: false, summary: 'Your query raised an error.', details: [] });
    }
  };

  if (status === 'loading') return <Spinner label="Starting the SQL engine (DuckDB) and loading tables…" />;
  if (status === 'error') return <ErrorBox text={`Could not start DuckDB: ${bootError}`} />;

  const axisColor = '#94a3b8';
  return (
    <div className="space-y-3">
      <CodeEditor value={code} onChange={setCode} language="sql" onRun={onRun} ariaLabel="SQL editor" height={200} />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={onRun} disabled={status !== 'ready'}>
          ▶ Run <kbd className="ml-1 text-xs text-slate-400">Ctrl+Enter</kbd>
        </button>
        <button className="btn-primary" onClick={onSubmit} disabled={status !== 'ready' || !result}>
          Submit chart for grading
        </button>
        {solutionUnlocked && (
          <button className="btn-ghost" onClick={() => setCode(lab.solution)}>
            Load reference query
          </button>
        )}
      </div>
      {error && <ErrorBox text={error} />}
      {result && (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Chart type</span>
              <select className="input" value={sel.type} onChange={(e) => setSel({ ...sel, type: e.target.value as ChartType })}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{sel.type === 'pie' ? 'Slice label' : 'X axis'}</span>
              <select className="input" value={sel.x} onChange={(e) => setSel({ ...sel, x: e.target.value })}>
                {result.columns.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">{sel.type === 'pie' ? 'Slice size' : 'Y axis'}</span>
              <select className="input" value={sel.y} onChange={(e) => setSel({ ...sel, y: e.target.value })}>
                {result.columns.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="card h-72 p-2" aria-label={`${sel.type} chart of ${sel.y} by ${sel.x}`} role="img">
            <ResponsiveContainer width="100%" height="100%">
              {sel.type === 'line' ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f033" />
                  <XAxis dataKey="x" stroke={axisColor} fontSize={11} />
                  <YAxis stroke={axisColor} fontSize={11} width={60} tickFormatter={compactInr} />
                  <Tooltip />
                  <Line dataKey="y" stroke="#0d9488" strokeWidth={2} dot={false} name={sel.y} />
                </LineChart>
              ) : sel.type === 'area' ? (
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f033" />
                  <XAxis dataKey="x" stroke={axisColor} fontSize={11} />
                  <YAxis stroke={axisColor} fontSize={11} width={60} tickFormatter={compactInr} />
                  <Tooltip />
                  <Area dataKey="y" stroke="#0d9488" fill="#0d948855" name={sel.y} />
                </AreaChart>
              ) : sel.type === 'pie' ? (
                <PieChart>
                  <Tooltip />
                  <Pie data={data} dataKey="y" nameKey="x" outerRadius="80%">
                    {data.map((_, i) => (
                      <PieCell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : sel.type === 'scatter' ? (
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f033" />
                  <XAxis dataKey="x" stroke={axisColor} fontSize={11} />
                  <YAxis dataKey="y" stroke={axisColor} fontSize={11} width={60} tickFormatter={compactInr} />
                  <Tooltip />
                  <Scatter data={data} fill="#0d9488" />
                </ScatterChart>
              ) : (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f033" />
                  <XAxis dataKey="x" stroke={axisColor} fontSize={11} />
                  <YAxis stroke={axisColor} fontSize={11} width={60} tickFormatter={compactInr} />
                  <Tooltip />
                  <Bar dataKey="y" fill="#0d9488" name={sel.y} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-medium">Query result</summary>
            <div className="mt-2">
              <ResultTable result={result} />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
