export type Cell = string | number | boolean | null;

export interface ResultSet {
  columns: string[];
  rows: Cell[][];
}

export interface GradeResult {
  passed: boolean;
  summary: string;
  details: string[];
}

export const pass = (summary = 'Passed', details: string[] = []): GradeResult => ({ passed: true, summary, details });
export const fail = (summary: string, details: string[] = []): GradeResult => ({ passed: false, summary, details });
