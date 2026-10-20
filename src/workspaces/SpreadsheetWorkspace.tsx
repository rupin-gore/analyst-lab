import { useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBox, Spinner } from '../components/ui';
import { addrOf, buildGrid, colName, Sheet } from '../engines/sheet';
import { gradeSpreadsheet, type SheetValue } from '../graders/spreadsheet';
import { getCsv, getManifest } from '../lib/datasets';
import { loadDraft, saveDraft } from '../lib/progress';
import type { WorkspaceProps } from './types';

function display(v: SheetValue): string {
  if (v === null) return '';
  if (typeof v === 'object') return v.error;
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return String(v);
}

export default function SpreadsheetWorkspace({ lab, storageKey, onGraded, solutionUnlocked }: WorkspaceProps) {
  const spec = lab.grading.spreadsheet!;
  const [csv, setCsv] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>(() => loadDraft(storageKey) ?? {});
  const [selected, setSelected] = useState(spec.targets[0]?.cell ?? 'A1');
  const [bar, setBar] = useState('');
  const barRef = useRef<HTMLInputElement>(null);
  const targets = useMemo(() => new Set(spec.targets.map((t) => t.cell)), [spec.targets]);

  useEffect(() => {
    const ref = lab.data[0];
    getManifest(ref.dataset)
      .then((m) => getCsv(ref.dataset, m.tables[ref.tables[0]].file))
      .then(setCsv)
      .catch((e) => setError(String(e)));
  }, [lab.data]);

  useEffect(() => {
    saveDraft(storageKey, edits);
  }, [storageKey, edits]);

  const sheet = useMemo(() => (csv ? new Sheet(buildGrid(csv, lab.sheetSetup, edits)) : null), [csv, lab.sheetSetup, edits]);
  useEffect(() => () => sheet?.destroy(), [sheet]);

  useEffect(() => {
    if (sheet) setBar(String(sheet.raw(selected) ?? ''));
  }, [sheet, selected]);

  if (error) return <ErrorBox text={error} />;
  if (!sheet || !csv) return <Spinner label="Loading spreadsheet…" />;

  const { rows, cols } = sheet.size();
  const commit = () => {
    if (String(sheet.raw(selected) ?? '') !== bar) setEdits((e) => ({ ...e, [selected]: bar }));
  };

  const submit = () => {
    const reference = new Sheet(buildGrid(csv, lab.sheetSetup, JSON.parse(lab.solution)));
    onGraded(gradeSpreadsheet(sheet, reference, spec));
    reference.destroy();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Click a cell, type a value or a formula (starting with <code>=</code>) in the bar and press Enter. Target cells are highlighted.
      </p>
      <div className="flex items-center gap-2">
        <span className="w-14 rounded bg-slate-100 px-2 py-1.5 text-center font-mono text-xs font-semibold dark:bg-slate-800">{selected}</span>
        <input
          ref={barRef}
          className="input font-mono"
          aria-label={`Formula for cell ${selected}`}
          value={bar}
          onChange={(e) => setBar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder="=SUMIFS(…)"
        />
      </div>
      <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-300 dark:border-slate-700">
        <table className="border-collapse font-mono text-xs" role="grid">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 w-10 border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} className="min-w-24 border border-slate-200 bg-slate-100 px-2 py-1 font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {colName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <th className="sticky left-0 border border-slate-200 bg-slate-100 px-1 text-slate-500 dark:border-slate-700 dark:bg-slate-800">{r + 1}</th>
                {Array.from({ length: cols }, (_, c) => {
                  const a = addrOf(r, c);
                  const v = sheet.value(a);
                  const isSel = a === selected;
                  const isTarget = targets.has(a);
                  return (
                    <td
                      key={c}
                      role="gridcell"
                      aria-selected={isSel}
                      onClick={() => {
                        setSelected(a);
                        barRef.current?.focus();
                      }}
                      className={`max-w-48 cursor-cell truncate border px-2 py-1 ${typeof v === 'number' ? 'text-right' : ''} ${
                        isSel ? 'outline-2 -outline-offset-2 outline-accent-600' : ''
                      } ${isTarget ? 'bg-amber-50 dark:bg-amber-900/30' : r === 0 ? 'bg-slate-50 font-semibold dark:bg-slate-900' : 'bg-white dark:bg-slate-950'} border-slate-200 dark:border-slate-800 ${
                        typeof v === 'object' && v !== null ? 'text-rose-600' : ''
                      }`}
                    >
                      {display(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={submit}>
          Submit for grading
        </button>
        <button className="btn-secondary" onClick={() => setEdits({})}>
          Reset sheet
        </button>
        {solutionUnlocked && (
          <button className="btn-ghost" onClick={() => setEdits((e) => ({ ...e, ...JSON.parse(lab.solution) }))}>
            Load reference formulas
          </button>
        )}
      </div>
    </div>
  );
}
