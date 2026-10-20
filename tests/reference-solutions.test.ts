/**
 * Runs every lab's reference solution through its own grader, and checks that the optional
 * wrong.* answer (a common mistake) fails. Adding a lab adds its tests automatically.
 */
import { describe, expect, it } from 'vitest';
import type { Lab } from '../src/content/types';
import { buildGrid, Sheet } from '../src/engines/sheet';
import { gradeChart } from '../src/graders/chart';
import { gradePythonTests } from '../src/graders/python';
import { gradeSpreadsheet } from '../src/graders/spreadsheet';
import { compareResults } from '../src/graders/sql';
import type { GradeResult } from '../src/graders/types';
import { gradeDiagram, gradeWritten } from '../src/graders/written';
import { loadContent, manifest, readCsv, runPythonLab, sqlRunner } from './helpers';

const tracks = loadContent();
const labs = tracks.flatMap((t) => t.labs);

async function grade(lab: Lab, answer: string): Promise<GradeResult> {
  switch (lab.workspace) {
    case 'sql': {
      const run = await sqlRunner(lab.data);
      const expected = await run(lab.solution);
      expect(expected.rows.length, 'reference returns rows').toBeGreaterThan(0);
      return compareResults(expected, await run(answer), lab.grading.sql);
    }
    case 'chart': {
      const run = await sqlRunner(lab.data);
      const expected = await run(lab.solution);
      const actual = await run(answer);
      const spec = lab.grading.chart!;
      return gradeChart(expected, actual, { type: spec.acceptedTypes[0], x: actual.columns[0], y: actual.columns[1] }, spec);
    }
    case 'python': {
      const res = await runPythonLab(lab.data, answer, lab.tests!);
      const g = gradePythonTests(res.tests);
      if (res.errors.length) g.details.unshift(...res.errors);
      return g;
    }
    case 'spreadsheet': {
      const ref = lab.data[0];
      const csv = readCsv(ref.dataset, manifest(ref.dataset).tables[ref.tables[0]].file);
      const reference = new Sheet(buildGrid(csv, lab.sheetSetup, JSON.parse(lab.solution)));
      const user = new Sheet(buildGrid(csv, lab.sheetSetup, JSON.parse(answer)));
      return gradeSpreadsheet(user, reference, lab.grading.spreadsheet!);
    }
    case 'written':
      return gradeWritten(answer, lab.grading.written!.rubric.map(() => true), lab.grading.written!);
    case 'diagram':
      return gradeDiagram(answer, lab.grading.diagram!.rubric.map(() => true), lab.grading.diagram!);
  }
}

describe('content', () => {
  it('loads tracks and labs', () => {
    expect(tracks.length).toBeGreaterThan(1);
    expect(labs.length).toBeGreaterThan(0);
  });
  it('every lab references datasets and tables that exist', () => {
    for (const lab of labs) {
      for (const ref of lab.data) {
        const m = manifest(ref.dataset);
        for (const t of ref.tables) expect(m.tables[t], `${lab.id}: ${ref.dataset}.${t}`).toBeDefined();
      }
    }
  });
  it('lab ids are unique within each track and have hints', () => {
    for (const t of tracks) {
      const ids = t.labs.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const l of t.labs) expect(l.hints.length, l.id).toBeGreaterThan(0);
    }
  });
});

describe.each(labs.map((l) => [`${l.trackId}/${l.id}`, l] as const))('%s', (_name, lab) => {
  it('reference solution passes its grader', async () => {
    const r = await grade(lab, lab.solution);
    expect(r.passed, `${r.summary}\n${r.details.join('\n')}`).toBe(true);
  }, 300_000);

  if (lab.wrong) {
    it('common wrong answer fails its grader', async () => {
      const r = await grade(lab, lab.wrong!);
      expect(r.passed, 'wrong answer should not pass').toBe(false);
    }, 300_000);
  }
});
