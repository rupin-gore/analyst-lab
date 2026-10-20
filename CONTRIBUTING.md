# Adding content

Labs, tracks and datasets are plain files. The app discovers them at build time with `import.meta.glob`, and `npm test` checks every one automatically. You never need to edit component code to add a lab.

## 1. Add a lab

Create a folder: `content/tracks/<track-id>/labs/<lab-id>/` (the folder name must equal `id` in `lab.json`).

| File | Required | Purpose |
|---|---|---|
| `lab.json` | yes | Metadata, scenario, task, hints, explanation, interview note, grading spec |
| `solution.<ext>` | yes | Reference answer: `.sql`, `.py`, `.json` (spreadsheet formulas), `.mmd` (Mermaid), `.md` (written) |
| `starter.<ext>` | no | What the editor starts with |
| `tests.py` | Python labs | Hidden tests (see below) |
| `wrong.<ext>` | recommended | A **common wrong answer**; the test suite checks that it fails, which proves your trap works |

### `lab.json`

```jsonc
{
  "id": "sql-net-revenue-by-state",
  "title": "FY2024-25 net revenue by state",
  "order": 1,                                   // position in the track
  "difficulty": "Beginner",                     // Beginner | Intermediate | Advanced
  "minutes": 20,
  "skills": ["SQL joins", "Aggregation"],       // used for the skills map
  "workspace": "sql",                           // sql | python | spreadsheet | chart | diagram | written
  "company": "Bazaarly",                        // fictional
  "stakeholder": { "name": "Meenal Rao", "role": "Finance Controller" },
  "scenario": "3–5 sentences of Markdown, ending with the stakeholder's ask as a > quote.",
  "task": "Exactly what to produce: columns, filters, sort order.",
  "data": [{ "dataset": "bazaarly", "tables": ["orders", "customers"] }],
  "hints": ["Revealed one at a time, from gentle to specific."],
  "explanation": "Worked-solution notes shown after an attempt.",
  "interview": "A STAR-style sentence the learner can adapt.",
  "grading": { "sql": { "ordered": true, "tolerance": 0.01 } }
}
```

Grading spec per workspace:

- **sql**: `{ "sql": { "ordered": true|false, "tolerance": 0.01 } }`. The learner's result is compared with the result of `solution.sql`. Set `ordered` only when the task asks for a sort.
- **chart**: `{ "chart": { "acceptedTypes": ["line"], "typeFeedback": { "pie": "why not" } } }`. `solution.sql` must return the x column first and the y column second.
- **python**: `{}`. Grading lives in `tests.py`.
- **spreadsheet**: `{ "spreadsheet": { "targets": [{ "cell": "J2", "label": "North units" }], "requireFormula": true } }` plus `"sheetSetup": { "I2": "North" }` for label cells. The dataset's first table is placed at A1. `solution.json` maps cells to formulas.
- **diagram**: `{ "diagram": { "requiredTerms": ["pickup", ["QC", "quality check"]], "rubric": ["…"] } }`. A nested array means any one of those terms.
- **written**: `{ "written": { "rubric": ["…"], "minWords": 60, "maxWords": 120, "suggestedTerms": ["…"] } }`. Optional `"facts": [{ "label": "…", "value": "…" }]` shows a facts table.

### Python `tests.py`

Every `test_*` function runs after the learner's cells, in a copy of their namespace. Use its docstring's first line as the label shown to the learner, and write assertion messages that say **what is wrong without giving the answer**. `_fresh("customers")` returns an untouched copy of a dataset table for computing expected values.

```python
def test_no_duplicate_emails():
    """One row per email (ignoring case)"""
    d = clean["email"].str.lower().duplicated().sum()
    assert d == 0, f"{d} emails still appear more than once"
```

In `starter.py` and `solution.py`, a line starting with `# %%` splits notebook cells.

## 2. Add a dataset

1. Write `data-gen/<dataset>.py` with a `DATASET` name, a fixed `SEED` and a `generate()` that calls `write_csv` and `write_manifest` from `common.py`. Standard library only.
2. Register it in `data-gen/generate_all.py`.
3. Run `npm run data`, then commit both the script and the generated files in `public/datasets/<dataset>/`.

Make the data feel Indian and realistic (INR, Indian cities and states, Diwali and March year-end peaks, UPI, GST where relevant). Plant realistic problems on purpose (duplicates, nulls, mislabels, outliers, timezones) and include at least one trap a careless analyst would miss. Document the traps in the generator's docstring, not in the UI.

## 3. Add or fill a track

`content/tracks/<track-id>/track.json`:

```jsonc
{
  "id": "data-analyst",
  "title": "Data Analyst",
  "short": "One-line description",
  "order": 2,
  "status": "ready",            // "planned" shows it greyed out on the home page
  "role": { "day": "Markdown", "teams": [], "tools": [], "keywords": ["15 JD keywords"] },
  "capstone": { "title": "", "brief": "", "steps": [], "deliverables": [], "template": { "filename": "", "content": "" } },
  "interview": [{ "type": "Technical", "q": "", "a": "Markdown model answer" }]
}
```

## 4. Check

```bash
npm test          # your reference solution must pass and your wrong.* must fail
npm run dev       # try the lab in the browser
```
