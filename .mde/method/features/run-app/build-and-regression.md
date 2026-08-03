---
type: feature
id: build-and-regression
title: Build and regression run (run-app)
origin: mde
impacts:
  - run-app
default: n/a
---

# Build and regression run (run-app)

## Purpose

When a plan generates runnable code, the app must actually **build** and its **full**
test suite must still **pass** — proving the change compiles and did not break the rest
of the app.

## Impact on run-app

A plan that produces runnable code **runs the app it generated** — after `dev-setup`
has proven the environment (env resolved, database reached, app starts). Two
executions, each leaving a required log under `evidence/logs/`:

| log | proves | pass condition |
|---|---|---|
| `build.log` | the generated code builds | `mde:build` ran to completion, exit 0 |
| `test.log` | the **FULL** suite still passes (regression) | the whole `mde:test` suite ran and exited 0 — not just the plan's new tests |

The regression point is what makes run-app more than "build": running the *whole*
suite proves the change did not break previously-working behaviour anywhere.

Log capture (real captured output, UTF-8, missing = didn't run, non-zero = failed) is
governed by [[captured-command-output]] — the same rule as every other execution log.
run-app **runs** the `mde:build`/`mde:test` scripts that `server`/`testing`
authored; running is not authoring.

## Checks

- Did the generated code build — is `build.log` present and showing `mde:build` exit 0?
  · evidence: `evidence/logs/build.log`
  · when: requires-environment

- Did the FULL test suite pass (regression) — is `test.log` present, showing the whole
  `mde:test` suite ran and exited 0 (not a subset, not a stale run)?
  · evidence: `evidence/logs/test.log` + the run report
  · when: requires-environment

<!-- runApp.buildLogClean / testLogClean are model-computed: the plan's manifest
     declares build.log / test.log (run-app mandated outputs); the check confirms the
     file exists and its captured content shows a clean exit (not just that a manifest
     entry or an empty file is present — the "prints instead of runs" cheat). -->
```check scope=plan target=run-app
WHEN  $plan.runApp.buildDeclared IS "true"
THEN  $plan.runApp.buildLogClean IS "true"
  ELSE "run-app: build.log is missing or does not show a clean `mde:build` (exit 0) — the generated code was not proven to build; run `mde:build`, capture the output to evidence/logs/build.log, and fix any build error"
```

```check scope=plan target=run-app
WHEN  $plan.runApp.testDeclared IS "true"
THEN  $plan.runApp.testLogClean IS "true"
  ELSE "run-app: test.log is missing or does not show the FULL suite passing (exit 0) — regression was not proven; run the whole `mde:test` suite, capture it to evidence/logs/test.log, and fix any failure (a broken existing test is a regression this plan must not ship)"
```
