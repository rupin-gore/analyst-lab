import Papa from 'papaparse';
import type { DatasetManifest } from '../content/types';

const manifests = new Map<string, Promise<DatasetManifest>>();
const csvCache = new Map<string, Promise<string[][]>>();

export function datasetUrl(dataset: string, file: string): string {
  return `${import.meta.env.BASE_URL}datasets/${dataset}/${file}`;
}

export function absoluteDatasetUrl(dataset: string, file: string): string {
  return new URL(datasetUrl(dataset, file), window.location.href).href;
}

export function getManifest(dataset: string): Promise<DatasetManifest> {
  if (!manifests.has(dataset)) {
    manifests.set(
      dataset,
      fetch(datasetUrl(dataset, 'manifest.json')).then((r) => {
        if (!r.ok) throw new Error(`Dataset ${dataset} not found`);
        return r.json();
      }),
    );
  }
  return manifests.get(dataset)!;
}

export function getCsv(dataset: string, file: string): Promise<string[][]> {
  const key = `${dataset}/${file}`;
  if (!csvCache.has(key)) {
    csvCache.set(
      key,
      fetch(datasetUrl(dataset, file))
        .then((r) => r.text())
        .then((t) => Papa.parse<string[]>(t.trim(), { skipEmptyLines: true }).data),
    );
  }
  return csvCache.get(key)!;
}
