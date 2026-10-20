import type { ChartGrading, ChartType } from '../content/types';
import { cellsEqual, normalizeCell } from './sql';
import { fail, pass, type Cell, type GradeResult, type ResultSet } from './types';

export interface ChartSelection {
  type: ChartType;
  x: string;
  y: string;
}

function sortCells(a: Cell, b: Cell): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

/**
 * Grades a chart built from the learner's query result. The expected result's first column is
 * the x-axis and its second the y-axis. The x labels may be formatted any way (2024-04 or
 * 2024-04-01), so y values are compared in x-sorted order.
 */
export function gradeChart(expected: ResultSet, actual: ResultSet, sel: ChartSelection, spec: ChartGrading): GradeResult {
  const details: string[] = [];
  const xi = actual.columns.indexOf(sel.x);
  const yi = actual.columns.indexOf(sel.y);
  if (xi === -1 || yi === -1) return fail('Pick an x field and a y field from your query result.');
  if (xi === yi) return fail('The x and y fields must be different columns.');

  const typeOk = spec.acceptedTypes.includes(sel.type);
  if (!typeOk) {
    details.push(spec.typeFeedback?.[sel.type] ?? `A ${sel.type} chart is not the best way to answer this question.`);
  }

  const exp = [...expected.rows].map((r) => [normalizeCell(r[0]), normalizeCell(r[1])]).sort((a, b) => sortCells(a[0], b[0]));
  const act = [...actual.rows].map((r) => [normalizeCell(r[xi]), normalizeCell(r[yi])]).sort((a, b) => sortCells(a[0], b[0]));
  let dataOk = true;
  if (act.length !== exp.length) {
    dataOk = false;
    details.push(`Your chart has ${act.length} points on the x-axis; expected ${exp.length}.`);
  } else {
    const bad = act.filter((p, i) => !cellsEqual(p[1], exp[i][1], spec.tolerance ?? 0.01)).length;
    if (bad > 0) {
      dataOk = false;
      details.push(`${bad} of ${exp.length} plotted values don't match. Check the query and that y is the measure, not the label.`);
    }
  }
  if (typeOk && dataOk) return pass(`Passed: a ${sel.type} chart of the right data answers the question.`);
  return fail(typeOk ? 'The chart type is right, but the data is not.' : 'Reconsider the chart type.', details);
}
