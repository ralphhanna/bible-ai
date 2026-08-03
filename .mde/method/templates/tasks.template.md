---
id: TEMPLATE-TASKS
type: template
title: Tasks
status: active
source_path: method/templates/tasks.template.md
artifact: plan
used_by_commands:
- mde evaluate
- mde go
---
# Tasks

## Status

draft | evaluated | executing | executed | partially-executed | blocked | cancelled | released

## Scope

```text
operation: ba | design | implementation | review | reconciliation | documentation | setup | method-change | other
level: app | capability | other
inScope: <explicit inclusions>
outOfScope: <explicit exclusions>
```

## Tasks

Use simple sequential numbers. Tasks are stage/control steps and manifest-derived follow-up steps.

Do not list every output as a task. Required outputs belong in the plan-local manifest.

Recommended base stages. **evaluate** does the heavy lifting (generate + the full
cycle + four-pass validation); **go** only accepts and commits what evaluate already
proved:

```md
- [ ] 1. Define scope
- [ ] 2. Establish rules list
- [ ] 3. Define impact and method targets
- [ ] 4. Gate 1 - target inclusion (verification): did you skip a target? **Run** `node .mde/verification/verificationRunner.mjs . <plan-dir> --gate=1 --out=<plan-dir>/evidence/logs/verify.log` (use `--out=` so the log is written UTF-8 by the engine — do NOT shell-redirect `> verify.log`, which writes UTF-16 on Windows and corrupts it) - it exits 0 only when every *required* target (a loaded target's transitive `requires` ∩ the tech stack) is loaded or excused. A required target neither loaded nor recorded in `scope.md ## Excluded targets` makes it exit non-zero and STOPS here - fix the target set (or add the exclusion with a reason) and re-run until clean. Tick this line only when the gate exits 0; ticking without a clean run is a rubber-stamp. Runs on the impact's loaded-targets alone, before any generation.
- [ ] 5. Plan the manifest - one `planned` entry per target-mandated artifact, before generating anything
- [ ] 6. Generate the artifacts (flip each entry planned -> created/modified) - install, build, run tests/migrations alongside generation
      **Run the verifier full** here: `node .mde/verification/verificationRunner.mjs . <plan-dir> --out=<plan-dir>/evidence/logs/verify.log` (the engine writes the log UTF-8 via `--out=`; do NOT shell-redirect `> verify.log` — Windows redirects write UTF-16 and corrupt it). It backs 7.1/7.2 and the deterministic checks feeding 7.4; tick a pass only when its findings in `verify.log` are clean (repaired + re-run to exit 0).
