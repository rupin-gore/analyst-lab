import { Link, useParams } from 'react-router-dom';
import { DifficultyBadge, Markdown, ProgressBar, Reveal, Section } from '../components/ui';
import { getTrack } from '../content';
import { downloadText } from '../lib/download';
import { getLabProgress, labKey, useProgress } from '../lib/progress';
import { trackStats } from '../lib/stats';
import { workspaceLabel } from '../workspaces';
import NotFound from './NotFound';

export default function TrackPage() {
  const { trackId = '' } = useParams();
  const track = getTrack(trackId);
  const data = useProgress();
  if (!track) return <NotFound />;
  const s = trackStats(track, data);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <Link to="/" className="text-sm text-slate-500 hover:underline">
          ← All tracks
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{track.title}</h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">{track.short}</p>
        <div className="mt-4 max-w-sm space-y-1">
          <ProgressBar value={s.ratio} label="Track progress" />
          <p className="text-xs text-slate-500">
            {s.passed} of {s.total} labs passed
          </p>
        </div>
      </div>

      {track.status === 'planned' && <p className="card p-5 text-slate-600 dark:text-slate-400">This track is planned for a later phase.</p>}

      {track.role && (
        <Section title="The role in practice">
          <Markdown>{track.role.day}</Markdown>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Works with</h3>
              <div className="flex flex-wrap gap-1.5">
                {track.role.teams.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Tools</h3>
              <div className="flex flex-wrap gap-1.5">
                {track.role.tools.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <h3 className="mt-4 mb-2 text-sm font-semibold">Keywords you'll see in job descriptions</h3>
          <div className="flex flex-wrap gap-1.5">
            {track.role.keywords.map((k) => (
              <span key={k} className="chip bg-accent-50 text-accent-800 dark:bg-accent-800/30 dark:text-accent-100">
                {k}
              </span>
            ))}
          </div>
        </Section>
      )}

      {track.labs.length > 0 && (
        <Section title="Labs">
          <ol className="divide-y divide-slate-100 dark:divide-slate-800">
            {track.labs.map((lab, i) => {
              const p = getLabProgress(data, labKey(track.id, lab.id));
              return (
                <li key={lab.id}>
                  <Link to={`/tracks/${track.id}/labs/${lab.id}`} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                        p.passed ? 'bg-emerald-600 text-white' : p.attempts ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                      aria-label={p.passed ? 'Passed' : p.attempts ? 'Attempted' : 'Not started'}
                    >
                      {p.passed ? '✓' : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-slate-900 dark:text-slate-100">{lab.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {lab.company} · {lab.skills.join(', ')}
                      </span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-2 sm:flex">
                      <span className="chip">{workspaceLabel[lab.workspace]}</span>
                      <DifficultyBadge level={lab.difficulty} />
                      <span className="w-14 text-right text-xs text-slate-500">{lab.minutes} min</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Section>
      )}

      {track.capstone && (
        <Section title="Capstone">
          <h3 className="text-lg font-semibold">{track.capstone.title}</h3>
          <Markdown className="mt-2">{track.capstone.brief}</Markdown>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1 text-sm font-semibold">Steps</h4>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {track.capstone.steps.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="mb-1 text-sm font-semibold">Deliverables for your GitHub</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {track.capstone.deliverables.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
          <button className="btn-primary mt-4" onClick={() => downloadText(track.capstone!.template.filename, track.capstone!.template.content)}>
            Download starter: {track.capstone.template.filename}
          </button>
        </Section>
      )}

      {track.interview && track.interview.length > 0 && (
        <Section title={`Interview bank (${track.interview.length})`}>
          <ul className="space-y-4">
            {track.interview.map((q, i) => (
              <li key={i} className="border-b border-slate-100 pb-4 last:border-0 dark:border-slate-800">
                <p className="mb-2 text-sm">
                  <span className="chip mr-2">{q.type}</span>
                  <span className="font-medium">{q.q}</span>
                </p>
                <Reveal label="Show model answer">
                  <Markdown>{q.a}</Markdown>
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
