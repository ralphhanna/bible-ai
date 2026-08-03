---
type: feature
id: required-operation-ui-coverage
title: Required-operation UI coverage (§7)
origin: mde
impacts:
  - testing
  - ui-design
default: n/a
---

# Required-operation UI coverage (§7)

## Purpose

Design coverage proves a required operation is **rendered**; this proves it **works** — every
role-permitted operation a page part renders has a UI/E2E scenario that performs it.

## Impact on testing

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

## Impact on ui-design

The denominator is the rendered, role-permitted operations from `operation-coverage`.

## Checks

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
