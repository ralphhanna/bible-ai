---
type: command
command: mde review method
loads:
  - rules/core/*
  - rules/workflow/*
  - method features
  - method targets
---

# mde review method

Purpose: review the **method's own internal consistency** — that the compiled
`targets/` are in sync with their source `features/`, and that the feature files
are valid. This is the method-internal analog of `mde review app` (which reviews the app
against Specs). It **reports**; it makes no changes.

The model: a **feature** is the source of truth; a **target** is derived from it by the
compiler (`compile-targets.mjs`) — skeleton (authored: id / applies_when / Purpose) plus
the contributing features' `Impact on <target>` and `Checks`, each tagged
`[feature: <id>]`. So `.mde/method/features/` is **governed source** exactly like
`specs/` is for the app: edit a feature and the compiled targets are **stale until
recompiled** — that staleness is **drift**, the same class as editing a spec without
reconciling the app.

**Commands are authored directly, not compiled** — they are governed source with no
derived artifact, so there is no drift check for them (nothing to be stale against).
Instead they are audited **on their own content**: a command must stay target-agnostic
(RULE-CORE-001, step 2a) — the discipline for commands is *what they must not contain*,
not *whether they match a compiled output*.

## Load

- Core rules.
- All method features under `.mde/method/features/`.
- All compiled targets under `.mde/method/targets/` (and `targets/catalogue.json`).
- All command profiles under `.mde/method/commands/` (for the target-agnostic
  audit — step 2a — review reads their content, not just their presence).
- All verification scripts under `.mde/verification/*.mjs` (same step 2a audit,
  applied to script logic instead of command prose).

## Behavior

### 0. Method package lint (structural)

A fast structural validation of the method package (this subsumes the former
`mde validate method`):

- core rule front matter present and well-formed; no duplicate rule IDs;
- target profile front matter present; no duplicate target IDs;
- command files present;
- feature front matter present (`id`, `impacts:`); no duplicate feature IDs;
- **OKF conformance of the Method bundle** (see `mde.specs/design/mde-okf-support.md`):
  `.mde/method/` IS an OKF bundle. Check that every non-reserved concept `.md` (rules,
  features, commands, targets, audit views, templates) has parseable YAML frontmatter
  with a **non-empty `type`** from the method profile vocabulary (`method-rule`, `feature`,
  `command`, `target`, `audit-view`, `template`). Reserved/infrastructure files
  (`index.md`, `log.md`, `README.md`, `boot.md`, `RULES_OVERVIEW.md`, `audit-prompt.md`)
  are exempt. Spec templates under `templates/business-specs|design-specs/` carry the type
  of the spec they GENERATE (`entity`, `page`, …) — that is an app-bundle type, valid but
  not a method type. A missing/blank/unknown `type` is a conformance failure. (The same
  bar is enforced offline by `method/scripts/okf-conformance.test.mjs`.)
- **`targets/catalogue.json` freshness** — the verifier (`model.mjs`) reads this file as the
  authoritative target-id list (RULE-CORE-001 §2a below — no live target discovery in
  scripts); it is written by `compile-targets.mjs` alongside the compiled targets, so it
  must never drift from them. Check: every `id:` frontmatter value under `targets/**/*.md`
  has a matching entry in `catalogue.json` (same id, same `requires:`), and every
  `catalogue.json` entry resolves to a real target file — no orphan entries either
  direction. A mismatch means `catalogue.json` is stale (edited by hand, or a
  `compile-targets.mjs` run that didn't complete) — flag it and recommend recompiling.

This lints the **method package itself**; it does not validate the business app.

### 1. Feature ↔ target drift (the recompile-reconcile check)

A feature edited without recompiling leaves `targets/` stale — **drift**. Detect and
report it (do not recompile here — that is a change, made through a plan's `go`):

- **Stale composition:** for each `[feature: <id>]` block in a compiled target, the
  block's text must match that feature's current `Impact on <target>` / `Checks`. A
  feature whose source has changed since the target was compiled is **drift** — name the
  feature and the affected target(s); recommend recompiling.
- **Missing contribution:** every active feature whose `impacts:` names a target should
  appear (as a `[feature: id]` block) in that target. A feature that impacts a target
  but has no block there = stale/under-compiled target — drift.
- **Orphan block:** a `[feature: id]` block in a target whose feature no longer exists
  (or no longer `impacts:` that target) = stale/over-compiled — drift.
- **Skeleton integrity:** the target's authored skeleton (id / title / applies_when /
  Purpose) is present and non-empty; a composed section that is empty
  (`_(no feature…)_`) for a target that should have contributors is a defect.

### 2. Feature file validation (AI)

The compiler is **mechanical** — it trusts the feature's structure and cannot catch
semantic problems. Validate each feature file:

- **Structural:** required frontmatter (`id`, `impacts:`); `id` matches the filename; every
  target in `impacts:` is a real target; the body has a `## Impact on <target>` block for
  **each** target it impacts; checks under `## Checks` carry their `evidence:` and `when:`
  (`static | requires-environment`); an optional `## Template impact` only when it shapes a
  template; `group` / `groupRule` only on genuine alternatives.
