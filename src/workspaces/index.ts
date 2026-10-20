import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { WorkspaceKind } from '../content/types';
import type { WorkspaceProps } from './types';

/** Each workspace is its own chunk, so DuckDB, Pyodide, Monaco and Mermaid load only where needed. */
export const workspaces: Record<WorkspaceKind, LazyExoticComponent<ComponentType<WorkspaceProps>>> = {
  sql: lazy(() => import('./SqlWorkspace')),
  python: lazy(() => import('./PythonWorkspace')),
  spreadsheet: lazy(() => import('./SpreadsheetWorkspace')),
  written: lazy(() => import('./WrittenWorkspace')),
  diagram: lazy(() => import('./DiagramWorkspace')),
  chart: lazy(() => import('./ChartWorkspace')),
};

export const workspaceLabel: Record<WorkspaceKind, string> = {
  sql: 'SQL',
  python: 'Python',
  spreadsheet: 'Spreadsheet',
  written: 'Written',
  diagram: 'Diagram',
  chart: 'Chart',
};
