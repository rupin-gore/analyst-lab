import type { Track } from '../content/types';
import { getLabProgress, labKey, type ProgressData } from './progress';

export function trackStats(track: Track, data: ProgressData) {
  const total = track.labs.length;
  let passed = 0;
  let attempted = 0;
  let seconds = 0;
  for (const lab of track.labs) {
    const p = getLabProgress(data, labKey(track.id, lab.id));
    if (p.passed) passed++;
    if (p.attempts > 0) attempted++;
    seconds += p.timeSpentSec;
  }
  return { total, passed, attempted, seconds, ratio: total ? passed / total : 0 };
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
