---
type: feature
id: evidence-attachment
title: Evidence attachment
origin: mde
impacts:
  - documentation
default: n/a
---

# Evidence attachment

## Purpose

Verification evidence is attached to the relevant plan, with the kinds of evidence
distinguished — so a reviewer can find proof, not just claims.

## Impact on documentation

Evidence is attached to the relevant plan. It distinguishes build, unit test,
API/integration test, and E2E/test-browser evidence (the captured artifacts from the Testing
capabilities live under the plan's `evidence/`).

## Checks

- Is evidence attached to the relevant plan, distinguishing build / unit / API-integration /
  E2E evidence?
  · evidence: plan `evidence/` + `evidence.md`
  · when: static
