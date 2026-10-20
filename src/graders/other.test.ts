import { describe, expect, it } from 'vitest';
import { buildGrid, colName, parseAddr, Sheet } from '../engines/sheet';
import { gradeChart } from './chart';
import { gradePythonTests } from './python';
import { gradeSpreadsheet } from './spreadsheet';
import { countWords, gradeDiagram, gradeWritten } from './written';

describe('gradePythonTests', () => {
  it('passes when every test passes', () => {
    const r = gradePythonTests(JSON.stringify([{ name: 'test_a', label: 'A', passed: true, message: '' }]));
    expect(r.passed).toBe(true);
  });
  it('lists readable failure messages (common wrong answer)', () => {
    const r = gradePythonTests([
      { name: 'test_a', label: 'Shape', passed: true, message: '' },
      { name: 'test_b', label: 'No duplicates', passed: false, message: '45 emails still appear more than once' },
    ]);
    expect(r.passed).toBe(false);
    expect(r.summary).toBe('1 of 2 checks failed.');
    expect(r.details).toContain('✗ No duplicates: 45 emails still appear more than once');
  });
  it('edge case: unreadable or empty output fails safely', () => {
    expect(gradePythonTests('not json').passed).toBe(false);
    expect(gradePythonTests('[]').passed).toBe(false);
  });
});

describe('spreadsheet', () => {
  const csv = [
    ['region', 'units', 'price'],
    ['North', '10', '5'],
    ['South', '20', '2'],
    ['North', '5', '5'],
  ];
  const spec = { targets: [{ cell: 'E2', label: 'North units' }], requireFormula: true };
  const ref = new Sheet(buildGrid(csv, { D2: 'North' }, { E2: '=SUMIFS(B2:B4,A2:A4,D2)' }));

  it('passes a correct formula', () => {
    const user = new Sheet(buildGrid(csv, { D2: 'North' }, { E2: '=SUMIF(A2:A4,"north",B2:B4)' }));
    expect(gradeSpreadsheet(user, ref, spec).passed).toBe(true);
  });
  it('fails a wrong range (common wrong answer)', () => {
    const user = new Sheet(buildGrid(csv, { D2: 'North' }, { E2: '=SUMIFS(B3:B4,A3:A4,D2)' }));
    const r = gradeSpreadsheet(user, ref, spec);
    expect(r.passed).toBe(false);
    expect(r.details[0]).toMatch(/E2 \(North units\) shows 5/);
  });
  it('edge case: a typed-in correct number fails when formulas are required', () => {
    const user = new Sheet(buildGrid(csv, { D2: 'North' }, { E2: '15' }));
    expect(gradeSpreadsheet(user, ref, spec).details[0]).toMatch(/typed in/);
  });
  it('edge case: errors and empty cells are reported', () => {
    const user = new Sheet(buildGrid(csv, { D2: 'North' }, { E2: '=1/0' }));
    expect(gradeSpreadsheet(user, ref, spec).details[0]).toMatch(/error/);
    const blank = new Sheet(buildGrid(csv, { D2: 'North' }, {}));
    expect(gradeSpreadsheet(blank, ref, spec).details[0]).toMatch(/empty/);
  });
  it('addresses convert both ways', () => {
    expect(parseAddr('J11')).toEqual({ row: 10, col: 9 });
    expect(colName(27)).toBe('AB');
  });
});

describe('written and diagram', () => {
  const spec = { rubric: ['Headline', 'Action'], minWords: 5, maxWords: 20 };
  it('passes when long enough and every rubric item is ticked', () => {
    expect(gradeWritten('Revenue grew four times versus September.', [true, true], spec).passed).toBe(true);
  });
  it('fails with unticked rubric items (common wrong answer)', () => {
    const r = gradeWritten('Revenue grew four times versus September.', [true, false], spec);
    expect(r.passed).toBe(false);
    expect(r.details).toContain('✗ Action');
  });
  it('edge case: word limits', () => {
    expect(gradeWritten('Too short', [true, true], spec).passed).toBe(false);
    expect(gradeWritten('word '.repeat(25), [true, true], spec).passed).toBe(false);
    expect(countWords('  ')).toBe(0);
  });
  const dspec = { requiredTerms: ['pickup', ['QC', 'quality check']], rubric: ['Labelled exits'] };
  it('diagram passes with all terms (alternatives allowed)', () => {
    expect(gradeDiagram('A[Pickup] --> B{Quality check?}', [true], dspec).passed).toBe(true);
  });
  it('diagram fails with a missing step', () => {
    const r = gradeDiagram('A[Pickup] --> B[Refund]', [true], dspec);
    expect(r.passed).toBe(false);
    expect(r.details[0]).toMatch(/QC" or "quality check/);
  });
});

describe('gradeChart', () => {
  const expected = { columns: ['month', 'rev'], rows: [['2024-04', 10], ['2024-05', 20], ['2024-06', 15]] };
  const spec = { acceptedTypes: ['line' as const], typeFeedback: { pie: 'No pies for trends.' } };
  it('passes a line chart with differently formatted x labels', () => {
    const actual = { columns: ['m', 'r'], rows: [['2024-06-01', 15], ['2024-04-01', 10], ['2024-05-01', 20]] };
    expect(gradeChart(expected, actual, { type: 'line', x: 'm', y: 'r' }, spec).passed).toBe(true);
  });
  it('fails a pie chart with the right data (common wrong answer)', () => {
    const actual = { columns: ['m', 'r'], rows: expected.rows };
    const r = gradeChart(expected, actual, { type: 'pie', x: 'm', y: 'r' }, spec);
    expect(r.passed).toBe(false);
    expect(r.details).toContain('No pies for trends.');
  });
  it('edge case: x and y swapped or same column', () => {
    const actual = { columns: ['m', 'r'], rows: expected.rows };
    expect(gradeChart(expected, actual, { type: 'line', x: 'r', y: 'm' }, spec).passed).toBe(false);
    expect(gradeChart(expected, actual, { type: 'line', x: 'm', y: 'm' }, spec).passed).toBe(false);
  });
});
