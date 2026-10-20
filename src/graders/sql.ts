import { fail, pass, type Cell, type GradeResult, type ResultSet } from './types';

export interface CompareOptions {
  /** Row order matters (the task asked for a sort). */
  ordered?: boolean;
  /** Absolute tolerance for numbers; a relative tolerance of 1e-6 is always allowed too. */
  tolerance?: number;
}

const DEFAULT_TOL = 0.01;

/** Turns numeric strings, bigints and dates into comparable primitives. */
export function normalizeCell(v: unknown): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'number') return Number.isNaN(v) ? null : v;
  if (typeof v === 'boolean') return v;
  if (v instanceof Date) return v.toISOString().replace('T', ' ').replace(/\.000Z$|Z$/, '');
  const s = String(v).trim();
  if (s !== '' && /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(s)) return Number(s);
  return s;
}

export function cellsEqual(a: Cell, b: Cell, tol = DEFAULT_TOL): boolean {
  if (a === null || b === null) return a === b;
  if (typeof a === 'number' && typeof b === 'number') {
    const diff = Math.abs(a - b);
    return diff <= tol || diff <= Math.abs(b) * 1e-6;
  }
  if (typeof a === 'boolean' || typeof b === 'boolean') return String(a) === String(b);
  return String(a) === String(b);
}

/** Sort key that is stable under float noise below the tolerance. */
function cellKey(c: Cell): string {
  if (c === null) return '\u0000null';
  if (typeof c === 'number') return `n:${c.toFixed(1).padStart(24, ' ')}`;
  return `s:${String(c)}`;
}

function rowKey(row: Cell[]): string {
  return row.map(cellKey).join('\u0001');
}

function columnSignature(rows: Cell[][], col: number): string {
  return rows.map((r) => cellKey(r[col])).sort().join('\u0001');
}

function rowsEqual(a: Cell[], b: Cell[], tol: number): boolean {
  return a.length === b.length && a.every((v, i) => cellsEqual(v, b[i], tol));
}

/** Groups 0-based indices into human "rows 3-5, 9" text (1-based). */
export function formatRanges(indices: number[]): string {
  const sorted = [...indices].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    parts.push(start === prev ? `${start + 1}` : `${start + 1}–${prev + 1}`);
    start = cur;
    prev = cur;
  }
  const label = parts.length === 1 && !parts[0].includes('–') ? 'row' : 'rows';
  if (parts.length > 6) return `${label} ${parts.slice(0, 6).join(', ')} and ${parts.length - 6} more ranges`;
  return `${label} ${parts.join(', ')}`;
}

/**
 * If the learner returned the right columns in a different order, find the permutation
 * by matching each expected column to an actual column with the same values.
 */
function matchColumns(expected: ResultSet, actual: ResultSet): number[] | null {
  const n = expected.columns.length;
  const identity = expected.columns.map((_, i) => i);
  const actualSigs = actual.columns.map((_, i) => columnSignature(actual.rows, i));
  const used = new Set<number>();
  const perm: number[] = [];
  for (let i = 0; i < n; i++) {
    const sig = columnSignature(expected.rows, i);
    // Prefer the same position, then any unused column with an identical signature.
    let j = actualSigs[i] === sig && !used.has(i) ? i : actualSigs.findIndex((s, k) => s === sig && !used.has(k));
    if (j === -1) return identity;
    used.add(j);
    perm.push(j);
  }
  return perm;
}

