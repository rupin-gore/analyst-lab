import { buildContent } from './loader';
import type { Lab, Track } from './types';

const files = import.meta.glob('/content/tracks/**/*.{json,sql,py,md,mmd}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

export const tracks: Track[] = buildContent(files);

export function getTrack(id: string): Track | undefined {
  return tracks.find((t) => t.id === id);
}

export function getLab(trackId: string, labId: string): Lab | undefined {
  return getTrack(trackId)?.labs.find((l) => l.id === labId);
}

export const allLabs: Lab[] = tracks.flatMap((t) => t.labs);
