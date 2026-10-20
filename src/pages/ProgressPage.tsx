import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProgressBar, Section } from '../components/ui';
import { allLabs, tracks } from '../content';
import { downloadText } from '../lib/download';
import { exportProgress, getLabProgress, importProgress, labKey, resetProgress, useProgress } from '../lib/progress';
import { formatDuration, trackStats } from '../lib/stats';

export default function ProgressPage() {
  const data = useProgress();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const totals = allLabs.reduce(
    (acc, lab) => {
      const p = getLabProgress(data, labKey(lab.trackId, lab.id));
      acc.passed += p.passed ? 1 : 0;
      acc.attempted += p.attempts > 0 ? 1 : 0;
      acc.seconds += p.timeSpentSec;
      acc.hints += p.hintsUsed;
      return acc;
    },
    { passed: 0, attempted: 0, seconds: 0, hints: 0 },
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Your progress</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Labs passed', `${totals.passed} / ${allLabs.length}`],
          ['Labs attempted', String(totals.attempted)],
          ['Time practising', formatDuration(totals.seconds)],
          ['Hints used', String(totals.hints)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <Section title="By track">
        <ul className="space-y-4">
          {tracks
            .filter((t) => t.labs.length > 0)
            .map((t) => {
              const s = trackStats(t, data);
              return (
                <li key={t.id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <Link to={`/tracks/${t.id}`} className="font-medium hover:underline">
                      {t.title}
                    </Link>
                    <span className="text-slate-500 tabular-nums">
                      {s.passed}/{s.total} · {formatDuration(s.seconds)}
                    </span>
                  </div>
                  <ProgressBar value={s.ratio} label={`${t.title} progress`} />
                </li>
              );
            })}
        </ul>
      </Section>

      <Section title="Backup">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">Progress lives in this browser. Export it to move between browsers or keep a backup.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => downloadText(`analyst-lab-progress-${new Date().toISOString().slice(0, 10)}.json`, exportProgress(), 'application/json')}>
            Export progress
          </button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
            Import progress
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = importProgress(await f.text());
              setMessage(r.ok ? `Imported progress for ${r.labs} labs.` : r.error);
              e.target.value = '';
            }}
          />
          <button
            className="btn-ghost text-rose-600"
            onClick={() => {
              if (confirm('Reset all progress? This cannot be undone. Export first if you want a backup.')) resetProgress();
            }}
          >
            Reset progress
          </button>
        </div>
        {message && (
          <p role="status" className="mt-3 text-sm">
            {message}
          </p>
        )}
      </Section>
    </div>
  );
}
