---
type: feature
id: erd-diagram
title: ERD diagram (logical)
origin: mde
impacts:
  - business-requirements
  - documentation
default: n/a
---

# ERD diagram (logical)

## Purpose

A logical entity-relationship view — entities and relationships, **not** attributes (those
live in each entity's Storage View). A view, never a new source of truth. The **same** logical
ERD is first produced during business analysis (from the entity files) and later kept current
during design — one file, two phases, never two competing ERDs.

## Impact on business-requirements

When business analysis defines or refines the entity model, produce the logical ERD as
**Graphviz DOT** in `docs/diagrams/erd.dot` and render it to `docs/diagrams/erd.svg`; the
`docs/diagrams/erd.md` page embeds the SVG. Nodes are bare entities (no columns); every
relationship carries explicit cardinality + a short verb label.

**Use these exact layout settings so crossings are actually minimized** (do not substitute —
`splines=true` curves edges freely and tangles them):

```text
graph [rankdir=LR, splines=ortho, concentrate=true, nodesep=0.6, ranksep=1.0, overlap=false];
```

- **`splines=ortho`** — right-angle edge routing that avoids nodes (the crossing-reducer). Never
  `splines=true`.
- **`concentrate=true`** — merges duplicate/parallel edges between the same two nodes into one
  (e.g. an entity that both *authors* and *receives* another — draw **one** edge, label it once,
  not two parallel edges that overlap).
- **Cluster by capability** (`subgraph cluster_<cap>`).
- **A hub entity forces a split.** When one entity (typically the central actor, e.g.
  `Employee`) connects to entities in **two or more other capabilities**, a single combined ERD
  cannot avoid long crossing edges — clustering alone will not fix it. In that case **do not
  emit one combined diagram**: produce **one ERD per capability** (`erd-<capability>.dot/.svg`),
  each showing that capability's entities and their relationships, with the hub repeated in each
  as a boundary node. A combined overview ERD is acceptable only when no entity bridges 3+
  clusters. Splitting is the rule, not a fallback — a tangled all-in-one ERD is a defect.
- **`concentrate=true` merges parallel edges but can orphan the second label** — when two
  relationships connect the same pair (e.g. *authors* / *receives*), prefer a **single edge with
  a combined label** ("authors / receives") over two edges, so no label floats without a line.

Graphviz lays out the graph from these settings; do **not** hand-place or rely on a text
renderer's auto-layout. `erd.dot` is the authored source of truth; `erd.svg` is generated from
it with:

```text
node .mde/method/scripts/render-diagram.mjs docs/diagrams/erd.dot docs/diagrams/erd.svg
```

Every entity and relationship traces to a `specs/business/entities/<slug>.md`. This is the same
diagram design later refines — BA produces it; design does not start a new one. Lives under
`docs/diagrams/`, never `specs/`.

**ERD reading — the diagram in plain English, as SEPARATE statements.** Below the embedded SVG,
`docs/diagrams/erd.md` carries a **`## Reading` section**: a **bulleted list of standalone
natural-language sentences**, one per relationship — NOT text mingled inside the diagram (the DOT
edges keep only their short verb label; the full sentences live in this separate list). A business
reader who does not read crow's-foot notation verifies the model by reading the sentences. Each
sentence is the relationship's **verb label + cardinality quantifier**, in both directions where
useful:

- "Every **Employee** fills exactly one **Position**."
- "A **Position** is filled by zero or more **Employees**."
- "An **Employee** holds zero or more **Skills**; each **Skill** is held by zero or more **Employees**."

The quantifier words come from the relationship's cardinality (`exactly one`, `zero or more`,
`at least one`, `one or more`), the verb from its label — **the same relationship data the
diagram is drawn from**, so the reading and the diagram cannot drift. It is a *derived view*,
generated from the entities' relationships, never hand-authored independently. The reading is a
readable companion, not a new source of truth: if a sentence reads wrong ("a Position fills many
Employees"), the model — not the sentence — is wrong.

**Every relationship must carry a real ROLE NAME (a meaningful verb phrase), in the diagram and
the reading.** The role name is the labeled end of the relationship — the word that makes the
sentence say something: *fills*, *reports to*, *is assigned to*, *belongs to*, *manages*,
*holds*. A generic, contentless label — **`has`, `relates to`, `associated with`, `links to`,
or a bare foreign-key name** — is a defect: "Employee **has** Position" states nothing a reader
can check. Both directions should read naturally where the inverse is meaningful (forward: "fills";
inverse: "is filled by"). A relationship without a real role name is an under-specified model, not
just a cosmetic label gap — the ERD's edges and the reading's sentences both require it.

## Impact on documentation

When the data model is in scope, the logical ERD (`docs/diagrams/erd.dot` + rendered
`docs/diagrams/erd.svg`, embedded in `docs/diagrams/erd.md`) is present and current: bare entity
nodes (no columns), every relationship with explicit cardinality + a short verb label, laid out
by Graphviz to minimize crossings (group by capability, hubs central; split per-capability if
large). If BA already produced it, design **refines the DOT and re-renders the SVG** rather than
recreating it; if it is absent, design produces it. Every entity and relationship traces to a
`specs/business/entities/<slug>.md`. Lives under `docs/diagrams/`, never `specs/`.

The `erd.md` page has a **`## Reading` section** below the embedded SVG — the plain-English
narration of the diagram (one sentence per relationship, verb + cardinality quantifier), kept in
sync when the DOT changes (both derive from the same entity relationships). It is part of
`erd.md`, not a separate file.

## Template impact

- `erd` DOT template (`erd.template.dot`) → the Graphviz `digraph` skeleton (clustered by
  capability, crossing-minimized layout).
- `erd` page template (`erd.template.md`) → embeds the rendered `erd.svg`.
- `render-diagram.mjs` → renders DOT → SVG. Tries native Graphviz `dot` first; if it is not on
  PATH, falls back to the bundled WASM Graphviz (`@hpcc-js/wasm`) shipped with the method — no
  system Graphviz install needed. Only if both are unavailable does it exit non-zero. **Rendering
  is therefore always available in a normal agent environment; do not defer it as
  "Graphviz not available" without first running the script and capturing its actual failure.**

## Checks

- When the entity model is defined/refined (BA) or a data model is in scope (design), is the
  logical ERD authored as Graphviz DOT in `docs/diagrams/erd.dot` (entities + relationships, no
  attributes), each node tracing to an entity file, grouped/clustered to minimize crossings?
  · evidence: `docs/diagrams/erd.dot`
  · when: static
- Is `docs/diagrams/erd.svg` rendered from `erd.dot` (via `render-diagram.mjs`, native or WASM
  Graphviz) and current with it, and embedded by `docs/diagrams/erd.md`?
  · evidence: `docs/diagrams/erd.svg` rendered from the current `erd.dot`
  · when: static — run `render-diagram.mjs` directly; only defer if it exits non-zero with both
    backends unavailable, and capture that exact error as the deferral reason
- Does `docs/diagrams/erd.md` include a **`## Reading` section** — the diagram in plain English,
  one sentence per relationship (verb + cardinality quantifier, e.g. "Every Employee fills exactly
  one Position") — covering the same relationships the DOT draws (a relationship in the diagram
  with no sentence, or a sentence for a relationship not in the diagram, is drift)?
  · evidence: `docs/diagrams/erd.md ## Reading` vs the relationships in `erd.dot`
  · when: static
- Does **every relationship carry a real role name** — a meaningful verb phrase (`fills`,
  `reports to`, `is assigned to`) on the edge label in `erd.dot` and in the reading sentence — and
  **not** a generic `has` / `relates to` / `associated with` / `links to` / bare FK name? A
  contentless label means the model under-specifies the relationship.
  · evidence: edge labels in `erd.dot`; the verbs in `erd.md ## Reading`
  · when: static
