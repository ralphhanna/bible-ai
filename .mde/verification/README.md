# .mde/verification — verification machinery

Machinery for the verification model. **Invoked by evaluate/go; NOT read by the AI**
(it lives outside `method/` so it never burns the AI's method-load context). The
*checks themselves* live as `check` blocks in each feature's `## Checks` under
`method/features/` — those the AI reads.

## The four gates (the strategy)

```
plan → target → manifest → artifact → quality
```

| # | Failure mode | Kind |
|---|---|---|
| 1 | A required target is absent from the plan | plan-level (built-in) |
| 2 | A manifest artifact has no capability trace | plan-level (built-in) |
| 3 | A manifest entry produced no file | plan-level (built-in) |
| 4 | An artifact is flawed / non-compliant | authored `check` blocks |

## Scope = how often a check runs (its only meaning)

A `check` block declares its scope in the fence:

- **`scope=item`** — runs **once per manifest item** this capability produced;
  `$item` is bound each iteration. The common #4 case (quality of each artifact).
- **`scope=plan`** — runs **once** for the whole plan. The check iterates whatever
  set it needs **as data** — `$plan.trace` (all items), `$plan.entities`, `$manifest`.
  Use for cross-cutting scans (a trace header on all source, whoever produced it)
  and set-level checks.
- **`scope=system`** — runs **once**, independent of any plan — for whole-app
  completeness questions with no owning plan (e.g. "does every entity have a
  Maintenance panel somewhere"; the entity and its covering page may come from two
  different plans, so no per-plan manifest can answer it). Only evaluated under
  `mde review app` (`--app-wide`); never at `evaluate`/`go`. Body is normally an
  `ASK` — the AI reads the relevant spec trees itself; there is no `$app` join
  primitive (deliberately — see `.mde/mde.specs/design/verification.md`). A `WHEN`
  guard, if present, is that check's OWN readiness gate, independent of the blanket
  `--app-wide` gate (e.g. don't ask about coverage until a coverage report exists).

"Scan all items" is **not** a scope — it's a `scope=plan` check reaching into
`$plan.trace`. There is no per-item "check everything" mode.

## The verbs

```
# scope=item — per manifest item
WHEN  <cond> [AND <cond>]      THEN <cond> [AND <cond>]  [ELSE "<complaint>"]

# scope=plan — run once; iterate a set
EVERY $x IN <set> [WHERE <cond>]   THEN <cond>  [ELSE "<complaint>"]

# either — pose a question to the AI instead of asserting
... ASK "question with ${$paths} the AI must answer/confirm/fix"

operators: IS  IN  CONTAINS  MATCHES  EXISTS  INTERSECT   (prefix NOT to negate)
```

- **`THEN`** → deterministic assertion. Fails → `[FAIL]` (the script decides).
- **`ASK`** → the script fills `${$path}` data into the question; the **AI** must
  answer it in the loop. Emits `[ASK]`. This is how semantic checks (UI design
  fidelity, field-vs-entity alignment) work: script does the mechanics, AI judges.
- Both `[FAIL]` and `[ASK]` block a clean pass (the repair loop).

## The `$` model

- `$item` — the current manifest item (scope=item): `{type, path, content, capability,
  action, status, entity, page, dataFields}`. `entity`/`page` derived from the item's
  `source.refs`; `content` structured for JSON, raw text otherwise.
- `$this` — the owning capability `{name}`.
- `$plan` — `{loaded, required, excluded, missing, capabilities, entities, trace}`.
  `entities`/`trace` are derived from THIS plan's manifest (the plan knows what it
  touched — no global scan).
- `$techStack` — `{targets, operations}` (the applicability universe for #1;
  `operations` is the standard-root-operations contract, one entry per required key).
- `$spec` — **lazy, keyed**: `$spec.entity["employee"]`, `$spec.page["employee-directory"]`
  read one file on access (cached). Never scans the specs tree.
- `$app` — whole-app, plan-independent (scope=system only). Deliberately minimal:
  `$app.hasFile["specs/design/UI/operation-coverage.md"] IS "true"` (lazy/keyed, like
  `$spec`; "true"/"false" strings, the model's boolean convention — not `EXISTS`, which
  tests presence/non-emptiness and would treat a confirmed `false` the same as unset) is
  the only primitive — a `WHEN` readiness guard, not a join. The ASK body itself does
  the whole-app reading (no `$app.entities`/`$app.pages` join fields).
- EVERY loop var (`$e`, `$t`) binds the current set element, addressable in the rule.

## Examples (real, in the capabilities)

```
# scope=item — audited entity's own migration has audit columns (spec-vs-artifact)
WHEN  $item.type IS "migration"  AND  $spec.entity[$item.entity].aspects CONTAINS "Audit"
THEN  $item.content CONTAINS "created_at"

# scope=plan — every governed source file has a valid trace header (cross-cutting)
EVERY $t IN $plan.trace WHERE $t.type IS "source" AND $t.path MATCHES "\.(ts|tsx)$"
THEN  $t.content MATCHES "MDE trace"

# scope=plan + ASK — validate the UI design against the entity (semantic → AI)
EVERY $t IN $plan.trace WHERE $t.path MATCHES "specs/design/UI/pages/.*\.md$" AND $t.entity EXISTS
ASK   "Confirm every field ${$t.dataFields} exists on ${$t.entity} (has ${$spec.entity[$t.entity].properties})."
```

## Files

Two orchestrators, each importing from focused modules that do one thing (no target/
feature-specific logic lives in any of them — target ids come from `targets/
catalogue.json` or a target's own `when` column; suite names are discovered from
disk/manifest, never a hardcoded list — this is RULE-CORE-001, audited by
`mde review method` step 2a):

- `operators.mjs` — the fixed operator vocabulary (`IS`/`IN`/`CONTAINS`/…).
- `model.mjs` — **orchestrator.** `buildModel()` assembles `$manifest/$plan/$techStack/
  $app/$spec` by calling into:
  - `manifest-item.mjs` — read the manifest, build `$item` objects, entity/page trace joins.
  - `target-catalogue.mjs` — tech-stack/loaded/excluded/required targets, a target's
    `## Outputs` table, spec-instance enumeration, the standard-root-operations contract
    (`techStackOperations()`, backs `$techStack.operations`).
  - `spec-parser.mjs` — `$spec`: lazy entity / business-rule / page-spec parsing.
  - `plan-builders.mjs` — per-plan derived pieces (server slices, migrations, test
    evidence, coverage incl. cosplay detection, cross-slice imports).
  - `$app` (scope=system's root) is built inline in `model.mjs` — deliberately minimal
    (`hasFile` only), no dedicated module.
- `verificationRunner.mjs` — **orchestrator.** `run()` discovers relevant capabilities,
  runs their checks against the model, applies the plan-level gates (#1/#2/#3), prints/
  writes the result. `node verificationRunner.mjs <root> <planDir>`. `runAppWide()` is the
  separate `scope=system` path — no plan, no target-relevance gate, `node
  verificationRunner.mjs <root> --app-wide`. Both call into:
  - `capability-parser.mjs` — read a capability file's id/impacts/Checks bullets/```check fences.
  - `dsl-evaluator.mjs` — parse a check block into rules, resolve `$`-paths, evaluate a
    rule to emit fail/ask complaints.
  - `report-writer.mjs` — `writeReport()` (per-plan) and `writeSystemReport()` (scope=system).
  - `format-helpers.mjs` — stdout summary printer, mandated-output path matching,
    report text helpers (status lines, anchors, ref links, grouping).
- `verificationRunner.test.mjs` — self-test (`node --test`); imports only `buildModel`
  from `model.mjs`, so it is unaffected by which internal module something lives in.

## The loop (script ↔ AI ↔ user)

`[FAIL]` = repair the artifact. `[ASK]` = the AI answers/confirms, or the finding is
excused (`- target: X · reason: … · ref: …` under `## Excluded targets` in scope.md,
which the user confirms). Unresolved fails/asks = the plan can't reach `executed`.

## Not yet wired

- Into `evaluate`/`go` as the repair gate (red = can't finish).
- A `mde verify [plan]` CLI (currently: `node verificationRunner.mjs <root> <planDir>`; use
  the `C:/…` path form on Windows, not `/c/…`).
- Most `scope=system` migrations — only `page-composition.md`'s Maintenance-panel check
  has moved so far. `validateOperationCoverage`, `validateBusinessRules`,
  `validateUiDesign` are still hand-coded in `validate-project-contract.mjs`; see
  `.mde/mde.specs/design/verification.md` for the migration order.
