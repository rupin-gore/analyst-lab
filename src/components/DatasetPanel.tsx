import { useEffect, useState } from 'react';
import type { DataRef, DatasetManifest } from '../content/types';
import { datasetUrl, getCsv, getManifest } from '../lib/datasets';

interface Loaded {
  manifest: DatasetManifest;
  previews: Record<string, string[][]>;
}

export function DatasetPanel({ refs }: { refs: DataRef[] }) {
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [active, setActive] = useState<string>(refs[0] ? `${refs[0].dataset}.${refs[0].tables[0]}` : '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const out: Record<string, Loaded> = {};
        for (const ref of refs) {
          const manifest = await getManifest(ref.dataset);
          const previews: Record<string, string[][]> = {};
          for (const t of ref.tables) previews[t] = (await getCsv(ref.dataset, manifest.tables[t].file)).slice(0, 6);
          out[ref.dataset] = { manifest, previews };
        }
        if (!cancelled) setLoaded(out);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refs]);

  if (error) return <p className="text-sm text-rose-600">Could not load data: {error}</p>;
  if (refs.length === 0) return <p className="text-sm text-slate-500">No dataset for this lab.</p>;

  const tabs = refs.flatMap((r) => r.tables.map((t) => ({ key: `${r.dataset}.${t}`, dataset: r.dataset, table: t })));
  const cur = tabs.find((t) => t.key === active) ?? tabs[0];
  const ds = loaded[cur.dataset];
  const meta = ds?.manifest.tables[cur.table];
  const preview = ds?.previews[cur.table];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Tables">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === cur.key}
            onClick={() => setActive(t.key)}
            className={`rounded-md px-2.5 py-1 font-mono text-xs ${t.key === cur.key ? 'bg-accent-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {t.table}
          </button>
        ))}
      </div>
      {!meta ? (
        <p className="text-sm text-slate-500">Loading data…</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            {meta.rows.toLocaleString('en-IN')} rows ·{' '}
            <a className="text-accent-700 underline dark:text-accent-500" href={datasetUrl(cur.dataset, meta.file)} download>
              download {meta.file}
            </a>
          </p>
          <details open className="group">
            <summary className="cursor-pointer text-sm font-medium">Schema</summary>
            <table className="mt-2 w-full text-left text-xs">
              <tbody>
                {meta.columns.map((c) => (
                  <tr key={c.name} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-1 pr-2 font-mono font-medium">{c.name}</td>
                    <td className="py-1 pr-2 font-mono text-slate-500">{c.type}</td>
                    <td className="py-1 text-slate-600 dark:text-slate-400">{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          {preview && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium">Preview (first 5 rows)</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr>
                      {preview[0].map((h) => (
                        <th key={h} className="border-b border-slate-200 px-1.5 py-1 text-left whitespace-nowrap dark:border-slate-700">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(1).map((r, i) => (
                      <tr key={i}>
                        {r.map((v, j) => (
                          <td key={j} className="border-b border-slate-100 px-1.5 py-1 whitespace-nowrap dark:border-slate-800">
                            {v === '' ? <span className="text-slate-400 italic">null</span> : v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
