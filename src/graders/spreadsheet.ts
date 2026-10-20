import type { SpreadsheetGrading } from '../content/types';
import { fail, pass, type GradeResult } from './types';

export type SheetValue = string | number | boolean | null | { error: string };

export interface SheetReader {
  /** Computed value of a cell, e.g. value('J2'). */
  value(addr: string): SheetValue;
  /** What was typed into the cell (formula text or literal). */
  raw(addr: string): string | number | null;
}

function show(v: SheetValue): string {
  if (v === null || v === '') return 'empty';
  if (typeof v === 'object') return v.error;
  return typeof v === 'number' ? String(Math.round(v * 100) / 100) : `"${v}"`;
}

export function gradeSpreadsheet(user: SheetReader, reference: SheetReader, spec: SpreadsheetGrading): GradeResult {
  const tol = spec.tolerance ?? 0.01;
  const details: string[] = [];
  let failures = 0;
  for (const t of spec.targets) {
    const got = user.value(t.cell);
    const want = reference.value(t.cell);
    const raw = user.raw(t.cell);
    let ok: boolean;
    if (typeof got === 'number' && typeof want === 'number') ok = Math.abs(got - want) <= tol;
    else if (typeof got === 'object' && got !== null) ok = false;
    else ok = String(got ?? '').trim().toLowerCase() === String(want ?? '').trim().toLowerCase();

    if (ok && spec.requireFormula && !(typeof raw === 'string' && raw.startsWith('='))) {
      failures++;
      details.push(`✗ ${t.cell} (${t.label}): the value is right but it is typed in. Use a formula so it updates when data changes.`);
      continue;
    }
    if (ok) {
      details.push(`✓ ${t.cell} (${t.label})`);
    } else {
      failures++;
      const why =
        got === null || got === ''
          ? 'is empty'
          : typeof got === 'object' && got !== null
            ? `shows an error (${got.error})`
            : `shows ${show(got)}, which is not right`;
      details.push(`✗ ${t.cell} (${t.label}) ${why}.`);
    }
  }
  if (failures === 0) return pass(`Passed: all ${spec.targets.length} target cells are correct.`, details);
  return fail(`${failures} of ${spec.targets.length} target cells are not right yet.`, details);
}
