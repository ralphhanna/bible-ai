---
type: feature
id: traceability-to-business-specs
title: Traceability to business specs
origin: mde
impacts:
  - application-design
default: n/a
---

# Traceability to business specs

## Purpose

Every design artifact must trace back to business specs (capability, entity, use case, or
rule) — design is the bridge, not a new source of truth.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **ISO/IEC/IEEE 42010** — https://standards.ieee.org/ieee/42010/6846/
  - ARC-42010-09 (Maintain correspondence between views)
- **arc42** — https://arc42.org/overview
  - ARC42-01 (Introduction and goals)


## Impact on application-design

Each architecture / decision / entity / page artifact is traceable to business specs. Design
entities match the business entities they implement. Concerns stay layered (no business logic
hidden in UI or persistence). All design diagrams live under `docs/diagrams/` (never `specs/`),
each a view tracing to its source.

**Use-case realization trace.** The `## Realization` section (`use-case-realization`, in the same
use-case file) traces onto the business sections of that file:

- a **realization step entry** realizes a **business step**, joined by its **step #** (S1, S2, …);
- a **condition realization** realizes a **condition**, joined by its **title**;
- a realization step **invokes** an entity operation (by OKF uri), **applies** a business rule (by
  OKF uri), is **exposed-through** an API operation, and is **rendered-through** a page interaction.

Design may add mechanics but must **not silently change** the actor, business intent, numbered
steps, or a condition's situation / expected result. If design discovers the business behaviour
must change, the business sections are updated first, through the governed change process.

## Audit

Judge whether the design **actually derives from the business specs** — not just that a
"traceable to X" line was written. Read the design artifacts against the BA they claim to
implement, looking for real correspondence, drift, and gaps.

For a sample of design artifacts (entities, pages, decisions): does each reflect a *specific*
business entity/use-case/rule, with matching names, fields, and behaviour — or is the trace a
nominal citation to a spec the design doesn't actually mirror (a design entity missing fields
the business entity declares; a page whose operations don't match the capability's; a decision
citing a requirement it doesn't address)? Conversely, is any in-scope business concept **absent**
from the design (a use case with no page, an entity with no design counterpart)? And is business
logic correctly *placed* — not smuggled into the UI or persistence layer.

Report the design as **grounded** (each artifact genuinely mirrors its business source, no
in-scope concept missing) or **drifted** (name the artifacts whose trace is nominal, the missing
concepts, or the mislayered logic). A "traces to …" annotation is not traceability if the design
doesn't match what it cites.

## Checks

- Is each architecture/decision/entity/page artifact traceable to business specs?
  · evidence: design ↔ business-spec links
  · when: static
- Does each `## Realization` section trace onto the business sections of its own file — realizing
  its numbered steps and conditions (by step # and condition title) — without altering the actor,
  intent, steps, or any condition's situation / expected result?
  · evidence: `## Realization` ↔ the file's business sections (steps + conditions)
  · when: static + AI review
- Do design entities match the business entities they implement, with concerns layered?
  · evidence: design vs. entity files
  · when: static
- Do all design diagrams live under `docs/diagrams/` (never `specs/design/`)?
  · evidence: diagram file locations
  · when: static
