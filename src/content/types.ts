export type WorkspaceKind = 'sql' | 'python' | 'spreadsheet' | 'written' | 'diagram' | 'chart';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface DataRef {
  dataset: string;
  tables: string[];
}

export interface SqlGrading {
  ordered?: boolean;
  tolerance?: number;
}

export interface SpreadsheetGrading {
  targets: { cell: string; label: string }[];
  tolerance?: number;
  requireFormula?: boolean;
}

export interface WrittenGrading {
  rubric: string[];
  minWords?: number;
  maxWords?: number;
  suggestedTerms?: string[];
}

export interface DiagramGrading {
  /** Each entry must appear in the diagram source; an array means any one of the alternatives. */
  requiredTerms: (string | string[])[];
  rubric: string[];
}

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter';

export interface ChartGrading {
  acceptedTypes: ChartType[];
  typeFeedback?: Partial<Record<ChartType, string>>;
  tolerance?: number;
}

export interface Grading {
  sql?: SqlGrading;
  spreadsheet?: SpreadsheetGrading;
  written?: WrittenGrading;
  diagram?: DiagramGrading;
  chart?: ChartGrading;
}

/** What a content author writes in lab.json. */
export interface LabFile {
  id: string;
  title: string;
  order: number;
  difficulty: Difficulty;
  minutes: number;
  skills: string[];
  workspace: WorkspaceKind;
  company: string;
  stakeholder: { name: string; role: string };
  scenario: string;
  task: string;
  data: DataRef[];
  hints: string[];
  explanation: string;
  interview: string;
  grading: Grading;
  /** Spreadsheet only: extra cells (labels) placed on the sheet next to the data. */
  sheetSetup?: Record<string, string | number>;
  /** Written only: facts the writer should use, shown as a table. */
  facts?: { label: string; value: string }[];
}

export interface Lab extends LabFile {
  trackId: string;
  /** Reference solution: SQL, Python, JSON (spreadsheet formulas), Markdown or Mermaid. */
  solution: string;
  starter?: string;
  /** Python only: hidden tests. */
  tests?: string;
  /** A common wrong answer; the reference-solution test checks that it fails. */
  wrong?: string;
}

export interface InterviewQuestion {
  type: 'Technical' | 'Case' | 'Guesstimate' | 'Behavioural';
  q: string;
  a: string;
}

export interface Capstone {
  title: string;
  brief: string;
  deliverables: string[];
  steps: string[];
  template: { filename: string; content: string };
}

export interface TrackFile {
  id: string;
  title: string;
  short: string;
  order: number;
  status: 'ready' | 'planned';
  role?: {
    day: string;
    teams: string[];
    tools: string[];
    keywords: string[];
  };
  capstone?: Capstone;
  interview?: InterviewQuestion[];
}

export interface Track extends TrackFile {
  labs: Lab[];
}

export interface DatasetManifest {
  id: string;
  title: string;
  description: string;
  tables: Record<string, { file: string; rows: number; columns: { name: string; type: string; description: string }[] }>;
}
