---
type: feature
id: contract-and-failure-tests
title: Contract and failure-path tests
origin: mde
impacts:
  - integration
  - testing
default: n/a
---

# Contract and failure-path tests

## Purpose

Contract and applicable failure-path tests exist and run, with evidence accurately labeled —
a mock-only test proves local behavior, not live compatibility.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **AsyncAPI** — https://www.asyncapi.com/docs/reference/specification/latest
  - EVT-ASYNC-09 (Contract and failure testing)


## Impact on integration

Contract tests and applicable failure-path tests exist; the test environment is accurately
recorded. Evidence is labeled as fixture/mock, emulator, sandbox, or production-like.

## Impact on testing

These run in a capable environment and capture output under `evidence/logs/`, classified
static (existence) vs. requires-environment (the run).

## Checks

- Do contract + failure-path tests exist, run in a capable environment, with output captured
  and evidence accurately labeled (fixture/mock/emulator/sandbox/production-like)?
  · evidence: test source + run logs under `evidence/logs/`
  · when: static (existence) + requires-environment (run)
