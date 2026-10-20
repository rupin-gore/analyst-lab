import type { DiagramGrading, WrittenGrading } from '../content/types';
import { fail, pass, type GradeResult } from './types';

export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

/** Written answers: the learner ticks the rubric honestly; we check length and give term nudges. */
export function gradeWritten(text: string, checked: boolean[], spec: WrittenGrading): GradeResult {
  const words = countWords(text);
  const details: string[] = [];
  if (spec.minWords && words < spec.minWords) {
    return fail(`Your answer has ${words} words; write at least ${spec.minWords}.`);
  }
  if (spec.maxWords && words > spec.maxWords) {
    return fail(`Your answer has ${words} words; stakeholders skim, so keep it under ${spec.maxWords}.`);
  }
  const missing = spec.rubric.filter((_, i) => !checked[i]);
  const lower = text.toLowerCase();
  const absent = (spec.suggestedTerms ?? []).filter((t) => !lower.includes(t.toLowerCase()));
  if (absent.length) details.push(`Consider mentioning: ${absent.join(', ')}.`);
  if (missing.length) {
    return fail(`${missing.length} rubric item${missing.length === 1 ? '' : 's'} not met yet.`, [
      ...missing.map((m) => `✗ ${m}`),
      ...details,
    ]);
  }
  return pass('Passed: every rubric item is met. Compare with the model answer below.', details);
}

/** Diagrams: required terms must appear in the Mermaid source, plus a self-ticked rubric. */
export function gradeDiagram(source: string, checked: boolean[], spec: DiagramGrading): GradeResult {
  const lower = source.toLowerCase();
  const missingTerms = spec.requiredTerms.filter((t) => {
    const alts = Array.isArray(t) ? t : [t];
    return !alts.some((a) => lower.includes(a.toLowerCase()));
  });
  const details: string[] = missingTerms.map(
    (t) => `✗ The diagram does not mention "${Array.isArray(t) ? t.join('" or "') : t}".`,
  );
  const missingRubric = spec.rubric.filter((_, i) => !checked[i]);
  details.push(...missingRubric.map((m) => `✗ ${m}`));
  if (details.length === 0) return pass('Passed: all required steps are present. Compare with the example below.');
  return fail(`${missingTerms.length + missingRubric.length} item(s) still missing.`, details);
}
