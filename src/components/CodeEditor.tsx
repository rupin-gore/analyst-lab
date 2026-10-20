import Editor, { loader, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { useEffect, useRef } from 'react';
import { useTheme } from '../lib/theme';

// Bundle Monaco locally instead of loading it from a CDN.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

export interface CodeEditorProps {
  value: string;
  onChange: (v: string) => void;
  language: 'sql' | 'python' | 'markdown' | 'plaintext';
  onRun?: () => void;
  height?: number | string;
  ariaLabel: string;
}

export default function CodeEditor({ value, onChange, language, onRun, height = 260, ariaLabel }: CodeEditorProps) {
  const theme = useTheme();
  const runRef = useRef(onRun);
  useEffect(() => {
    runRef.current = onRun;
  }, [onRun]);

  const onMount: OnMount = (editor, m) => {
    editor.addCommand(m.KeyMod.CtrlCmd | m.KeyCode.Enter, () => runRef.current?.());
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700" data-testid="code-editor">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={onMount}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: language === 'python' ? 4 : 2,
          automaticLayout: true,
          ariaLabel,
          padding: { top: 8 },
        }}
      />
    </div>
  );
}
