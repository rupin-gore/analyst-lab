# Analyst Lab

Learn entry-level analyst roles by doing their real tasks on realistic Indian business data, with every answer graded automatically. It runs entirely in the browser: no backend, no login, and progress is saved in `localStorage`.

Each **track** is a role. Each **lab** has a short stakeholder scenario, a dataset, a task, an in-browser workspace, an automatic grader, hints revealed one at a time, a worked solution and an interview talking point.

| Workspace | Engine | Graded on |
|---|---|---|
| SQL | DuckDB-WASM + Monaco | Result set vs the reference query (row order ignored unless the task sorts; aliases ignored; float tolerance) |
| Python | Pyodide (pandas, numpy; scipy on import) | Hidden assert-based tests |
| Spreadsheet | HyperFormula | Values of named target cells (optionally requiring formulas) |
| Chart | DuckDB + Recharts | Chart type plus the plotted data |
| Diagram | Mermaid | Required steps present plus a self-ticked rubric |
| Written | — | Word limits plus a self-ticked rubric (an AI-feedback hook is ready but off) |

DuckDB, Pyodide, Monaco and Mermaid load lazily, only on labs that need them.

## Run it

Requires Node 20.19+ (or 22.12+) and Python 3.10+ (Python is only needed to regenerate data).

```bash
npm install
npm run dev        # http://localhost:5173
```

The first Python lab downloads Pyodide (~10 MB) from the jsDelivr CDN, after which the browser caches it.

## Test

```bash
npm test           # grader unit tests + every lab's reference solution (and its planted wrong answer)
npx playwright install chromium   # once
npm run test:e2e   # smoke test: home page, one SQL lab, one Python lab
npm run build      # type-check + production build
```

`npm test` runs Python labs in Pyodide under Node. On the first run it downloads pandas from the CDN, so it needs internet access once.

## Add a lab

Write a content folder; no component code changes. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Regenerate data

```bash
npm run data       # python data-gen/generate_all.py
```

The generators are seeded and use only the Python standard library, so the CSVs are byte-identical on every run. See [data-gen/README.md](data-gen/README.md) for the planted data problems.

## Project layout

```
content/tracks/<track>/track.json             role overview, capstone, interview bank
content/tracks/<track>/labs/<lab>/            one folder per lab (see CONTRIBUTING.md)
data-gen/                                     seeded dataset generators
public/datasets/<dataset>/                    generated CSVs + manifest.json (schema shown in the UI)
src/graders/                                  pure grading functions (+ *.test.ts)
src/engines/                                  DuckDB, Pyodide worker, HyperFormula sheet
src/workspaces/                               one lazy-loaded component per workspace type
src/pages/                                    Home, Track, Lab, Progress
tests/reference-solutions.test.ts             runs every lab's reference solution through its grader
e2e/smoke.spec.ts                             Playwright smoke test
```

## Status

- **Phase 1 (done):** platform, all six workspaces, graders with tests, progress storage with export/import, Foundations track with one sample lab per workspace type.
- **Phase 2:** Data Analyst, Business Analyst and Product Analyst tracks in full.
- **Phase 3:** remaining tracks.
- **Phase 4:** skills map, readiness scores, search, accessibility and Lighthouse pass.

All companies, people and figures are fictional.
