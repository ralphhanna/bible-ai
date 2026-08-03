---
type: command
command: mde review app
loads:
  - rules/core/*
  - rules/workflow/*
  - relevant targets
---

# mde review app

Purpose: review the whole app's output against its Specs and capabilities by running the applicable targets' own validation app-wide, catching cross-plan regression and coverage gaps no single plan's verification can see, and consolidating the result into one actionable report.

## Load

- Core rules.
- **The applicable target profiles** — the union of the targets loaded across the branch's
  plans (from each plan's `impact.md ## Loaded Targets`) plus the app's tech-stack targets,
  closed over `requires:`. Do **not** name or enumerate targets here; derive them the same
  way `mde evaluate` does. Review runs **whatever checks those targets define** — it keeps
  no parallel, hand-maintained list of what to check (pages, source structure, rules,
  coverage): those live in the targets/features and stay in sync as they evolve.

Also load plan-local leftovers from `plans/` (see step 2): each plan's `scope.md`
*Deferred* scope and `discussion.md` open entries.

## Sub-command: `mde review app audit [target]`

A focused **substance audit** — separate from the full review below. Where the full
review runs the targets' mechanical checks (do artifacts exist, trace, pass), the audit
asks the harder question a check cannot: does the app *genuinely behave*, or does it only
look right? It is performed by a **fresh session** (per the verification model §3 — it did
not build the app) that **drives the running app** and judges each concern against a
witness the author does not control (the app's own request/write log, a read-back after a
mutation), following the compiled audit views under `<METHOD_SOURCE>/targets/audit/`.

Forms:

- **`mde review app audit ?`** — **list** the available audit targets (the `.md` files
  under `<METHOD_SOURCE>/targets/audit/`) and stop. Discovery only; no audit runs.
- **`mde review app audit <target>`** — audit that one target (e.g. `web-ui`, `api`).
- **`mde review app audit`** — audit **all** available audit targets.

How it runs (for each target in scope):

1. Ensure the app is running (`mde:start`) with its request log capturing (`LOG_PATH`), so
   the auditor can drive it and read the witness. A target whose audits need no running app
   (e.g. `business-requirements`, `application-design` — they judge specs against their
   source) is audited by reading the artifacts, not the running app.
2. Load `<METHOD_SOURCE>/targets/audit/<target>.md` — the general audit guidance composed
   from that target's features' `## Audit` sections. **Apply the plan/app scope at run time:**
   this command audits the **whole app** (all instances), so add no plan-narrowing clause;
   the feature audit prose is scope-agnostic by design.
3. In a **fresh session** (not one that generated the app), carry out each `## Audit` block:
   drive the app / read the artifacts, and for each concern report a verdict —
   **genuine | fake | not-exercised** — with the **observed witness** (the server-log line,
   the read-back result, the missing operation), never just a checkbox.

Output — **one report file per target**, plus a summary index:

- **`reports/review/audit/<target>.md`** (one per audited target, overwrite) — the detailed
  findings: per concern, the verdict + what was observed + where the witness is.
- **`reports/review/audit/index.md`** (the summary index, overwrite) — a roll-up across the
  audited targets: per target a one-line verdict and counts (**N genuine · M fake ·
  K not-exercised**), fakes ranked most-severe first, each linking to its
  `reports/review/audit/<target>.md`. Print this digest to the user.

**Report-only** (same Boundary as the full review): writes only under `reports/`, touches
no `verify.log`, plan `status.md`, specs, or source. A `fake`/`not-exercised` verdict is an
actionable finding for a later `mde start …`, not a change this command makes.

## Behavior

**OKF conformance of the App bundle** (see `mde.specs/design/mde-okf-support.md`). A
project's `specs/` + `design/` + `docs/` are an OKF bundle; this review is the whole-bundle
scope (per-plan `evaluate` only sees a plan's own new files, so bundle-wide conformance
lives here). Check that every non-reserved concept `.md` under `specs/` and `docs/` has
parseable YAML frontmatter with a **non-empty `type`**, and that the `type` is a
**registered** type in the meta-catalog (`.mde/mde-meta-model/meta-catalog.json` — the
profile's type registry; strict: an unregistered `type` is a failure). Reserved files
(`index.md`, `log.md`, `README.md`) are exempt. A missing/blank/unregistered `type` is a
conformance failure reported alongside the other whole-app gaps. (The Method bundle's
equivalent is enforced by `mde review method`.)

Before the review, run `node .mde/method/scripts/verify-method-followed.mjs .` (same
invocation `mde go` uses — this script now only holds plan-scoped, always-on checks; the
whole-app down-gap coverage question moved to the `scope=system` run below).
Include every reported operations/UI-design failure in the review; do not downgrade an
executable gate failure to a prose-only observation.

**Also re-run verification for every plan on the branch (report-only).** Verification is
mechanical and cheap, so review does not trust each plan's *recorded* `verification-*.md`
(a snapshot from when the plan ran, possibly stale after later plans changed the code) —
it **re-runs the verifier against current code** and reports the live result. For each plan
directory under `plans/` (skip reserved folders like `backlog/`):

```
node .mde/verification/verificationRunner.mjs . plans/<plan-id>
```

Capture each plan's pass/fail and every failing `[FAIL]`/`[ASK]` check. This is
**report-only**: do **not** write `verify.log`, `reports/review/verification*.md`, or any plan
`status.md` — the results feed *this* review's report and nothing else (see Boundary).

**Also run the whole-app `scope=system` checks (report-only, review-only).** These are
completeness questions with no single owning plan (e.g. "does every entity have a
Maintenance panel somewhere") — the DSL's `item`/`plan` scopes are both bound to one
plan's own manifest, so a check like this can only run here, never at `evaluate`/`go`:

```
node .mde/verification/verificationRunner.mjs . --app-wide --report=reports/review/verification.md
```

Each `scope=system` block carries its own readiness guard (a `WHEN`, independent of this
`--app-wide` gate) — a check whose guard doesn't hold yet is reported as "not yet ready",
not a failure. Fold its `[ASK]`/`[FAIL]` findings into the Action Items table like any
other verification finding (Src = `V`).

The **live re-run result is authoritative**. Where it diverges from the plan's recorded
verification report or `status.md` (a check the plan recorded green that is now red, or
vice versa), report the current result and **flag the drift** — a plan can record green at
`go` time and regress once a later plan edits its files. Every current verification failure
becomes an **action item** (below), alongside the review findings.

1. **Run each applicable target's validation against the current output.** Review does not
   re-implement per-target checks (pages vs. page specs, source structure, business rules,
   coverage dimensions) — those are already defined by the targets/features and executed by
   the verifier re-runs above. For **each applicable target** (the union from Load), apply the
   checks it defines against the app's current artifacts, and record every failure. The
   *what/when* comes from the target's own `## Checks` and `## Outputs`; review is the
   orchestrator that runs them app-wide and reports, naming no specific check itself.

   Two things the per-plan verifier re-runs (above) **structurally cannot** see, which review
   adds — but still without hand-coding target logic:
   - **App-wide coverage gaps** — the `scope=system` run (above) surfaces required operations /
     pages that **no plan was ever in scope for**, so no per-plan verifier ever looked at them
     (the compatible-model backstop, RULE-WORKFLOW-004). These are the targets' own coverage checks,
     run over the *whole* app rather than one plan's footprint.
   - **Cross-plan drift** — a check an earlier plan recorded green that a later plan regressed
     (flagged by the per-plan re-runs above, since each is re-run against *current* code).

   Report every failure — drift, missing specs, coverage gaps, source-quality and manifest gaps —
   naming the concrete file(s) and a recommended fix, as **action items** (below).
2. **Surface outstanding plan leftovers.** Leftovers are stored per-plan and are
   otherwise never resurfaced once a plan is past. Across all plans under `plans/`,
   report:
   - **Deferred scope** — `scope.md` *Deferred* items (ours, but not done yet), with
     their `reason:` and owning intent;
   - **Open discussion items** — `discussion.md` entries with `status: open`.

   Report these as **pending-actions (parked, Outcome C)**. Separately — and **not**
   merged with pending-actions — also surface any **open verification debt (owed,
   Outcome B):** plans whose `status.md` carries `verification-debt: open` (a `go` that
   built but deferred tests/coverage/screenshots for lack of an environment). Keep the
   two categories distinct in the report, matching their `status.md` lines.

   This is **informational** — it does not block anything and applies no changes
   (see Boundary); it makes project-wide leftovers and owed checks visible so the user
   can decide whether to pick them up in a new plan or re-run `go` in a capable agent.
3. **Audit test honesty (a fresh, independent judgment).** The verifier re-runs above
   confirm tests *exist and trace*; they cannot see whether the tests actually *exercise
   the app* — a suite of `readFileSync` assertions passes every structural check while
   testing nothing. This step catches that, and it is deliberately **not** performed by
   the session that wrote the tests (that session optimised them to pass and cannot
   judge them). Run the app's test suite to produce fresh evidence, then examine it with
   the audit prompt at `.mde/method/testing/audit-prompt.md`:
   - run `npm run mde:test` (or the app's declared test command), capturing its output
     and timing; ensure the app writes its request log (`LOG_PATH`) during the run;
   - fill the prompt's placeholders — the step-definition files, the run report(s) and
     timing, the app request log, and the run's start/end window;
   - **the auditor is a separate concern from this review's author**: examine the tests
     against the prompt's criteria (rationale, technology, layers, depth, UI interaction,
     scenarios) and read back its two flags — `TESTS-REAL` and `EVIDENCE-CREDIBLE`.

   A `no` on either is a **High-priority Action Item** (Src = `R`): the app's tests do
   not prove it works, so the app is not genuinely reviewed. Fold it into the table like
   any finding — it is fixed by rewriting the tests to make real calls / interactions,
   not by re-asserting they are fine.

4. **Write the findings to `reports/review/app-review.md`** (overwrite — it is the latest review,
   not an append log). Structure it digest-first so it is scannable:
   - a header with the review timestamp and the version branch / commit reviewed;
   - an **Overall** one-line verdict;
   - an **Action Items** table (see below) — the single addressable fix list;
   - **Coverage** — a section per coverage dimension the loaded targets report (e.g. the
     targets' own code/CRUD, test, and docs coverage checks), each showing what is covered
     vs. missing. Present whatever the applicable targets define; do not enumerate a fixed
     set of dimensions here — the targets own which coverage they report.
   - **Verification** — per-plan re-run results (pass/fail + failing checks), with any
     **drift** from the plan's recorded report flagged;
   - **High-priority findings** (drift, missing specs/tests, and any target-check violation),
     each naming the concrete file(s) and a recommended
     fix;
   - **Pending-actions** (Deferred scope + open discussion, per plan) and, separately,
     **Verification debt** (plans with `verification-debt: open`);
   - a **Recommended next step** (typically an `mde start …` to close the gaps).
   Also print the digest to the user. `reports/` is review/report output, not durable
   project Specs or source, so writing it does not breach the read-only boundary below.

   ### Action Items (the addressable fix list)

   A **single flat, numbered table** at the top of the report collecting **every**
   actionable item from all sources — review findings, the verification re-run failures,
   and coverage gaps — so the user can point an agent at them by number ("fix items
   3, 6, 18"). Requirements:
   - **One flat number space** across all sources (not per-section). Number `1..N`.
   - **Severity-ordered** (High → Medium → Low) so the lowest numbers are the most urgent.
   - **Renumbered each run** — the table reflects the current review; item numbers are
     valid for *this* report, not stable across runs (act on the current one).
   - Columns: **# · Status · Src · Severity · Item · File(s) · Fix**.
     - **Status** = the item's current state, shown as a checkbox + label so fixed items
       read as ticked off:
       - `[ ] open` — a real gap to fix now.
       - `[~] deferred` — legitimately parked, NOT a fix-now item: env-gated (needs a
         DB/browser/runtime this run lacks), out of the reviewed scope, or blocked on
         another item. **State WHY** in the Fix cell (e.g. "deferred — requires PostgreSQL",
         "deferred — blocked on item 10", "deferred — out of scope, non-goal in plan 005").
         A deferred item MUST be visually distinct from an open one; do not present a parked
         item as if it were fix-now.
       - `[x] fixed` — verified resolved on THIS run: its verification check now passes, or
         the review confirms the artifact/behavior now exists. Fixed items stay in the table
         (ticked) so the user sees what the last cycle closed; they are not silently dropped.
       Order within a severity band: `open` first, then `deferred`, then `fixed`.
     - **Src** = `R` (app-review), `V` (verification re-run), or `R+V` when both converge on
       the same root cause — surface the convergence, do not list it twice.
     - **Item** = one-line statement of the defect.
     - **File(s)** = concrete path(s), with line numbers where known.
     - **Fix** = the directive: what the change must achieve (actionable enough to hand to
       an agent), and — for a verification item — which check goes green when done. For a
       `deferred` item, the Fix cell leads with the **reason it is deferred**.
   - Every High-priority finding and every current verification failure MUST appear as a
     row. The prose **High-priority findings** / **Verification** sections remain (they hold
     the evidence and detail); the Action Items table is the *index* into them.
   - **Deriving Status:** an item is `fixed` when its backing check/finding no longer
     reproduces on this run (the verifier re-run passes it, or the artifact now exists);
     `deferred` when it is env-gated, a declared non-goal/deferred scope, or blocked on
     another open item; otherwise `open`. Because the table is regenerated each run, Status
     reflects the **current** state — an item fixed since the last review shows `[x]`, a
     newly-passing verification check drops from open to fixed. This is how the user sees
     items get checked off as they are fixed.

## Boundary

App review **reports** findings — it writes only its report to `reports/review/app-review.md`
(and prints the digest). That report is the single allowed write.

Re-running the verifier per plan (Behavior) is **report-only**: it executes the checks in
place to read the current result, but writes **no** `verify.log`, `verification-*.md`, or
`status.md`. The verification results live only inside `reports/review/app-review.md`. This does
not breach the boundary — the sole write remains the review report.

It does **not** apply durable changes to Specs, source, tests, docs, or the consolidated
manifest. Durable fixes must be made through a plan and built with `mde go`.

**Commit its own output.** After writing the report(s), `mde review app` commits **only
the report files it produced** — `reports/review/app-review.md`, `reports/review/verification.md`,
and (for the audit sub-command) `reports/review/audit/index.md` + `reports/review/audit/*` — so each
review is a durable, versioned record rather than a dirty working tree. The commit is
scoped to `reports/` **only**: stage exactly those paths (`git add reports/…`), never `-A`,
and commit with a message naming the review and the reviewed commit (e.g.
`review app: app review @ <short-sha>`). It commits **nothing else** — no Specs, source,
`verify.log`, or `status.md`; if the working tree has unrelated changes they stay unstaged.
Skip the commit only when there is no git repo or the report content is unchanged from the
last review (nothing to record).
