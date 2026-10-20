import { DetailedCellError, HyperFormula } from 'hyperformula';
import type { SheetReader, SheetValue } from '../graders/spreadsheet';

export type RawCell = string | number | null;

export function colName(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function parseAddr(addr: string): { row: number; col: number } {
  const m = /^([A-Z]+)(\d+)$/i.exec(addr.trim());
  if (!m) throw new Error(`Bad cell address: ${addr}`);
  let col = 0;
  for (const ch of m[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: Number(m[2]) - 1, col: col - 1 };
}

export function addrOf(row: number, col: number): string {
  return `${colName(col)}${row + 1}`;
}

/** Typed text → what HyperFormula should store. */
export function coerce(input: string | number | null): RawCell {
  if (input === null) return null;
  if (typeof input === 'number') return input;
  const s = input.trim();
  if (s === '') return null;
  if (s.startsWith('=')) return s;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return input;
}

/** Lays out the CSV at A1, then the lab's label cells, then the learner's edits. */
export function buildGrid(csv: string[][], setup: Record<string, string | number> = {}, edits: Record<string, string> = {}, minRows = 40, minCols = 11): RawCell[][] {
  const grid: RawCell[][] = [];
  const ensure = (r: number, c: number) => {
    while (grid.length <= r) grid.push([]);
    for (const row of grid) while (row.length <= c) row.push(null);
  };
  ensure(minRows - 1, minCols - 1);
  csv.forEach((row, r) =>
    row.forEach((v, c) => {
      ensure(r, c);
      grid[r][c] = r === 0 ? v : coerce(v);
    }),
  );
  for (const [addr, v] of [...Object.entries(setup), ...Object.entries(edits)]) {
    const { row, col } = parseAddr(addr);
    ensure(row, col);
    grid[row][col] = coerce(v);
  }
  return grid;
}

export class Sheet implements SheetReader {
  readonly hf: HyperFormula;
  constructor(grid: RawCell[][]) {
    this.hf = HyperFormula.buildFromArray(grid, { licenseKey: 'gpl-v3', useArrayArithmetic: true });
  }
  value(addr: string): SheetValue {
    const { row, col } = parseAddr(addr);
    const v = this.hf.getCellValue({ sheet: 0, row, col });
    if (v instanceof DetailedCellError) return { error: v.value };
    return v as SheetValue;
  }
  raw(addr: string): string | number | null {
    const { row, col } = parseAddr(addr);
    const v = this.hf.getCellSerialized({ sheet: 0, row, col });
    return v === undefined || v === null ? null : (v as string | number);
  }
  set(addr: string, input: string): void {
    const { row, col } = parseAddr(addr);
    this.hf.setCellContents({ sheet: 0, row, col }, [[coerce(input)]]);
  }
  size(): { rows: number; cols: number } {
    const d = this.hf.getSheetDimensions(0);
    return { rows: d.height, cols: d.width };
  }
  destroy(): void {
    this.hf.destroy();
  }
}
