---
type: feature
id: glossary
title: Business glossary
origin: mde
impacts:
  - business-requirements
default: n/a
---

# Business glossary

## Purpose

Business analysis produces a **glossary** — the authoritative, plain-language definitions of the
domain terms the specs use, so everyone (business, design, AI) reads the same vocabulary. It is
the project's **ubiquitous language** in one place: what each term means, in business terms, with
its synonyms and any terms it must not be confused with.

The glossary is also the human-readable companion to the machine references of
[[semantic-references]]: the domain terms that `{{kind:slug}}` tags point at are the terms the
glossary defines.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **arc42** — https://arc42.org/overview
  - ARC42-12 (Architecture glossary)


## Impact on business-requirements

Business analysis writes a glossary at `specs/business/glossary.md` — an alphabetical list of
**domain terms**, each with:

- **term** — the canonical name (the one the specs and semantic tags use);
- **definition** — plain-language business meaning, not a technical/implementation description;
- **synonyms / also-known-as** — other names the business uses for the same thing;
- **not to be confused with** — near-terms that are genuinely different (where ambiguity exists);
- optionally, a **link to the MDE object** it corresponds to when the term *is* a modelled object
  (an entity, role, capability, use case) — so the glossary and the model agree.

Scope and discipline:

- Cover the terms that carry **business meaning** — domain nouns, roles, statuses, key processes —
  not generic English and not implementation jargon.
- A term that is a modelled object (entity/role/capability) is defined **once** as business
  meaning; the glossary entry references the object rather than restating its full spec (no
  duplication — the entity spec remains the source of truth for that entity's detail).
- Definitions are business-first: if a term needs a system/technical note, that is secondary to
  its business meaning.
- New terms discovered later (in design, use cases, prototypes) are added back to the glossary so
  it stays the single vocabulary source.

## Template impact

- `glossary` template → the alphabetical term list (term / definition / synonyms / not-to-confuse /
  optional object link).

## Checks

- Does `specs/business/glossary.md` exist with the domain terms defined in **plain business
  language** (term + definition, synonyms/disambiguation where useful) — covering the meaningful
  domain vocabulary, not generic words or implementation jargon?
  · evidence: `specs/business/glossary.md`
  · when: static
- Are modelled-object terms (entities, roles, capabilities, use cases) present in the glossary and
  consistent with their specs — defined once, referencing the object rather than duplicating its
  full spec?
  · evidence: glossary terms vs. `specs/business/` entities/roles/capabilities
  · when: static
