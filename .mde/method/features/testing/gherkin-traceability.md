---
type: feature
id: gherkin-traceability
title: Gherkin traceability
origin: mde
impacts:
  - testing
default: n/a
---

# Gherkin traceability

## Purpose

Each `.feature` scenario traces to an acceptance criterion / test-plan row — and through it to
a use case / API endpoint / page spec.

## Impact on testing

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

## Audit

Judge whether the business-rule tests **actually exercise the rule** — whether they would
**catch the rule breaking** — or merely clear the coverage floor while proving nothing. Coverage
cannot see this: a contentless scenario that POSTs *something* through the route still executes
source lines and counts as coverage, so a genuine-coverage verdict says nothing about whether the
rule's logic is tested. This concern is the one coverage can't answer.

For **each** business rule (`specs/business/**/business-rules/<slug>.md`), read its scenarios
under `tests/business-rules/` and the step definitions they bind to, and ask:

- **Is there a valid/invalid PAIR?** An invalid case that drives violating input *and* a valid
  case that drives satisfying input, through the **same operation**. A lone reject is **not
  exercised** — it can pass because the endpoint refuses everything; a lone accept never shows
  the rule exists. The proof is the **contrast**.
- **Does the reject identify THIS rule?** The invalid case must assert on a **structured** error
  field carrying the rule's **concept id** (its catalogue path minus `.md`), not any 422 and not
  a brittle prose-message substring. A test that asserts a bare status code, or `body.details.rule
  === <slug>` with no valid case, is the demoX failure mode: it names the rule yet proves nothing.
- **Does the valid case assert an observable EFFECT?** The operation succeeded and the state
  changed (row created / transition happened / value persisted) — not just "a 2xx" or "a toast".
- **Would flipping the rule off break this test?** The litmus: if the server-side rule check were
  removed, the invalid case must start *failing*. If it wouldn't (the assertion doesn't depend on
  the rule firing), the test is decorative.

Report each rule's BR tests as **exercised** (valid/invalid pair, reject carries the rule's
concept id, valid asserts a real effect — a test that would fail if the rule were disabled) or
**not exercised** (missing a half, vague/contentless assertion, or a rejection that doesn't
identify the rule). A rule whose tests are present and pass the coverage floor is **not**
exercised if removing the rule would leave the tests green.

## Checks

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