export function compareResults(expectedRaw: ResultSet, actualRaw: ResultSet, opts: CompareOptions = {}): GradeResult {
  const tol = opts.tolerance ?? DEFAULT_TOL;
  const expected: ResultSet = { columns: expectedRaw.columns, rows: expectedRaw.rows.map((r) => r.map(normalizeCell)) };
  const actual: ResultSet = { columns: actualRaw.columns, rows: actualRaw.rows.map((r) => r.map(normalizeCell)) };

  const ec = expected.columns.length;
  const ac = actual.columns.length;
  if (ac < ec) {
    return fail(`Your result has ${ac} column${ac === 1 ? '' : 's'}; the task needs ${ec}.`, [
      'A column is missing. Re-read the task for every field the stakeholder asked for.',
    ]);
  }
  if (ac > ec) {
    return fail(`Your result has ${ac} columns; the task needs ${ec}.`, [
      'Remove the extra columns so the output matches exactly what was asked for.',
    ]);
  }

  const er = expected.rows.length;
  const ar = actual.rows.length;
  if (ar !== er) {
    const hint =
      ar > er
        ? 'You have more rows than expected. Check for duplicates, missing filters or a join that fans out.'
        : 'You have fewer rows than expected. Check your filters, join type and grouping.';
    return fail(`Your result has ${ar} row${ar === 1 ? '' : 's'}; expected ${er}.`, [hint]);
  }

  const perm = matchColumns(expected, actual)!;
  const reordered = actual.rows.map((r) => perm.map((j) => r[j]));

  if (opts.ordered) {
    const bad: number[] = [];
    reordered.forEach((row, i) => {
      if (!rowsEqual(row, expected.rows[i], tol)) bad.push(i);
    });
    if (bad.length === 0) return pass('Passed: your result matches the expected output.');
    // Same rows, wrong order?
    const sortedA = [...reordered].sort((a, b) => rowKey(a).localeCompare(rowKey(b)));
    const sortedE = [...expected.rows].sort((a, b) => rowKey(a).localeCompare(rowKey(b)));
    if (sortedA.every((row, i) => rowsEqual(row, sortedE[i], tol))) {
      return fail('The right rows, but in the wrong order.', ['Check your ORDER BY: column and direction.']);
    }
    return fail(`Wrong values in ${formatRanges(bad)} (of ${er}).`, columnHints(reordered, expected.rows, bad, expected.columns, tol));
  }

  // Unordered: match every actual row to a distinct expected row (bucketed by the non-numeric cells,
  // so float noise never splits a bucket).
  const buckets = new Map<string, number[]>();
  expected.rows.forEach((row, i) => {
    const k = textKey(row);
    buckets.set(k, [...(buckets.get(k) ?? []), i]);
  });
  const unmatched: number[] = [];
  reordered.forEach((row, i) => {
    const cands = buckets.get(textKey(row)) ?? [];
    const pos = cands.findIndex((e) => rowsEqual(row, expected.rows[e], tol));
    if (pos === -1) unmatched.push(i);
    else cands.splice(pos, 1);
  });
  if (unmatched.length === 0) return pass('Passed: your result matches the expected output.');
  const sortedA = [...reordered].sort((a, b) => rowKey(a).localeCompare(rowKey(b)));
  const sortedE = [...expected.rows].sort((a, b) => rowKey(a).localeCompare(rowKey(b)));
  const bad = sortedA.map((row, i) => (rowsEqual(row, sortedE[i], tol) ? -1 : i)).filter((i) => i >= 0);
  return fail(`${unmatched.length} of ${er} rows don't match any expected row (row order ignored).`, [
    `For example, your ${formatRanges(unmatched.slice(0, 3))} (in your output order).`,
    ...columnHints(sortedA, sortedE, bad, expected.columns, tol),
  ]);
}

function textKey(row: Cell[]): string {
  return row.map((c) => (typeof c === 'number' ? '#' : cellKey(c))).join('\u0001');
}

function columnHints(actual: Cell[][], expected: Cell[][], bad: number[], names: string[], tol: number): string[] {
  const cols = new Set<number>();
  for (const i of bad) {
    expected[i].forEach((v, c) => {
      if (!cellsEqual(actual[i][c], v, tol)) cols.add(c);
    });
  }
  return [...cols].map((c) => `Column ${c + 1} ("${names[c]}" in the reference) has values that differ.`);
}
