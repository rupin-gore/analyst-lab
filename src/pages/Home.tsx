import { Link } from 'react-router-dom';
import { ProgressBar } from '../components/ui';
import { tracks } from '../content';
import { useProgress } from '../lib/progress';
import { trackStats } from '../lib/stats';

export default function Home() {
  const data = useProgress();
  const ready = tracks.filter((t) => t.status === 'ready');
  const planned = tracks.filter((t) => t.status === 'planned');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">Learn analyst roles by doing the work.</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          Each track is a role. Each lab is a real task on realistic Indian business data, with a stakeholder ask, a workspace in your browser and an automatic grader.
          Read less, do more.
        </p>
      </div>

      <h2 className="mt-10 mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">Available tracks</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ready.map((t) => {
          const s = trackStats(t, data);
          return (
            <Link key={t.id} to={`/tracks/${t.id}`} className="card group flex flex-col p-5 transition-shadow hover:shadow-md">
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-accent-700 dark:text-white dark:group-hover:text-accent-500">{t.title}</h3>
              <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-400">{t.short}</p>
              <div className="mt-4 space-y-1.5">
                <ProgressBar value={s.ratio} label={`${t.title} progress`} />
                <p className="text-xs text-slate-500">
                  {s.passed} of {s.total} labs passed
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {planned.length > 0 && (
        <>
          <h2 className="mt-12 mb-4 text-sm font-semibold tracking-wide text-slate-500 uppercase">Coming in later phases</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {planned.map((t) => (
              <li key={t.id} className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
                <p className="font-medium text-slate-700 dark:text-slate-300">{t.title}</p>
                <p className="mt-1 text-sm text-slate-500">{t.short}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