- **Semantic:** each `Impact on <target>` actually pertains to that target; checks are
  coherent and testable (a clear pass/fail, not vague); no contradiction with another
  feature's contribution to the same target; the feature's scope is coherent (one
  concern, not a grab-bag).

Report each invalid feature with the concrete file and the specific problem.

### 2a. Command + verification-script target-agnosticism (RULE-CORE-001)

The per-plan `commands-stay-target-agnostic` check only fires when a *method-change
plan edits a command* — so a violation that slipped in (or predates the check) is never
re-examined. Review audits **every** command profile **and every verification script**
app-wide, applying RULE-CORE-001 "Commands are target-agnostic": a command
(`.mde/method/commands/*.md`) or a verification script (`.mde/verification/*.mjs`) must
operate over *whatever targets/suites are loaded or discovered* and must **not** name or
enumerate a specific target, feature, suite, or target-mandated artifact, nor hardcode a
gate that belongs in a feature. The *what/when* lives in features (tagged to a target) and
each target's own `## Outputs` table; the command/script runs it generically.

For each command **or verification script** file, flag as a violation any:
- **Hardcoded target/feature list** — the command names or enumerates specific targets or
  features (e.g. a `loads:`/Load list of concrete target names like `server`,
  `web-ui`, `persistence`), rather than loading "the relevant/loaded targets" generically.
- **Named target/feature in the steps** — behavior text that references a specific target,
  feature, or diagram by name and applies logic to it.
- **Inline required-artifact list or domain gate** — the command lists specific artifacts a
  plan must produce, or hardcodes a check/gate that belongs in a feature.
- **Hardcoded target/suite id literal in a `.mjs` script** — e.g. a `facts` object mapping
  named conditions to `loaded.includes('web-ui')`/`loaded.includes('api')` by literal string
  (targets/catalogue.json + a target's own `when` column are the only legitimate source of
  a target id in verification logic), or a fixed suite-name array (`['unit','api','ui']`)
  where the real suites should be discovered from the manifest or disk (`reports/evidence/tests-*/`,
  `reports/evidence/coverage/<suite>/`) instead of assumed. A `.mjs` file is exempt only where it
  reads target/suite identity generically (via `catalogue.json`, a target's own `when`
  column, or directory/manifest discovery) — never where it encodes a specific target's or
  suite's name as program logic.

Distinguish a genuine violation (target-specific *logic*) from legitimate generic phrasing
("the loaded targets", "each target's checks", "whichever targets apply") — the latter is
correct. Report each violating command with the concrete file, the offending lines, and the
fix (move the specific behavior into a feature tagged to the right target; have the command
defer to the loaded targets).

### 2b. Delivery-triangle coverage (feature ⇄ Outputs ⇄ template)

