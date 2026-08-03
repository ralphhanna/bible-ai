---
type: feature
id: static-vs-executable-classification
title: Static vs executable classification (verification debt)
origin: mde
impacts:
  - testing
default: n/a
---

# Static vs executable classification (verification debt)

## Purpose

Verification splits into static (run in every environment, never deferred) and executable
(needs runtime/DB/install). This classification is what lets `mde go` defer correctly and open
a verification debt — and what stops a capable agent from deferring fixable setup.

## Impact on testing

- **Static checks run in every environment** and must never be deferred (structure/tracing,
  dependency resolution, layout, selector presence, …).
- **Executable checks** (run the suite, measure coverage, capture screenshots, apply
  migrations) need a runtime. When the environment **genuinely cannot execute**, record
  `deferred — requires execution environment` and open a verification debt — not marked passed,
  not invented. A **capable agent** with a real toolchain must **repair** a broken install /
  missing binary / stopped service and run the check before deferring; falling back to a stale
  build to clear a debt is a process failure. `node --check` is not a substitute for running
  tests.

## Checks

- Are executable checks that genuinely cannot run recorded as `deferred — requires execution
  environment` with an open verification debt (not passed on `--check`), and did a capable agent
  repair fixable setup rather than defer?
  · evidence: `evidence.md` deferral records + `status.md` verification-debt flag
  · when: static (the classification itself)
