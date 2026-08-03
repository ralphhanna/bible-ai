---
type: feature
id: capability-docs
title: Capability docs (scope-specific)
origin: mde
impacts:
  - documentation
default: n/a
---

# Capability docs (scope-specific)

## Purpose

A plan that implements or changes a capability/capability also produces **its** docs — scoped to
what it built, not the whole application.

## Impact on documentation

Implementation includes documentation (business/requirements/design/api/user as applicable),
alongside source and tests. Docs are **scope-specific**: document the capability/capability
implemented or changed, not other capabilities. Docs trace to capabilities, page specs, use
cases, APIs, or plans. API docs are updated when endpoints/contracts change. Generated
docs/output do not become authoritative unless explicitly confirmed and reconciled.

**Per use-case walkthrough.** For each in-scope use case the plan implements or changes, the
docs include a **full step-by-step walkthrough** — an ordered narrative of the actor's path
through the use case, with a **screenshot at every step** showing the screen at that point.
Reuse the screenshots already captured from the running UI for the Testing target
(`reports/evidence/screenshots/`, see the `ui-screenshots` capability) rather than re-capturing or
hand-supplying images; where a step's screen was not captured there, capture it from the
running UI during the same run. Each walkthrough lives at `docs/walkthroughs/<use-case-slug>.md`,
traces to its use case, and references the screenshot for each step inline. A use case whose
walkthrough is absent, has no screenshots, or whose screenshots are stale relative to the
current UI is incomplete — flag it, do not keep a stale walkthrough as if current.

## Checks

- Did the plan produce docs for the capability/capability it implemented (scope-specific, traced
  to capabilities/specs/APIs), with API docs updated when contracts changed?
  · evidence: `docs/` for the implemented scope
  · when: static
- For each in-scope use case, does `docs/walkthroughs/<use-case-slug>.md` exist with an ordered
  step-by-step narrative and a screenshot per step (reusing `reports/evidence/screenshots/`), traced to
  the use case, with stale/missing screenshots flagged rather than kept?
  · evidence: `docs/walkthroughs/` + the use case's screenshots
  · when: requires-environment

<!-- Mandated-output coverage (every loaded target produced its ## Outputs) is a
     built-in plan-level gate in the verifier, attributed to the owning target —
     not a per-capability check block (which would mislabel the finding). -->

