---
type: feature
id: semantic-references
title: Semantic references in generated text
origin: mde
impacts:
  - business-requirements
  - application-design
  - architecture
  - api-design
  - persistence-design
  - ui-design
  - documentation
default: on
---

# Semantic references in generated text

## Purpose

**All AI-generated specs and text output — specs (business and design), plans, reviews, knowledge
pages, reports, and walkthroughs — must tag references to known MDE objects with canonical
semantic tags**, so references are machine-resolvable, traceable, and linkable, not just prose that
happens to mention a name.

**Tagging is a naming-integrity constraint, not only a traceability aid.** A tag
`{{entity:performance-goal}}` *asserts the object exists* with that exact slug and **must resolve**
— so tagging **pins generated prose to the real, catalogued model** and stops the AI confabulating.
Untagged prose lets the AI invent names ("the objectives"), rename the same object across a
document ("goals" here, "review targets" there), or reference something that was never modeled —
all invisibly. A tagged reference cannot: it either resolves to a real object or it is a flagged
defect. This is why tagging must be **exhaustive in narrative prose**, not decorative: every
mention of a modeled object is a place the AI could otherwise drift, so every mention is tagged.

### Canonical tag form

A semantic reference is written `{{<kind>:<slug>}}` — `<kind>` a canonical MDE object kind,
`<slug>` the object's slug (the same slug used in its file path / id). Examples:
`{{entity:employee}}`, `{{use-case:approve-project-assignment}}`, `{{role:hr-administrator}}`,
`{{business-capability:performance-management}}`.

### Canonical object kinds

The `<kind>` vocabulary is **not defined here** — it is the closed set already owned by the manifest
trace schema's `sourceRef.kind` (`templates/trace/manifest-entry.schema.json`), the single source of
truth, so the tag vocabulary and the trace vocabulary never diverge. A tag whose `<kind>` is outside
that set is invalid; a new kind is added once, to the schema.

### Rules

- **Tag every mention.** Tag every named **concept** (any catalogued MDE object) with
  `{{kind:slug}}` **each time it appears** in generated prose — flow steps, condition
  situations/results, outcomes, narrative — not just the first mention. An **untagged mention of a
  known concept is a defect**, because it is exactly where the AI can drift the name or introduce
  something unmodeled. (Casual pronouns — "it", "the record" — need no tag; a *named* concept does.)
- **Well-formedness.** Every tag present must parse as `{{<canonical-kind>:<slug>}}` and its slug
  must **resolve to a real object**. Malformed or dangling tags are defects.
- **Do not fabricate.** Never tag a reference to an object that does not exist — `{{entity:widget}}`
  with no `widget` entity is worse than untagged prose. Equally, do **not** name in prose an object
  that has no catalogued counterpart: if the flow needs "performance goals", either it is the
  `{{entity:performance-goal}}` that exists (tag it) or it is a **missing object** to raise as an
  open question — never an untagged invented name.
- **Consistent slug.** The same object is always the same tag — `{{entity:performance-goal}}`
  everywhere, never `{{entity:goals}}` or bare "objectives" elsewhere. Tagging is what enforces one
  name per object across the whole document.
- **Prose stays readable.** The tag augments the reference; it does not replace readable naming.

This feature is also the **delivery mechanism**: the `## Impact` sections below carry the tagging
instruction into each text-producing target, so the convention is applied at generation — a plain
principle with no target impact is inert (the generator follows targets/templates).

## Impact on business-requirements

When generating business specs, **tag every concept** it names with `{{kind:slug}}` **at every
mention**. This is strongest inside a use case's **`## Flow` steps and `## Conditions`**, where the
concepts acted on, the actor, and the rule proven appear in narrative prose — a step "the manager
reviews goals, feedback, and assignment context" must be "the {{role:people-manager}} reviews
{{entity:performance-goal}}, {{entity:feedback}}, and {{entity:project-assignment}} context". A
named concept left as bare prose is drift — it is where the AI drifts the name or invents an
unmodeled one. Do not fabricate a tag for a concept that does not exist; a needed-but-uncatalogued
name is a missing concept to raise, not an untagged word.

## Impact on application-design

Design-overview and decision text tags **every concept** it names as `{{kind:slug}}`, so design
traces to the same vocabulary the business specs use.

## Impact on architecture

Architecture narrative tags **every concept** it references as `{{kind:slug}}` rather than naming
it in bare prose.

## Impact on api-design

API-design text tags **every concept** its endpoints serve as `{{kind:slug}}`.

## Impact on persistence-design

Persistence-design text tags **every concept** whose storage it describes as `{{kind:slug}}`.

## Impact on ui-design

Page specs and the UI catalog tag **every concept** they reference as `{{kind:slug}}`.

## Impact on documentation

Docs, reports, knowledge pages, and walkthroughs tag **every concept** they name as `{{kind:slug}}`
— a walkthrough of a use case tags the use case and every concept it walks through — so generated
documentation links to the model rather than restating names.

## Checks

- Does generated text tag **every mention** of a known **concept** with a canonical `{{kind:slug}}`
  tag — not just the first mention — so no named concept survives as bare prose? Read the narrative
  (especially use-case `## Flow` steps and `## Conditions`): does any sentence name a concept that
  exists in the catalogue but leaves it untagged (the confabulation escape hatch)?
  · evidence: every named-concept mention in the prose vs. the catalogue; untagged known concepts
  · when: static + AI review
- Is every `{{...}}` tag well-formed — a canonical `<kind>` (per the trace schema) and a `<slug>`
  that resolves to a real object — with no dangling or fabricated references, and the **same object
  always the same slug** (no `performance-goal` in one place and `goals`/`objectives` in another)?
  · evidence: the tags vs. `specs/business/` + `specs/design/` objects; slug consistency per object
  · when: static + AI review

```check scope=item
# Well-formedness (deterministic): every {{...}} tag in a generated artifact must
# parse as {{<kind>:<slug>}}. Flags a malformed tag (missing kind or slug, spaces,
# empty). Completeness (did it tag what it should) and slug-resolves are the semantic
# checks above — a regex can't resolve slugs or judge untagged prose without false
# positives. This only fires on a present-but-malformed tag.
WHEN  $item.type IS "source"
  AND $item.content MATCHES "\{\{"
THEN  $item.content NOT MATCHES "\{\{\s*([^:}]+\}\}|:[^}]*\}\}|[^:}]*:\s*\}\}|\s*\}\})"
  ELSE "a {{...}} semantic tag is malformed — use {{<kind>:<slug>}} with a canonical kind and a resolvable slug (semantic-references)"
```

```check scope=system
# untaggedConcepts (app.untaggedConcepts in model.mjs): HIGH-PRECISION mechanical half of the
# naming-integrity gate. It flags a DISTINCTIVE concept name (a multi-word slug like
# `performance-goal` → "performance goal") appearing in a use case's narrative prose (## Flow /
# ## Conditions) OUTSIDE a {{…}} tag — an untagged known concept, the confabulation escape hatch.
# Single common-word slugs are deliberately NOT flagged here (too ambiguous for a regex — left to
# the AI-review check above); so a hit is a real untagged reference. Vacuous until use cases +
# multi-word concepts exist (inScope guards it).
WHEN  $app.untaggedConcepts.inScope IS "true"
THEN  $app.untaggedConcepts.clean IS "true"
  ELSE "a known concept is named in use-case prose but left untagged — ${$app.untaggedConcepts.hitCount}: ${$app.untaggedConcepts.hits}. Tag every mention {{kind:slug}} so the reference resolves and the AI can't drift or invent the name."
```
