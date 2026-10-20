import { useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Difficulty } from '../content/types';
import type { Cell, GradeResult, ResultSet } from '../graders/types';

export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div className={`prose prose-slate max-w-none prose-sm dark:prose-invert prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-900 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 p-4 text-sm text-slate-600 dark:text-slate-300">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-600 border-t-transparent" />
      {label}
    </div>
  );
}

const difficultyColor: Record<Difficulty, string> = {
  Beginner: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  Intermediate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Advanced: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
};

export function DifficultyBadge({ level }: { level: Difficulty }) {
  return <span className={`chip ${difficultyColor[level]}`}>{level}</span>;
}

function fmt(c: Cell): string {
  if (c === null) return 'NULL';
  if (typeof c === 'number') return Number.isInteger(c) ? String(c) : c.toLocaleString('en-IN', { maximumFractionDigits: 4 });
  return String(c);
}

export function ResultTable({ result, maxRows = 200 }: { result: ResultSet; maxRows?: number }) {
  const rows = result.rows.slice(0, maxRows);
  return (
    <div className="max-h-80 overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full border-collapse font-mono text-xs">
        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
          <tr>
            {result.columns.map((c, i) => (
              <th key={i} scope="col" className="border-b border-slate-200 px-2 py-1.5 text-left font-semibold whitespace-nowrap dark:border-slate-800">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-950 dark:even:bg-slate-900/50">
              {r.map((c, j) => (
                <td key={j} className={`border-b border-slate-100 px-2 py-1 whitespace-nowrap dark:border-slate-800/60 ${typeof c === 'number' ? 'text-right' : ''} ${c === null ? 'text-slate-400 italic' : ''}`}>
                  {fmt(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-2 py-1 text-xs text-slate-500">
        {result.rows.length} row{result.rows.length === 1 ? '' : 's'}
        {result.rows.length > maxRows ? ` (showing first ${maxRows})` : ''}
      </p>
    </div>
  );
}

export function GradePanel({ result }: { result: GradeResult | null }) {
  if (!result) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border p-4 ${
        result.passed
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
          : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
      }`}
    >
      <p className={`font-semibold ${result.passed ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-900 dark:text-amber-200'}`}>
        {result.passed ? '✓ ' : ''}
        {result.summary}
      </p>
      {result.details.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
          {result.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ErrorBox({ text }: { text: string }) {
  return <pre className="overflow-auto rounded-lg bg-rose-50 p-3 font-mono text-xs whitespace-pre-wrap text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">{text}</pre>;
}

export function Reveal({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="btn-secondary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide' : label}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