- [ ] 6a. Run the test suite as evidence (applications with tests only): the framework runs `npm run mde:test` (or the plan's declared test command) as a **script** — not a self-report — and captures the run to `evidence/logs/test.log` (UTF-8). This is the evidence of record that 7.4 judges for honesty; step 6's own test runs are the AI's build-time fix tool, not this. Skip when the plan produces no tests (a BA/design/docs plan). Tick only when the captured run exists.
- [ ] 7.1 Validate - Check targets output: every artifact the loaded targets *require* is declared in the manifest - the verifier's mandated-output gate; tick only on a clean run
- [ ] 7.2 Validate - Check artifacts exist: every declared artifact actually exists on disk (no missing, no orphans) - the verifier's artifact-exists gate; tick only on a clean run
- [ ] 7.3 Validate - Template shape: each artifact has its template's required sections/tables/frontmatter
- [ ] 7.4 Validate - AI semantic review (on top of the executed capability checks): reading each artifact against its source specs, capability intent, template, target, and related artifacts - did it follow the specs, is anything important missing, is it generic/weak, does it match the template but miss the real purpose, do related artifacts contradict? Produced the right thing, not just a file-shaped thing. AI reviews, answers/routes each `[ASK]` from the verifier, repairs straightforward fixes, asks the user only when needed.
- [ ] 7.5 Validate - Runtime proof (applications only): the built app actually runs and its tiers really talk to each other - `node .mde/method/scripts/verify-app-runtime.mjs . --json evidence/runtime.json` (append console output to `evidence/logs/runtime.log`). Artifact and traceability checks are all satisfiable by a disconnected app: a suite that only reads source files passes while the UI renders nothing, and a frontend that swallows fetch errors and falls back to hardcoded data looks identical to a working one. This stage is what a file-shaped pass cannot fake - tick only on exit 0.
- [ ] 8. Repair validation findings and re-run affected validation passes until clean
- [ ] 9. Classify any unresolved findings: out-of-scope follow-up, environment-blocked verification debt, deferred/pending action, partially-executed, or blocked. Do not mark the plan done while in-scope validation findings remain unresolved. **Classification is not a substitute for repair:** an in-scope, fixable finding goes back to stage 8 until the verifier exits 0 — only genuinely out-of-scope, environment-blocked, or user-intent findings may be classified here. Repair cost is a conversation with the user, never a silent `partially-executed`.
- [ ] 10. Record final evidence, including the last validation run after repairs
- [ ] 11. Finalize (go) - confirm the verifier actually ran at evaluate (`evidence/logs/verify.log` exists for the current fingerprint): if missing, run the full verifier now and repair like evaluate would; if present, re-run `--mechanical` (FAIL-only, no fresh ASK judgment) as a cheap regression check. Then accept and commit the proven set.
```

**This file is the step ledger - it exists from the start of evaluate.** `mde evaluate` writes
`tasks.md` (all lines unchecked) as its *first* action, then ticks each line as that step
completes and checkpoints it in `status.md`/`log.md`. So at any pause the ticked/unticked lines
say exactly which step evaluate is on. A running evaluate with **no `tasks.md`** means the ledger
was never created - the agent skipped ahead; that is an evaluate defect.

**The order is a contract - steps are gated on their predecessors.** Do not skip ahead:
- **Stage 4 (Gate 1)** runs before anything is planned or built (needs only the loaded targets); a
  skipped required target stops the plan here.
- **Stage 5 (plan the manifest)** writes the `planned` `output.manifest` - the ownership boundary.
- **Stage 6 (generate) must not begin until stage 5's planned manifest exists.** Writing a source/
  migration/test file with no `output.manifest` is a hard violation: the file is unowned (cancel/
  change cannot roll it back) and invisible to verification. If stage 6 finds no planned manifest,
  STOP and do stage 5 first - never reverse-engineer a manifest from files already on disk.

**Expand 7.1-7.4 as four separate checkboxes - do not collapse them.** A plan's `tasks.md` must
carry `7.1`, `7.2`, `7.3`, `7.4` as their own checkable lines (as above), each ticked only when that
pass is genuinely done. A single `- [ ] 7. Validate` line is a defect: it lets the four passes be
rubber-stamped as one tick, which is how target-mandated artifacts (a missing diagram, a missing
`migrate.log`) slip through "validated." Keep the four lines. (7.1-7.4 are Gates 2-4 of the
verification model - coverage, artifact-exists, and quality - applied to the generated artifacts;
Gate 1 is stage 4.)

Stages 1-10 are `mde evaluate` - Gate 1 first (stage 4), then it generates the real files,
installs/builds/tests them as it goes, validates (the four-pass model - see the
capabilities/targets/validation reference), and records verdicts in `evidence.md`. Stage 11 is
`mde go`, a **separate command** the user runs afterward: when the evaluation fingerprint is
current it accepts and commits the proven set and does **not** re-run the cycle.

Validation is a repair gate, not a passive report. If Gate 1 (stage 4) or 7.1-7.4 finds a defect
that is inside confirmed scope, stage 8 repairs it and re-runs the affected pass(es). Only the
final clean pass is ticked. If a finding cannot be repaired, stage 9 records the reason and the
plan status reflects the truth: `verification-debt` for environment-blocked executable checks,
`pending-actions` for explicitly deferred/open discussion work, or lifecycle
`partially-executed`/`blocked` when required in-scope work is not complete. A plan must not show
`executed`/`evaluated` with hidden in-scope validation failures.

After execution, results may be shown inline:

```md
- [x] 4. Gate 1 target inclusion PASS
- [x] 6. Generate artifacts - build PASS / tests FAIL
- [x] 7.1 Planning PASS   - [x] 7.2 Implementation PASS   - [x] 7.3 Template shape PASS   - [x] 7.4 AI semantic PASS
- [x] 8. Repairs PASS - affected validation re-run clean
```

## Blockers

- None currently identified.
