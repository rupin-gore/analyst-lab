/// <reference lib="webworker" />
import { PY_HARNESS } from './pyHarness';
import { PYODIDE_INDEX_URL } from './pyodideVersion';

// Pyodide's own types are not needed here; the worker only calls a few functions.
/* eslint-disable @typescript-eslint/no-explicit-any */
let py: any = null;
let ns: any = null;

type Msg =
  | { id: number; type: 'init' }
  | { id: number; type: 'files'; files: { name: string; url: string }[] }
  | { id: number; type: 'reset' }
  | { id: number; type: 'run'; code: string }
  | { id: number; type: 'test'; cells: string[]; tests: string };

const post = (m: unknown) => (self as unknown as Worker).postMessage(m);

async function init() {
  if (py) return;
  post({ type: 'status', text: 'Downloading Python (first time only, ~10 MB)…' });
  const mod = await import(/* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`);
  py = await mod.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  post({ type: 'status', text: 'Loading pandas and numpy…' });
  await py.loadPackage(['pandas', 'numpy']);
  await py.runPythonAsync(PY_HARNESS);
  py.FS.mkdirTree('/data');
}

async function setFiles(files: { name: string; url: string }[]) {
  const map = py.globals.get('_AL_FILES');
  map.clear();
  for (const f of files) {
    const text = await fetch(f.url).then((r) => r.text());
    const path = `/data/${f.name}.csv`;
    py.FS.writeFile(path, text);
    map.set(f.name, path);
  }
  map.destroy();
  resetNs();
}

function resetNs() {
  ns?.destroy?.();
  ns = py.globals.get('_al_new_namespace')();
}

async function runCell(code: string) {
  await py.loadPackagesFromImports(code);
  return JSON.parse(py.globals.get('_al_run_cell')(code, ns));
}

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  try {
    let result: unknown = null;
    if (m.type === 'init') await init();
    else if (m.type === 'files') await setFiles(m.files);
    else if (m.type === 'reset') resetNs();
    else if (m.type === 'run') result = await runCell(m.code);
    else if (m.type === 'test') {
      resetNs();
      const errors: string[] = [];
      for (const [i, c] of m.cells.entries()) {
        const r = await runCell(c);
        if (r.error) errors.push(`Cell ${i + 1} raised an error:\n${r.error}`);
      }
      await py.loadPackagesFromImports(m.tests);
      const tests = py.globals.get('_al_run_tests')(m.tests, ns);
      result = { errors, tests };
    }
    post({ id: m.id, ok: true, result });
  } catch (err) {
    post({ id: m.id, ok: false, error: String(err) });
  }
};
