import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadPyodide, type PyodideInterface } from 'pyodide';
import Papa from 'papaparse';
import { buildContent } from '../src/content/loader';
import type { DataRef, DatasetManifest, Track } from '../src/content/types';
import { PY_HARNESS } from '../src/engines/pyHarness';
import type { ResultSet } from '../src/graders/types';

export const ROOT = join(__dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export function loadContent(): Track[] {
  const files: Record<string, string> = {};
  for (const p of walk(join(ROOT, 'content', 'tracks'))) {
    if (/\.(json|sql|py|md|mmd)$/.test(p)) files[relative(ROOT, p).replace(/\\/g, '/')] = readFileSync(p, 'utf8');
  }
  return buildContent(files);
}

export function manifest(dataset: string): DatasetManifest {
  return JSON.parse(readFileSync(join(ROOT, 'public', 'datasets', dataset, 'manifest.json'), 'utf8'));
}

export function datasetPath(dataset: string, file: string): string {
  return join(ROOT, 'public', 'datasets', dataset, file);
}

export function readCsv(dataset: string, file: string): string[][] {
  return Papa.parse<string[]>(readFileSync(datasetPath(dataset, file), 'utf8').trim(), { skipEmptyLines: true }).data;
}

/** DuckDB (native) with the same table-loading convention as the browser engine. */
export async function sqlRunner(refs: DataRef[]): Promise<(sql: string) => Promise<ResultSet>> {
  const db = await DuckDBInstance.create(':memory:');
  const conn: DuckDBConnection = await db.connect();
  const reload = async () => {
    for (const ref of refs) {
      const m = manifest(ref.dataset);
      for (const t of ref.tables) {
        const path = datasetPath(ref.dataset, m.tables[t].file).replace(/\\/g, '/');
        await conn.run(`CREATE OR REPLACE TABLE "${t}" AS SELECT * FROM read_csv('${path}', header = true)`);
      }
    }
  };
  return async (sql: string) => {
    await reload();
    const reader = await conn.runAndReadAll(sql);
    return { columns: reader.columnNames(), rows: reader.getRowsJson() as ResultSet['rows'] };
  };
}

let pyPromise: Promise<PyodideInterface> | null = null;

export function getPyodide(): Promise<PyodideInterface> {
  pyPromise ??= (async () => {
    const py = await loadPyodide({ indexURL: join(ROOT, 'node_modules', 'pyodide') + '/' });
    await py.loadPackage(['pandas', 'numpy']);
    await py.runPythonAsync(PY_HARNESS);
    py.FS.mkdirTree('/data');
    return py;
  })();
  return pyPromise;
}

/** Runs notebook cells then the hidden tests, exactly as the browser worker does. */
export async function runPythonLab(refs: DataRef[], cellsSource: string, tests: string): Promise<{ errors: string[]; tests: string }> {
  const py = await getPyodide();
  const files = py.globals.get('_AL_FILES');
  files.clear();
  for (const ref of refs) {
    const m = manifest(ref.dataset);
    for (const t of ref.tables) {
      const p = `/data/${t}.csv`;
      py.FS.writeFile(p, readFileSync(datasetPath(ref.dataset, m.tables[t].file), 'utf8'));
      files.set(t, p);
    }
  }
  files.destroy();
  const ns = py.globals.get('_al_new_namespace')();
  const errors: string[] = [];
  const cells = cellsSource.split(/^# %%.*$/m).map((s) => s.trim()).filter(Boolean);
  for (const c of cells) {
    await py.loadPackagesFromImports(c);
    const r = JSON.parse(py.globals.get('_al_run_cell')(c, ns));
    if (r.error) errors.push(r.error);
  }
  await py.loadPackagesFromImports(tests);
  const out = py.globals.get('_al_run_tests')(tests, ns);
  ns.destroy();
  return { errors, tests: out };
}
