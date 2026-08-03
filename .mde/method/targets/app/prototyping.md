---
type: target
id: TARGET-PROTOTYPING
title: Prototyping Target Profile
applies_when:

---

# Prototyping Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

**DEPRECATED — not active. Do not rely on it.** The "prototype" is no longer a distinct,
explicitly-requested thing: the user may never ask for a "prototype" and instead produce UI
directly. This target's `applies_when` is intentionally **empty**, so `mde evaluate` never
auto-selects it and it composes no behavior or checks. Its former facets now live on the
**web-ui** target — role/user switcher and annotations as **dev-only `.env`-gated** affordances;
**guided workflows** always (when a capability defines workflows); the **model-derived fake-API
pipeline**, **single-tier live page**, and **data-source switch** as the
fallback-until-real-API path — and on **testing**. The file is kept for history; do not add
dependencies on it, and do not treat its absence from a plan as a gap.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| fake-api | tools/fake-api/ | — | prototype-in-scope |
| role-switcher | src/web/src/components/ (dev header) | — | prototype-in-scope |

## Composed behavior

_(no feature impacts this target)_

## Validation checks

_(no feature checks for this target)_
