import * as duckdb from '@duckdb/duckdb-wasm';
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import type { DataRef } from '../content/types';
import type { Cell, ResultSet } from '../graders/types';
import { datasetUrl, getManifest } from '../lib/datasets';

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;
const registered = new Set<string>();

async function init(): Promise<duckdb.AsyncDuckDB> {
  const bundle = await duckdb.selectBundle({
    mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
    eh: { mainModule: ehWasm, mainWorker: ehWorker },
  });
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  await db.open({ query: { castBigIntToDouble: true, castDecimalToDouble: true } });
  return db;
}

export function getDb(): Promise<duckdb.AsyncDuckDB> {
  dbPromise ??= init();
  return dbPromise;
}

/** (Re)creates the lab's tables from the CSV files, so every run starts from clean data. */
export async function loadTables(refs: DataRef[]): Promise<void> {
  const db = await getDb();
  const conn = await db.connect();
  try {
    for (const ref of refs) {
      const manifest = await getManifest(ref.dataset);
      for (const table of ref.tables) {
        const meta = manifest.tables[table];
        const fileName = `${ref.dataset}__${meta.file}`;
        if (!registered.has(fileName)) {
          const text = await fetch(datasetUrl(ref.dataset, meta.file)).then((r) => r.text());
          await db.registerFileText(fileName, text);
          registered.add(fileName);
        }
        await conn.query(`CREATE OR REPLACE TABLE "${table}" AS SELECT * FROM read_csv('${fileName}', header = true)`);
      }
    }
  } finally {
    await conn.close();
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(ms: number, withTime: boolean): string {
  const d = new Date(ms);
  const date = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return withTime ? `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` : date;
}

function toCell(v: unknown, typeName: string): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return Number(v);
  if (v instanceof Date) return formatDate(v.getTime(), !/^Date/.test(typeName));
  if (typeName.startsWith('Timestamp') && typeof v === 'number') return formatDate(v, true);
  if (typeName.startsWith('Date') && typeof v === 'number') return formatDate(v, false);
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  return String(v);
}

export async function runQuery(sql: string): Promise<ResultSet> {
  const db = await getDb();
  const conn = await db.connect();
  try {
    const table = await conn.query(sql);
    const fields = table.schema.fields;
    const columns = fields.map((f) => f.name);
    const types = fields.map((f) => String(f.type));
    const rows: Cell[][] = [];
    const cols = fields.map((_, i) => table.getChildAt(i)!);
    for (let r = 0; r < table.numRows; r++) {
      rows.push(cols.map((c, i) => toCell(c.get(r), types[i])));
    }
    return { columns, rows };
  } finally {
    await conn.close();
  }
}
