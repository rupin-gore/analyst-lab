import type { Lab } from '../content/types';
import type { GradeResult } from '../graders/types';

export interface WorkspaceProps {
  lab: Lab;
  /** Key for drafts and progress, e.g. "foundations/sql-net-revenue-by-state". */
  storageKey: string;
  onGraded: (r: GradeResult) => void;
  /** True once the learner has attempted; enables "Load reference solution". */
  solutionUnlocked: boolean;
}
