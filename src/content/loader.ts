import type { Lab, LabFile, Track, TrackFile } from './types';

/**
 * Builds the track/lab tree from raw content files. Keys are paths like
 *   content/tracks/<track>/track.json
 *   content/tracks/<track>/labs/<lab>/lab.json
 *   content/tracks/<track>/labs/<lab>/solution.sql   (or .py, .json, .md, .mmd)
 *   content/tracks/<track>/labs/<lab>/starter.sql    (optional)
 *   content/tracks/<track>/labs/<lab>/tests.py       (python labs)
 *   content/tracks/<track>/labs/<lab>/wrong.sql      (optional: a common wrong answer that must fail)
 * Pure so the same code runs in Vite (import.meta.glob) and in Node tests (fs).
 */
export function buildContent(files: Record<string, string>): Track[] {
  const tracks = new Map<string, Track>();
  const labFiles = new Map<string, Record<string, string>>();

  for (const [rawPath, text] of Object.entries(files)) {
    const path = rawPath.replace(/\\/g, '/').replace(/^.*?content\/tracks\//, '');
    const parts = path.split('/');
    if (parts.length === 2 && parts[1] === 'track.json') {
      const t = JSON.parse(text) as TrackFile;
      if (t.id !== parts[0]) throw new Error(`track.json id "${t.id}" does not match folder "${parts[0]}"`);
      tracks.set(t.id, { ...t, labs: [] });
    } else if (parts.length === 4 && parts[1] === 'labs') {
      const key = `${parts[0]}/${parts[2]}`;
      const entry = labFiles.get(key) ?? {};
      entry[parts[3]] = text;
      labFiles.set(key, entry);
    }
  }

  for (const [key, entry] of labFiles) {
    const [trackId, folder] = key.split('/');
    const track = tracks.get(trackId);
    if (!track) throw new Error(`Lab ${key} has no track.json`);
    if (!entry['lab.json']) throw new Error(`Lab ${key} is missing lab.json`);
    const meta = JSON.parse(entry['lab.json']) as LabFile;
    if (meta.id !== folder) throw new Error(`lab.json id "${meta.id}" does not match folder "${folder}"`);
    const solutionName = Object.keys(entry).find((f) => f.startsWith('solution.'));
    if (!solutionName) throw new Error(`Lab ${key} is missing a solution file`);
    const starterName = Object.keys(entry).find((f) => f.startsWith('starter.'));
    const wrongName = Object.keys(entry).find((f) => f.startsWith('wrong.'));
    const lab: Lab = {
      ...meta,
      trackId,
      solution: entry[solutionName],
      starter: starterName ? entry[starterName] : undefined,
      tests: entry['tests.py'],
      wrong: wrongName ? entry[wrongName] : undefined,
    };
    if (lab.workspace === 'python' && !lab.tests) throw new Error(`Python lab ${key} is missing tests.py`);
    track.labs.push(lab);
  }

  const result = [...tracks.values()].sort((a, b) => a.order - b.order);
  for (const t of result) t.labs.sort((a, b) => a.order - b.order);
  return result;
}
