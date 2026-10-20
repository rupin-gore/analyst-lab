import { useEffect, useId, useState } from 'react';
import { useTheme } from '../lib/theme';

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;
function getMermaid() {
  mermaidPromise ??= import('mermaid').then((m) => m.default);
  return mermaidPromise;
}

/** Renders Mermaid source; reports whether it parsed. */
export function MermaidView({ source, onValid }: { source: string; onValid?: (ok: boolean) => void }) {
  const theme = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const mermaid = await getMermaid();
      mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'default', securityLevel: 'strict' });
      try {
        const out = await mermaid.render(`m${id}${Date.now()}`, source);
        if (!cancelled) {
          setSvg(out.svg);
          setError(null);
          onValid?.(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String((e as Error).message ?? e).split('\n').slice(0, 4).join('\n'));
          onValid?.(false);
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // onValid is intentionally excluded: callers pass inline callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, theme, id]);

  return (
    <div>
      {error && <pre className="mb-2 rounded bg-amber-50 p-2 text-xs whitespace-pre-wrap text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Diagram syntax error: {error}</pre>}
      {/* Mermaid output is generated locally with securityLevel "strict". */}
      <div className="mermaid-preview overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
