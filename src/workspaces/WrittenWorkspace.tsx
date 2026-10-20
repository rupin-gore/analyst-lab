import { useEffect, useState } from 'react';
import { countWords, gradeWritten } from '../graders/written';
import { getFeedbackProvider } from '../lib/aiFeedback';
import { loadDraft, saveDraft } from '../lib/progress';
import { Markdown } from '../components/ui';
import type { WorkspaceProps } from './types';

interface Draft {
  text: string;
  checked: boolean[];
}

export function Rubric({ items, checked, onChange }: { items: string[]; checked: boolean[]; onChange: (c: boolean[]) => void }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="mb-1 text-sm font-medium">Rubric: tick each item your answer honestly meets</legend>
      {items.map((item, i) => (
        <label key={i} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-teal-700"
            checked={!!checked[i]}
            onChange={(e) => {
              const next = [...checked];
              next[i] = e.target.checked;
              onChange(next);
            }}
          />
          <span>{item}</span>
        </label>
      ))}
    </fieldset>
  );
}

export default function WrittenWorkspace({ lab, storageKey, onGraded, solutionUnlocked }: WorkspaceProps) {
  const spec = lab.grading.written!;
  const draft = loadDraft<Draft>(storageKey);
  const [text, setText] = useState(draft?.text ?? lab.starter ?? '');
  const [checked, setChecked] = useState<boolean[]>(draft?.checked ?? []);
  const [aiText, setAiText] = useState<string | null>(null);
  const provider = getFeedbackProvider();
  const words = countWords(text);

  useEffect(() => {
    saveDraft(storageKey, { text, checked });
  }, [storageKey, text, checked]);

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Your answer</span>
        <textarea className="input min-h-56 leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your answer here…" />
      </label>
      <p className={`text-xs ${spec.maxWords && words > spec.maxWords ? 'text-rose-600' : 'text-slate-500'}`}>
        {words} words{spec.minWords || spec.maxWords ? ` (aim for ${spec.minWords ?? 0}–${spec.maxWords ?? '∞'})` : ''}
      </p>
      <Rubric items={spec.rubric} checked={checked} onChange={setChecked} />
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={() => onGraded(gradeWritten(text, checked, spec))}>
          Submit
        </button>
        {provider && (
          <button
            className="btn-secondary"
            onClick={async () => {
              setAiText('Asking for feedback…');
              setAiText(await provider.review({ labTitle: lab.title, task: lab.task, rubric: spec.rubric, answer: text, modelAnswer: lab.solution }));
            }}
          >
            Get AI feedback ({provider.name})
          </button>
        )}
        {solutionUnlocked && (
          <button className="btn-ghost" onClick={() => setText(lab.solution)}>
            Load model answer
          </button>
        )}
      </div>
      {aiText && (
        <div className="card p-3">
          <Markdown>{aiText}</Markdown>
        </div>
      )}
    </div>
  );
}
