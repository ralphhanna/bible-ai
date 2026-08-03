---
type: feature
id: open-questions-tracking
title: Open questions tracking
origin: mde
impacts:
  - business-requirements
default: n/a
---

# Open questions tracking

## Purpose

Keep important assumptions and unresolved questions **visible**, not hidden — incomplete
requirements are a defect when open questions are buried or an artifact declares `None` without
having challenged material ambiguities.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **ISO/IEC/IEEE 42010** — https://standards.ieee.org/ieee/42010/6846/
  - ARC-42010-10 (Identify inconsistencies and unresolved concerns)


## Impact on business-requirements

Open and resolved business questions are tracked explicitly in the originating plan's
**`plans/<plan-id>/discussion.md`** (the same curated, two-way reasoning trail every plan already
keeps — see `rules/core/02-artifact-model.rules.md`), and surfaced rather than silently assumed.
Missing or deferred sections are marked explicitly instead of pretended complete.

There is no separate durable, cross-plan discussion log. A business question belongs to the plan
that raised it; if it is still open when that plan closes, a later plan that touches the same
ground re-raises it in its own `discussion.md` — it is not carried forward automatically.

## Per-artifact questions

Entity, business-rule, role, use-case, and capability templates carry `## Open Questions` so a
question can be raised in context. Every artifact question is also mirrored into the plan's
`discussion.md` with a back-reference to its source artifact. Resolution is updated in both
places; disagreement is drift.

## Semantic challenge before `None`

`Open Questions: None` is accepted only after reviewing the artifact for unresolved decisions
about, where applicable:

- the real business goal and driving object;
- actor authority, approvals, confirmations, and handoffs;
- entity boundaries and missing durable concepts;
- relationship cardinality and ownership;
- quantities, partial fulfilment, over-fulfilment, and remaining amounts;
- lifecycle ownership and valid transitions;
- exception and override authority;
- cancellation/reversal effects;
- concurrency or stale information;
- scope exclusions and deferred decisions.

The review does not invent speculative questions. It challenges assumptions material to the
transaction, model, rule, or outcome.

## Template impact

- `discussion` template → open + resolved question entries in the plan's `discussion.md`
  (`plans/<plan-id>/discussion.md`; owned by `rules/core/02-artifact-model.rules.md`, not restated
  as a separate business-requirements artifact).
- entity / business-rule / role / use-case / capability-overview templates → `## Open Questions`
  rows, each mirrored into the plan's `discussion.md`.

## Checks

- Are important assumptions and open questions recorded in the plan's `discussion.md` rather than
  hidden?
  · evidence: `plans/<plan-id>/discussion.md`
  · when: static
- Are missing/deferred sections marked explicitly rather than pretended complete?
  · evidence: spec files' deferred markers
  · when: static
- Does every artifact `## Open Questions` row have a matching discussion entry with the same
  status and a back-reference, and vice versa?
  · evidence: artifact open-question rows vs. discussion entries
  · when: static
- Before accepting `Open Questions: None`, was the artifact challenged for material ambiguity in
  actors, object boundaries, cardinality, quantities, lifecycle, exceptions, reconciliation, and
  scope?
  · evidence: artifact content + review evidence / resolved discussion entries
  · when: AI review
