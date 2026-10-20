import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'analyst-lab:theme';

function current(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

const listeners = new Set<(t: Theme) => void>();

export function setTheme(t: Theme): void {
  document.documentElement.classList.toggle('dark', t === 'dark');
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(t));
}

export function useTheme(): Theme {
  const [t, setT] = useState<Theme>(current);
  useEffect(() => {
    listeners.add(setT);
    return () => {
      listeners.delete(setT);
    };
  }, []);
  return t;
}
