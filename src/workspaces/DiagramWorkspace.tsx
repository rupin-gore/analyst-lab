import { useEffect, useState } from 'react';
import CodeEditor from '../components/CodeEditor';
import { MermaidView } from '../components/MermaidView';
import { gradeDiagram } from '../graders/written';
import { loadDraft, saveDraft } from '../lib/progress';
import type { WorkspaceProps } from './types';
import { Rubric } from './WrittenWorkspace';

interface Draft {
  source: string;
  checked: boolean[];
}

export default function DiagramWorkspace({ lab, storageKey, onGraded, solutionUnlocked }: WorkspaceProps) {
  const spec = lab.grading.diagram!;
  const draft = loadDraft<Draft>(storageKey);
  const [source, setSource] = useState(draft?.source ?? lab.starter ?? 'flowchart TD\n  A[Start] --> B[Next step]\n');
  const [checked, setChecked] = useState<boolean[]>(draft?.checked ?? []);
  const [valid, setValid] = useState(true);

  useEffect(() => {
    saveDraft(storageKey, { source, checked });
  }, [storageKey, source, checked]);

  const submit = () => {
    if (!valid) {
      onGraded({ passed: false, summary: 'The diagram has a syntax error.', details: ['Fix the Mermaid syntax so the preview renders.'] });
      return;
    }
    onGraded(gradeDiagram(source, checked, spec));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Write a{' '}
        <a className="underline" href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" rel="noreferrer">
          Mermaid flowchart
        </a>
        . Use <code>{'A[Step]'}</code> for steps, <code>{'B{Decision?}'}</code> for decisions and <code>{'A -->|label| B'}</code> for labelled arrows.
      </p>
      <div className="grid gap-3 xl:grid-cols-2">
        <CodeEditor value={source} onChange={setSource} language="plaintext" ariaLabel="Mermaid diagram source" height={300} />
        <div className="card min-h-40 p-2">
          <MermaidView source={source} onValid={setValid} />
        </div>
      </div>
      <Rubric items={spec.rubric} checked={checked} onChange={setChecked} />
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={submit}>
          Submit
        </button>
        {solutionUnlocked && (
          <button className="btn-ghost" onClick={() => setSource(lab.solution)}>
            Load example answer
          </button>
        )}
      </div>
    </div>
  );
}
