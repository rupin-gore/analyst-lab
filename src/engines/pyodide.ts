export interface CellOutput {
  stdout: string;
  display: { kind: 'html' | 'text'; text: string } | null;
  error: string | null;
}

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

class PyClient {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private ready: Promise<void> | null = null;
  private statusListeners = new Set<(s: string) => void>();
  private currentFiles = '';

  onStatus(fn: (s: string) => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private call<T>(msg: Record<string, unknown>): Promise<T> {
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker!.postMessage({ ...msg, id });
    });
  }

  init(): Promise<void> {
    if (!this.ready) {
      this.worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e) => {
        const d = e.data;
        if (d.type === 'status') return this.statusListeners.forEach((fn) => fn(d.text));
        const p = this.pending.get(d.id);
        if (!p) return;
        this.pending.delete(d.id);
        if (d.ok) p.resolve(d.result);
        else p.reject(new Error(d.error));
      };
      this.ready = this.call<void>({ type: 'init' }).catch((e) => {
        this.ready = null;
        this.worker?.terminate();
        throw e;
      });
    }
    return this.ready;
  }

  async setFiles(files: { name: string; url: string }[]): Promise<void> {
    await this.init();
    const key = JSON.stringify(files);
    if (key === this.currentFiles) return this.reset();
    await this.call({ type: 'files', files });
    this.currentFiles = key;
  }

  async reset(): Promise<void> {
    await this.call({ type: 'reset' });
  }

  async run(code: string): Promise<CellOutput> {
    await this.init();
    return this.call<CellOutput>({ type: 'run', code });
  }

  async test(cells: string[], tests: string): Promise<{ errors: string[]; tests: string }> {
    await this.init();
    return this.call({ type: 'test', cells, tests });
  }
}

export const python = new PyClient();
