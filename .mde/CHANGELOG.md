# MDE Changelog

2026-07-28 — 0.9.5 — Enhanced use-case model completed (Design + Testing layers): one-file
use case with a `## Realization` design section, the use-case **condition** as the single test
denominator, a derived (not stored) capability journey, semantic tagging as a naming-integrity
gate, code-first API, and eight mechanical verification gates.

**Use case is ONE file, faceted by layer (entity/Storage-View precedent).** The use case is a
single `user-owned` file: business sections (Intent/Actor/Trigger/Outcome/`## Preceded By`/a
**numbered** `## Flow` S1,S2…/`## Conditions`) **plus** a `## Realization` design section the
**design pass adds and fills** (business analysis never creates or scaffolds it — no `(unrealized)`
stubs), exactly as the Persistence target adds an entity's `## Storage View`. Steps are numbered;
the realization repeats each step by its # (the in-file join key). A **condition** is split by
facet: business half (`situation → expectedResult`) authored in BA; design half (operation-uri /
expectedApiStatus / rule-uri on reject / state / persistence / testLayers) added in realization.
Conditions attach to a step or (cross-cutting) the use case. `operation`/`rule` are **OKF-ref
uris** to real concepts (entity operation / rule), so coverage is machine-checkable.

**Capability journey is derived, not stored.** Each use case declares its predecessor(s) in
`## Preceded By` (OKF refs); the workflow is the **derived graph** of those edges — no `workflow.md`
artifact to duplicate or drift. Verified mechanically: refs resolve within the capability, graph
is acyclic.

**Testing: the use-case condition is the single coverage denominator.** Replaces the three old
checklists (every operation → a scenario; every rule → a `tests/business-rules/` valid+invalid
pair; every rendered op → a UI scenario) that produced hollow checkbox tests. A test proves a
condition; operations/rules/UI are covered *because* a condition exercising them is proven, and the
condition's realization supplies exactly what the test asserts. The standalone `tests/business-
rules/` pair model is **retired** — a rule is proven through the use-case conditions that invoke it.
Nothing falls through, enforced mechanically: **opConditionCoverage** (every op named in a
condition realization), **ruleConditionCoverage** (every rule claimed by a reject-condition —
static, nothing forgotten), and **ruleEvidence** (the captured run log shows the rule's concept-id
on a real 422/409/403 — runtime proof the rule was invoked and blocked the transaction; a
conditional rule fires only on violating data, so this evidence, not a static mention, is the
proof).

**Semantic tagging is a naming-integrity constraint.** `{{kind:slug}}` doesn't just link — it
asserts the concept exists and must resolve, so tagging pins generated prose to the real catalogue
and stops the AI confabulating or renaming. Now **every mention** must be tagged (not first-mention),
stated as "tag every concept" (no type-list enumeration). Backed by a high-precision mechanical
detector (**untaggedConcepts**): a distinctive multi-word concept named in use-case prose without a
tag is flagged; single common words are left to AI review (no false-positive noise).

**API is code-first.** No design-stage API contract: operations are declared on the entity
(`## Operations`), access on each operation (roles + scope), each operation realized by a use case;
the HTTP contract (endpoints/shapes/status) is the **generated `openapi.yaml`** (from routes, last).
The capability `overview.md` is a **thin index of references** — no restated API/operations table,
no pages table, no inline realizations. `designOpCoverage` rewired: every entity operation must be
realized by a use case (not matched against an overview table). `ui-catalog.md` moved under
`specs/design/UI/`.

**Verification: eight mechanical gates for the enhanced model, all tested.** designOpCoverage
(rewired), precededBy (resolves + acyclic), untaggedConcepts, realizationCoverage (every numbered
step + condition realized), opConditionCoverage, ruleConditionCoverage, ruleEvidence — system-
scoped, deterministic, each guarded `inScope` (vacuous until its inputs exist). The mechanical/AI
split is now clean: structure is verified mechanically, substance is judged by audit. Full suite
25 → 39.

2026-07-27 — 0.9.4 — Enhanced use-case model (BA layer): test conditions become the
behavioural spine; substantive business-rule/API tests; reports/ split into review/ and
evidence/.

**Enhanced use-case — business-analysis layer.** Adopted `mde.specs/design/enhanced-use-case.md`
and implemented its **first layer** (business analysis; design and testing layers follow, one at
a time, so the method is never left half-migrated). A use case now carries **test conditions** —
each a semantic title + a situation + **one** precise expected result ("when this situation
exists, this result must happen") — as the behavioural spine that design realizes and testing
proves. Business analysis defines behaviour; mechanics (pages, API paths, HTTP statuses, tables,
per-step state-change tables, design-handoff notes) move to the design realization. `use-case-
catalogue.md` gains test conditions and drops the standalone precondition/alternate-flow/exception/
state-change-table/design-handoff/representative-scenario sections (kept the business-coherence
discipline: trigger, actor authority, driving-object, business-goal-not-CRUD). `business-
transaction-analysis.md` revised: important situations surface as test conditions, not executable
examples forced into the business use case. `business-rule-catalogue.md`: every rule must be
**governed by a use case** (invoked by a step) and **proven by a use-case test condition** — a
rule with no step is an **orphan**, a rule with no condition is **unproven**; rules are no longer
a separate testing island. The `use-case` template gains a **Test Conditions** section.
(Reconciliation, recorded in the spec: the standalone `tests/business-rules/` valid+invalid
scenario-pair model is superseded — but only retired *as part of* the later testing layer, not
now; and a condition's `expectedError` label is corroborating prose, the machine-checkable
assertion stays the structured rule concept-id from `api/business-rule-responses.md`.)

**Substantive business-rule & API tests.** A business-rule test now must exercise the rule via
the real API with a **valid+invalid pair** — a lone reject can pass because the endpoint refuses
everything; the proof is the contrast (same operation, invalid rejected *for this rule*, valid
admitted). The reject must identify the rule by its **OKF concept id in a structured error field**
(not a bare status or brittle prose), stated as an API contract in `business-rule-responses.md`
so the app is built to emit what the test asserts. New `## Audit` concern in `gherkin-
traceability.md` judges test substance ("would flipping the rule off break this test?") — the
concern the coverage-only testing audit was missing. `businessRuleCovered` now requires invalid
AND valid language; the vague-Gherkin blocklist gained the demoX coverage-checkbox phrasings
(`records operation`, `exercise operation … through`, `rejects invalid input or succeeds`,
`returns a validation response for`), and a new check flags `entity.op` ids leaked into scenario
prose (code cosplaying as English).

**reports/ split — verdicts vs machine-proof.** `reports/review/` holds what `mde review app` /
`review method` write (app-review.md, method-review.md, verification.md, audit/index.md,
audit/*.md — verification is now nested under the review it belongs to, not a sibling);
`reports/evidence/` holds machine-produced proof (coverage/, code-coverage.md, db-report.json,
bootstrap-status.json, tests-*/, screenshots/). Producers and verifier readers moved in lockstep
(coverage-gate regexes, report-path defaults, plan-ready coverage path); targets recompiled.

**Migration is one-per-schema, not per-table (test/verifier fix).** Two stale migration tests
asserted the dropped per-entity mandate; migration output is `perEach: —` (one up/down pair per
version bump; entity-table coverage stays enforced by `schema-from-entities`).
`resolveNumberedPath` now treats an unfilled `{name}` abutting `{n}` as a wildcard so the
per-schema `{n}_{name}.up.sql` resolves against the real produced file.

2026-07-24 — 0.9.3 — Testing audit view + audit declares its targets; production-logic
rule stated before generation; verifier capability→entity join for whole-app plans.

**Production logic stated BEFORE generation — no fake data, no mock fallback.** The audit
and coverage checks catch fakes *after* the fact; nothing told the generator up front that
the code it writes is production logic. RULE-CORE-004 gains a "Production logic" section
forbidding hardcoded sample records, mock/stub returns in production paths, silent fallback
to fake data when a real call fails (failures must surface), no-op controls, and hand-written
coverage numbers — data comes from the real store/service/API, and an unreachable dependency
is a `blocked` condition, not a shortcut. Surfaced in the generation step itself: `evaluate.md`
3b (the old prose flow) and the E3 generate prompt (`evaluate.mjs`) both carry the clause.

**A testing audit view now exists — coverage substance is judged, not just its number.**
The floor check reads `total.lines.pct` and *trusts the file*; nothing asked where the
number came from. A generated app shipped a `write-coverage.mjs` that hardcodes `pct: 82`
with no coverage tool in the chain — clearing the 75% floor while measuring nothing — and
no gate caught it: the deterministic cosplay check only inspected per-suite reports (absent
here), and the audit had no testing concern (no `## Audit` under `features/testing/**`). Added
a `## Audit` to `coverage-threshold.md` that reads the coverage-generating script and judges
**measured** (a real tool — c8/nyc/vitest/pytest-cov — instrumented the driven process; report
keys are real `src/**` files) vs **fabricated** (a hardcoded constant, or a report whose keys
are synthetic labels — cosplay, including in the merged report). Compiles to a new
`targets/audit/testing.md` view, picked up automatically by evaluate 3e and `review app`.

**The audit now declares its targets — silent gaps made visible.** A plan loads N targets
but only those with an audit view get examined; the report said "7 genuine" over a subset
with no indication the rest (testing, run-app, persistence, dev-setup) were never audited —
reading as whole-plan assurance. `evaluate.md` 3e now splits `impact.md ## Loaded Targets`
into **audited** (view exists) and **not audited (no audit view)**, and the report must open
with an `## Audit Targets` section naming both. A loaded target the audit cannot cover is now
stated, not hidden.

**Verifier join fix — whole-app plans no longer verify vacuously.** `touchedEntities` and the
Service/Repository operation joins used direct entity refs only, while routes used the
capability→entity hop. A whole-app backend plan's manifest items are all capability-vertical
(they trace to a capability, not each entity), so `touchedEntities` resolved to **empty** →
the entire operation-coverage loop ran over nothing (0 operations "checked"), and
service/repository were falsely reported missing even when routes passed. All three now use
the same capability hop: demoX plan 003 resolves 26 entities → 97 operations, route/service/
repository 97/97/97.

2026-07-24 — 0.9.2 — Audit maturity: the audit now spans every layer, files cleanly,
runs per-plan, and reports actionably — plus a mechanical design-operation-coverage
check the audit exposed.

**Audit coverage extended to the BA sub-objects and UI design.** Beyond the capability
audit, `## Audit` now covers **entities** (real attributes/states vs. hollow), **use-cases**
(concrete flow vs. "starts the transaction" scaffolding — the exact fake found in the HR
demo), **business rules** (enforceable statement vs. named shell), **entity operations**
(domain actions + differentiated access vs. boilerplate CRUD), and **ui-design page specs**
(concrete panels bound to real entities/operations vs. generic composition shells). New
`ui-design` audit view, distinct from `web-ui` (specs vs. running behaviour).

**Audit files under ONE primary target.** A feature's `## Audit` compiled into *every*
target it impacted, so a server-endpoint audit duplicated into api + architecture + server
(architecture.md read as "really the server"). Now each audit block files under its
feature's first real impacted target — one audit, one home. `targets/audit/architecture.md`
is gone; server-code audit lives in `server.md`.

**Plan-scoped audit after verify** (`evaluate` step 3e). After verification + the runtime
gate, a **fresh session** audits **only this plan's artifacts** (the `this-plan` rows of
impact.md) — so the audit runs after *every* plan, scoped to what it produced (a BA plan
audits its capabilities/entities/use-cases; a UI plan its pages), not deferred to a whole-app
review. A `fake` on an in-scope artifact routes back to generation like a `[FAIL]`.

**Structured, actionable audit report.** Every audit view now mandates one row per concern —
**concern · verdict (genuine/fake/not-exercised) · witness · severity · fix** — ending with
counts and fakes ranked by severity. No vague narrative; every finding is directly actionable
in a repair plan.

**Mechanical design-operation-coverage check** (`scope=system`, `entity-operations-and-access`).
`$app.designOpCoverage` enumerates every entity operation and every design-capability
operation and FAILs on any entity op with no matching design row — the exact gap the audit
caught (e.g. a design realising 24 of 97 declared operations) is now a hard gate at
`mde review app`, not only an audit finding. Vacuous until design exists.

**`validate-project-contract.mjs` → `verify-method-followed.mjs`.** The meaningless
"project contract" name is gone; the script is renamed to what it does — verify the AI
actually followed the method (ran the verifier, left real evidence), not rubber-stamped the
ledger. All callers, prose, and the compliance-log filename updated.

**ERD reading.** The ERD doc (`docs/diagrams/erd.md`) now carries a `## Reading` section —
the diagram in plain English as **separate standalone sentences** (one per relationship, verb
+ cardinality quantifier), derived from the same relationships the diagram draws so they can't
drift. Requires every relationship to carry a **real role name** (a meaningful verb — `fills`,
`reports to` — not `has`/`relates to`), enforced by a check: a contentless label under-specifies
the model.

2026-07-23 — 0.9.1 — `server` rename, per-item recovery, catalogue outputs, audit
sub-command, and verifier scope/trace fixes.

**`source-generation` → `server`.** The target that owns backend code is now named for
what it is — `server` (route/service/repository/DAL are its layers), not the process that
made it. Pure rename: target skeleton, `TARGET-SERVER`, the feature folder, and all 35
`## Impact on server` / `impacts:` references. `service`/`repository` output-type ownership
unchanged (deferred).