A feature can be *stated* yet never *delivered* — the class of defect where a feature says an
artifact should exist but nothing makes the generator produce it. A feature reaches generation
through three delivery points, and review checks they agree:

1. **`## Outputs` (target)** — makes the artifact *get produced* (the mandated-output table the
   verifier and evaluate read). Authored in the target skeleton.
2. **`## Impact on <target>` (feature)** — tells the generator *how*.
3. **template hook (template)** — prompts it at the point of generation, section by section.

Flag:

- **Feature with no output mandate.** A feature whose purpose is to **produce a durable artifact**
  (it describes writing a file under `specs/`, `docs/`, `src/`, etc., or names a `## Template
  impact`) but for which **no `## Outputs` row** exists in any target it impacts. This is the
  "stated but never produced" defect (e.g. a glossary feature with no `glossary` Outputs row) —
  name the feature and the target whose `## Outputs` should carry it.
- **Orphan output.** An `## Outputs` row (target) whose artifact traces to **no producing
  feature** — a mandate with nothing describing how/what to generate.
- **Template ⇄ feature gap.** A feature that mandates content in a template (a `## Template
  impact`, or an instruction like "tag references / add section X") where the **named template
  does not reflect it** — or, for a rule that applies across a *family* of templates (e.g. tag
  every reference), a template in that family that **lacks** the hook while its siblings have it.
  This catches partial delivery (some templates hooked, others not).
- **Output without a template.** An `## Outputs` artifact that is authored from a template
  (business-spec / design-spec / page kinds) but has **no template** under `templates/` — the
  generator has a mandate but no shape to fill.

Report each with the concrete feature/target/template and the missing delivery point (add the
Outputs row / add the template hook / add the template), not just "inconsistent".

### 3. Catalogue + reverse verification (optional, on request)

- Build a **catalogue** of targets and the features each references (target → its
  `[feature: id]` blocks) — the reverse view of the features' `impacts:`.
- On request, run the **reverse / recompose / compare** check on a target: regenerate it
  from its features with an isolated agent (no sight of the current target) and compare
  semantically. Convergence proves the features are a sufficient source of truth;
  divergence buckets into {acceptable paraphrase | method inconsistency | missing
  feature}.

### 4. Report

Write the findings to `reports/review/method-review.md` (overwrite — latest review, not an append
log), digest-first:

- a header with the review timestamp;
- an **Overall** one-line verdict;
- **Drift** — features edited but targets not recompiled (stale/missing/orphan blocks),
  each naming the feature + affected target(s), with "recompile" as the fix;
- **Invalid features** — structural/semantic problems, each naming the file;
- **Delivery gaps** — feature stated but not delivered: a feature with no `## Outputs` mandate,
  an orphan output, a template⇄feature gap (a feature's mandated template content missing, or a
  template-family hook applied to some siblings but not all), or an output with no template — each
  naming the concrete feature/target/template and the missing delivery point;
- **Command/script violations (RULE-CORE-001)** — commands or verification scripts with
  target/feature/suite-specific logic (hardcoded target lists, named targets in steps,
  inline artifact/gate lists, a hardcoded suite-name array), each naming the file +
  offending lines + the fix (move it to a feature, or read the id from
  `catalogue.json`/discover it from disk instead of a literal);
- **Catalogue** — target → contributing features (and any feature no target uses); plus
  `catalogue.json` freshness (any drift from `targets/**/*.md` id: frontmatter);
- a **Recommended next step** (typically recompile via a method-change plan's `go`, or fix
  the flagged feature files).

Also print the digest. `reports/` is review output, not durable method content, so writing
it does not breach the boundary below.

## Boundary

`mde review method` **reports** findings — it writes only its report to
`reports/review/method-review.md` (and prints the digest). That report is the single allowed
write.

It does **not** recompile, edit features, or change targets. Recompiling `targets/`
from changed features is a **change**, made through a plan and built with `mde go`
(modifying a feature is planned work, like reconciling spec drift). Review detects and
reports; the plan reconciles.
