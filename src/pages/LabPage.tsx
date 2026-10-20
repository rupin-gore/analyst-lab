import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DatasetPanel } from '../components/DatasetPanel';
import { MermaidView } from '../components/MermaidView';
import { DifficultyBadge, GradePanel, Markdown, Section, Spinner } from '../components/ui';
import { getTrack } from '../content';
import type { Lab } from '../content/types';
import type { GradeResult } from '../graders/types';
import { addTime, getLabProgress, labKey, recordAttempt, updateLab, useProgress } from '../lib/progress';
import { formatDuration } from '../lib/stats';
import { workspaceLabel, workspaces } from '../workspaces';
import NotFound from './NotFound';

function solutionMarkdown(lab: Lab): string {
  switch (lab.workspace) {
    case 'sql':
    case 'chart':
      return '```sql\n' + lab.solution.trim() + '\n```';
    case 'python':
      return '```python\n' + lab.solution.trim() + '\n```';
    case 'spreadsheet':
      return Object.entries(JSON.parse(lab.solution) as Record<string, string>)
        .map(([cell, f]) => `- **${cell}**: \`${f}\``)
        .join('\n');
    case 'diagram':
      return '```\n' + lab.solution.trim() + '\n```';
    case 'written':
      return lab.solution;
  }
}

/** Counts visible time on the page in 15-second ticks. */
function useTimeTracking(key: string) {
  useEffect(() => {
    let last = Date.now();
    const flush = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible') addTime(key, Math.round((now - last) / 1000));
      last = now;
    };
    const iv = setInterval(flush, 15_000);
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
      else last = Date.now();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      flush();
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [key]);
}

export default function LabPage() {
  const { trackId = '', labId = '' } = useParams();
  const track = getTrack(trackId);
  const index = track?.labs.findIndex((l) => l.id === labId) ?? -1;
  const lab = track && index >= 0 ? track.labs[index] : undefined;
  const key = labKey(trackId, labId);
  const data = useProgress();
  const progress = getLabProgress(data, key);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const gradeRef = useRef<HTMLDivElement>(null);
  useTimeTracking(key);

  useEffect(() => {
    setGrade(null);
    setShowSolution(false);
  }, [key]);

  if (!track || !lab) return <NotFound />;
  const Workspace = workspaces[lab.workspace];
  const hintsShown = progress.hintsUsed;
  const attempted = progress.attempts > 0;
  const next = track.labs[index + 1];

  const onGraded = (r: GradeResult) => {
    setGrade(r);
    recordAttempt(key, r.passed);
    setTimeout(() => gradeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6">
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:underline">
          Tracks
        </Link>{' '}
        /{' '}
        <Link to={`/tracks/${track.id}`} className="hover:underline">
          {track.title}
        </Link>
      </nav>
      <header className="mt-2 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{lab.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <DifficultyBadge level={lab.difficulty} />
          <span className="chip">{workspaceLabel[lab.workspace]}</span>
          <span className="chip">~{lab.minutes} min</span>
          {lab.skills.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
          {progress.passed && <span className="chip bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">✓ Passed</span>}
          {progress.timeSpentSec > 0 && <span className="text-slate-500">{formatDuration(progress.timeSpentSec)} spent</span>}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-4">
          <Section title="Scenario">
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              {lab.company} · from {lab.stakeholder.name}, {lab.stakeholder.role}
            </p>
            <Markdown>{lab.scenario}</Markdown>
          </Section>
          <Section title="Your task">
            <Markdown>{lab.task}</Markdown>
            {lab.facts && (
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {lab.facts.map((f) => (
                    <tr key={f.label} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-400">{f.label}</td>
                      <td className="py-1.5 text-right font-mono font-medium">{f.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
          {lab.data.length > 0 && (
            <Section title="Data">
              <DatasetPanel refs={lab.data} />
            </Section>
          )}
          <Section title={`Hints (${hintsShown}/${lab.hints.length})`}>
            {hintsShown === 0 && <p className="text-sm text-slate-500">Stuck? Reveal one hint at a time.</p>}
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              {lab.hints.slice(0, hintsShown).map((h, i) => (
                <li key={i}>
                  <Markdown>{h}</Markdown>
                </li>
              ))}
            </ol>
            {hintsShown < lab.hints.length && (
              <button className="btn-secondary mt-3" onClick={() => updateLab(key, (p) => ({ ...p, hintsUsed: Math.min(lab.hints.length, p.hintsUsed + 1) }))}>
                Reveal hint {hintsShown + 1}
              </button>
            )}
          </Section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-18 lg:self-start">
          <Section title="Workspace">
            <Suspense fallback={<Spinner label="Loading workspace…" />}>
              <Workspace key={key} lab={lab} storageKey={key} onGraded={onGraded} solutionUnlocked={attempted} />
            </Suspense>
          </Section>
          <div ref={gradeRef}>
            <GradePanel result={grade} />
          </div>
          {grade?.passed && next && (
            <Link to={`/tracks/${track.id}/labs/${next.id}`} className="btn-primary">
              Next lab: {next.title} →
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Section title="Worked solution">
          {!attempted ? (
            <p className="text-sm text-slate-500">Submit at least one attempt to unlock the worked solution.</p>
          ) : !showSolution ? (
            <button
              className="btn-secondary"
              onClick={() => {
                setShowSolution(true);
                updateLab(key, (p) => ({ ...p, solutionViewed: true }));
              }}
            >
              Show worked solution
            </button>
          ) : (
            <div className="space-y-3">
              <Markdown>{lab.explanation}</Markdown>
              {lab.workspace === 'diagram' && (
                <div className="card p-2">
                  <MermaidView source={lab.solution} />
                </div>
              )}
              <Markdown>{solutionMarkdown(lab)}</Markdown>
            </div>
          )}
        </Section>
        <Section title="How to talk about this in an interview">
          <Markdown>{lab.interview}</Markdown>
        </Section>
      </div>
    </div>
  );
}