**Per-item generation recovery (in the prose, so both callers get it).** The generation
instruction now says: flip each `output.manifest` entry `planned → created` the **moment**
its file is written — one item at a time, never batched — so a stop/crash leaves an
accurate manifest and a re-run regenerates only the still-`planned` entries and skips the
done ones. Carried in the shared prose (evaluate.md stage 3b **and** the engine's E3
prompt), so the standalone `mde evaluate` and `evaluate.mjs` both get per-item recovery
from one source; the engine's post-band reconcile is now just a disk re-check, not the
primary mechanism.

**`catalogue.json` carries outputs.** Each target entry now lists the output types it
mandates (parsed from its `## Outputs` table) — one lookup for "which target produces
what". Fixed a latent shadowing bug this surfaced: the new `targets/audit/*` phase views
were shadowing real targets in the compiler's name→path map (and the validator), so a
target could compile from an empty skeleton; both now skip phase-view dirs.

**`mde review app audit [target]`.** A focused substance-audit sub-command — a fresh
session drives the running app and judges each concern genuine/fake/not-exercised against a
witness (the app's own log), following the compiled `targets/audit/*` views. `audit ?`
lists targets; `audit <target>` one; `audit` all. Output: one `reports/audit/<target>.md`
per target plus a `reports/audit-report.md` summary. Report-only, and **`mde review app`
now commits its own report output** (scoped to `reports/`).

**Verifier fixes.** (1) Route↔operation trace-join: a capability-vertical route (traced to
`capabilities/<cap>/overview.md`) now resolves to its entities via the overview's
`{{entity:X}}` tags — so `capability-api-boundary` stops falsely reporting "no API endpoint"
for operations whose routes are real, marked, and verb-mapped. (2) `verify.log` gets a run
header each invocation (`=== verify: <mode> · <iso-ts> · <project> · <plan> ===`) so
stale/earlier runs can't be mistaken for the current result. (3) install-dev's db-connect
round-trip check, the correlation-id feature, and the persistence audit sections carried
over from the 0.9.0 batch's tail.

2026-07-23 — 0.9.0 — The evaluate engine, the run-app target, an audit phase, and a
batch of verifier scope/honesty fixes. The through-line: turn prose requirements the AI
could self-certify into mechanical, evidence-gated checks, and keep per-plan evaluate
judging only the plan.

**`evaluate.mjs` — the phase-orchestration engine (new).** Walks a plan's evaluate as
fresh sessions the framework sequences, ticking `tasks.md` only on evidence (a script
exited 0, a judge returned its verdict) — the AI never ticks its own boxes. Generation
(E3) walks the manifest by band, one session per contiguous artifact-kind run, each fed
the target(s) that mandate its artifacts. Highlights: band-level resume (skip
already-`created` bands, including on repair — no rebuilding completed work); the
framework reconciles the manifest against disk after each band (watch it fill in);
`--grain plan|band-group|band` makes session cost a knob (21→10→1 sessions on a 62-artifact
plan); incremental regeneration marks stale only artifacts whose `sourceRef` source changed
(a plan edit no longer forces a full rebuild); a blocked generation band halts honestly
rather than fabricating a validation-repair; a per-invocation run-log with timing, verdicts,
and repair reasons; usage-limit pause; UTF-8/BOM-safe logs that overwrite per run.
Agent-spawning machinery extracted to `goal-loop/agent-runner.mjs`, shared with the loop.

**`run-app` target (new).** The anchor an author reaches for — *"I made code, run it."*
`requires: dev-setup`, so loading run-app pulls the readiness environment via the
dependency cascade (the AI never has to remember it; Gate 1 enforces it). Mandates
`build.log` + a **full-suite regression** `test.log`, each verified to show a real clean
run — closing the "prints instructions instead of running" cheat. run-app *runs* the
scripts source-generation/testing authored; running is not authoring, and it is not
`deployment` (which authors remote deploy scripts, never run here).

**Audit phase (new).** Features now carry a `## Audit` section — general, scope-agnostic
guidance for how a **fresh session** judges whether the concern genuinely *behaves*,
against a witness the author does not control (the running app + its own log), not merely
that an artifact is present. Compiles per-target into `targets/audit/<target>.md` —
phase-isolated (the generator never sees the auditor's instructions); scope is applied by
the caller at run time, not authored. Added across the app's substance: UI (no-op controls,
silent hardcoded fallback, subset-of-spec pages, un-propagated identity), business rules
(displayed vs enforced), server code (hollow routes), business-requirements (boilerplate
capabilities), and design (drift from the BA it cites).

**`mde:ready` + readiness honesty.** New contracted `mde:ready` script — proves every
*user-provided* env config (DATABASE_URL, keys, service URLs) is present and working,
blocks on failure, runs before every build (distinct from `mde:install`). install-dev
gains a mechanical check that `db-connect.log` shows a real round-trip (a `SELECT 1`), not
a script that only prints "now run mde:install, db:reset…". A `test-correlation-id` feature
lets tests prove they reached the server (TestID+RunId carried on requests, read from the
inbound header, correlated to the server log).

**Verifier: keep per-plan evaluate scoped to the plan.** The mandated-output gate's
`perEach` expansion is now scoped to the instances the plan's manifest references — a
Client-Management plan is no longer FAILed for not producing specs for the other 25
use-cases in the app (25/18/10-file out-of-scope FAILs gone). The gherkin business-rule
coverage check moved `scope=plan → scope=system` (an app-wide question belongs to
`review app`). captured-command-output's citation check gained an `evidenceMdExists` guard
(no more "evidence.md doesn't reference the report" when there is no evidence.md). Fixed a
`typeof null` crash that took down the verifier on any pre-generation (all-`planned`)
manifest, and turned off the always-on `[verify:debug]` trace that clogged captured logs.

2026-07-20 — 0.8.25 — Retired the four hardcoded whole-app validators from
`validate-project-contract.mjs` into target-scoped feature checks, fixed the page→entity
trace regression, and added a feature-owned aspect vocabulary. Three connected pieces:

**Validator migration (script → features).** `validate-project-contract.mjs` dropped from
~260 to ~80 lines — it now holds ONLY the plan-scoped verifier-ran gate. The four whole-app
validators moved to feature checks, and the migration refined the old "all whole-app" analysis:
most were actually **plan-scoped checks on known artifacts**, made precise by the check-block
`target=` gate (0.8.24). `validateUiDesign` → `design-system-styling.md` (`$plan.designSystem`:
declared tokens/components implemented in the plan's generated web source; stack contradiction),
`scope=plan target=web-ui`. `validateComposition` (canvas/panel vocab) → `page-composition.md`
(`$t.compositionValid`), and `validateOperationCoverage`'s up-drift → `page-composition.md`
(`$t.opsResolve`) both `scope=plan target=ui-design`. `validateBusinessRules` split:
spec-filled-in → `business-rule-catalogue.md` (`$rule.specComplete`), rule-tested was already
`gherkin-traceability.md`. Each was unit-tested non-vacuous + run against real apps (no false
positives) before deleting the JS; dead helpers + the `appWide` gate removed.

**Page→entity trace regression fixed.** A page-spec's `sourceRef.refs` had regressed to naming
only its capability, so the manifest could no longer answer "which pages implement `<entity>`"
and verification couldn't derive a page's `$item.entity`. The convention (refs list the subject
entity + every rendered entity + the capability, not the capability alone) is now explicit in
`page-spec.md` + the manifest schema, and enforced by a `scope=plan target=ui-design` check
(`$t.entity EXISTS`). Generalized in the schema: rule-enforcing code/tests ref the specific rule.

**Feature-owned aspect vocabulary.** Aspects were fuzzy prose (`## Aspects` matched by ad-hoc
regex like `/audit/i`), with no validity check — a typo or unimplemented aspect silently did
nothing. Now a feature that implements an aspect OWNS it, declaring `aspects: - <name> |
<declaredAt>` in frontmatter (the upstream twin of `impacts:`); `compile-targets.mjs` gathers
them into `aspects-catalogue.json` (`{name, declaredAt, implementedBy}`, single-owner enforced).
The entity template references the catalogue instead of a hand-listed set, and `entity-model.md`
gains a `scope=item` check flagging any entity aspect not in the catalogue. Four aspects
catalogued: audit-trail (audit-history), optimistic-locking (optimistic-locking), surrogate-key
(storage-view-model), soft-deactivation (entity-model).

Docs: `verification.md` records the completed migration + the DSL↔`model.mjs` contract (every
`$path` is a lookup into a model field; a check references a field `model.mjs` must populate) +
the `target=` attribute spec; `manifest-design.md` records the refs-lists-every-upstream rule;
`features/README.md` documents the `aspects:` convention. Method validation clean; verifier 7/7,
method-scripts 2/2.

2026-07-19 — 0.8.24 — Fixed a class of false positives where implementation checks
fired on design plans. Root cause was three separate leaks, all found validating a
real design plan (produce-full-application-design):
(1) A check block's `target=` attribute was dead metadata — parsed by no one, so a
`target=api` check ran on any plan whose owning feature was relevant via some OTHER
loaded target (e.g. architecture). The verifier now parses `target=` and skips a check
whose target isn't loaded.
(2) `$plan.loaded CONTAINS "api"/"persistence"` used SUBSTRING matching, so a design
plan loading `api-design`/`persistence-design` tripped guards meant for the bare
`api`/`persistence` implementation targets. Changed to `"api" IN $plan.loaded` (exact
element match) across 5 features (transaction-boundaries, shared-access-enforcer,
context-propagation, cross-cutting-concerns, logging).
(3) The page-spec completeness check demanded literal template tokens
(`pagePattern:`, `## Primary Capability`, …) that real page specs express in
equivalent forms (`**Page pattern:**`, `capability:` frontmatter, `## Composition`),
so complete pages were flagged "missing all six sections". Made it format-tolerant
(model-side `$t.pageSpecComplete`) and its message now names the actual gaps.
Also: object-shaped refs printed as `[object Object]` — now coerced to the real path
(and the finding blames the artifact's own `path`, not its upstream `sourceRef`);
the coverage finding's stale wording "no capability trace" → "no feature trace"
(post the capability→feature rename). Separately, the four whole-app validators in
`validate-project-contract.mjs` (page-spec/composition/operation-coverage/business-rule
coverage — leftover hardcoded checks from before `scope=system`) now run ONLY app-wide
(`mde review app`), not at per-plan `go`, so a design plan no longer fails its own `go`
for whole-app gaps outside its scope (e.g. business rules with no tests yet). The
verifier-ran gate stays per-plan. Verified against the real design plan (6 issues/109
instances → 2 legitimate/28) and full regression suite (verifier 7/7, method-scripts
2/2, method validation clean).

2026-07-18 — 0.8.23 — Split "the database is reachable" (an environment fact) from
"the schema the migrations declared exists" (a schema-building fact), which 0.8.22
had conflated by hanging the DB proof on the persistence target. Found via a real
plan: an environment-prep plan (operation setup) that deferred schema legitimately did
**not** load `TARGET-PERSISTENCE`, so `db-report.json` was correctly not required of it —
but that meant the one plan whose whole job is proving the environment owed no
reachability evidence at all. Added a dedicated **`TARGET-DEV-SETUP`** whose `## Outputs`
mandate the smokescreen evidence logs (`env-check`/`db-connect`/`migrate`/`health`/`smoke`/
`teardown` under `plans/{plan}/evidence/logs/`), with `db-connect.log` (`when: db-in-scope`)
as the required proof the DB was reached — so an environment plan's mandated-output gate now
fails if it produced no evidence of a live connection. `db-report.json` stays on
`TARGET-PERSISTENCE` (schema proof, owed only by plans that build schema). `install-dev` now
impacts both `dev-setup` and `source-generation`; recompiled the affected targets.
`db-connect.log` remains the proven-capable anchor (revokes downstream deferral), and
connection details stay host/port/db only, never the password.

2026-07-18 — 0.8.22 — Strengthened environment-readiness evidence so a persistence
plan can no longer claim success without proving the database is real. `install-dev`'s
smokescreen now writes a required per-step log set under `evidence/logs/`
(`env-check`/`db-connect`/`migrate`/`health`/`smoke`/`teardown`), each with a defined
pass condition — the smokescreen is "passed" only when the logs exist and show success,
never on the agent's say-so; `db-connect.log` (a live connection + trivial round-trip) is
the anchor that proves the runtime capable, so any later `requires-environment` deferral
in the same plan is a defect. Added `reports/db-report.json` as a **required output** on
the persistence target (`## Outputs`), so the verifier's mandated-output gate fails when a
persistence plan has no captured `mde:db-report` proving the DB exists (health `pass` +
the migration-declared tables present). Passwords are explicitly excluded from every
logged connection detail (host/port/db only). Added a features-README convention —
"prompt and pause, never guess or defer": when a feature needs user-only input (DB
credentials in `.env`, a decision), it asks the user for the specific thing and waits,
and must not invent a value, proceed on a broken state, or defer-as-"requires-environment"
what is really a missing user input. Recompiled the source-generation and persistence
targets from the changed features.

2026-07-17 — 0.8.21 — Migrated `validateOperationCoverage`'s down-gap direction onto
`scope=system`: split the function's three concerns correctly this time (down-coverage —
whole-app join, no owning plan, moved to `ui-shared/operation-coverage.md` as `scope=system`
+ `ASK`, folding both entity-operation and use-case dimensions into one question, gated on
`$app.hasFile["specs/design/UI/operation-coverage.md"] IS "true"`; up-drift — stays in the
script, genuinely plan-scoped per the design doc's own earlier finding). Removed the now-dead
`--app-wide` flag from `validate-project-contract.mjs` (its only consumer is gone) and updated
`app.review.md` accordingly — it now calls the script the same way `go` does, and separately
runs `verificationRunner.mjs --app-wide` for the `scope=system` sweep. Fixed a real bug found
building this: `$app.hasFile` returned a raw boolean, so `WHEN ... EXISTS` always evaluated
true regardless of the actual value (`EXISTS` tests presence/non-emptiness, not a boolean's
value — a confirmed `false` still "exists"). Fixed by returning "true"/"false" strings, the
model's existing boolean convention, and using `IS "true"` in the guard — a standing DSL
gotcha worth remembering: a boolean guard is always `IS "true"`, never `EXISTS`. Verified
against hrdemo (guard holds, both dimensions surfaced in one ASK) and the dev repo itself
(no coverage report → guard correctly withholds, no false pass); full regression suite green,
plan-scoped re-run unchanged from baseline.

2026-07-17 — 0.8.20 — Built `scope=system`: the check DSL's third scope, for whole-app
completeness questions with no owning plan (e.g. "does every entity have a Maintenance
panel somewhere") — runs once, independent of any plan, only under `mde review app`
(`--app-wide`), never at `evaluate`/`go`. `capability-parser.mjs` recognizes the tag;
`model.mjs` adds a deliberately minimal `$app` root (`hasFile` only — no join fields, since
the resolved design has the check body's `ASK` do the whole-app reading itself, not a
model-side join); `verificationRunner.mjs` gets `runAppWide()` + a new `--app-wide` CLI
mode; `report-writer.mjs` gets `writeSystemReport()`. `app.review.md` now invokes it
alongside the existing per-plan re-runs (report-only, same boundary). Migrated the first
real check onto it: `validateComposition`'s whole-app Maintenance-panel join (the other
half of that function — per-page canvas/panel vocabulary — stays in the script; it's
genuinely plan-scoped) moved to `page-composition.md` as a `scope=system` + `ASK` block,
verified against hrdemo. Fixed a `parseBlock()` gap found while building this: a bare
`ASK` with no preceding `WHEN`/`EVERY` (needed for a whole-app question with no set to
iterate) silently parsed to zero rules — `ASK` now opens a rule itself when none is open,
with no change to the existing `WHEN`/`EVERY`-prefixed form. Also fixed a latent
interpolation bug caught testing this: `standard-root-operations.md`'s `ELSE` message
(0.8.19) was wrapped across two lines, which silently drops everything after line one
(matches the single-line convention every other check already follows — not a DSL change,
just a fix to that one check's authoring).

2026-07-16 — 0.8.19 — Migrated `validateOperations` out of `validate-project-contract.mjs`
into a real `scope=plan` check block on `standard-root-operations.md` — step 1 of the
migration order in `.mde/mde.specs/design/verification.md`'s "Plan-level vs. system-wide
checks" section (the one validator of the six with no whole-app join, safe to move without
`scope=system`). New `techStackOperations()` (`target-catalogue.mjs`) computes the required-
operation-key set from project structure (`tests/`, `db/migrations`, `db/seeds`, `db/`),
parses tech-stack.md's Operations Map (YAML-block and markdown-table forms), and checks each
against package.json scripts, folding required-but-unmapped / missing-script / no-op-
placeholder into one `ok` flag per `$techStack.operations` entry. `parseOperations`/
`validateOperations` deleted from the script entirely — no call site remains. Verified against
hrdemo's real tech-stack.md/package.json (correctly flags its missing `db:schema-dump`
mapping) and via a direct DSL evaluation smoke test.

2026-07-16 — 0.8.18 — Split `model.mjs` (1372 lines) and `verificationRunner.mjs` (820
lines) into focused modules — pure refactor, no behavior change, verified by exact
finding-count parity against hrdemo's real plans before/after:
`model.mjs` → orchestrator (`buildModel()`, 497 lines) + `manifest-item.mjs` (manifest
read + `$item` construction, entity/page trace joins), `target-catalogue.mjs` (tech-
stack/loaded/excluded/required targets, a target's `## Outputs`, spec-instance
enumeration), `spec-parser.mjs` (`$spec`: lazy entity/business-rule/page parsing),
`plan-builders.mjs` (server slices, migrations, test evidence, coverage incl. cosplay
detection, cross-slice imports). `verificationRunner.mjs` → orchestrator (`run()` +
CLI entry, 313 lines) + `capability-parser.mjs` (capability file id/impacts/Checks
bullets/```check fence extraction), `dsl-evaluator.mjs` (the check DSL's own parser +
$-path resolver + rule evaluator), `report-writer.mjs` (the Markdown verification
report), `format-helpers.mjs` (stdout summary, mandated-output path matching, report
text helpers). Every module's only cross-file dependency is a plain import — no
circular imports (the one real cross-concern, `toItem()` needing `dataCoveredFields()`
from spec-parser, is passed as a parameter instead of an import to keep manifest-item.mjs
from depending on spec-parser.mjs). Confirmed no hardcoded target/suite names crept
back in during the move (the two intentional named exceptions from 0.8.16,
`auth-in-scope`/`data-model-in-scope`, are the only non-catalogue target references
anywhere in `.mde/verification/*.mjs`). `.mde/verification/README.md`'s `## Files`
section updated to describe the new structure. Verified: full test suite green, and
identical `verify:` summary line (distinct issues / instances / ASKs) for all 7 hrdemo
plans before and after the split.

2026-07-16 — 0.8.17 — Same invalid-target-name validation for tech-stack.md, plus fold both
this session's target-agnosticism fixes into `mde review method` so they're audited going
forward, not just fixed once:
(1) **`specs/design/tech-stack.md`'s `type:` block validated against `catalogue.json`** — the
same defect class as 0.8.15's `impact.md ## Loaded Targets` fix, one level up: a
fabricated/misspelled `type:` (e.g. `backend` instead of `api`) silently narrows the app's
target-applicability "universe" with no error, which can mask a genuinely-required target as
"not part of this app's stack." This universe is what `mde review app`'s target union is built
from (`app.review.md` line 17), so the fix protects review as much as evaluate/go. New
`$plan.invalidTechStackTargets` in `model.mjs`; `verificationRunner.mjs` emits the same
gate-1 finding shape. Verified: hrdemo's real tech-stack.md is clean (all 6 `type:` values
real); a fixture with `type: backend` correctly flagged, `type: web-ui` correctly not.
(2) **`mde review method` extended** to cover what 0.8.15/0.8.16 just fixed, so it's audited
on an ongoing basis rather than a one-time cleanup: step 0's vague "catalogue consistency
where feasible" is now concrete (every `targets/**/*.md` `id:` must have a matching
`catalogue.json` entry and vice versa — catches a stale catalogue.json from a hand-edit or a
partial `compile-targets.mjs` run); step 2a's command target-agnosticism audit (RULE-CORE-001)
now also covers `.mde/verification/*.mjs` — a hardcoded `facts`-style target-name lookup or a
fixed suite-name array reintroduced later is the same class of violation as a command
hardcoding a target list, and review now says so explicitly.

2026-07-16 — 0.8.16 — Remove ALL hardcoded target/suite names from the verifier — logic now
relies on target files (and discovered manifest/disk state) 100%, per user correction that
0.8.15's catalogue.json was only a performance fix, not the actual ask:
(1) **`compile-targets.mjs` writes `targets/catalogue.json`** (id + requires + path per
target) as part of compiling targets from features — the single place targets are discovered.
`model.mjs`'s `allTargetIds()` reads this JSON; no live walk/parse of `targets/**/*.md` at
verify time.
(2) **Removed `model.mjs`'s hand-maintained `facts` object** (`'ui-in-scope':
loaded.includes('web-ui')`, `'api-in-scope': loaded.includes('api') || loaded.includes('api-
design')`, etc. — 6 named gates hardcoding 6 target ids by literal string). Replaced with a
generic `whenHolds(when)`: `when` is now the target's own real id (or comma-separated ids,
OR'd) evaluated directly against `loaded` — e.g. `when: api` instead of `when: api-in-scope`.
Two conditions are NOT target-shaped and stay as named, explicitly-commented exceptions (there
is no target whose id IS "auth"): `auth-in-scope` (depends on tech-stack.md's auth axis, not
target-loaded state) and `data-model-in-scope` (persistence targets OR "the plan touched an
entity" regardless of which target loaded it).
(3) **Discovered, during the audit, that nearly every `when` value across 11 target files was
a dead tautology**: a row inside `api.md` gated by `api-in-scope` (= `api` OR `api-design`
loaded) is only ever evaluated when `api` itself is already loaded (the outer loop only fetches
a target's Outputs when that target is in `loaded`) — so the condition was always true by
construction. Updated all 11 files: same-target rows simplified to `always`; genuinely
cross-target rows (`testing.md` gating `api-test`/`ui-test` on whether `api`/`web-ui` are
SEPARATELY loaded; `documentation.md` gating walkthroughs/user-guide/operator-guide on
`web-ui`/`deployment`; `architecture.md` gating `shared-infra-source` on `source-generation`)
now name the real other target's id directly instead of a nickname.
(4) **Removed the two remaining hardcoded suite-name lists** (`['api','ui','business-rules']`
for server-log checking, `['unit','api','ui']` for coverage-cosplay detection — both added
earlier this session). Suites are now DISCOVERED: server-log check scans `reports/tests-*/`
directories that actually exist on disk; cosplay check scans the manifest for whatever
`reports/coverage/<suite>/coverage-summary.json` entries the plan actually produced. A stack
that adds a suite the method never named (contract tests, load tests, …) is covered
automatically, no method change required.
Verified: full regression suite green, hrdemo plan 003 (fabricated `TARGET-BACKEND` etc.)
still correctly flagged, plan 004's `ui-test`/`api-test` gating unchanged, cosplay/server-log
fixtures re-run clean.

2026-07-16 — 0.8.15 — Validate loaded-target names against the real target catalogue:
traced the 0.8.14 item-3/item-4 blind spot (`reference-display`/`schema-from-entities` never
firing on hrdemo plan 003) to its actual root cause — plan 003's `impact.md ## Loaded Targets`
names `TARGET-BACKEND`, `TARGET-DB-SCHEMA`, `TARGET-SEEDING`, none of which are real targets
(the method's actual catalogue has `TARGET-API`, `TARGET-PERSISTENCE`, etc.). `loadedTargets()`
in `model.mjs` only ever regex-extracted `TARGET-*`-shaped tokens with no check against the
catalogue, so a fabricated/misspelled name silently occupies a "loaded" slot while triggering
no real target's checks — worse than a genuinely missing target, because it looks covered.
Added `allTargetIds()` (walks `.mde/method/targets/**/*.md`, reads each file's own `id:`
frontmatter — never a hand-maintained list, so it can't drift) and `$plan.invalidLoaded`;
`verificationRunner.mjs`'s gate 1 (target inclusion) now fails loudly on any invalid entry,
reported ahead of the missing-target check since it's the more dangerous failure (hidden vs.
visible). Verified against hrdemo: correctly flags all three fabricated names on plan 003, zero
false positives on plan 004 (real target names) or the dev repo's own plans.

2026-07-16 — 0.8.14 — Business-rule test location/log requirements, API/repository
display-label rule, and a live schema-dump-vs-model check — all found via a real retrospective
audit of hrdemo (verifier run against every historical plan commit via detached git worktrees,
never touching the live working tree):
(1) **Business-rule test location** — `testing.md`'s `rule-test` output moved to the dedicated
`tests/business-rules/{cap}.feature` (was mixed into each capability's regular `.feature`);
added `rule-test-report` → `reports/tests-business-rules/`. `gherkin-traceability.md` gained a
location check (`inCorrectLocation` in `model.mjs`, scoped to a business-rule-only feature
blob) distinct from the existing violation-coverage check, plus content requirements (state the
rule, sample data, result).
(2) **Server logs as evidence for every suite that drives the real app** — `captured-command-
output.md` now requires `LOG_PATH` → `reports/tests-{api,ui,business-rules}/run.log` per suite
(not just the test runner's own report), closing the "assertions passed but never reached the
server" gap. `model.mjs`'s `buildTestEvidence()` gained `missingServerLogSuites`.
(3) **`reference-display.md` extended to api/source-generation** — a related-entity's display
label must survive the whole path: repository JOIN (deterministic smell check: a Repository
SELECTing a `..._id` column with no JOIN anywhere in the file), and a create/update response
that already fetched the related entity for validation must carry its display-label forward
(AI-judgment ASK, since "is the join correctly wired to this field" isn't regex-checkable).
Verified against hrdemo's real repositories (`AssignmentRepository`, `PerformanceReview-
Repository`, `PerformanceGoalRepository` — all three do JOIN correctly) and confirmed the
false-positive-safe path (absolute/relative, forward/back-slashed FK-column keys).
(4) **Live schema-dump-vs-model check (persistence-integration-test.md)** — closes a real gap
found in hrdemo: migration 002 shipped without 5 spec-declared employee columns, discovered and
patched by hand months later as migration 009, because the one static check that could have
caught it (`schema-from-entities`) never ran (the plan never loaded `persistence`), and the
*live*-schema check was previously prose-only with no mechanism at all. Per user correction,
this does **not** hardcode `information_schema`/Postgres: `standard-root-operations.md` gained
`db:schema-dump` as a required, stack-specific Operations Map entry (`pg_dump --schema-only`,
`mysqldump --no-data`, an ORM's own introspection, etc. — recorded in `tech-stack.md` like
`migrate`/`seed`), and `persistence-integration-test.md` gained two ASK-based semantic checks
(schema-dump format varies per stack, so this is AI-judgment, not a fixed regex): confirm a
dump was captured, then confirm each entity's Storage View genuinely appears in the live dump.
`validate-project-contract.mjs` requires `db:schema-dump` in the ops map whenever `db/` exists —
verified this correctly flags hrdemo's tech-stack.md as currently missing it.
(5) **Retrospective finding, not yet fixed**: `mde review app`'s per-plan verifier loop does
not actually widen any single plan's check scope to the union of loaded targets — each
iteration still only sees that one plan's own manifest trace and its own loaded targets. This
is why the repository-join fix (item 3) went uncaught by every plan: the plan owning the fixed
files (003) never loaded the targets that trigger `reference-display`, and the plan that did
load them (004) doesn't own those files. Confirmed empirically (looped the exact command
`app.review.md` specifies across all 7 hrdemo plans; the check never fired in any of them).
Logged for a future session — a real redesign, not addressed here.

2026-07-15 — 0.8.13 — Close three test/coverage verification gaps found while investigating
hrdemo's actual state (tests executed but results never traced to evidence, no coverage
report ever computed at its declared path):
(1) **Coverage report path mismatch (root cause)** — `model.mjs`'s `buildCoverage()` was
reading `evidence/reports/coverage*.json` (plan-local), but `testing.md`/`coverage-threshold.md`
declare the real, durable location as `reports/coverage/coverage-summary.json` (merged) +
`reports/coverage/{unit,api,ui}/coverage-summary.json` (per-suite). The existing
`reportPresent`/`meetsFloor` check block was silently no-op-ing against the wrong path on
every project. Fixed to read the documented paths.
(2) **Coverage cosplay detection** — added `hasCosplay`/`cosplaySuites` to `$plan.coverage`
and a new `coverage-threshold.md` check block: a per-suite report whose entries are all
synthetic placeholders (`api:cucumber-scenarios` etc., no real file that exists under `src/`)
now fails instead of silently passing. Path matching tolerates absolute/relative and
forward/back-slashed keys (real coverage tools emit both) by checking the resolved path
actually exists on disk, not a rigid prefix regex — verified against hrdemo's real
Windows-absolute-path coverage report (no false positive) and a synthetic fixture (correctly
flagged).
(3) **Test-execution evidence** — added `$plan.testEvidence` (model.mjs) and two check
blocks in `captured-command-output.md`: a plan must leave a machine-readable test report on
disk (`evidence/logs/test.log`, or `cucumber.json`/`results.json`/`junit*.xml`/an HTML index
under `reports/`), and `evidence.md` must actually reference it — closing the "claimed tests
passed, nothing traces to it" gap. Verified live against hrdemo plan 007: correctly flagged
that its real `reports/tests-api/cucumber.json` + `reports/tests-ui/cucumber.json` are never
cited in `evidence.md`.
(4) **`ELSE` message interpolation (verificationRunner.mjs)** — found while building (1)-(3):
`${$path}` interpolation only ever ran for `ASK` messages, never `ELSE`, so any check
attempting to name specifics in its failure message (e.g. which files were found) printed the
literal `${...}` unexpanded. `emit()` now interpolates `rule.msg` the same way as `rule.ask`.
All changes verified with the existing `verificationRunner.test.mjs` +
`method-script-regressions.test.mjs` suites (unaffected, still green) plus new live runs
against hrdemo's real plan/report data and purpose-built fixtures for the cosplay true/false
cases.

2026-07-15 — 0.8.12 — Deterministic business-rule coverage gate:
`validate-project-contract.mjs` gained `validateBusinessRules()`, closing a real gap in
`business-rule-catalogue.md` — its `## Checks` were prose/AI-review only (no `check` block),
so a cataloged rule with unfilled template placeholders or with no backing test could pass
every existing gate silently. The new check walks both rule locations
(`specs/business/rules/<slug>.md` and `specs/business/capabilities/<slug>/business-rules/
<slug>.md`), fails when a rule's frontmatter `id:` or any required section (Statement, Owning
Capability, Affected Entities, Trigger/Context, Constraint/Decision/Calculation, Testability)
is missing or still a template placeholder, and fails when a rule's `id` is not referenced by
any file under `tests/` (an unenforced/untested rule). No-ops when no rules are cataloged yet
(a BA-only plan), so it does not block early-stage work. Verified with three cases: a
well-formed rule referenced by a test (pass), a raw unfilled template (fail on placeholders),
and a well-formed but untested rule (fail on no test reference).

2026-07-15 — 0.8.11 — Close the "evaluate ticked verification without running it" gap:
`validate-project-contract.mjs` now takes an optional plan-dir argument and, when given one
(`go`'s call now always passes it), hard-checks that `tasks.md`'s claim that verification
stages 4/6 ran is backed by a real `evidence/logs/verify.log` (present, non-empty, and
containing a genuine `verificationRunner.mjs` summary line) — a ticked checkbox with no
backing run now fails this script's exit code, which `go` already hard-gates on, so the gap
closes at the code level rather than relying on an agent re-reading `plan.go.md` prose
correctly. `plan.go.md` step 5 updated to pass the plan dir; step 6 still re-runs the
verifier in `--mechanical` mode and re-checks `evidence.md ## Semantic ASK Answers` as a
belt-and-suspenders re-confirmation. Also strengthened `boot.md`'s Command Rule to require a
full re-read of the command's own profile before every invocation ("in full", "do not rely
on prior context") — the standing-instruction lever that reduces the odds of this class of
skip happening again elsewhere.

2026-07-14 — 0.8.10 — Fix over-strict `relationships:` check before live test (commit cc969f9):
Full read-through of the 0.8.9 UI-design redesign (template, all 6 owning features, both new
features, compiled targets) ahead of the first live test. `page-spec.md`'s deterministic
`scope=plan` check hard-required the literal string `relationships:` in every page-spec, but
`page-defaulting.md` documents a legitimate single-panel shape (a lookup entity's
Table-with-edit-in-place) with nothing to relate — this would have failed `mde evaluate` on the
first simple-entity page tested. `page-composition.md`'s own check already scopes this correctly
("does each **multi-panel** page declare relationships"); removed the blanket requirement from the
hard check to match. Also mapped the two panel types (`Summary`, `Chart`) `carbon-ui-profile.md`
had left without Carbon guidance, and fixed a broken sentence in `page-defaulting.md`.
Method validates: 8 rules, 16 target profiles, 12 command profiles.

2026-07-14 — 0.8.9 — Page-spec redesign: pattern-first composition, panel relationships, Carbon UI
profile (commits 8e8b79b, 6e3e66c, 25601e3):
Three-part redesign of the page-spec / ui-design layer, reviewed in full and landed as three
commits so the diffs stay legible. Nothing is released yet, so this is a clean cutover — no
backward-compatibility clauses, no migration story.
(1) **Page-spec template** — Composition now declares `uiProfile` + `pagePattern`
(Search-Filter-List / Profile / Parent-Children / Compare-Match / Summary-Drilldown / Custom, with
required reason for Custom) before the concrete canvas/panel shape, and panels carry typed
`relationships` (Dependent/Selected/Reference/Compare/Match/Aggregate/Compose/Control). The
Interaction Model moved from a flat step table to scoped interactions — trigger, mode
(create/edit/view/operate), workingObject, targetScope/selectionOwner/noSelection, ordered steps,
validation, and explicit commit/abandon outcomes (operation, target, effects, success). Every
editable input now traces to Data Covered (Captured).
(2) **Review fixes** — restored a worked target-binding table (the mechanism that prevents a Save
wired to `collection[0]`, which the redesign had reduced to a bare enum with no guidance); required
partial-failure behavior on bulk commits; reconciled `## Actions` as the flat rollup of
`outcomes.commit` (it and the Interaction Model were two unreconciled places that could each define
"what does this button do" — the same shape as the original Codex review finding); Data-Covered
ownership for relationship-sourced fields; disambiguated the `Info` vs. `StateTransition` subpanel
owner.
(3) **Owning features** — extended the same redesign to `interaction-binding` (scoped interactions,
why `Submit` needs disambiguation per interaction type), `page-composition` (Canvas/Panel/
**Relationship**, replacing vague canvas links with typed business semantics; `Info`/
`StateTransition` subpanel definitions), `page-defaulting` (page shape now falls out of
`pagePattern` selection), `lifecycle-transition-control` and `object-info-metadata` (updated to the
subpanel vocabulary). Added two new features: **`ui-patterns`** (the 5 preferred page patterns +
selection policy + the external-standards boundary — MDE owns purpose/pattern/panels/relationships/
outcomes, the UI profile owns component behavior/accessibility/tokens — resolving the earlier
parked Form/Function split) and **`carbon-ui-profile`** (adopts IBM Carbon as the default web UI
profile, mapping every MDE panel type to a real Carbon component — resolving the other parked item,
baking accessibility into the design-system components, with a concrete default). Swept every
remaining `SelectDetails`/`PopupDetails`/"canvas link" reference to the `Selected`-relationship
vocabulary so no stale terminology remains anywhere in the method.
Recompiled `targets/design/ui-design.md` (11 features, was 10) and `targets/app/web-ui.md`
(33 features, was 31). Sourced from the `mde-ui-patterns-complete`/`method-ui-patterns-integrated`
packages, now fully absorbed and removed.
Method validates: 8 rules, 16 target profiles, 12 command profiles.

2026-07-14 — 0.8.8 — Every command notifies Commander + naming-confusion fix (works 020–021):
(1) **Commander Phase 4 (work 020):** every `mde` command now notifies the Commander bar on
completion, not just `mde show`. Delivered as **one shared rule**
(`rules/workflow/05-commander-notify.rules.md`) inherited by all 12 command docs (they already
`loads: rules/workflow/*`) — no per-command edits. States the event name + whether it blocks, per
command (`mde go` → `finalized`, non-blocking; `mde evaluate` → `evaluated`, blocking; etc.). Fixed
a scenario/blocking mismatch caught by cross-checking the rule's table against the server
(`released` was wrongly non-blocking; a release is consequential — now blocks). Removed
`plan.status.md`'s now-redundant local prompt-ui tail (had the pilot's old unsupported `--wait`
flag) in favor of the shared rule.
(2) **Command-naming confusion fixed, without renaming files (work 021):** `RULES_OVERVIEW.md`'s
Commands table referenced nonexistent files/commands (`version.start.md` / `mde start version`) —
corrected to the real files and commands, and completed with the two rows that were missing
(`mde show`, `mde show version`). Added a **uniqueness guard** to `validate-method.mjs`: every
command file's frontmatter `command:` must be unique — this is the check that would have caught the
`mde show` / `mde show version` naming question early. The filename-vs-command-name mismatch
(`plan.status.md` serves `mde show`) is now documented and guarded, not renamed away.
Method validates: 8 rules, 16 target profiles, 12 command profiles.

2026-07-14 — 0.8.7 — Commander workbench overlay + `mde workbench` command (works 017–019):
Builds out the prompt-ui pilot from 0.8.6 into a working human-in-the-loop review gate, hosted in
the shared workbench (agent-agnostic — any driving AI, not just Claude).
(1) **Commander overlay bar** (`workbench/commander.py`, `routes/commander.py`, overlay markup in
`templates/index.html` + `static/app.js`/`style.css`): an in-flow bar above the workbench app (not a
covering overlay) that shows a pending question — the active plan's discussion is the question; the
user's response is **general** (free text, or the Go/Re-Evaluate shortcuts) and is recorded verbatim
for the driving agent to interpret. Annotation itself stays in the workbench's existing annotation
tools — Commander does not duplicate it.
(2) **`mde workbench` command** (renamed from the `mde prompt` pilot): `command,event` are optional
positional args. The agent runs one backgrounded, unbuffered (`python -u`) call to
`workbench/notify-commander.py` that posts the question and **waits** for the user's response,
printing `workbench invoked, awaiting your response...` immediately and `response received: "..."`
when it arrives — a single call so the agent cannot drop the wait step. Bounded per call; re-run to
keep waiting past the window.
(3) **Reliability fixes surfaced by live testing:** the workbench now publishes its address to
`<install-root>/workbench/.runtime/workbench.json` (gitignored) so agents discover the real
host:port instead of guessing; `resolve_registered_project` normalizes POSIX/MSYS/Cygwin path forms
(`/c/...`, `/cygdrive/c/...`) so `$(pwd)`-style folders resolve; `/api/commander/ask` and `/respond`
accept GET as well as POST (a plain `curl` without `-X POST` no longer 404s); `_resolve_active_plan_id`
now parses a fenced `id:` field in `active-plan.md` (was misreading the ```text fence marker itself as
the plan id).
(4) **`task-sequence.md`** (`.mde/workbench/`): the ordered BA → Design → Build UI → Build backend →
Verify tests → App Review stages, each with its command(s), what it produces, and the recommended
next stage — the source Commander reads to recommend the next command after a stage completes.
**Affected:** `.mde/workbench/{commander.py,notify-commander.py,task-sequence.md,src/**}`;
`.mde/method/commands/{plan.status.md,workbench.md}`; `.mde/cli/mde-cli.mjs` (`update-app --force`).
Commander/workbench.md remain a POC (works 017–019); the every-command shared rule and further
scenario templates are deferred.

2026-07-13 — business-requirements: strengthen the analysis feature set (commit cd86d4d):
Deeper business-analysis rules and one new feature, sourced from the `business-requirements-revised`
package (retroactive changelog entry — no version bump was recorded at the time).
- **Added `business-transaction-analysis`** — cross-artifact semantic analysis of a use case:
  verifies the business need, the driving object, the actor's action, the resulting state change,
  discovers missing objects the flow implies, and reconciles the stated outcome against the model.
  Impacts business-requirements, ui-design, api-design.
- **Strengthened `use-case-catalogue`** — trigger-to-outcome causality, object roles, actor
  participation, alternate-flow discipline, state-change analysis, scenarios, and challenging a use
  case's open questions rather than accepting them at face value.
- **Strengthened `entity-model`** — relationship cardinality/participation and a missing-business
  -object review.
- **Strengthened `business-rule-catalogue`** — rules implied by flows (not just stated), quantified
  fulfilment, exceptions, and reversal semantics.
- **Strengthened `actor-and-role-model`** — explicit supporting-actor participation and
  authority/handoff checks.
- **Strengthened `open-questions-tracking`** — semantic challenge before accepting `None`.
- Unrelated feature files retained unchanged; `targets/requirements/business-requirements.md`
  recompiled to match.

2026-07-13 — 0.8.6 — Interaction-Model schema (A0) + prompt-ui pilot (work 019):
Two additive, backward-compatible method changes on the UI-improvements arc.
(1) **Page-spec Interaction Model schema (A0):** `page-spec.template.md` gains a **Goal-action
realization** table (per goal action: semantic add/create/edit/update/save/cancel · mode
create/edit/view · initial values · editable inputs · commit/cancel/success) and a **Data Covered →
Excluded (declared)** table (intentionally-omitted maintainable properties + reason, so a
partial-by-design form is conforming, not a coverage gap). The `page-spec` feature documents these
as **additive**: the completeness check still requires only the section headings, so page-specs
authored before this schema stay valid and upgrade opportunistically — no forced migration. Checks
key off editor **mode**, not button label. Prepares the ground for the (later) mode-aware
interaction-binding and transaction-data-coverage checks.
(2) **prompt-ui pilot (Commander):** `mde show` (`plan.status.md`) gains a completion tail —
`prompt-ui <command>,<event>` — that hands the command + terminal event to the workbench Commander
bar (human-in-the-loop review). The event selects the scenario and whether it blocks (`reported` →
FYI, non-blocking). Wired on the read-only `show` command only, to prove the mechanism; the
every-command shared rule is deferred to a later work. Workbench-side Commander (overlay bar, ask /
respond, background waiter) is POC under works/017–019, not method.
**Affected:** `page-spec.template`; `page-spec` feature; `plan.status` command; recompiled targets.

2026-07-12 — 0.8.5 — Page-spec consolidation (work 015): remove Intent / Page Kind / Page Analysis:
This session grew the page-spec template (Primary Capability, Interaction Model, Page Analysis)
without removing the sections they made redundant. This consolidates.
(1) **Deleted three sections** from `page-spec.template.md`: `## Intent` (near-dup of Purpose),
`## Page Kind` (Maintenance-vs-Workflow is now DERIVED from Subject + Composition, not authored),
`## Page Analysis` (its content relocated).
(2) **Content relocated, nothing lost:** primary transaction + success outcome → `## Interaction
Model`; expected usage → `## Purpose`; entry contexts already in `## Page Context`; business
objects already in `## Composition` panel sources.
(3) **`## Subject` retained** as the page's explicit semantic anchor (not derived) — so the
committed work-009 subject checks need no rewire. **New Subject↔Composition consistency check:** the
declared Subject must match the entity of the `purpose: Maintenance` panel in Composition; a
mismatch is a defect (drift between stated purpose and structure), reconciled toward neither.
(4) **Checks/prose re-anchored** for the three deleted sections: the deterministic completeness
check now requires Primary Capability + Subject + Interaction Model + Data Covered + Actions;
page-defaulting's "analyze-before-shape" points at Purpose/Subject/Interaction Model/Page Context.
**Affected:** `page-spec.template`; `page-spec`, `page-defaulting` features; recompiled targets.

2026-07-12 — 0.8.4 — Workbench Tests tab, business-rule test coverage, deferral discipline:
Follow-on (same session) after 0.8.3 — surfacing test reality in the workbench and closing gaps the
Tests view exposed (business rules untested; deferrals that never close).
(1) **Workbench Tests dashboard tab** — a new `Tests` tab renders the app's test reality from real
artifacts: per-suite coverage gauges (unit/api/ui/merged, with synthetic-cosplay flagged), Gherkin
scenarios per feature (expandable, each tagged `data`/`vague`), a **business-rule coverage** table
(each rule tested/untested), and the UI screenshots. `dashboard.py` gains `_dashboard_tests()`
(reads reports/coverage/*, tests/*.feature, business-rule specs, reports/screenshots — manifest/
spec-driven, no invention); frontend `renderTestsDashboardTab` + registry + panel + styles.
(2) **Business-rule test coverage** — the Tests tab shows which business rules have a test and which
do not (mde.demo surfaced 0/6 tested). `gherkin-traceability` hardened: every business rule must have
a scenario that **exercises the rule's violation** (the negative/reject path with the violating data
and the rejection), not merely a happy path and not left untested — naming the rule is not testing it.
(3) **Readable-Gherkin, two-tier** — the vague-Gherkin check is broadened (more presence phrasings:
"saves the selected", "is reference only", …) and paired with a semantic ASK — a regex cannot decide
"returns conflict" (concrete) vs "saves the selected client" (vague); the AI judges whether each Then
asserts a verifiable outcome.
(4) **Deferral discipline** — a deferral must state a concrete cause and a concrete follow-up;
"hygiene item"/"good enough"/"follow-up recorded in evidence.md" (a reason pointing at another file)
are invalid — that is skipped work dressed up as deferred. And deferrals are now **closeable and
reconciled**: `pending-actions` excludes a resolved deferral, and each `mde evaluate` re-examines
prior plans' open deferrals and closes the ones now satisfied — the parked backlog reflects real
outstanding work, not stale items already delivered. (`impact.template`, `status.template`,
`plan.evaluate` 4c.)
**Affected:** `gherkin-traceability` feature; `impact.template`, `status.template` templates;
`plan.evaluate` command; workbench `dashboard.py`, `dashboard-cards.js`, `app.js`, `style.css`;
recompiled targets. **Also (not in this repo):** rendered the missing `erd.svg` for hrdemo (a missing
generated output — the ERD render is skippable today; worth enforcing that a missing erd.svg is a defect).

2026-07-11 — 0.8.3 — DB report script + endpoint, migration tracking (schema_migrations):
Follow-on (same session) after 0.8.2 — giving the generated app a way to expose its live database.
(1) **`mde:db-report` script + `GET /api/db-report` endpoint** (`app-runtime-scripts`) — a seventh
`mde:` script (for apps with a DB) that reports the live database in three parts: **health**
(connect check), **summary** (tables with row counts, views, sequences, indexes, enums — plus the
migration state), and **full JSON detail** (per-table columns/PK/FKs/unique/indexes). Read-only; to
stdout and `reports/db-report.json`. The same report is served live at `GET /api/db-report`, sharing
one `db-report` module with the CLI so they cannot drift.
(2) **Migration tracking — `schema_migrations`** (`versioned-migrations`) — the migration runner now
maintains a `schema_migrations` table (version PK, name, checksum, applied_at), applies only
**pending** migrations in order, records each, and skips already-applied ones (checksum detects an
edited already-applied migration). Blindly re-applying every `.up.sql` on each run is a defect. The
db-report summary reports the migration state (current version, applied count, pending / checksum-
mismatched) so the report shows whether the live schema is up to date with `db/migrations/`.
(3) **Workbench** (already committed in `e03bd5a` this session) — dashboard capability attribution
by `sourceRef` (not path-guessing); the tree no longer globally ignores `coverage`/`test-results`/
`playwright-report`/`htmlcov` so declared `reports/` outputs are browsable.
**Affected:** `app-runtime-scripts`, `versioned-migrations` features; recompiled targets. **Still
open (workbench):** HTML-report `/raw/` links drop the project folder token (404 on click); `reports/`
is watch-ignored (no live refresh on new results).

2026-07-11 — 0.8.2 — Serious-work posture, self-audit gate, anti-cosplay testing, readable Gherkin, WB fixes:
Follow-on (same session) after 0.8.1, hardening the AI's *posture* and the *substance* of testing —
prompted by an agent that kept deferring/shrinking test work with excuses.
(1) **Posture preamble (RULE-CORE-001)** — a "this work is serious" stance read first by every
command: do the whole scope; **"this is too much work" is not an argument**; quality over speed;
run the work (don't defer it away); no cosplay (a file that merely exists ≠ done); honest status.
(2) **Final scope self-audit + deferral re-examination (`mde evaluate` 4c)** — before stamping
`evaluated`, the AI must re-read the plan's scope/acceptance/manifest and confirm the ENTIRE scope
is really done (not narrowed/stubbed/faked), and **re-challenge every deferral**: the environment is
treated as ready for live tests, and if the agent ran any executable step it is proven capable — so
deferring other executable checks is a defect; convert unjustified deferrals into actual runs. Step 8
must state the audit result explicitly.
(3) **Readable Gherkin (`gherkin-traceability`)** — scenario **data must be visible in the Gherkin**:
input records as data tables / quoted values, output asserted with the actual values, plain English
(no `entity.op` ids, no "backed by the API"/"is visible"-only assertions). Deterministic vague-Gherkin
check added.
(4) **Anti-cosplay coverage (`coverage-threshold`)** — coverage must measure **real source files**;
a per-suite report whose only entry is a synthetic placeholder (`api:cucumber-scenarios` 100% of
itself) is coverage cosplay, not coverage. (Found in mde.demo: the agent fabricated 100% api/ui
coverage files.)
(5) **Workbench fixes** — the tree no longer globally ignores `coverage` / `test-results` /
`playwright-report` / `htmlcov` (they are declared, navigable `reports/` outputs — the 0.8.1 coverage
locations were being hidden by the tree walker). Dashboard capability attribution reads `sourceRef`
(the governed trace) instead of guessing from file paths; a page's declared `## Primary Capability`
is the resolvable source. (Still open: HTML-report `/raw/` links drop the project folder token → a
"Not Found" on click; and `reports/` is watch-ignored so new results don't auto-refresh.)
**Affected:** `RULE-CORE-001`; `plan.evaluate` command; `gherkin-traceability`, `coverage-threshold`
features; workbench `config.py` (IGNORED_PARTS), `dashboard.py` (sourceRef attribution); recompiled
targets.

2026-07-11 — 0.8.1 — Coverage locations, all-suite coverage, page Primary Capability, LOG_PATH:
Follow-on method work after 0.8.0 (same session), sharpening testing/traceability so coverage and
capability attribution are honest and examined.
(1) **Coverage locations declared + all suites produce coverage** — `coverage-threshold` now
spells out per-suite coverage paths (`reports/coverage/{unit,api,ui}/` + merged
`reports/coverage/coverage-summary.json`) and requires **both** the unit suite AND the Cucumber
API/UI suites to run instrumented; the floor is measured against the **merged** report so a healthy
unit number cannot mask an unmeasured/hollow UI. (Found via mde.demo: only Vitest produced
coverage; Cucumber ran uninstrumented.)
(2) **Test-run log location via `LOG_PATH`** — `required-operation-ui-coverage` (log-as-test-
evidence) declares the captured app log is env-driven: the suite sets `LOG_PATH` so the run's log
lands at a known file the validator examines.
(3) **`LOG_PATH` / `LOG_LEVEL` in the env contract** — `env-contract` now enumerates the logging
env vars; `LOG_PATH` **defaults to `logs/app.log`** (root `logs/`, gitignored) and mirrors to
stdout. `logging` establishes the same. (Closed a dangling reference — logging/testing pointed at
env-contract for `LOG_PATH` which had not declared it.)
(4) **Page `## Primary Capability`** — a page spec now declares its **primary capability** as a
resolvable `{{business-capability:<slug>}}` (the same way an entity declares its capability),
required + verified (prose check + deterministic completeness check). This is the machine-readable
trace that attributes a page — and its tests — to a capability without guessing from the file name.
(Found via the workbench App-matrix work: path-based capability attribution false-gapped 82% of
mde.demo artifacts; `sourceRef` + a declared page capability is the correct source. The workbench
dashboard was also fixed to attribute by `sourceRef`, reading the declared capability rather than
guessing — a workbench change, not method.)
**Affected:** `coverage-threshold`, `required-operation-ui-coverage`, `logging`, `env-contract`,
`page-spec` features; `page-spec` template; recompiled targets. **Open:** whether a test needs its
own capability trace on top of inheriting the page's.

2026-07-11 — 0.8.0 — Governed UI, interaction binding, logging/test evidence, impact analysis, `mde update-app`:
A batch of method work (works 009–013) under one strategy — **the AI drives design; the method fences it** toward a functional, usable, consistent UI (new MDE strategy belief 2.11).
**Intent:** close the gaps a real generation bug exposed (a List panel doing Maintenance wired Save to `collection[0]`, unbound to any visible record) and the surrounding class of "the check examined nothing" failures — an unexamined requirement is a suggestion; make the proof unfakeable and the AI knows it is watched.
(1) **business-key → display-label** (work 009) — the business entity layer models no "key"; `display-label` is the single identity role. Uniqueness is a persistence-design constraint (a Storage View UNIQUE), added only when the business enforces it. Removes the fabricated-code-column trigger (`EmployeeNumber`, `ClientCode`).
(2) **UI fences** (works 009–011) — new `interaction-binding` feature (a page's interaction is steps toward a goal action; each goal action names its target record; deterministic `collection[0]` smell check); List-panel behavior (navigating vs in-place edit; an editing List that is neither is incomplete); maintenance-stays-on-subject (Page Kind + Subject); lifecycle transitions as a governed field committed by Save, not scattered buttons; object identity (`data-object-id`) + a mandatory `info-button` affordance; page-defaulting trimmed to the guidance/guardrail voice.
(3) **Strategy belief 2.11** — recorded in `mde.specs/requirements/strategy.md`; driver-seat preambles authored into the ui-design and web-ui target skeletons.
(4) **Logging split + test evidence** (work 012 / S1) — new `context-propagation` feature (request context threaded boundary→service→repository; owns the propagation invariant); `logging` scoped to hard-core log points (request boundary + caught errors) + guidance; `required-operation-ui-coverage` now demands behavioural assertions (not presence) with the captured log as examined proof — a silent log for a claimed operation is a defect.
(5) **Impact analysis** (work 012 / S2) — `impact.template.md` gains `## Impact Analysis` (identify full impact via reverse-traversing the manifest for modify/delete + judgment for add → disposition each item this-plan/deferred); `plan.evaluate` step 3 drives it.
(6) **Workbench plan summary** (work 012 / S3) — polished plan-summary CSS + a four-stage (requirements/design/app) breakdown derived from the plan's manifest artifacts.
(7) **`mde update-app`** (work 013) — new CLI command: detects the app's installed method version vs the current one, refreshes `.mde`, **stamps `.mde/VERSION`** (now also copied by `init-app`), displays `old → new`, and prints a fixed prompt for the USER to ask their AI to analyze the impact. Does not invoke the AI.
**Affected:** new features `context-propagation`, `interaction-binding`, `lifecycle-transition-control`, `row-selection-affordance`; edited `entity-model`, `storage-view-model`, `reference-display`, `object-info-metadata`, `actionable-controls`, `required-operation-ui-coverage`, `logging`, `page-composition`, `page-spec`, `page-defaulting`; rule `02-artifact-model`; templates `entity`, `page-spec`, `impact`; command `plan.evaluate`; `mde-cli.mjs` (+ VERSION in mirrorFramework); `mde.specs/requirements/strategy.md`; workbench `plans.py`, `style.css`, `plan-summary.template.md`; recompiled targets. Verification model gains `hasAuditOrSurrogateAspect`.
**Note:** works 009–011 were committed during the session; 012 (S1/S2/S3) and 013 land with this version bump.

2026-07-09 — 0.7.0 — Semantic references, glossary, authN, arch design/source split:
A batch of method work (works 006–008 + the authN thread), version bumped to 0.7.0.
(1) **Semantic references** — generated specs/design/docs tag references to known MDE objects
as `{{kind:slug}}`; delivered via the `semantic-references` feature (impacts the 7 text-producing
targets) + tag hooks in all business-spec and reference-heavy design/prototype templates. Kinds
are the trace schema's `sourceRef.kind` set (single source of truth).
(2) **Glossary** — new BA feature + template; added to the business-requirements `## Outputs` so it
is actually produced.
(3) **Architecture design/source split** — new `target=<id>` on check blocks in `compile-targets.mjs`
routes a check into only its target; the source-architecture checks moved to api/source-generation,
so a **design-only plan no longer fails on source checks** (the old per-plan exclusion workaround is
retired).
(4) **method review** — new delivery-triangle audit (feature ⇄ `## Outputs` ⇄ template) catches the
"stated but not delivered" defect class.
(5) **Stack templates** — broke node into a lean selection `.template.md` + a `.scaffold.md` bootstrap
recipe; added an **auth axis** to all four stacks; removed dead `extraRules`.
(6) **Authentication** — one code path (real auth) + a fail-closed, prod-guarded `.env` dev bypass;
mechanism is a tech-stack auth-axis choice. Wired into architecture/api/source-generation/persistence,
with an `auth-in-scope` produce-mandate so authN can't be silently skipped when on. **Default is
`none` (auth OFF / opt-in)** — a plain app build generates no auth until a project records
`mechanism: local-db`.
(7) **mde-requirements.md** restructured to a 7-section model.
This bumps the method marker — previously built plans read as method-stale on any future re-go
(harmless unless rebuilt).

2026-06-14 — Mock-up governed-value consistency:
Closed a drift gap where a page's mock-up could invent categorical values (roles,
statuses, enums) that disagree with business memory and with the implemented page — the
mock-up looked realistic but described a different world. The mock-up template already
advised "values from business memory," but nothing enforced it, so the directory mock-up
(plan 002) seeded "Consultant/Senior Consultant" while the employee model defines
"Engineer/Senior Engineer/…". Made the rule normative and checkable, not just advisory:
(1) Web-UI target — new expectation "Governed values trace to business memory" (categorical
values must use business-memory vocabularies; free-text like names may be fabricated), and
the ≥30-record seed clause now requires governed seed values to come from the model;
(2) Web-UI Review checks — added an assertion that a mock-up's governed values resolve
against business-memory enums/roles; (3) mde review app — added a cross-artifact value-
consistency check (page spec ↔ mock-up ↔ implemented page describe one model) that surfaces
existing drift on demand; (4) mockup template — tightened the seed-data and column comments
to name the source (entity Storage View enums, memory/business/roles/) and reference the new
checks. Page-spec and ui-catalog templates unchanged (they reference entities/use-cases by id
and carry no sample data). Note: this bumps the method marker — built UI plans (002) read as
method-stale on any future re-go (harmless unless rebuilt).

Revised-rules:

What changed
Reduced active rule files from 87 .rules.md files to 34 .rules.md files
Reduced rules content from roughly 47k words to about 5.7k words
Flattened target rules from many subfolders into one file per target:
.mde/method/rules/targets/server.rules.md
.mde/method/rules/targets/web-ui.rules.md
.mde/method/rules/targets/persistence.rules.md
.mde/method/rules/targets/documentation.rules.md
.mde/method/rules/targets/documentation-site.rules.md
.mde/method/rules/targets/api-testing.rules.md
.mde/method/rules/targets/ui-testing.rules.md
Important additions

Added explicit prototype rule support for:

ui
workflow
business-rule
integration
data

And added the rule principle we just discovered:

Complex business rules should be prototyped separately from UI pages, then referenced by the UI prototype.

Updated
.mde/method/rules/
.mde/method/rules/catalog.md
.mde/method/rules-consolidation-report.md
command/template references that pointed to old rule paths
Validation done
Confirmed all active rule files have required front matter
Confirmed no duplicate rule IDs
Confirmed no broken markdown links to missing .rules.md files inside .mde/method



--------------------------

Brief, append-only history of MDE method changes — rules, commands, templates, and method tools. Maintained by `mde rules approve` (for rule and command changes) and by direct edit for other method-level changes.

**Entries MUST be brief.** Target shape per entry:

- One-line summary in the heading.
- One short paragraph naming what changed and why.
- A compact bullet list of affected IDs / files when more than one.
- No verbose tables, no full diffs (use git for those), no inlined design rationale (link to the online docs instead).

For full content history, use `git log`. For the human-readable rationale behind a design decision, see the online MDE documentation.

---

## 2026-05-31 — Diagrams are rendered outputs, not memory (move to docs/)

**Affected:** `RULE-WF-APPLICATION-DESIGN` (`WF-AD-110` paths repointed, new `WF-AD-115`), `RULE-GV-MANIFESTS-LOGS` (diagram source.refs note), `RULE-WF-BUSINESS-ANALYSIS` (schema-diagram location). App migration: 12 files moved, 8 source headers + 3 plan manifests re-pointed.

**Intent:** ERD / architecture / state / workflow diagrams are *renderings* of model truth that already lives in memory (entities, capability workflows, `architecture.md`). Storing them under `memory/` made them permanent orphans (nothing implements a diagram) and let source/manifests cite a *picture* as their `source`. Memory holds the model; diagrams are derived outputs.

**Changes (method):**

- `WF-AD-110` — diagram outputs now target `docs/design/diagrams/`, not `memory/application/design/diagrams/`.
- `WF-AD-115` (new) — diagrams are rendered outputs, never memory; source files and manifest `source.refs` MUST NOT cite a diagram — they cite the underlying model memory (entity / capability workflow / `architecture.md`). A diagram has no implementors by design and must not be flagged as an orphan.
- `GV-LOG` + `WF-BA` — diagram outputs are `docs/design/diagrams/` artifacts; a diagram is never a `source.refs` value.

**Migration (this app):** moved 12 files (`{erd,architecture,state,workflow}.{md,mmd,svg}`) `memory/application/design/diagrams/` → `docs/design/diagrams/`; dropped the diagram ref from 8 state-machine source headers (entity ref remains); re-pointed plan 003/004/005 manifest `source.refs` from `diagrams/state.md` to the underlying entity; repointed plan 002's diagram artifact paths. Rebuilt manifest: orphans 15 → 12 (the 3 diagram orphans cleared); diagrams no longer appear under `memory/`.

**Note:** `app-mockup.html` is the same class (a rendering) and remains under `memory/` — a candidate for the same treatment, not done here.

---

## 2026-05-31 — Remove the backlog (project management is out of scope)

**Affected:** `plans/backlog.md` (deleted), `RULE-WF-IMPACT-ANALYSIS` (`WF-IA-060` backlog option already removed in the deferrals change), `RULE-WF-PLAN-INTAKE` (`WF-INTAKE-090` "Defer" option rewritten).

**Intent:** A stored backlog is a second source of truth about "what to build" that drifts from memory — the same stale-list anti-pattern `GV-REV-050` already rejects. The set of unbuilt work is *derivable* (memory ⊖ source) and surfaced by `mde app review`; scheduling/prioritizing it is project management, which is out of MDE scope. So there's nothing for a backlog file to hold that isn't either derivable or PM.

**Changes:**

- `plans/backlog.md` deleted; the proposed `RULE-WF-BACKLOG` / `WF-INTAKE-095` (discussed, never written) are abandoned.
- `WF-INTAKE-090` — the off-scope-idea choices drop "Defer → append to backlog"; the third option is now "Leave it out of MDE" (PM/user's own tracker). Genuine model intent re-enters via `mde plan start` and, once in memory, is surfaced by app review if left unimplemented.
- `WF-IA-060` no longer offers "or a `plans/backlog.md` entry" as a deferral follow-up (deferrals track in the manifest).

Note: `mde app review`'s `backlog`-area finding is retained — it is the *derived* "defined-but-unimplemented (memory ⊖ source)" view, which is the replacement for the stored backlog, not a reference to the deleted file.

---

## 2026-05-31 — Deferrals tracked in the manifest, not memory (deferrals.json fix)

**Affected:** `COMMAND-PLAN-APPROVE` (step 8 emits `skipped-deferred` entries; new `deferrals_in_manifest` self-verification row), `RULE-WF-IMPACT-ANALYSIS` (`WF-IA-060` rewritten, `WF-IA-070` extended).

**Intent:** `manifest/deferrals.json` was always empty because deferrals lived only in impact.md's prose Deferrals table — they were never written as manifest entries, so the consolidator had nothing to aggregate. Decision (user): deferral *tracking* belongs in the manifest, not memory — memory is what the system should be; implementation status (built / deferred / where) is the manifest's job. Putting `implementation_status` on memory elements would leak impl-tracking into the model.

**Changes:**

- `plan.approve` step 8 — every impact.md Deferrals row now also gets a manifest entry (`action: skip`, `status: skipped-deferred`, `reason`, `follow_up` = successor plan id or `none`). This is how deferrals reach `deferrals.json`.
- `deferrals_in_manifest` (WF-IA-070) self-verification row added — Deferrals table ↔ `skipped-deferred` manifest entries must be equal; a deferral only in prose is invalid.
- `WF-IA-060` rewritten: deferral tracking lives in the manifest (`skipped-deferred`), never memory; the old "or a `plans/backlog.md` entry" follow-up option is removed (backlog is being retired).
- `WF-IA-070` extended to a three-way equality: deferred-anywhere ↔ Deferrals table ↔ manifest `skipped-deferred` entries.

---

## 2026-05-31 — Consolidator is a required execute completion gate (stale-manifest fix)

**Affected:** `COMMAND-PLAN-EXECUTE` (steps 13–15 restructured; new `manifest_consolidated` self-verification row), `RULE-GV-MANIFESTS-LOGS` (`GV-LOG-035` hardened).

**Intent:** Plans 004/005 were marked `executed` but `manifest/index.json` reflected only 001–003 — 81 source files untracked, 27 memory files reported as false orphans by app review. Root cause: running `build-app-manifest.mjs` was the *last* execute step (14), placed **after** the plan was already marked executed (13), with nothing gating it — so it was silently skipped. The fix belongs in execute (keep it fresh), not in the auditor (the rejected alternative was making app review rebuild it, which would breach its read-only scope and mask the real defect).

**Changes:**

- `plan.execute` steps reordered: 13 finalizes statuses but no longer marks executed; 14 runs the consolidator as a **required completion gate** (clean exit, 0 framework-defects, this plan's artifacts visible in `index.json`); 15 marks executed only when 11 + 12 + 14 pass.
- `manifest_consolidated` (GV-LOG-035) added to the step-11 self-verification checklist — a stale consolidated manifest is now a FAIL that blocks `executed`.
- `GV-LOG-035` — added "required completion gate, not a trailing convenience": a plan.execute that didn't run the consolidator to a clean exit has not validly completed; app review *reports* staleness as a process defect rather than rebuilding around it.

**Remediation:** rebuilt the live manifest (`visible=242, defects=0, deferrals=0`); 81 untracked → 0, 27 orphans → 15 (the remainder are diagrams/mockup noise + under-referenced `source.refs`, addressed separately).

---

## 2026-05-31 — App review must smoke the real entrypoint, not just run tests

**Affected:** `RULE-GV-APP-REVIEW` (new `GV-REV-060`; `GV-REV-020` tier list amended).

**Intent:** Observed in plan 003 — the API/UI test suites passed (31 unit, 29 API, 9 UI) and the plan reported "all verified," yet `npm run dev` could not serve a single login: the UI script used a removed `vite --root` flag, and the server never loaded `.env` (`DATABASE_URL` undefined → pg SASL crash on the first query, with no handler so the process died). The tests missed all of it because they run the app in-process via Supertest (`createTestApp` / mounted app factory) — bypassing the entrypoint scripts, env loading, the Vite proxy, and CSRF. App review's tiers had no "does it actually boot" gate, so it inherited the same blind spot: compiles + tests green was treated as "runs."

**Changes:**

- `GV-REV-060` — review MUST start the real run scripts (`dev`/`start`, plus `migrate`/`seed` when a DB is needed), wait for the server to listen, and assert a live response through the actual port/proxy (e.g. authenticated login returns a session cookie; an error case returns a structured error, not a crash). Separate gate from the test suite; a green suite with a non-booting entrypoint is blocking. Rationale: in-process harnesses cannot detect a broken `dev`/`start` script, an unloaded `.env`, or an unhandled async error that kills the live server.
- `GV-REV-020` — tier list now includes "operational boot (GV-REV-060)".

---

## 2026-05-31 — Docs default-on; close the deferral escape valve

**Affected:** `RULE-TARGET-DOCUMENTATION` (new `TARGET-DOC-005`), `RULE-WF-IMPACT-ANALYSIS` (new `WF-IA-050`, `WF-IA-060`, `WF-IA-070`); strengthens the `impact_covers_spec` approve gate.

**Intent:** Observed in plan 003 — `docs/users` and `docs/api` were `deferred` with soft reasons ("stabilize first") even though the UI specs and API routes they trace to already existed in Plan 002 design memory; `docs/operate` was deferred in the Perspectives table but missing from the Deferrals table (drift). Root cause: docs were opt-in (never activated since the request didn't name them), and `deferred` accepted free-text reasons with no validity test, no follow-up requirement, and no completeness check.

**Changes:**

- `TARGET-DOC-005` — documentation target auto-activates for any plan producing server/web source against a capability with design memory; `docs/api` and `docs/users` become committed artifacts generated at execute unless disabled in `mde-policy.md`. "Not requested" no longer omits docs.
- `WF-IA-050` — `deferred` is valid only when a required input artifact does not yet exist; soft reasons are rejected. (Dashboard stays deferrable; docs do not.)
- `WF-IA-060` — every deferral must name a follow-up (successor plan id or `plans/backlog.md` entry); orphan deferrals are invalid.
- `WF-IA-070` — the Deferrals table must equal the set of deferred items across impact.md; any unmirrored `deferred` status is drift and fails `impact_covers_spec`.

---

## 2026-05-31 — Tiered memory loading for plan intake

**Affected:** `RULE-WF-PLAN-INTAKE` (new `WF-INTAKE-100`), `COMMAND-PLAN-START` (new `loads_memory` frontmatter + "Memory Loading" section).

**Intent:** Observed in plan 003 — `mde plan start` loaded ~10.6k tokens including three full entity schemas, state/workflow diagrams, and `tech-stack.md` that intake never consumes (intake only writes `spec.md` + `questions.md`, selects no stack). Roughly two-thirds of the load was execution-time detail. Establish a load tier: summary at intake, full at approve/execute.

**Changes:**

- `WF-INTAKE-100` — added; defines summary tier (`plan start`/`plan change`: overview + memory index + policy + templates) vs full tier (`plan approve`/`plan execute`: full entity/diagram/stack/rule bodies). Commands declare their tier in `loads_memory`; load exactly that set. When the debug rule is active, the trace's token table is the compliance check.
- `COMMAND-PLAN-START` — `loads_memory` frontmatter added (`tier: summary`, `include`, `defer_to_execute`); "Memory Loading (Summary Tier)" section added.

---

## 2026-05-18 — Add `mde app status`; reset semantics in `mde plan change`; tighten `mde rules modify`

**Affected:** new `COMMAND-APP-STATUS`; `COMMAND-PLAN-CHANGE` rewritten; `COMMAND-RULES-MODIFY` cross-references added.

**Intent:** Three roadmap items from notes.txt. (1) A fast read-only snapshot is missing — `mde app review` is the deep audit, but there's no quick "where are we?" command. (2) `mde plan change` previously preserved all execution state on a scope change, which left stale tasks/evidence/manifest entries describing prior work. Reset is now the default. (3) `mde rules modify` already followed the right flow but lacked explicit references to the placeholder and self-contained-rules rules added recently.

**Changes:**

- `mde app status` — new read-only command. Reads `active-plan.md`, `log.md`, `generation.manifest.log`, `reports/app-review.md`, `reports/rules-validation.md`, `rules-audit.md`, `tech-stack.md`, and `CHANGELOG.md` to produce a one-screen snapshot. Runs no subprocesses; sits between `mde plan show` (one plan) and `mde app review` (full audit).
- `mde plan change` — rewritten with three stages: apply change → reset execution state (tasks rewritten to `pending`, prior tasks archived as `tasks.<previous>.md`; `evidence.md` archived and re-created from template; `generation.manifest.log` gets an append-only `scope-reset` record naming superseded outputs) → record + recommend. History-preserving via versioned archives, not destructive. `mde plan rerun` is now explicitly NOT a substitute (rerun is same scope; change is different scope).
- `mde rules modify` — `loads_rules` now includes `RULE-GOVERNANCE-RUNTIME-SOURCE`. Apply-stage rules updated to require `<MDE_ROOT>/`/`<METHOD_SOURCE>/` placeholders (per GV-SRC-040) and self-contained rule bodies (per GV-SRC-050). Boundaries section adds the self-contained constraint explicitly.

---

## 2026-05-17 — `.mde/` minimal layout; scripts back inside `method/`; `<MDE_ROOT>` placeholder

**Affected:** `.mde/docs/` (deleted), `.mde/README.md` (new), `.mde/scripts/` (moved back into `<METHOD_SOURCE>/scripts/`), runtime-source rules, mde.md, several rules that hard-coded `.mde/`, and rules that linked to internal docs.

**Intent:** Clean cut — `<METHOD_SOURCE>/` is what is available to the AI, period. Scripts live under `<METHOD_SOURCE>/scripts/` because the AI invokes them. Long-form docs are online; `.mde/` itself carries only `README.md`, `CHANGELOG.md`, and `method/`.

**Changes (brief):**

- `.mde/docs/` removed (canonical docs are online).
- `.mde/README.md` added — short orientation, points at online docs.
- `.mde/scripts/` reverted to `.mde/method/scripts/`. Script `repoRoot` raised back to three levels up. `package.json` and the manifest spec test updated.
- `GV-SRC-040` added — defines `<MDE_ROOT>` and pins the minimal layout.
- `GV-SRC-050` added — rules MUST be self-contained; no links from rule bodies to docs (online or local).
- Hard-coded `.mde/CHANGELOG.md` and `.mde/scripts/` in rules replaced with `<MDE_ROOT>/CHANGELOG.md` and `<METHOD_SOURCE>/scripts/`.
- `mde.md` rewritten to list both placeholders and the minimal MDE root.
- Removed `relatedDesignNote` frontmatter and `.mde/internals/...` body links from `design-memory-artifacts.rules.md` and `application-design.rules.md`.
- CHANGELOG header tightened: entries MUST be brief (this entry is the new template).

**Verification:** `npm run smoke` — 8/8 passed.

---

## 2026-05-17 — Method scripts and docs promoted to `.mde/` root

**Affected:** `package.json`, `tests/manifest/build-app-manifest.spec.ts`, three method tools (relocated), `RULE-GOVERNANCE-METHOD-TOOLS` (GV-MT-010 location wording), `RULE-GOVERNANCE-RULES-VALIDATION` (GV-VAL-120 generator path, GV-VAL-105 example).

**Intent:** The prior entry moved method tools from app `scripts/` to `.mde/method/scripts/`. Reflection: `.mde/method/` is for the three method asset kinds (commands, rules, templates). Tooling and method docs are not in that family — they support the method overall. Promote them to `.mde/scripts/` and `.mde/docs/` so `.mde/method/` stays clean as the trio commands/rules/templates.

**Layout change:**

```text
before                            after
.mde/method/scripts/        →     .mde/scripts/
.mde/method/docs/           →     .mde/docs/
.mde/method/{commands,rules,templates}/    unchanged
```

**Changes:**

- Three method tools moved from `.mde/method/scripts/` to `.mde/scripts/`. `repoRoot` resolution inside each script reduced from `'..', '..', '..'` to `'..', '..'` to reflect the shallower nesting.
- `package.json` npm-script wrappers updated: `manifest:build` and `rules:audit` now invoke `node .mde/scripts/<tool>.mjs`.
- `tests/manifest/build-app-manifest.spec.ts` updated path in `path.join(...)` and `describe()` label.
- `GV-MT-010` — location wording changed from `.mde/method/scripts/` to `.mde/scripts/`. Migration queue references updated.
- `GV-VAL-120` — generator path changed from `.mde/method/scripts/generate-method-docs.mjs` to `.mde/scripts/generate-method-docs.mjs`. Canonical invocation updated.
- `GV-VAL-105` — example invocation updated to `node .mde/scripts/list-rule-outputs.mjs`.

**Verification:** `npm run smoke` — 8/8 passed (typecheck, build:web, test:manifest, test:api, manifest:build, rules:audit, docs:build, server /healthz).

**Historical entries** below (referencing `.mde/method/scripts/`) are preserved as factual records of the path at that point in time. They are not corrected.

---

## 2026-05-17 — Method tools migrated to `.mde/method/scripts/`; changelog renamed

**Affected:** `package.json` (npm-script wrappers), `tests/manifest/build-app-manifest.spec.ts`, three method tools (moved + converted), the changelog file itself (renamed), and references across rules, commands, and docs.

**Intent:** Per `GV-MT-010` / `GV-MT-020` (added in the prior entry), method tools belong under `.mde/method/scripts/` in plain Node ESM, not under the app's `scripts/` folder in TypeScript+tsx. Execute that migration so MDE projects bootstrap cleanly without `npm install` having run first. Rename `rules-changelog.md` to `CHANGELOG.md` because the file already tracks command, tool, and template changes alongside rules.

**Migration completed:**

| Before | After | Conversion |
|---|---|---|
| `scripts/build-app-manifest.ts` (TS + tsx) | `.mde/method/scripts/build-app-manifest.mjs` | TS → plain Node ESM; type annotations dropped; logic unchanged. Now also emits the `contributors`, `firstContributor`, `lastContributor`, and `ownership` fields per AF-MAN-045. |
| `scripts/list-rule-outputs.ts` (TS + tsx) | `.mde/method/scripts/list-rule-outputs.mjs` | TS → plain Node ESM; type annotations dropped; logic unchanged. Updated generated-by attribution. |
| `scripts/update-manifest-statuses.mjs` | `.mde/method/scripts/update-manifest-statuses.mjs` | Move only (already `.mjs`). Updated usage message. |

**Verification:**

```text
npm run manifest:build      visible=63 defects=0 deferrals=0 (unchanged)
npm run test:manifest       3/3 passing, deterministic byte-identical output
npm run rules:audit         produces rows; previous output paths still detected
```

**Other changes:**

- `package.json` — `manifest:build` and `rules:audit` scripts now invoke `node .mde/method/scripts/<tool>.mjs` directly (no `tsx`).
- `tests/manifest/build-app-manifest.spec.ts` — `describe()` label and `spawnSync` invocation now point at `.mde/method/scripts/build-app-manifest.mjs`.
- `scripts/` folder removed — empty after migration. sampleHR has no application-owned scripts in the current baseline.
- `.mde/rules-changelog.md` → `.mde/CHANGELOG.md`. References updated in: `plan-command-lifecycle.rules.md`, `rule-change-governance.rules.md`, `rules.approve.md`, `mde.docs/docs/reference/commands.md`, `mde.docs/docs/changing-rules.md`.
- `rules-validation.rules.md` GV-VAL-105 — example of project-local audit invocation updated from `scripts/list-rule-outputs.ts` to `node .mde/method/scripts/list-rule-outputs.mjs`.

**Now done; no longer deferred:** the migration items listed in the prior entry's "Migration deferred" section are complete.

---

## 2026-05-17 — Method tools location + language; method reference generator pinned

**Affected:** new `RULE-GOVERNANCE-METHOD-TOOLS`, `RULE-GOVERNANCE-RULES-VALIDATION` (GV-VAL-120 amended).

**Intent:** `mde rules validate` would have called a generator script that didn't exist yet on a fresh project (chicken-and-egg: the script is generated by a plan but is needed before any plan has executed). And the existing `scripts/list-rule-outputs.ts` had the same loop. Resolve both by pinning a clear location and language for **method tools** — tools that operate on `.mde/method/` content. Method tools live under `.mde/method/scripts/`, ship with MDE itself, and are written in plain Node ESM (`.mjs`) so they run on day one with only `node` available, regardless of the application's tech stack.

**Decisions captured:**

- Method-tool location: `.mde/method/scripts/` — ships with `.mde/`, not produced by app plans.
- Method-tool language for now: plain Node ESM (`.mjs`). No TypeScript, no `tsx`, no transpiler. Runs on `node` directly.
- Method-tool language later (Option C): stack-agnostic alternatives (Python, PowerShell, Go binary) MAY be added as opt-in alternatives. Deferred. Until then, `.mjs` is canonical.

**Changes:**

- `RULE-GOVERNANCE-METHOD-TOOLS` — new rule file. Five statements: GV-MT-010 location (`.mde/method/scripts/`), GV-MT-020 language (`.mjs` + plain Node), GV-MT-030 deterministic and stateless, GV-MT-040 invocation (canonical `node .mde/method/scripts/<tool>.mjs`, optional npm wrappers), GV-MT-050 read-only with respect to method source.
- `GV-VAL-120` — amended to name the generator at `.mde/method/scripts/generate-method-docs.mjs` and link to GV-MT-010/020 for location and language constraints. Invocation is via `node` directly so it works before any `package.json` exists.

**Migration deferred (corrected):**

All four scripts in the current `scripts/` folder back `mde` commands, so all four are method tools. Migration queue:

- `scripts/build-app-manifest.ts` → `.mde/method/scripts/build-app-manifest.mjs` (implements `mde manifest build`).
- `scripts/list-rule-outputs.ts` → `.mde/method/scripts/list-rule-outputs.mjs` (implements `mde rules audit`, used inside `mde rules validate`).
- `scripts/update-manifest-statuses.mjs` → `.mde/method/scripts/update-manifest-statuses.mjs` (used inside `mde plan execute`; already `.mjs`, only the move is needed).
- (new) `.mde/method/scripts/generate-method-docs.mjs` (implements the docs generation step inside `mde rules validate` per GV-VAL-120).

After migration, the application's `scripts/` folder contains only scripts genuinely owned by the application — currently none in the sampleHR baseline. The classifying test in GV-MT-010 is "does this script implement an `mde` command?", not "what does it read or write?".

npm-script wrappers in `package.json` (`manifest:build`, `rules:audit`) become thin shims invoking `node .mde/method/scripts/<tool>.mjs`.

## 2026-05-17 — Method reference site generation (spec only; implementation deferred)

**Affected:** `RULE-GOVERNANCE-RULES-VALIDATION` (new `GV-VAL-120`), `COMMAND-RULES-VALIDATE` (Agent Behavior step 7 added).

**Intent:** Rules already exist in `.mde/method/rules/` and produce `reports/rules-summary.md` and `reports/rules-reference.md` (per GV-VAL-100/110), but those reports are transient validation outputs, not a browsable reference. Need a discoverable method reference inside the app's MkDocs site so users can navigate rules by category, by stack target, and per-rule from search results and links.

**Decisions captured:**

- Location: inside the existing `docs/` site under `docs/method/` (single docs-site; KISS).
- Regen trigger: every `mde rules validate` run overwrites the generated pages.
- Granularity: one page per rule file (matches `.mde/method/rules/.../*.rules.md`); individual statements are reachable via stable lowercase anchors (`#qr-rev-005`).

**Changes:**

- `GV-VAL-120` — added; specifies `docs/method/` directory layout (index, by-category, by-stack, rules, commands, templates), per-page shape (banner, applicability table, body with anchors, see-also), regen semantics (deterministic, overwrite, stale-page removal), and the mkdocs.yml nav constraint (indices visible, leaf pages reachable via search).
- `COMMAND-RULES-VALIDATE` — Agent Behavior gained step 7 "Regenerate Method Reference Site" pointing at GV-VAL-120.

**Deferred (implementation):**

- The actual generator (likely `scripts/generate-method-docs.ts`) is not implemented in this changelog entry. The spec is captured; the work is a follow-up plan. Until the generator exists, `mde rules validate` validation continues to function and the `docs/method/` pages will be missing — this is a `deferred` finding per QR-REV-170 scope-aware severity.

## 2026-05-17 — Multi-plan ownership in master manifest; rerun simplified

**Affected:** `RULE-GOVERNANCE-APP-MANIFEST-ARTIFACTS` (new `AF-MAN-045`), `COMMAND-PLAN-RERUN`, `RULE-WORKFLOW-PLAN-COMMAND-LIFECYCLE` (`WF-PLAN-RR-020` rewritten, new `WF-PLAN-RR-025`).

**Intent:** Generation is cumulative — multiple plans contribute to the same artifact (`mkdocs.yml`, `App.tsx`, `package.json`, `.env.example`, `docs/glossary.md`). The original `mde plan rerun` spec was destructive by default and wiped files blindly per the active plan's manifest. That would delete other plans' contributions to shared files. Two changes: (1) the master manifest must record contributor history per output, so any tool can tell exclusive from shared; (2) rerun stays simple — overwrite in place, report orphans, trust the generator to merge for shared outputs. Destructive cleanup moves behind `--clean` and even then never touches shared outputs.

**Changes:**

- `AF-MAN-045` — added; the consolidator must compute and emit `contributors`, `lastContributor`, `firstContributor`, and derived `ownership` (`exclusive` | `shared`) per folded manifest entry. The contributor list is the canonical record of cumulative authorship.
- `WF-PLAN-RR-020` — rewritten; default rerun is non-destructive overwrite-in-place. Wipe is opt-in via `--clean`. Shared outputs are NEVER deleted, even with `--clean`. Generator handles merge for shared artifacts; rerun does not.
- `WF-PLAN-RR-025` — added; orphan reporting after every rerun. Outputs in the prior manifest but not in the new manifest are reported in `log.md` and the run summary. Never silently deleted. User decides per orphan: keep, delete, or re-scope.
- `COMMAND-PLAN-RERUN` — Agent Behavior simplified from 12 steps that included a destructive wipe to 12 steps that regenerate in place, compute orphans, optionally clean exclusive orphans, append manifest run. Boundaries section adds explicit statements that rerun does not implement merge logic and never deletes shared outputs.

## 2026-05-17 — Add `mde plan rerun`

**Affected:** new `COMMAND-PLAN-RERUN`, `RULE-WORKFLOW-PLAN-COMMAND-LIFECYCLE` (added `WF-PLAN-095`, `WF-PLAN-RR-010`, `WF-PLAN-RR-020`, `WF-PLAN-RR-030`).

**Intent:** Once a plan reaches `executed` or `partially executed`, there is no clean way to force a fresh regeneration over the same scope. `mde plan execute` is for first-time/continued execution; `mde plan change` is for scope/spec edits. The missing verb is "re-execute the same thing." Add `mde plan rerun [reason]` so a user can regenerate the in-scope artifacts of the active plan from a clean slate — for example after a rule change, after manifest drift, or after a generation defect was identified.

**Changes:**

- `COMMAND-PLAN-RERUN` — new command file. Twelve-step Agent Behavior: resolve active plan, verify preconditions, record reason, derive in-scope set, wipe, reset lifecycle to `executing`, re-execute, append run entry to generation manifest, return lifecycle to prior or completed state, recommend `mde app review`.
- `WF-PLAN-095` — names the command in the plan-command lifecycle rule alongside the other plan verbs.
- `WF-PLAN-RR-010` — requires a freeform reason in `log.md`; no silent reruns.
- `WF-PLAN-RR-020` — wipe is bounded to files listed in the plan's `generation.manifest.log`; protects other-plan artifacts, memory, plan artifacts, and method.
- `WF-PLAN-RR-030` — rerun does not change spec/scope; only `log.md` and `generation.manifest.log` are appended.

## 2026-05-17 — App review: scope-aware severity

**Affected:** `RULE-GOVERNANCE-APP-REVIEW` (QR-REV-155, QR-REV-160, QR-REV-220), new `QR-REV-170`.

**Intent:** The first run of `mde app review` against sampleHR over-flagged missing capabilities as `blocking` even though plan 007 explicitly scoped only `employee-records` with the other capabilities deferred to follow-up plans. Incomplete scope is a legitimate mid-program state, not a defect. Severity must be derived from the active plan's declared scope, not from raw memory↔source comparison.

**Changes:**

- `QR-REV-170` — added; scope-aware severity. Missing implementation defaults to `deferred` (warning); escalates to `blocking` only when the active plan claims the item AND is `executing` or beyond. Items not yet claimed by any plan are normal mid-program state.
- `QR-REV-155` — severity grading reframed as scope-aware: blocking grades apply only to entities the active plan claims.
- `QR-REV-160` — severity grading reframed as scope-aware: `use-case-not-implemented` is blocking only when the plan claims the use case.
- `QR-REV-220` — escape clause inverted: missing forward links default to `deferred`, escalate to `blocking` only inside active plan scope.

## 2026-05-17 — App review: universal rules, manifest reliability, docs drift

**Affected:** `RULE-GOVERNANCE-APP-REVIEW`, `COMMAND-APP-REVIEW`.

**Intent:** Close three gaps in `mde app review`. (1) The review was checking the app against a hand-picked rule subset (6 of 80+), silently skipping behavioral verification, retention, architecture, persistence audit, server validation, and most others. (2) The master artifact list was treated as ground truth — a wrong manifest produced false-positive "missing artifact" reports and false-negative "unexpected artifact" reports. (3) Documentation was checked for presence and assets but not for content accuracy against memory; a doc page could exist with correct screenshots and still describe the wrong capability.

**Changes:**

- `QR-REV-008` — added; universal rule application. Review discovers the checked rule set at runtime by scanning front matter, not by enumeration in the command file. Lists rules-that-contributed in the report.
- `QR-REV-020` — strengthened; the review always derives the expected artifact set independently and cross-validates against the manifest. The manifest is one of two inputs, not the sole source of truth. Adds `manifest agrees`, `manifest drift`, `manifest missing` states and three drift sub-categories.
- `QR-REV-165` — added; docs ↔ memory drift (tier 5) compares doc content references against memory per capability and use case. Drift kinds: description, usecase, entity, operation, terminology, doc-missing, memory-missing.
- `COMMAND-APP-REVIEW` — `loads_rules` reduced to meta-rules only (`RULE-GOVERNANCE-APP-REVIEW`, `RULE-GOVERNANCE-RULE-AUTHORING`); Agent Behavior step 4 added (runtime rule discovery), step 8 added (independent derivation of expected artifact set), tier 3 step 18 added (manifest cross-validation), tier 5 step 28 added (docs drift), tier 6 step 31 added (list contributing rules); existing steps renumbered.

## 2026-05-17 — App review report location and archive

**Affected:** `RULE-GOVERNANCE-APP-REVIEW`, `COMMAND-APP-REVIEW`, docs reference.

**Intent:** A single overwritten `reports/app-review.md` loses history between runs. Establish a dual-write convention: a convenience pointer that's always current, plus a timestamped archive entry that's append-only. The archive is the source of truth and the git diff of arbitrary past runs is one `ls` away.

**Changes:**

- `QR-REV-009` — added; pins the dual-write convention (`reports/app-review.md` + `reports/app-review/<YYYY-MM-DD-HHMM>.md`), the timestamp format with collision counter, scope-name suffix pattern, and `--chat-only` exception.
- `COMMAND-APP-REVIEW` — Agent Behavior step 28 updated to reference QR-REV-009 dual-write; step renumbered (29, 30 for the existing constraints).
- `mde.docs/docs/reference/commands.md` — output section updated to show both file paths and the scoped variant.

## 2026-05-16 — App review tier structure

**Affected:** `RULE-GOVERNANCE-APP-REVIEW`, `COMMAND-APP-REVIEW`.

**Intent:** The existing app review had strong coverage of memory↔source consistency, drift, and documentation, but nothing that first confirmed the app actually runs. Establish a six-tier execution model (operational → hygiene → completeness → coverage → drift → recommendations) so a review begins by checking that the source compiles, tests pass, migrations apply, seed loads, and docs build. Tier 1 failures do not abort — downstream tiers continue best-effort but are marked unreliable.

**Changes:**

- `QR-REV-005` — added; defines six-tier execution and best-effort policy on tier 1 failure.
- `QR-REV-010` — clarified; tier 1 tool-managed cache files (node_modules/.cache, dist/, coverage/) do not count as modifications.
- `QR-REV-155` — added; schema ↔ data model drift (persistence target).
- `QR-REV-160` — added; API ↔ memory drift (server target).
- `QR-REV-200` — added; operational health gate (build, typecheck, unit/integration tests, migrations, seed, docs build, ui tests).
- `QR-REV-210` — added; hygiene checks (linter, leftover markers, contract/traceability headers, orphans).
- `QR-REV-220` — added; source ↔ memory bidirectional existence check.
- `COMMAND-APP-REVIEW` — Agent Behavior rewritten as tier-by-tier sequence (setup → tier 1 → tier 2 → ... → tier 6 → output).

## 2026-05-16 — Establish three-command rule-change flow

**Affected:** `RULE-GOVERNANCE-RULE-CHANGE-GOVERNANCE`, `RULE-GOVERNANCE-RULES-VALIDATION`, `RULE-WORKFLOW-PLAN-COMMAND-LIFECYCLE`, `COMMAND-RULES-MODIFY` (new), `COMMAND-RULES-APPROVE` (new), `COMMAND-RULES-VALIDATE`. Removed: `COMMAND-RULES-CHANGE`, `COMMAND-RULES-IMPORT`, `COMMAND-RULES-EXPORT`, `COMMAND-RULES-SHOW`, `COMMAND-RULES-START`.

**Intent:** Rule changes are at the user's discretion (git is the audit trail). The canonical change flow is explicit and interactive: `mde rules modify` runs intent → explain → discuss → apply; `mde rules validate` runs focused per-rule integrity plus a brief dry-run against the app; `mde rules approve` appends to this changelog and prepares a commit message. Import/export are dropped in favor of plain git. `rules show` and `rules start` are dropped — open the file or bootstrap explicitly.

**Changes:**

- `GV-CHG-010` — flipped from "plan required for significant changes" to "user discretion".
- `GV-CHG-015` — added; states the canonical three-command flow.
- `GV-VAL-025` — added; enumerates 10 focused per-rule checks.
- `GV-VAL-026` — added; defines the brief dry-run against current app state.
- `WF-PLAN-100` — was "mde rules show", now "mde rules modify".
- `WF-PLAN-110` — was "mde rules start", now "mde rules validate".
- `WF-PLAN-120` — was "mde rules change", now "mde rules approve".
