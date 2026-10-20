import { useSyncExternalStore } from 'react';

export interface LabProgress {
  attempts: number;
  passed: boolean;
  passedAt?: string;
  firstAttemptAt?: string;
  timeSpentSec: number;
  hintsUsed: number;
  solutionViewed: boolean;
}

export interface ProgressData {
  version: 1;
  labs: Record<string, LabProgress>;
}

const KEY = 'analyst-lab:progress:v1';
const DRAFT_PREFIX = 'analyst-lab:draft:';

const empty = (): ProgressData => ({ version: 1, labs: {} });
const emptyLab = (): LabProgress => ({ attempts: 0, passed: false, timeSpentSec: 0, hintsUsed: 0, solutionViewed: false });

function read(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as ProgressData;
    return parsed?.version === 1 && parsed.labs ? parsed : empty();
  } catch {
    return empty();
  }
}

let state: ProgressData = typeof localStorage === 'undefined' ? empty() : read();
const listeners = new Set<() => void>();

function commit(next: ProgressData) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep in memory */
  }
  listeners.forEach((l) => l());
}

export function labKey(trackId: string, labId: string): string {
  return `${trackId}/${labId}`;
}

export function updateLab(key: string, fn: (p: LabProgress) => LabProgress): void {
  const current = state.labs[key] ?? emptyLab();
  commit({ ...state, labs: { ...state.labs, [key]: fn(current) } });
}

export function recordAttempt(key: string, passed: boolean): void {
  const now = new Date().toISOString();
  updateLab(key, (p) => ({
    ...p,
    attempts: p.attempts + 1,
    firstAttemptAt: p.firstAttemptAt ?? now,
    passed: p.passed || passed,
    passedAt: p.passedAt ?? (passed ? now : undefined),
  }));
}

export function addTime(key: string, seconds: number): void {
  if (seconds > 0) updateLab(key, (p) => ({ ...p, timeSpentSec: p.timeSpentSec + seconds }));
}

export function useProgress(): ProgressData {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function getLabProgress(data: ProgressData, key: string): LabProgress {
  return data.labs[key] ?? emptyLab();
}

export function exportProgress(): string {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function importProgress(json: string): { ok: true; labs: number } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(json);
    if (parsed?.version !== 1 || typeof parsed.labs !== 'object') return { ok: false, error: 'Not an Analyst Lab progress file.' };
    const labs: Record<string, LabProgress> = {};
    for (const [k, v] of Object.entries(parsed.labs as Record<string, Partial<LabProgress>>)) {
      labs[k] = { ...emptyLab(), ...v };
    }
    commit({ version: 1, labs });
    return { ok: true, labs: Object.keys(labs).length };
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
}

export function resetProgress(): void {
  commit(empty());
}

export function loadDraft<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function saveDraft(key: string, value: unknown): void {
  try {
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    /* ignore */
  }
}
