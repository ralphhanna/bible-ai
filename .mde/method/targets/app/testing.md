---
type: target
id: TARGET-TESTING
title: Testing and Coverage Target Profile
applies_when:
  - a plan creates or modifies source code
  - a plan changes business rules, APIs, page behavior, workflows, or persistence
---

# Testing and Coverage Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

Testing must prove behavior, not just that files exist or the app builds.

## Outputs

The artifacts a plan loading this target must produce. The verifier reads this
(authoritative) list and checks the plan's manifest contains each. `when` gates
applicability to the plan's scope.

| output | path | perEach | when |
|---|---|---|---|
| api-test | tests/api/{cap}.feature | business-capability | api |
| ui-test | tests/ui/{cap}.feature | business-capability | web-ui |
| rule-test | tests/business-rules/{cap}.feature (scenario per rule) | business-rule | always |
| rule-test-report | reports/evidence/tests-business-rules/ | — | always |
| coverage-report | reports/evidence/coverage/ | — | always |
| test-evidence | evidence/logs/ | — | always |
| migrate-log | evidence/logs/migrate.log | — | persistence |
| seed-log | evidence/logs/seed.log | — | persistence |

<!-- coverage-report and page-screenshot (web-ui) are DURABLE PROJECT OUTPUTS, not
     plan evidence: they describe the app's current state (its test health and its UI),
     so they live at PROJECT level under `reports/` and are checked app-wide — replaced
     when the app changes, not accumulated per plan. test-evidence / migrate-log /
     seed-log remain plan-local `evidence/` (they are run-proof for that plan). -->

## Composed behavior

### Annotations (reviewer feedback on live pages)  `[feature: annotations]`

Stable selectors that annotations rely on are the same ones E2E tests use to drive the
running UI — keep important elements addressable.

**A live-app plan must ship an E2E test that proves app annotation actually works** — not just
that selectors exist. The test loads the running app embedded as the Workbench does, completes
the `mde-wb-hello` → `mde-app-ready` handshake, enters annotate mode, clicks an element, and
asserts the app posts an `mde-annotation` message (or that a note round-trips through
`/api/annotations` and re-resolves to the same element on reload). An app where this test is
absent or failing has **not** delivered the annotations facet, regardless of whether the library
files are present.

### Captured command output  `[feature: captured-command-output]`

For each executable check run, save real stdout/stderr under `evidence/logs/`: install →
`install.log`, build → `build.log`, typecheck → `typecheck.log`, tests → `test.log` (+ a
machine-readable report), coverage → `reports/evidence/coverage/`, migrations/seeds → `migrate.log` /
`seed.log`. `evidence.md` references these files (path + headline result). A check claimed
`passed` with **no captured artifact** does not satisfy the gate — capture it or record it
deferred with the reason.

**Logs must be UTF-8, no BOM.** A captured log is evidence a human and the verifier read, so
it must be plain readable text. On Windows a bare PowerShell redirect (`cmd > build.log`) or
`Out-File` writes **UTF-16 with a BOM** — which opens as binary/garbage in an editor and breaks
line-based tooling. Capture as UTF-8 explicitly: pipe through `| Out-File -Encoding utf8`
(or `Set-Content -Encoding utf8`), or redirect from a shell that defaults to UTF-8 (`bash`,
`node`), or have the runner write the file itself. A log that is UTF-16/BOM-encoded is a defect
even when its content is correct — rewrite it as UTF-8.

**Every test suite that drives the running server must capture the server's own log as
evidence, not only the test runner's own output.** The runner's stdout (`test.log`) proves the
suite ran and its assertions passed; it does **not** prove the server-side code path actually
executed — only the app's own log does (see [[logging]]'s boundary log point, and
`required-operation-ui-coverage`'s per-operation log corroboration). This applies to **every**
suite that drives the real app — API, UI/E2E, and business-rules (a pure in-process unit suite
has no server to log). Each such suite sets `LOG_PATH` (`.env`, per [[env-contract]]) to a
suite-specific file, conventionally next to that suite's own report —
`reports/evidence/tests-{api,ui,business-rules}/run.log`. A suite that runs but captures no server log at
its `LOG_PATH` leaves its "passed" claim unverified against real server activity.

### Contract and failure-path tests  `[feature: contract-and-failure-tests]`

These run in a capable environment and capture output under `evidence/logs/`, classified
static (existence) vs. requires-environment (the run).

### Coverage threshold  `[feature: coverage-threshold]`

**Every suite that exercises code runs with coverage — not just the unit suite.** A common trap:
the unit suite (e.g. Vitest) runs with coverage and reports a healthy number, while the **Cucumber
API and UI suites run without instrumentation** — so the route and UI layers are **unmeasured**,
and an untested UI hides behind a high server number. That is a defect. Run each suite with its
stack's coverage tooling:

