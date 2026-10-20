import { describe, expect, it } from 'vitest';
import { compareResults, formatRanges, normalizeCell } from './sql';
import type { ResultSet } from './types';

const expected: ResultSet = {
  columns: ['state', 'net_revenue'],
  rows: [
    ['Maharashtra', 1500.25],
    ['Karnataka', 1200.5],
    ['Delhi', 900],
  ],
};

describe('compareResults', () => {
  it('passes an identical result, ignoring alias names', () => {
    const actual = { columns: ['s', 'rev'], rows: expected.rows.map((r) => [...r]) };
    expect(compareResults(expected, actual, { ordered: true }).passed).toBe(true);
  });

  it('allows float noise within tolerance and numeric strings', () => {
    const actual = { columns: ['state', 'x'], rows: [['Maharashtra', 1500.2549], ['Karnataka', '1200.50'], ['Delhi', BigInt(900)]] };
    expect(compareResults(expected, actual as ResultSet, { ordered: true }).passed).toBe(true);
  });

  it('ignores row order when the task does not ask for a sort', () => {
    const actual = { columns: ['a', 'b'], rows: [...expected.rows].reverse() };
    expect(compareResults(expected, actual).passed).toBe(true);
  });

  it('flags right rows in the wrong order when sorting is required', () => {
    const actual = { columns: ['a', 'b'], rows: [...expected.rows].reverse() };
    const r = compareResults(expected, actual, { ordered: true });
    expect(r.passed).toBe(false);
    expect(r.summary).toMatch(/wrong order/);
  });

  it('accepts columns in a different order', () => {
    const actual = { columns: ['rev', 'state'], rows: expected.rows.map(([a, b]) => [b, a]) };
    expect(compareResults(expected, actual, { ordered: true }).passed).toBe(true);
  });

  it('common wrong answer: duplicates inflate values; reports which rows differ', () => {
    const actual = { columns: ['a', 'b'], rows: [['Maharashtra', 1500.25], ['Karnataka', 1350.5], ['Delhi', 990]] };
    const r = compareResults(expected, actual, { ordered: true });
    expect(r.passed).toBe(false);
    expect(r.summary).toBe('Wrong values in rows 2–3 (of 3).');
    expect(r.details.join(' ')).toMatch(/Column 2/);
    // Never reveals the expected numbers
    expect(JSON.stringify(r)).not.toMatch(/1200/);
  });

  it('reports row count differences', () => {
    const r = compareResults(expected, { columns: ['a', 'b'], rows: expected.rows.slice(0, 2) });
    expect(r.passed).toBe(false);
    expect(r.summary).toMatch(/2 rows; expected 3/);
  });

  it('reports a missing column', () => {
    const r = compareResults(expected, { columns: ['a'], rows: expected.rows.map((x) => [x[0]]) });
    expect(r.summary).toMatch(/1 column; the task needs 2/);
  });

  it('edge case: empty results match each other', () => {
    const empty = { columns: ['a'], rows: [] };
    expect(compareResults(empty, { columns: ['b'], rows: [] }).passed).toBe(true);
  });

  it('edge case: NULL only equals NULL', () => {
    const e = { columns: ['a', 'b'], rows: [['x', null]] };
    expect(compareResults(e, { columns: ['a', 'b'], rows: [['x', null]] }).passed).toBe(true);
    expect(compareResults(e, { columns: ['a', 'b'], rows: [['x', 0]] }).passed).toBe(false);
  });

  it('edge case: duplicate rows must match in multiplicity', () => {
    const e = { columns: ['a'], rows: [['x'], ['x'], ['y']] };
    expect(compareResults(e, { columns: ['a'], rows: [['x'], ['y'], ['y']] }).passed).toBe(false);
  });
});

describe('helpers', () => {
  it('formats row ranges 1-based', () => {
    expect(formatRanges([0])).toBe('row 1');
    expect(formatRanges([2, 3, 4, 8])).toBe('rows 3–5, 9');
  });
  it('normalises values', () => {
    expect(normalizeCell(' 12.5 ')).toBe(12.5);
    expect(normalizeCell('2024-04')).toBe('2024-04');
    expect(normalizeCell(undefined)).toBe(null);
  });
});
