---
type: command
command: mde go
loads:
  - rules/core/*
  - rules/workflow/*
  - active plan
  - relevant targets
  - relevant templates
---

# mde go

Purpose: **finalize the plan** — accept the **working, verified** candidate artifacts
`mde evaluate` already produced, and **commit** them. `go` is commit/finalize/close.
Evaluate runs the full cycle (generate + install + build + test) so the artifacts are
already real and proven; `go` does not re-derive, re-build, or re-verify them. The one
exception is the **resume case**: when evaluate ran where it could not execute (no
npm/DB) and left **owed verification**, `go` finishes those owed checks in a capable
environment, then commits. Otherwise verification is already done — `go` just accepts
and commits.

`mde evaluate` is required before `go`; if not yet done (or the fingerprint is stale),
`go` runs it and then **proceeds straight into finalize in the same invocation** — it
does **not** pause for a second `go`. A `draft` plan does not stop to wait for
confirmation: one `go` evaluates (generating the artifacts) *and* finalizes. (A plan
already in `evaluated` with a current fingerprint finalizes directly — its artifacts
were generated in the prior evaluate.)

`go` is **resumable**. If the artifacts are already generated and still current (e.g.
a previous `go` ran where it could not execute tests), `go` does **not** regenerate —
it runs **only the owed verification** and clears the plan's verification debt. This is
how a plan whose artifacts were generated in a non-executing environment (e.g. a
browser agent with no runtime/DB) is finished later by simply running `mde go` again in
a capable agent. Same verb, no regeneration.

## Preconditions

- An active plan in `evaluated` (the normal finalize case — artifacts generated and verified, ready to accept + commit) **or** `executed`/`partially-executed` with an **open verification debt** (the resume case — owed verification still to finish). If the plan is in `draft`, `go` runs `mde evaluate` first (which generates the artifacts and records the impact), then **continues into finalize in the same invocation** — it does not stop for a second `go`. A `go` on an already-`evaluated` plan finalizes straight away.
  - **A failed verifier is not a resume case.** `partially-executed`/`blocked` admits `go` **only** for an open *verification debt* — checks that could not run for lack of an environment. It must **not** be used to carry forward a plan whose verifier *ran and failed* with unresolved in-scope findings. Distinguish the two by cause, not by lifecycle name: if the last `evidence/logs/verify.log` for the current fingerprint exits non-zero with in-scope `[FAIL]` findings, the owed work is **repair**, not deferred verification. Route back through `mde evaluate` (step 1) and fix the findings; do not finalize, and do not let a later plan start on top of it. Only an *unrunnable* check (missing environment, recorded as `verification-debt: open`) qualifies as resume.
- Work is on an **active branch** off `main` (from `mde start branch`), unless the user has explicitly confirmed a no-branch mode. `go` commits build output, so it must not run on `main` by default.
  - **Auto-fixup when on `main`:** if `go` is invoked on `main` (or the base branch) and the only uncommitted changes are this plan's **plan-local files** (`plans/<id>/…`) with nothing durable touched yet, do not dead-end. Offer to **create the branch and carry the plan onto it** — `mde start branch <name>` (proposing a name from the plan), which moves the uncommitted plan-local work onto the new branch — then continue the build there. Only fall back to refusing if the user declines or the tree also contains unrelated/durable changes that must be sorted out first.
- **External dirty files are left alone, not a blocker.** `go` commits **only the manifest-listed plan-owned files**, so it does not require a globally clean tree. Files dirty but **not** in the manifest are external/user-owned: **warn** the user they exist and that `go` will not touch them — do not commit, stash, or revert them (see `plan-status` §7.1). The plan's own plan-local files and its manifest-listed artifacts are what the reconciliation commit contains.

## Target loading

`go` does **not** decide which targets apply, and names no target itself. **Target loading
happens at impact-analysis time (`mde evaluate`)** and is recorded in `impact.md`: evaluate
selects every target whose `applies_when` matches the plan's impact (the deterministic floor),
plus any target the AI judges applicable (it may only **add**, never suppress a match), as one
union. `go` **reads that recorded target list** but does not re-verify against it — evaluate
already ran the checks (step 6). See `mde evaluate` for the selection logic (including the
`requires:` dependency closure that pulls in cross-cutting targets).

## Behavior

0. **Decide finalize vs resume.** The **resume case** (run only the owed checks at step 6, skip nothing else) applies **only** when *all* hold: the plan is `executed`/`partially-executed` with an **open verification debt**; the generated artifacts are unchanged since evaluate; **and the method is unchanged since evaluate** (the fingerprint still matches — same rules, targets, templates). If any condition fails — in particular **if the method/rules changed since the plan was last evaluated** — the fingerprint is stale: this is **not** a resume. Route back through `mde evaluate` (step 1), which regenerates and re-verifies from the current method, then finalize. A method upgrade (e.g. via `init-app`) is a re-evaluate trigger, never a silent no-op resume.
1. Ensure the plan is `evaluated` **and its evaluation is current**: if lifecycle is `evaluated` and the evaluation fingerprint still matches (no plan input — `scope`, `discussion`, **the manifest-listed candidate artifacts**, `impact`, `acceptance` — and no method file changed since), use its `impact.md` + `output.manifest` and **proceed**. If the plan is in `draft`, **or any plan input changed after it was evaluated** (the fingerprint is stale — e.g. the user edited a candidate artifact), run `mde evaluate` now, then **proceed in the same invocation** — present the derived impact and continue, do not pause for a second `go`. **Never build on a stale evaluation:** a post-evaluate edit must be re-evaluated (which re-derives the artifacts/manifest from the edit) before `go` accepts them. Do not derive impact inline — the full evaluate command is required so target selection and the manifest are recorded.
   - **Coverage guard:** before finalizing, confirm the manifest actually covers every artifact the loaded targets mandate for the in-scope work — including the diagrams under `docs/diagrams/`. Do **not** enumerate specific artifacts here; the loaded targets and their referenced capabilities are the single source of what is required and when (each capability's `## Impact`/`## Checks` carries the trigger and path). If a mandated artifact has no manifest entry, the evaluation is incomplete regardless of fingerprint — re-run `mde evaluate` to add it and re-present the impact before building. `go` must not build a plan whose evaluate dropped a target-required artifact.
2. Set lifecycle to `executing`; update `tasks.md`, `evidence.md`, `log.md`, and derived `status.md`.
3. **Accept the manifest-listed candidate artifacts that `evaluate` already generated** — `go` does not generate or re-derive them. Evaluate produced and verified the real files (specs, **source, migrations** — everything the loaded targets define); this step takes them as the proven set to commit.
   - **Honor every change the user made.** The plan's `discussion.md` decisions and the user's edits to the candidate artifacts are intent — **do not re-derive over them.** A decision recorded at evaluate that the accepted artifacts contradict is a defect: the user was assured it would be applied. If a recorded decision cannot be honored, that is a verification failure to report (step 7), not a silent drop.
   - **Completeness check (not a build).** Confirm every manifest-listed artifact actually exists on disk and the set covers what the loaded targets mandate. If evaluate left an artifact only *planned* (a manifest entry with no real file), that is an **evaluate defect** — re-run `mde evaluate` to generate it, do not silently generate it here. `go` commits real files; it does not finish evaluate's job.
   - **Commit scope:** commit only the manifest-listed plan-owned files; leave non-manifest dirty files untouched and warn if any exist (see `plan-status` §7.1).
   - **Record resolved access-scope filters** where the loaded targets require it, so the
     recorded predicate (not re-interpreted prose) is the contract a later plan implements. The
     mechanics live in the shared-access-enforcer capability; `go` just ensures the recording
     happens as part of accepting the artifacts.
4. Confirm `plans/<plan-id>/output.manifest` reflects each artifact's final **touch state** — created, modified, or blocked. The manifest is a pure artifact trace; verification verdicts live in `evidence.md` (recorded by evaluate), not here.
5. Refresh the root `manifest/` consolidated outputs: run `node .mde/method/scripts/build-app-manifest.mjs` from the project root. Then run `node .mde/method/scripts/verify-method-followed.mjs . plans/<plan-id>` (the plan-dir argument is required here — it is what lets the script's built-in verifier-ran gate check *this* plan's `evidence/logs/verify.log`) and capture its output in `plans/<plan-id>/evidence/logs/method-followed.log`. A non-zero exit is a commit-time failure (step 7); repair before commit. **This script call is the mechanical gate that closes the rubber-stamp bug**: `verify-method-followed.mjs` itself checks — in code, not prose — whether `tasks.md` claims stages 4/6 ran (`- [x] 4.` / `- [x] 6.`) but `evidence/logs/verify.log` is missing/empty/not a real verifier run; if evaluate ticked the box without actually running the verifier, this call fails non-zero and `go` cannot proceed past it. This is one of the two executable gates `go` itself runs (the other is below).
6. **`go` also re-confirms the verifier's verdicts directly — it does not re-derive them, but it does not blindly trust a passing gate either.** A current fingerprint (step 1) means plan inputs and generated artifacts are unchanged since evaluate, so evaluate's recorded `evidence.md` results are the verdicts of record: `go` does **not** re-build, re-test, or re-judge (no fresh `[ASK]` review). Once step 5's gate confirms the verifier genuinely ran:
   - Confirm `evidence.md ## Semantic ASK Answers` answers or routes every verifier `[ASK]` emitted during evaluate; an unanswered `[ASK]` is unresolved semantic review, not a clean pass.
   - Re-run the verifier in **mechanical mode only** — `node .mde/verification/verificationRunner.mjs . <plan-dir> --mechanical --out=plans/<plan-id>/evidence/logs/verify.log` (the engine writes UTF-8 via `--out=`; do not shell-redirect) — as a cheap re-confirmation that nothing regressed between evaluate and now (e.g. a manual edit after evaluate that the fingerprint somehow missed). `--mechanical` scores only deterministic `[FAIL]`s; it does not re-surface `[ASK]` items for fresh AI judgment — those were already answered/routed at evaluate and stand as recorded. A non-zero exit here is a **verification failure** (step 7).
   - **Resume case (owed checks).** Separately, if the plan carries an open `verification-debt` (an executable check evaluate deferred for lack of an environment — tests, coverage, screenshots, migrations), run those owed checks now in the capable environment (evaluate's environment/repair/defer + evidence-capture discipline applies) and record the results in `evidence.md`; an owed check that now fails is also a **verification failure** (step 7).
   - If the fingerprint were stale, step 1 already routed back through `mde evaluate` (which regenerates, re-runs the verifier, and re-verifies), so by the time `go` reaches here the artifacts and their `verify.log` are current.
7. If verification **fails** (step 5's verifier-ran gate failed, the mechanical re-run found a `[FAIL]`, an owed resume check failed, or the rest of the method-followed gate failed):
   - repair defects within the confirmed scope when possible;
   - if unrepaired, set lifecycle to `partially-executed` or `blocked`, record evidence, update status/log, report gaps, and do **not** commit.
8. If verification **passes or is deferred** — **finalize first, then commit, in that order, as one commit.** Write the final plan state to disk *before* staging, and include those plan-local files in the single reconciliation commit so the committed record reflects the finalized state. Do **not** commit the artifacts first and update status afterward (that leaves `status.md`/`log.md` dirty and the committed record stale — the bug this rule fixes). The order is:
   - **(a)** set lifecycle to `executed` (or `partially-executed` if some scope is incomplete). **Honest status (RULE-CORE-004): never stamp `executed` while any target-required artifact is missing or faked** — a manifest-mandated artifact with no real file, an empty/stub stand-in, or a demo/skeleton substituted for the real thing ⇒ `partially-executed`/`blocked` with the gap recorded, not `executed`. A plan with an **open verification debt** is `executed`/`partially-executed` **but not yet verified** — the debt stays open until a later `go` in a capable agent runs the deferred checks and clears it;
   - **(b)** refresh `tasks.md`, `evidence.md`, `log.md`, derived `status.md` (**including its plain-English `## Outcome` section** — Result / What happened / What's wrong / How to fix / How to proceed, per the status template, so the user reads the final result and next step in `status.md` alone), and consolidated manifests — **on disk, before staging**;
   - **derive two separate flags** in `status.md`, on their own lines — never merge them (plan-status reference §9–§12):
     - **`verification-debt` (Outcome B — owed):** `open` if `evidence.md` records any check as `deferred — requires execution environment` (tests, coverage, screenshots, migrations…); otherwise `none`. Summarize the owed checks (e.g. "3 UI screenshots (requires browser environment)"). This is what `mde release branch` gates on.
     - **`pending-actions` (Outcome C — parked):** `open` if `discussion.md` has any entry with `status: open` **or** `scope.md` has any Deferred scope item; otherwise `none`. Non-goals never count. Informational; does not block `executed` or release.
   - Do **not** fold a verification debt into `pending-actions` (or a Deferred scope item into `verification-debt`): a screenshot/coverage debt is *owed work blocked by the environment* (B), not a *parked leftover* (C). Both lines must be recorded so neither leftovers nor owed checks are hidden at completion — do not omit either line.
   - **(c)** *now* create the MDE reconciliation commit on the active branch (when a repository is available and Git is supported), staging **only the manifest-listed plan-owned files** plus the plan-local bookkeeping (`plans/<id>/…` — including the just-updated `status.md`/`log.md`/`tasks.md`/`evidence.md` — and `manifest/`) — never `git add -A`. Because (a)/(b) ran first, the committed `status.md` reads `executed` (no post-commit status fixup). Files dirty but not in the manifest stay dirty and uncommitted (warn that they remain). (`go` always commits its reconciliation regardless of the policy `autoCommit` setting — that flag only governs whether `start`/`evaluate` also commit.)
   - **Resume case (step 0):** when this run only verified an existing build, there are no new durable artifacts — clear the verification debt, update evidence/status/log, refresh manifests, and commit the verification result; do not rebuild.
8.5. **Recommend the next plan.** Always record, in `status.md`, a one-line
   `recommended-next:` — what work should come after this plan and *why*, from what
   this plan revealed (what it required, deferred, or found out of scope). This is
   the plan-granularity sibling of the existing `recommended:` (which names the next
   *command* for *this* plan); `recommended-next` names the next *plan*.
   **If `plans/goal.md` exists**, also write that same recommendation into its
   `## Recommended next` section, and add this plan's id to the goal's `## Plans`
   list if absent. If `plans/goal.md` does not exist, do only the `status.md` line —
   a goal is never required, and its absence changes nothing else. This is the sole
   point where `go` touches the goal file; it reads nothing else from it and no
   other behaviour depends on a goal being present.
   **Self-check (both halves, or the write silently half-completes):** after writing,
   **read `goal.md` back** and confirm its `## Recommended next` now holds *this plan's*
   recommendation — not the template's explanatory placeholder ("The most recent plan's
   recommendation…") and not a prior plan's line. A `goal.md` that still shows the
   placeholder after `go` means step 8.5 wrote `status.md` but skipped the goal — the
   goal-runner would then pick the next plan off a stale recommendation. Do not finalize
   `executed` with `goal.md` present and its recommendation unwritten; if the read-back
   still shows the placeholder, write it before stamping. (Manual use never reads
   `goal.md`, so this only bites the goal-runner — but the write is cheap and the drift
   is invisible otherwise, so verify it here where it happens.)
9. Create `release.md` only during release, not here.

## Finalization repair gate

`go` must not commit a plan with unresolved in-scope validation findings. When the
method-followed gate, the verifier re-check (step 6 — full run if evaluate never ran
it, mechanical re-run otherwise), owed verification, manifest completeness check,
annotations, or plan evidence reveals a defect:

- repair defects within confirmed scope and re-run the affected check before commit;
- keep out-of-scope findings as follow-up candidates, not as completed work;
- keep environment-blocked executable checks as `verification-debt`;
- keep unresolved user intent/open discussions/deferred items as `pending-actions`;
- set lifecycle to `partially-executed` or `blocked` when required in-scope work remains
  incomplete.

`executed` means the manifest-listed plan-owned work is complete and the applicable
validation/repair loop is clean, except for explicitly recorded environment-only
verification debt. It never means "review wrote findings but the plan committed anyway."

## Boundaries

Do not silently expand scope. If `go` discovers new required work, record it as a
finding or follow-up plan unless it is a small direct fix required to complete the
scope.

`go` commits to the **active branch**, never `main`. Releasing is branch-level
(`mde release branch`).
