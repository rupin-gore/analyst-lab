import { fail, pass, type GradeResult } from './types';

export interface PyTestResult {
  name: string;
  label: string;
  passed: boolean;
  message: string;
}

/** Turns the JSON emitted by the Python test harness into a grade. */
export function gradePythonTests(raw: string | PyTestResult[]): GradeResult {
  let results: PyTestResult[];
  try {
    results = typeof raw === 'string' ? (JSON.parse(raw) as PyTestResult[]) : raw;
  } catch {
    return fail('The test harness returned something unreadable.', [String(raw).slice(0, 300)]);
  }
  if (!Array.isArray(results) || results.length === 0) {
    return fail('No tests ran. This lab is misconfigured.');
  }
  const failed = results.filter((r) => !r.passed);
  if (failed.length === 0) return pass(`Passed: all ${results.length} checks passed.`, results.map((r) => `✓ ${r.label}`));
  return fail(`${failed.length} of ${results.length} checks failed.`, [
    ...results.filter((r) => r.passed).map((r) => `✓ ${r.label}`),
    ...failed.map((r) => `✗ ${r.label}: ${r.message}`),
  ]);
}