- **Unit suite** — the stack's unit runner with coverage (e.g. `vitest run --coverage`, `pytest
  --cov`, `dotnet test --collect`).
- **Cucumber API suite** — instrumented (e.g. `c8`/`nyc` wrapping the API server process the
  scenarios drive) so route/service/repository execution during E2E is measured.
- **Cucumber UI suite** — instrumented (e.g. V8/Playwright coverage of the web app) so UI code
  exercised by scenarios is measured.

**Coverage must measure REAL SOURCE FILES — a coverage file is not the same as coverage.** The
report's entries must be **actual source paths** (`src/server/.../EmployeeRecordsRoutes.ts`,
`src/web/src/pages/EmployeeDirectory.tsx`) with real per-file line percentages. A per-suite report
whose only entry is a **synthetic placeholder** — e.g. `api:cucumber-scenarios` or
`ui:cucumber-scenarios` reporting `100%` of itself — is **coverage cosplay**: it satisfies "a file
exists" and "≥ floor" while measuring **zero real code**. That is a defect, not coverage. A
suspiciously perfect **100%** on an E2E suite is the tell — real instrumentation of routes/UI
almost never hits 100%. The API suite's report must contain real `src/server/**` files; the UI
suite's must contain real `src/web/**` files. Instrument the actual server process / web app the
scenarios drive — do not emit a hand-made summary.

**Declared coverage locations (a contract — fixed paths, not ad-hoc):**

| Suite | Coverage output |
|---|---|
| Unit | `reports/evidence/coverage/unit/coverage-summary.json` |
| Cucumber API | `reports/evidence/coverage/api/coverage-summary.json` |
| Cucumber UI | `reports/evidence/coverage/ui/coverage-summary.json` |
| Merged (all suites) | `reports/evidence/coverage/coverage-summary.json` |

Each suite writes its own subdirectory; a **merged** `reports/evidence/coverage/coverage-summary.json`
combines them and is what the floor is measured against — so the total reflects **all** layers,
not one suite. (A stack with a single suite may write only the merged file.)

**Minimum line coverage is the configured `minCoverage` floor (default 75%)** of the in-scope
code — set `featureSettings.coverage-threshold.minCoverage` in `specs/design/mde-policy.md` to
override for this application. **The floor is measured against the merged coverage** (all suites),
not the unit suite alone. Below the floor, stop and report the gap (uncovered code + reason)
rather than committing or faking. Record the reports in `evidence.md` (overall + per-module + per
suite) and reference the artifacts in the manifest. The line floor is a floor, not the goal —
behavioral dimensions still must be covered.

### Dependency resolution (static)  `[feature: dependency-resolution]`

A static check: every `import`/`require` resolves to a dependency declared in the project
manifest (`package.json`, `pyproject.toml`, `*.csproj`, …). Any undeclared package is a
failure, not a deferral. This runs in every environment and is never deferred.

### Gherkin traceability  `[feature: gherkin-traceability]`

Each `.feature` Scenario traces to an acceptance criterion / test-plan row in `acceptance.md`
(and through it to a use case / API endpoint / page spec). Behavioral dimensions (rules, use
cases, API endpoints, E2E workflows) are covered beyond the line floor.

### The test denominator is the use-case condition

**The intent:** a test proves a **use-case condition** — its `situation → expected result` — by
driving the condition's **realization** through the running app. The condition is the coverage
denominator; **operations and business rules are covered *because* a condition that exercises them
is proven**, not by a separate per-operation or per-rule checklist. This is what makes tests
substantive by construction: a condition is a *named business outcome to prove* ("Assignment
Exceeding Capacity Is Rejected"), not a checkbox ("employee.create exists"). Each condition's
realization (design layer) already supplies exactly what the test asserts — the operation (uri),
the expected API status, the rule proven on reject, the expected state/persistence, and the
`testLayers` — so the generator reads the condition + realization and produces the test.

**Two safety nets guarantee nothing falls through** (mechanically enforced, see Checks):

- **Every operation is claimed by a condition** — an entity operation named in some condition's
  realization; an operation no condition exercises is uncovered (`opConditionCoverage`).
- **Every rule is claimed by a condition AND shown to fire** — a rule named (`rule: <concept-id>`)
  in some reject-condition's realization (`ruleConditionCoverage`, static — nothing forgotten),
  **and** the captured run log shows that rule's concept-id on an actual rejection
  (`ruleEvidence`, runtime — the rule really fired and blocked the transaction).

**Business rules are proven through their conditions — no separate testing island.** A rule's
**reject-condition** *is* its invalid case (violating input → rejection asserting the rule's
concept-id); a sibling **accept-condition** on the same operation *is* the valid case. The
discrimination (valid admitted / invalid rejected) is proven by the *pair of conditions*, not by a
dedicated `tests/business-rules/` file. The standalone valid+invalid scenario-pair model is
**retired** — a rule lives in the use-case conditions that invoke it.

**The rejection must reference the rule by its concept id (API contract).** A reject-condition's
test asserts on a **structured field** in the error response — a machine-checkable `rule`/`code`/
`violation` field carrying the rule's **OKF concept id** (its catalogue path minus `.md`,
e.g. `specs/business/capabilities/project-staffing/business-rules/assignment-conflict-check`) —
not a bare slug and not a free-text message. This is the `api/business-rule-responses` contract:
the app is built to emit a structured error naming the violated rule, so the test can assert it
and the **runtime-evidence** gate can read it from the log.

**Evidence of results.** Each condition's responses are captured to the run log under
`reports/evidence/tests-{api,ui,business-rules}/` — the status, the structured rule concept-id on a
reject, and the observed effect on an accept — so a rule's enforcement is *evidenced* (the
`ruleEvidence` gate reads it), not merely asserted-and-discarded. A conditional rule fires only on
violating data, so this runtime evidence — not a static mention — is the real proof it works.

**`.feature` files must be EXECUTABLE, not decorative trace artifacts.** A `.feature` file
only satisfies traceability if the scenario actually *runs* — which means the app carries a
Cucumber runner (a `@cucumber/cucumber`/`cucumber-js` dependency), **step definitions** that
drive the real API/UI for those scenarios, and `mde:test` executes the `.feature` files (not
only the Vitest/supertest suites). A `.feature` file present in the manifest with no step
definitions and no invocation from `mde:test` is a **decorative trace file** — it looks like a
test, names the operation, satisfies the presence/naming checks, yet asserts nothing and never
runs. That is drift: the scenario is documentation cosplaying as a test. Presence of `.feature`
files therefore requires the runner + step definitions + `mde:test` wiring to exist alongside
them.

**A scenario must EXERCISE the operation with real data and assert its EFFECT — not scan the
screen.** Naming the operation is not testing it. Each scenario for a **mutating** operation
(create / update / delete / lifecycle transition) must:
1. **Apply concrete input data** — fill real field values (a create fills the form; an update
   changes a specific value; a transition acts on a known record), not merely open/close a
   modal or enter/exit an edit mode without editing.
2. **Assert the operation's observable effect** — the created row now appears in the list with
   the values entered; the updated value is shown back; the deleted row is gone; the lifecycle
   state changed; a stale/invalid write is rejected with the expected error. Asserting only
   that "a toast appeared" or that "an element is visible" is **not** an effect assertion — a
   toast fires on many paths and proves the form *submitted*, not that the operation *worked*
   with this data.

A **read** operation (list / read / search) asserts the **expected data is present** — the
specific records/fields it should return — not merely that the container element rendered.
A scenario that navigates, clicks, and asserts `I should see the "X" element` is **screen
scanning**: it proves the page mounted, not that the operation behaves correctly. Screen-scan
scenarios do not satisfy operation coverage; the scenario for `entity.op` must drive that
operation's real input→effect path.

**The data must be VISIBLE IN THE GHERKIN — living documentation, not a shell over hidden step
data.** A scenario is read by people (that is the point of Gherkin); its **input records and
expected output must appear in the scenario text in plain English**, not be buried in the step
definitions. Concretely:
- **Input** — the record(s) the operation acts on are stated in the step, as a **data table** or
  quoted field values: `When I register an employee: | name | department | email |
  | Web Employee | Engineering | web.employee@example.test |` — not a bare `When I create an
  employee`.
- **Output** — the expected result is a plain-English assertion naming the **actual values**:
  `Then the directory shows "Web Employee" in "Engineering"` — not `Then the result is backed by
  the API` or `Then the create operation succeeds`.
- **Language, not code** — steps read as business behaviour; do **not** leak operation ids into
  the prose (`When I do employee.create` is code cosplaying as English — say `When I register an
  employee`). The `entity.op` trace lives in `acceptance.md` / step wiring, not in the sentence.
- Repeating a scenario over several input rows uses a **Scenario Outline + Examples** table, so
  the data set is visible.

A `.feature` whose scenarios name an operation and assert vaguely ("operations are backed by the
API", "controls are visible") — with the real data hidden in `steps/*.mjs` — fails this even if
the steps do real work: the feature is unreadable as documentation. The data-in and data-out
belong in the scenario.

### UI coverage (design §6)  `[feature: operation-coverage]`

The rendered, role-permitted operations are the denominator for `required-operation-ui-coverage`
(each must have a performing E2E scenario).

### Persistence integration test (real schema, no mocked DB)  `[feature: persistence-integration-test]`

At least one integration test **applies the real migrations** (and seeds) to an isolated
real/ephemeral test database or schema (a local instance of the stack's own database, a test
container, or an embedded equivalent) and runs a **real repository query** through the real
driver: at least one insert->read
round-trip per table-owning capability, plus a constraint/FK behavior where defined.

The test harness must reset the **one** `DATABASE_URL` (migrate then seed) and point API
and repository tests at it before app/database modules are imported (see [[env-contract]]).
A stale, unreset database is not valid verification.

Faking the project's own DB (a stub `query()` returning canned rows, an in-memory stand-in) is a
verification failure and must be removed, not supplemented. Mocking a genuinely external service
is fine.

### Required-operation UI coverage (§7)  `[feature: required-operation-ui-coverage]`

For every entity operation a page part claims, there must be a Gherkin/E2E scenario that
**drives that operation through the running UI** — clicks the control, performs the action,
asserts the result (with a screenshot). Coverage is measured against the **required operations**
(entity `## Operations`, filtered to role-permitted), not whatever the UI happens to expose. A
rendered operation with no performing test is a gap. Where no runtime/DB is available, record
`deferred — requires execution environment`, never silently passed.

**Generate and run real browser automation.** UI/E2E tests are not source-file inspections,
component string checks, or static Cucumber steps. They must launch/control a real browser
(Playwright, Selenium, Cypress, or the stack's equivalent), navigate to the running application,
authenticate or select the required role, interact with real controls using stable selectors,
drive every role-permitted operation end-to-end, and assert the persisted/rendered outcome. A
`tests/ui` suite whose steps only read files, regex source code, mutate local test variables, or
assert that strings exist in generated source is **not a UI test** and does not satisfy this
target, even if Cucumber reports passing scenarios.

**Assert behaviour, not presence — and prove it with the captured log.** A scenario that only
checks a control is *visible*, or asserts something vague like "operations are backed by the
API," does **not** perform the operation — it is a hollow test that passes even when the feature
is broken (it cannot catch a Save wired to the wrong record). For a **mutating** operation the
scenario must complete the round-trip and assert an **observable outcome**: create → the record is
retrievable (appears in the list, or survives a reload); update → the change persists; a search →
the known-seeded record is returned. Presence-only assertions are a **defect**, not a passing test.

**The proof is the log — and the validator examines it.** A hollow test that only renders drives
**no server activity**, so its captured log is silent; a real round-trip drives the request through
the boundary (and, for a write, its transaction), leaving a correlated trace (see [[logging]] — the
hard-core boundary log point exists for exactly this). So during test runs the app **logs to a
declared file, captured as evidence** alongside screenshots, and the validator **examines that log
against each scenario's claimed operations**: a scenario claiming `employee.create` whose captured
log shows no create request at the boundary did not perform it — that is a defect. The requirement
is watched: presence-only is the losing move; the real round-trip is the only path that leaves the
required trace.

**The test-run log location comes from `.env` — `LOG_PATH`.** The app's log destination is
configurable (`LOG_PATH` in `.env`, per [[logging]] / [[env-contract]]), not a hardcoded path.
For a test run, the suite **sets `LOG_PATH`** to a known file so the captured log is findable and
manifested — conventionally next to that suite's HTML report:

- Cucumber UI (`test:ui`): `LOG_PATH=./reports/evidence/tests-ui/run.log`
- Cucumber API (`test:api`): `LOG_PATH=./reports/evidence/tests-api/run.log`

The app writes wherever `LOG_PATH` points (the app never hardcodes it); the **test harness
provides** the value so the run's log lands at a known, evidence-referenced location. The
validator reads the `LOG_PATH` the suite used to corroborate each scenario's claimed operations; a
suite that runs but captures no log at its `LOG_PATH` does not satisfy the log-as-evidence
requirement.

### Stable selectors  `[feature: stable-selectors]`

E2E/UI tests drive the running UI through these selectors; without them, scenarios are brittle.

### Static vs executable classification (verification debt)  `[feature: static-vs-executable-classification]`

- **Static checks run in every environment** and must never be deferred (structure/tracing,
  dependency resolution, layout, selector presence, …).
- **Executable checks** (run the suite, measure coverage, capture screenshots, apply
  migrations) need a runtime. When the environment **genuinely cannot execute**, record
  `deferred — requires execution environment` and open a verification debt — not marked passed,
  not invented. A **capable agent** with a real toolchain must **repair** a broken install /
  missing binary / stopped service and run the check before deferring; falling back to a stale
  build to clear a debt is a process failure. `node --check` is not a substitute for running
  tests.

### Test correlation id (tests prove they hit the server)  `[feature: test-correlation-id]`

Every test that drives the running app carries a **stable TestID** (an authored
identifier — e.g. a Gherkin `@id:<slug>` tag or the scenario's stable name) and sends
it on **every** request to the server as an `X-Correlation-Id` header, valued
`<TestID>+<RunId>`. The **RunId** is one id per `mde:test` run, injected by the runner
(env, e.g. `MDE_RUN_ID`) — not authored — so the id ties this specific run's requests
to this run's server log, and a stale prior-run log cannot be reused as evidence.

The test author owns the TestID; the framework owns the RunId. Neither alone can fake
the pairing: the server log will only contain `<TestID>+<RunId>` if the test *sent* it
(so the test really ran) *and* the server *received and handled* it (so it reached the
app).

### Test style by layer  `[feature: test-style-by-layer]`

- **API** and **UI/E2E** behavior → **Gherkin `.feature`** files (Given/When/Then) with step
  definitions wired to the real route/UI (the stack's Cucumber binding).
- **Unit** tests → the stack's **native** runner (vitest/jest, pytest, xUnit) — not Gherkin;
  cover rules, validation, calculations, mapping logic.
A plan implementing API/UI behavior with **no `.feature` files** for those layers fails this.

### UI screenshots  `[feature: ui-screenshots]`

Capture at least one screenshot **per implemented page** and **per E2E happy-path workflow**
(plus asserted error/empty/validation states reached). Generate them from the running UI during
tests (Playwright `page.screenshot()` etc.) — never hand-supplied or reused design images.
Store under `reports/evidence/screenshots/`, list each in `evidence.md`, record in the manifest. A
UI-bearing plan with missing required screenshots does not pass; an uncapturable screen is
reported as a gap, not faked.

Screenshots must be emitted by the same browser automation that performs the UI/E2E scenarios.
Stale images, manually copied images, static mockups, or screenshots captured outside the test run
do not prove the current scenarios interacted with the current app. A passing UI report with no
browser-driven screenshots is incomplete evidence.

**Attach screenshots to the test report — not only to disk.** A screenshot written to a file
is invisible to the Cucumber HTML report; the report embeds only images the step/hook
**attaches**. So each captured screenshot is attached to the running scenario as well as
written under `reports/evidence/screenshots/` — in a Cucumber world, capture the buffer and attach it
with its media type, e.g.

```ts
const buf = await this.page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
await this.attach(buf, 'image/png');   // embeds it in cucumber.html
```

so the generated `cucumber.html` shows each scenario's screenshot inline next to its steps. A
report with passing UI scenarios but **no embedded screenshots** does not satisfy this — the
proof must be visible in the report, not just sitting in the evidence folder.

**The Cucumber HTML report has a declared path.** The generated report is not dropped in an
ad-hoc location the reviewer has to hunt for — it is written to a **fixed** path so tooling and
humans always find it:

| Suite | HTML report path |
|---|---|
| UI / E2E (`test:ui`) | `reports/evidence/tests-ui/index.html` |
| API (`test:api`) | `reports/evidence/tests-api/index.html` |
| Business rules (`test:rules`) | `reports/evidence/tests-business-rules/index.html` |

The Cucumber `html` formatter's output target (in each suite's `cucumber.mjs`/config) points at
these paths. `reports/evidence/tests-ui/`, `reports/evidence/tests-api/`, and `reports/evidence/tests-business-rules/` are
report output (like `reports/evidence/screenshots/`), so writing them does not breach any read-only
boundary. A suite that runs but writes its HTML report somewhere else — or nowhere — does not
satisfy this.

## Validation checks

### Annotations (reviewer feedback on live pages)  `[feature: annotations]`

- Is the annotations library present and **mounted on the app server** (not the fake API)?
  · evidence: the toolbar mounted in the app shell + the router mounted on the app server
  · when: static
- Are annotations a **copied library**, not regenerated bespoke code, and do they call a
  relative `/api/annotations` on the real server rather than the capability resolver?
  · evidence: `assets/annotations/` present; client calls `/api/annotations`
  · when: static
- **Is the app-side bridge file actually copied into the app and wired in (behind the dev
  flag)?** The `mde-annotate-bridge.js` master must be copied to the app's served web public dir
  (e.g. `src/web/public/mde-annotate-bridge.js`) **and** referenced by a `<script>` tag in the
  app shell (mounted behind the dev `.env` flag), and the annotations router mounted on the app
  server. Any plan that builds UI whose served app is missing the bridge file, the `<script>`
  reference, or the router mount has **not** delivered the facet — this is a verification failure,
  not a warning. (The library existing only under `.mde/assets/` does not count: it must
  reach the running app.)
  · evidence: `src/web/public/mde-annotate-bridge.js` exists; app-shell template references it
    behind the dev flag; annotations router mounted on the app server
  · when: static
- Do important elements carry **stable selectors** (`id`/`data-testid`) so notes re-resolve?
  · evidence: page source selectors
  · when: static
- **Does an E2E test prove app annotation works end-to-end?** Embedded-app handshake
  (`mde-wb-hello` → `mde-app-ready`), enter annotate mode, click an element, and assert an
  `mde-annotation` message is posted / a note round-trips `/api/annotations` and re-resolves on
  reload. Absent or failing ⇒ the facet is not delivered.
  · evidence: the annotation E2E spec + its run output under `evidence/logs/`
  · when: static (test present) + requires-environment (E2E proof)

### Captured command output  `[feature: captured-command-output]`

- For every executable check claimed `passed` (install/build/typecheck/tests/coverage/migrate/
  seed), is its captured output saved under `evidence/logs/` or `reports/evidence/coverage/` and
  referenced from `evidence.md`?
  · evidence: `evidence/logs/*` + `evidence.md` references
  · when: requires-environment

<!-- $plan.testEvidence is model-computed: scans the plan's evidence/logs/ (depth 0) and the
     project's reports/ (depth ≤3) for a recognizable machine-readable test report
     (test.log, cucumber.json, results*.json, junit*.xml, an HTML report index), then checks
     whether evidence.md's own text mentions that file's basename. Two separate failures so
     each is actionable on its own: no report on disk at all vs. a report that exists but was
     never cited. -->
```check scope=plan
# testEvidence.reportsPresent = a machine-readable test report exists under evidence/logs/
# or reports/ (not just a prose claim in evidence.md).
WHEN  $plan.testEvidence.evidenceMdExists IS "true"
THEN  $plan.testEvidence.reportsPresent IS "true"
  ELSE "no machine-readable test report found under evidence/logs/ or reports/ (test.log, cucumber.json, results.json, junit*.xml, or an HTML report) — a claimed test run leaves no captured artifact"
```

```check scope=plan
# testEvidence.referencedInEvidence = at least one found report's filename is mentioned in
# evidence.md. Fires only when BOTH an evidence.md exists AND a report was found — this
# check owns "evidence.md exists but never cites the report it should". It must NOT fire
# when there is no evidence.md at all (you cannot fail to reference a file inside a file
# that does not exist — that is a missing-evidence.md problem, not a citation problem);
# hence the evidenceMdExists guard, without which it wrongly FAILs a plan that simply has
# not authored its evidence.md yet.
WHEN  $plan.testEvidence.evidenceMdExists IS "true"
  AND $plan.testEvidence.reportsPresent IS "true"
THEN  $plan.testEvidence.referencedInEvidence IS "true"
  ELSE "a test report was found (${$plan.testEvidence.reportsFound}) but evidence.md does not reference it — record the report path in evidence.md so the claimed result is traceable to its artifact"
```

<!-- testEvidence.hasMissingServerLog is model-computed: for each suite that actually ran
     (has a report under reports/evidence/tests-{api,ui,business-rules}/), checks whether its
     reports/evidence/tests-{suite}/run.log exists. A suite that never ran is not flagged — only a
     suite that DID run but captured no server log, which is the actual defect. -->
```check scope=plan
# A ran suite (api/ui/business-rules) with no run.log means the test claims to have
# exercised the server but left no server-side proof — only the test runner's own
# assertions, which cannot catch a scenario that asserted the wrong thing but never
# actually reached the server.
WHEN  $plan.testEvidence.hasMissingServerLog IS "true"
THEN  $plan.testEvidence.hasMissingServerLog IS "false"
  ELSE "suite(s) [${$plan.testEvidence.missingServerLogSuites}] ran but captured no server log at reports/evidence/tests-{suite}/run.log — set LOG_PATH so the app's own log corroborates the suite actually exercised the server"
```

### Contract and failure-path tests  `[feature: contract-and-failure-tests]`

- Do contract + failure-path tests exist, run in a capable environment, with output captured
  and evidence accurately labeled (fixture/mock/emulator/sandbox/production-like)?
  · evidence: test source + run logs under `evidence/logs/`
  · when: static (existence) + requires-environment (run)

### Coverage threshold  `[feature: coverage-threshold]`

- Was **every** test suite that exercises code run with coverage — the unit suite **and** the
  Cucumber API/UI suites — with real reports captured at their declared paths
  (`reports/evidence/coverage/{unit,api,ui}/` + merged `reports/evidence/coverage/`), rather than only the unit
  suite instrumented while API/UI run uninstrumented?
  · evidence: per-suite coverage reports + the merged report referenced from `evidence.md`
  · when: requires-environment
- Is in-scope line coverage of the **merged** report (all suites) ≥ the configured `minCoverage`
  floor (default 75%) — or stopped + reported, never faked (an untested UI must not hide behind a
  high unit number)?
  · evidence: merged `reports/evidence/coverage/coverage-summary.json` referenced from `evidence.md`
  · when: requires-environment
- Does each per-suite coverage report measure **real source files** — the API report contains
  `src/server/**` entries, the UI report contains `src/web/**` entries, each with genuine per-file
  percentages — rather than a **synthetic placeholder** entry (`api:cucumber-scenarios`,
  `ui:cucumber-scenarios`, or any single self-referential 100% row) that reports coverage of
  nothing?
  · evidence: the api/ui `coverage-summary.json` file keys are real source paths, not synthetic
    labels; a lone 100% entry is coverage cosplay, not coverage
  · when: requires-environment

<!-- Deterministic once the report is manifested (reports/evidence/coverage/coverage-summary.json):
     read total.lines.pct, compare to the policy floor. The mandated-output gate
     already checks the report EXISTS; this checks it MEETS THE FLOOR. Only fires when
     a report is present (no report → the mandated-output gate owns that failure).
     $plan.coverage is model-computed from the MERGED report + mde-policy minCoverage. -->
```check scope=plan
# coverage.reportPresent = the merged coverage report (reports/evidence/coverage/coverage-summary.json) exists.
# coverage.meetsFloor = its total line-% ≥ the policy floor (mde-policy minCoverage, default 75).
# The floor is measured against the MERGED coverage (all suites), so a healthy unit number
# cannot mask an unmeasured API/UI layer. (Only runs when a report exists; the mandated-output
# gate owns the "no report at all" case.)
WHEN  $plan.coverage.reportPresent IS "true"
THEN  $plan.coverage.meetsFloor IS "true"
  ELSE "measured line coverage (merged, all suites) is below the configured minCoverage floor (see coverage.linePct vs minCoverage) — raise coverage or stop and report the gap; never fake it"
```

<!-- Coverage cosplay: a per-suite report (unit/api/ui) can exist and even show 100%
     while measuring nothing real — a synthetic self-referential entry instead of actual
     src/server|web/** files. $plan.coverage.hasCosplay / cosplaySuites are model-computed
     by inspecting each present per-suite report's own file keys. -->
```check scope=plan
# coverage.hasCosplay = true when any present per-suite report (reports/evidence/coverage/{unit,api,ui}/
# coverage-summary.json) has no real src/server/** or src/web/** entries — i.e. it measures
# nothing but a synthetic placeholder (api:cucumber-scenarios, ui:cucumber-scenarios, etc.).
# coverage.cosplaySuites names which suite(s) failed this way.
WHEN  $plan.coverage.hasCosplay IS "true"
THEN  $plan.coverage.hasCosplay IS "false"
  ELSE "per-suite coverage report(s) [${$plan.coverage.cosplaySuites}] contain no real src/server/** or src/web/** entries — this is coverage cosplay (a synthetic placeholder passing as coverage), not real instrumentation; wrap the actual server/UI process the suite drives"
```

### Dependency resolution (static)  `[feature: dependency-resolution]`

- Does every import/require in generated source resolve to a declared manifest dependency?
  · evidence: dependency-resolution check output
  · when: static

### Gherkin traceability  `[feature: gherkin-traceability]`

- Does each `.feature` scenario trace to an acceptance-criterion / test-plan row in
  `acceptance.md`?
  · evidence: scenario ↔ acceptance.md rows
  · when: static
- Did a plan implementing API/UI behaviour produce **`.feature` files at all** (Gherkin,
  not only raw supertest/Playwright)?
  · evidence: presence of `.feature` files in the manifest
  · when: static
- Does **every use-case condition** have **at least one executable test** at each layer its
  realization declares (`testLayers`)? The condition is the denominator: a condition with no test
  is uncovered, regardless of how many operations/rules have scenarios.
  · evidence: a `.feature` scenario / test per condition, at its declared layers
  · when: static + requires-environment (the test runs and asserts the condition's result)
- Is **every entity operation covered by a condition** — named in some condition's realization so
  a test exercises it (not merely claimed by a bare step)?
  · evidence: `opConditionCoverage` — entity ops vs. operations named in condition realizations
  · when: static
- Is **every business rule proven through its conditions** — claimed by a reject-condition whose
  realization names it (`rule: <concept-id>`), **and** shown by the captured run log to have
  actually fired (its concept-id on a rejection)? A rule is proven by the pair of conditions that
  invoke it (reject-condition = the invalid case, a sibling accept-condition = the valid case), not
  a standalone `tests/business-rules/` file (retired). Naming the rule is not testing it; the
  runtime rejection is the proof.
  · evidence: `ruleConditionCoverage` (claimed) + `ruleEvidence` (run log shows the concept-id on a
    422/409/403 — the rule fired and blocked the transaction)
  · when: static (claimed) + requires-environment (evidence the rule fired)
- Does each reject-condition's test **assert the structured rule concept-id** on the rejection
  (the `api/business-rule-responses` contract) and drive **concrete violating input** (visible in
  the Gherkin), so the rejection is attributable to *this* rule — and does its sibling
  accept-condition drive satisfying input and assert the observable effect?
  · evidence: condition test asserts a structured concept-id rejection + carries input data; the
    accept-condition asserts the effect
  · when: static + requires-environment
- Are the `.feature` files **executable, not decorative** — is there a Cucumber runner
  (`@cucumber/cucumber`/`cucumber-js` dependency), step definitions driving the real API/UI,
  and does `mde:test` actually run the `.feature` files (not only Vitest/supertest)?
  · evidence: `package.json` deps + `mde:test` script; a step-definition dir/files for the
    scenarios; `.feature` files are invoked by the test aggregate
  · when: static (wiring present) + requires-environment (scenarios pass when run)
- Does each **mutating**-operation scenario (create/update/delete/lifecycle) **apply concrete
  input data** and **assert the operation's effect** — the created row appears with the entered
  values, the updated value is shown back, the deleted row is gone, the transition changed
  state, the invalid write is rejected — rather than only opening/closing a modal, entering/
  exiting edit mode, or asserting a toast / an element is visible (screen scanning)?
  · evidence: the scenario's steps — data-entry step(s) present + an outcome assertion on the
    operation's result, not just element visibility
  · when: static
- Does each **read** operation scenario (list/read/search) assert the **expected data is
  present** (the specific records/fields returned), not merely that a container element
  rendered?
  · evidence: the scenario asserts on returned data, not just element presence
  · when: static
- Is the **data visible in the Gherkin** — does each scenario state its **input record(s)**
  (a data table or quoted field values) and assert its **output with the actual values**, in
  plain English, rather than hiding the data in the step definitions or asserting vaguely
  ("operations are backed by the API", "controls are visible")? Does the prose read as business
  behaviour without leaking `entity.op` ids into the sentence?
  · evidence: scenario text carries concrete input data + value-bearing outcome assertions;
    no `entity.op` id or "backed by the API"/"is visible"-only assertions in the steps
  · when: static

```check scope=plan
# Vague-Gherkin smell (deterministic, broadened): a .feature Then-step that asserts only a
# presence/generic phrase — "backed by the API", "is/are visible", "controls are visible",
# "operation(s) succeed(s)", "saves the selected <x>", "is reference only", and the
# coverage-checkbox templates "records operation <x>" / "returns a validation response for" /
# "exercise operation ... through" / "rejects invalid input or succeeds" (a scenario that only
# names the op and asserts it "was recorded" proves nothing about behaviour) — hides the data.
# Enumerating vague phrases is a floor, not a ceiling (the semantic ASK below is the real
# arbiter); this catches the common ones cheaply. The data-in/out must be in the scenario.
EVERY $t IN $plan.trace WHERE $t.type IS "source"  AND  $t.path MATCHES ".*\.feature$"
THEN  $t.content NOT MATCHES "(?i)(Then .*(backed by the API|(are|is) visible|operations? (are|is) visible|controls are visible|operations? succeeds?|saves the selected|is reference only|records operation|returns a validation response for)|(When|Then) .*(exercise operation .* through|rejects invalid input or succeeds))"
  ELSE "a Gherkin scenario asserts vaguely (backed by the API / is-visible / records operation / returns a validation response / exercise-operation-through / rejects-or-succeeds) with no verifiable outcome — state the input record and the expected output values in the scenario (living documentation), not hidden in the step definitions"
```

```check scope=plan
# entity.op id leaked into Gherkin prose (deterministic): a Given/When/Then step that
# quotes a dotted operation id ("employee.create", "review.acknowledge") is code cosplaying
# as English — the scenario is written around the op id, not the business behaviour. The
# entity.op trace belongs in acceptance.md / step wiring, never in the sentence a reader
# reads. (A .feature *filename* or a src path is fine; this targets quoted dotted ids inside
# step lines.)
EVERY $t IN $plan.trace WHERE $t.type IS "source"  AND  $t.path MATCHES ".*\.feature$"
THEN  $t.content NOT MATCHES "(?im)^\s*(Given|When|Then|And) .*\"[a-z][a-z-]*\.[a-z][a-z-]+\""
  ELSE "a Gherkin step quotes an entity.op id (e.g. \"employee.create\") — that is code cosplaying as English; rewrite the step as business behaviour (\"When I register an employee: | name | ... |\") and keep the entity.op trace in acceptance.md / step definitions, not the scenario prose"
```

```check scope=plan
# Semantic (AI judgment) — the real arbiter a regex cannot be. Not every value-free step is
# vague ("returns conflict", "result is draft", "shows status active" are concrete outcomes);
# and a new vague phrasing the blocklist misses is still vague. The AI reads each behavioural
# Then and judges: does it assert a CONCRETE, VERIFIABLE outcome — a specific value, a named
# state, a rejection — that a reader can check, or is it presence-scanning ("...is visible",
# "saves the selected X") that proves the page mounted / the form submitted but not that the
# operation worked with real data?
EVERY $t IN $plan.trace WHERE $t.type IS "source"  AND  $t.path MATCHES ".*\.feature$"
ASK   "In ${$t.path}: does every behavioural Then step assert a concrete, verifiable outcome — a specific value the operation returned/persisted, a named lifecycle state, or a specific rejection — rather than a vague presence assertion (a control/page 'is visible', an operation 'is backed by the API', 'saves the selected X' with no value shown)? A UI scenario especially must state the record it acted on and the value it expects back, not just that a control rendered. List any scenario whose Then only scans the screen or asserts a generic success."
```

```check scope=plan
# entities = the entities this plan touched (from the manifest).
# featuresExist = the plan produced at least one Gherkin .feature file.
# This check: a plan with entities in scope must express behaviour as Gherkin scenarios,
# not only raw supertest/Playwright.
WHEN $plan.entities EXISTS
THEN  $plan.featuresExist IS "true"
  ELSE "no Gherkin .feature files produced — API/UI behaviour must be expressed as Cucumber scenarios, not only supertest/Playwright"
```

# ── The test denominator is the use-case CONDITION, not the operation or the rule ──
# (enhanced-use-case model.) A test proves a condition (situation → expected result); operations
# and rules are covered BECAUSE a condition that exercises them is proven. The two safety nets
# below make that sound: every operation and every rule must be CLAIMED by a condition (so nothing
# falls through), and every rule must show RUNTIME EVIDENCE it actually fired. These REPLACE the
# old per-operation scenario check and the standalone tests/business-rules/ valid+invalid pair
# (retired — a rule is proven through the use-case conditions that invoke it, not a separate island).

```check scope=system
# A — opConditionCoverage (app.opConditionCoverage): every entity operation is named in some
# use-case CONDITION's realization, so a test derived from that condition will exercise it. An
# operation claimed only by a bare step (no condition) is not proven; an operation claimed by no
# condition at all is uncovered. (designOpCoverage already ensures it's realized somewhere; this
# is the stronger "realized by a condition" that guarantees a test.)
WHEN  $app.opConditionCoverage.inScope IS "true"
THEN  $app.opConditionCoverage.complete IS "true"
  ELSE "operations are not covered by any use-case condition — ${$app.opConditionCoverage.missingCount} uncovered: ${$app.opConditionCoverage.missing}. Every operation must be exercised by a condition (its realization names the operation), so a test proves it."
```

```check scope=system
# B1 (static) — ruleConditionCoverage (app.ruleConditionCoverage): every business rule is named
# (as a `rule:` uri) in some condition's realization — the reject-condition that proves it. A rule
# claimed by no condition is FORGOTTEN; this catches it before the app even runs. Necessary but
# not sufficient — B2 proves it actually fires.
WHEN  $app.ruleConditionCoverage.inScope IS "true"
THEN  $app.ruleConditionCoverage.complete IS "true"
  ELSE "business rules are not claimed by any use-case condition — ${$app.ruleConditionCoverage.missingCount} forgotten: ${$app.ruleConditionCoverage.missing}. Every rule needs a reject-condition whose realization names it (rule: <concept-id>); a rule no condition proves is untested."
```

```check scope=system
# B2 (runtime evidence) — ruleEvidence (app.ruleEvidence): a rule is PROVEN only when the captured
# business-rules/API run log shows a REJECTION (422/409/403) carrying that rule's concept-id —
# evidence the rule was actually invoked and blocked the transaction. A conditional rule fires only
# on violating data, so "named in a condition" (B1) is not proof; the log must show it firing. This
# is what turns coverage into evidence. requires-environment (needs the app run + captured log;
# vacuous until the log exists — logPresent guards it).
WHEN  $app.ruleEvidence.inScope IS "true"
THEN  $app.ruleEvidence.complete IS "true"
  ELSE "business rules show no runtime evidence of firing — ${$app.ruleEvidence.noEvidenceCount} with no rejection in the run log: ${$app.ruleEvidence.noEvidence}. Each rule's condition test must drive violating input and the captured log must show a rejection carrying the rule's concept-id (proof the rule was invoked and blocked the transaction), not just a scenario that names it."
```

```check scope=plan
# featuresExist = the plan produced at least one Gherkin .feature file.
# packageJson = the raw package.json text the plan produced (root-most).
# This check: if the plan ships .feature files, they must be EXECUTABLE — the app must
# carry a Cucumber runner AND mde:test must run it. A .feature file with no cucumber
# dependency / no cucumber invocation in mde:test is a decorative trace file (names the
# op, passes presence/naming, but never runs). Step-definition presence is verified by
# the AI pass (requires knowing the runner's glue convention); this gate catches the
# common failure: .feature files exist but nothing executes them.
WHEN  $plan.featuresExist IS "true"
THEN  $plan.packageJson MATCHES "@cucumber/cucumber|cucumber-js" AND $plan.packageJson MATCHES "\"mde:test\"\s*:\s*\"[^\"]*cucumber"
  ELSE ".feature files are decorative — no Cucumber runner and/or mde:test does not execute them (scenarios named but never run); wire step definitions + run cucumber in mde:test"
```

### UI coverage (design §6)  `[feature: operation-coverage]`

- **Up-drift (always):** does every panel operation id resolve to a declared, role-permitted
  entity operation?
  · evidence: page-spec `## Composition` panel operations vs. entity `## Operations`
  · when: static
- **Down-coverage, for-sure dimensions (complete-design plans only):** is every role-permitted
  in-scope operation rendered by a panel, and every in-scope use case served by a page?
  · evidence: `operation-coverage.md` (entity-operations + use-cases sections) vs. `acceptance.md`
  · when: static

The down-coverage question has no single owning plan — a required operation and the panel that
should render it may come from two entirely different plans, so it can only be answered whole-app
(see `.mde/mde.specs/design/verification.md`). Gated on `operation-coverage.md` existing (the
complete-design signal), same condition the script-level gate used before this moved here; the
report not existing yet is "pending design", not a failure, and this check simply does not fire.

```check scope=system
WHEN  $app.hasFile["specs/design/UI/operation-coverage.md"] IS "true"
ASK   "Read every entity's ## Operations table across specs/business/entities/**, every panel's operations: list in every page-spec's ## Composition under specs/design/UI/pages/**, and every page's ## Supported Use Cases, across the whole project. List any role-permitted entity operation (<entity>.<op>) that no panel renders, and any in-scope use case that no page serves. Do not report up-drift here (a panel operation id with no declaring entity) — that is a separate, always-on, plan-scoped check."
```
- **Coverage report present and current:** does `operation-coverage.md` exist with one section per
  dimension the design defines (entity-operations, use-cases, and any open-door dimensions
  present), each element marked covered or uncovered?
  · evidence: `specs/design/UI/operation-coverage.md`
  · when: static

### Persistence integration test (real schema, no mocked DB)  `[feature: persistence-integration-test]`

- **Static - no faked DB:** no repository/persistence test fakes the project's own database.
  - evidence: test source review
  - when: static
- **Static - test is a pure consumer:** the integration test does not boot its own app tier
  (`createApp()`/`express()`/`.listen(...)`/`new Server`) or reset the database in-process
  (`DROP`/`TRUNCATE TABLE`, `migrate.reset/latest`, `resetDatabase`). Per the `mde:test`
  contract (`app-runtime-scripts`), the test hits the app **already running** (its `baseURL`)
  and the **one** `DATABASE_URL` — it starts no second server or database.
  - evidence: test source review — no in-process server construction or DB reset
  - when: static
- **Required - real integration test:** the suite resets the one `DATABASE_URL` (real
  migrations and seeds applied there), points tests at it, and runs a real repository query
  (insert->read round-trip per table-owning capability). A stale, unreset database is a failure.
  - evidence: integration run output (`evidence/logs/`) + `migrate.log`/`seed.log`
  - when: requires-environment
- **Required - the change actually landed in the DB:** after applying the up migration to the
  isolated target, **generate a real schema dump** via the stack's own `db:schema-dump` operation
  (`tech-stack.md` Operations Map — the command is whatever the chosen database's own tooling
  produces a real, structural schema dump; this method names no database engine) and **read it
  against every touched entity's `## Storage View`**: does each declared
  table exist, with every declared column — i.e. the migration's changes really took place, not
  merely that the SQL ran without error. The static `schema-from-entities` check proves the
  migration *declares* the table; this proves the database *has* it. Save the dump as evidence
  and record the comparison result (table-by-table, column-by-column) in `evidence.md`.
  - evidence: the `db:schema-dump` output saved under `evidence/logs/schema-dump.*`, compared
    against entity Storage Views, with the comparison result recorded in `evidence.md`
  - when: requires-environment
- **Reversibility (down) applies cleanly:** applying the paired **down** migration to the target
  rolls the change back without error (and, where non-destructive, restores the prior state) — the
  down is exercised, not just present.
  - evidence: down-apply output in `evidence/logs/`
  - when: requires-environment

<!-- check: the deterministic ($-model) form of the `when: static` checks above.
     The runner assembles the model, scopes $item to THIS capability's manifest
     entries by default, resolves $-paths, applies operators, and emits a complaint
     when a THEN fails. Prose `when: requires-environment`/semantic checks stay
     above for the AI pass — only the mechanizable ones get a check block. -->
```check scope=item
# Static — no faked DB: my test artifacts must not mock the project's own database.
WHEN  $item.type IS "test"
THEN  $item.content NOT MATCHES "(mock|stub|fake|vi\.fn|jest\.fn).*(query|pool|client|db)"
  ELSE "faked project DB (RULE-CORE-004 — mock external services only, never the app's own DB)"
# Static — pure consumer: a test must not boot its own app tier or reset the DB in-process.
# It hits the app mde:start launched (baseURL) and the one DATABASE_URL (see app-runtime-scripts).
WHEN  $item.type IS "test"
THEN  $item.content NOT MATCHES "(createApp\s*\(|express\s*\(\)|\.listen\s*\(|new\s+Server\b|(DROP|TRUNCATE)\s+TABLE|migrate\.(reset|latest)\s*\(|resetDatabase\s*\()"
  ELSE "test self-starts the app tier or resets the DB in-process — mde:test must be a pure consumer of the app mde:start launched (hit the running app's URL + the one DATABASE_URL), not boot a second server/DB"
```

<!-- Semantic (AI judgment) — a schema dump's format is stack-specific (raw SQL DDL, an
     ORM's introspection JSON, a plain-text schema listing, …), so no single regex/DSL
     check can parse "does this dump have column X" across every stack. The AI
     reads the captured dump directly against each touched entity's Storage View — the
     same comparison schema-from-entities.md does statically against the MIGRATION FILES,
     here done against the LIVE dump so a hand-patched migration (a column added later,
     out of band) or a migration that silently failed to apply cannot hide the gap. -->
```check scope=plan
# hasSchemaDump = a captured schema-dump artifact exists under evidence/logs/ for this
# plan (model-computed: a file matching schema-dump.* in the plan's evidence/logs/).
WHEN  $plan.persistenceInScope IS "true"
  AND $plan.hasSchemaDump IS "false"
ASK   "This plan touches persistence but evidence/logs/ has no captured db:schema-dump output. Confirm: was db:schema-dump run against the isolated test target after migrating, and if so where was its output saved? If it was never run, that is the defect to report — not a pass."
```

```check scope=plan
EVERY $e IN $plan.expectedTables
ASK   "Read the captured schema dump under evidence/logs/ (whatever format the stack's db:schema-dump produced) and confirm entity '${$e.entity}' Storage View — table '${$e.table}' — actually exists in the LIVE dump with every declared column present, not just in the migration source. Name any table or column the dump is missing that the Storage View declares; that is a real defect (the migration source can lie about what actually got applied)."
```

### Required-operation UI coverage (§7)  `[feature: required-operation-ui-coverage]`

- Does every role-permitted entity operation a page part renders have a UI/E2E scenario that
  performs it through the running UI (traced to the operation id + an `acceptance.md` row)?
  · evidence: `.feature` UI scenarios per operation + screenshots
  · when: requires-environment
- Do the UI/E2E step definitions use full browser automation against the running app — launch or
  connect to a browser, visit real routes, interact with controls, and wait for/assert rendered
  outcomes — rather than reading source files or mutating local test variables?
  · evidence: UI step definitions + runner config + captured browser screenshots/report
  · when: static (step wiring shape) + requires-environment (scenarios run)
- Does each scenario for a **mutating** operation assert an **observable outcome** (created record
  retrievable / change persists across reload / search returns the seeded match) — not merely that
  a control is visible or "backed by the API"?
  · evidence: `.feature` scenario Then-steps assert behaviour, not presence
  · when: static (assertion shape) + requires-environment (outcome reached)
- Does each suite set **`LOG_PATH`** (`.env`) so the app's run log is captured to a known,
  evidence-referenced file (conventionally `reports/evidence/tests-{ui,api}/run.log`), and does each
  mutating/search scenario's captured log show the **real request path it claims** (a boundary
  request for the operation; a write's transaction) — a silent log for a claimed operation being
  a defect?
  · evidence: the suite's `LOG_PATH` + the captured log referenced from `evidence.md` +
    per-scenario operation trace in the log
  · when: requires-environment

### Stable selectors  `[feature: stable-selectors]`

- Do important elements carry stable selectors / accessible labels (`id`/`data-testid`)?
  · evidence: page source selectors
  · when: static

```check scope=plan
# UI design compliance — DETERMINISTIC core, cross-cutting over all page artifacts
# (scope=plan scanning $plan.trace): every page must carry stable selectors
# (data-testid) so it is test- and annotation-addressable.
EVERY $t IN $plan.trace WHERE $t.type IS "source"  AND  $t.path MATCHES "src/web/src/pages/.*\.tsx$"
THEN  $t.content CONTAINS "data-testid"
  ELSE "page has no stable selectors (data-testid) — not test/annotation-addressable"
```

<!-- semantic (AI pass, not a `check` block): "does every action the page spec's
     ## Actions declares have a corresponding stable selector / control?" needs
     the AI to distinguish primary page actions (a button + testid) from inline
     sub-actions ("Add skill" within a profile). $spec.page[$item.page].actions
     lists them; the AI judges coverage. A crude substring match over-flags inline
     actions, so the precise action↔selector mapping is a semantic check. -->

### Static vs executable classification (verification debt)  `[feature: static-vs-executable-classification]`

- Are executable checks that genuinely cannot run recorded as `deferred — requires execution
  environment` with an open verification debt (not passed on `--check`), and did a capable agent
  repair fixable setup rather than defer?
  · evidence: `evidence.md` deferral records + `status.md` verification-debt flag
  · when: static (the classification itself)

### Test correlation id (tests prove they hit the server)  `[feature: test-correlation-id]`

- Do tests that drive the running app send `X-Correlation-Id: <TestID>+<RunId>` on their
  requests, with the RunId injected by `mde:test` (not hardcoded)?
  · evidence: test/support source setting the header; `mde:test` injecting the run id
  · when: static

- For each test claimed **passed** that drives the app, does a line carrying its
  `<TestID>+<RunId>` appear in this run's captured server log — proving the test reached
  the server, not just that a `.feature`/test file exists?
  · evidence: the preserved server log (per [[captured-command-output]]'s LOG_PATH) cross-referenced with the test report
  · when: requires-environment

<!-- correlationId.serverReadsHeader is model-computed: the request-boundary source reads
     an inbound X-Correlation-Id header (not only server-generated), so a test-set id can
     appear in the server log. Static-checkable from the boundary source; the per-test
     log correlation itself is requires-environment (needs a real run) and is the ASK. -->

### Test style by layer  `[feature: test-style-by-layer]`

- Are API and UI/E2E behaviors expressed as Gherkin `.feature` scenarios (steps wired to the
  real route/UI), and are unit tests in the native runner?
  · evidence: presence of `.feature` files for API/UI + native unit tests
  · when: static

### UI screenshots  `[feature: ui-screenshots]`

- For UI-bearing plans, were screenshots captured from the running UI (one per page + per happy
  path), stored under evidence, listed in `evidence.md`, recorded in the manifest (uncapturable
  → reported, not skipped)?
  · evidence: `reports/evidence/screenshots/` + `evidence.md`
  · when: requires-environment
- Are the captured screenshots **attached to the Cucumber report** (via `this.attach(buf,
  'image/png')`) so the generated `cucumber.html` shows them inline — not merely written to the
  evidence folder?
  · evidence: image attachments embedded in `cucumber.html`
  · when: requires-environment
- Is each suite's Cucumber HTML report written to its **declared path** — `reports/evidence/tests-ui/`
  for the UI/E2E suite, `reports/evidence/tests-api/` for the API suite, `reports/evidence/tests-business-rules/`
  for the business-rules suite — not an ad-hoc location?
  · evidence: the suite's Cucumber config `html` formatter target; the report file present at
    that path after a run
  · when: static (config target) + requires-environment (report present after run)
