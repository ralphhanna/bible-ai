---
type: audit-view
title: Audit — testing
---

# Audit — testing — COMPILED from features' `## Audit`

<!-- COMPILED by compile-targets.mjs. Do not hand-edit — edit each feature's ## Audit
     section and recompile. Each ## Audit speaks in GENERAL terms (what quality looks like
     for this concern). SCOPE is applied by the CALLER at run time, not authored here: an
     audit run for a plan adds "perform these checks for this plan's scope only"; an
     app-wide run (review app) adds none. The auditor is a FRESH session — it did not build this. -->

You did not build this. Do not trust that an artifact or control *exists* — judge whether
it *behaves*, by driving the real running app (or reading the specs, for BA/design targets)
and corroborating against a witness the author does not control (the app's own request/write
log, a read-back after a mutation, the spec's own content).

## How to report — every finding must be actionable

Do not write a vague narrative. For **each concern** you audit, produce one row:

| field | what it must contain |
|---|---|
| **concern** | the specific artifact/control/operation judged (name it: `client.create`, "Employee Directory save button", "review-period-constraint") — never "the API" or "the UI" in general |
| **verdict** | **genuine** · **fake** · **not-exercised** (you could not drive it — say why) |
| **witness** | the concrete evidence you observed: a server-log line, a read-back result after a mutation, the missing route/operation, the placeholder text quoted. A verdict with no witness is not a finding |
| **severity** | **high** (core substance is fake — a mutating action that never persists, a rule not enforced) · **medium** · **low** |
| **fix** | the concrete next action to make it genuine (name the file + what to change) — so the finding is directly actionable in a repair plan |

End with a **summary**: counts (**N genuine · M fake · K not-exercised**), and the **fakes ranked
most-severe first** with their fix. A `fake` on an in-scope artifact is a real defect — state it
plainly; do not soften it to "could be improved". "It exists / it responded 200 / the section is
filled" is never a genuine verdict on its own.

### Coverage threshold  `[feature: coverage-threshold]`

Judge whether the coverage number is **measured by real instrumentation**, or a **fabricated /
cosplay figure** that clears the floor while measuring nothing. A deterministic check reads
`total.lines.pct` and compares it to the floor — it *trusts the number in the file*; the audit's
job is to ask where that number came from.

Read the script that produced `reports/evidence/coverage/coverage-summary.json` (the npm `coverage`/`test`
script and any `write-coverage`/`report`-style generator it invokes). It is **fake** when the
percentage is **hardcoded** — a generator that literally writes `pct: 82` (or any constant) with no
coverage tool (`c8`/`nyc`/`vitest --coverage`/`pytest-cov`/V8) in the chain that ran the suite. It
is **cosplay** when the report exists but its file keys are **synthetic labels**
(`api:cucumber-scenarios`, a lone self-referential 100% row) instead of real `src/server/**` /
`src/web/**` files — including in the **merged** report, not only per-suite ones. A **100%** on an
E2E/Cucumber suite, or a merged report with one or two token `src/` keys and a round total, is the
tell. Corroborate against the witness the author does not control: does an instrumentation tool
actually appear in the executed command, and do the report's keys resolve to real source files on
disk?

Report coverage as **measured** (a real coverage tool instrumented the process the suite drove;
the report's keys are actual source files with genuine per-file percentages) or **fabricated**
(hand-written constant, or a report measuring nothing real). A coverage summary that exists and
passes the floor is **not** genuine coverage if no tool measured it.

### Gherkin traceability  `[feature: gherkin-traceability]`

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
