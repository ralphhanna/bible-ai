---
type: feature
id: page-spec
title: Page spec
origin: mde
impacts:
  - ui-design
  - web-ui
default: n/a
---

# Page spec

## Purpose

The **page-spec document** — the per-page contract under `specs/design/UI/pages/<slug>.md`. It
holds the page's `## Composition` (defined by the `page-composition` capability — its panels
declare each source, so there is no separate data-source table) **plus** the page's other
contract sections: data covered (per panel, shown or captured), filters, validation, states, and
navigation. It is the artifact a built page is checked against.

## Impact on ui-design

Each page-spec contains:

- a `## Primary Capability` — the **one** business capability this page primarily serves, declared
  as a **resolvable tagged reference** `{{business-capability:<slug>}}` (a page has a primary
  capability the same way an entity does). This is the machine-readable trace that lets
  coverage/testing attribute the page — and its tests — to a capability without guessing from the
  file name. The slug MUST resolve to a real capability under `specs/business/capabilities/`; a
  page that omits it, or leaves it as free text, breaks capability attribution;
- a primary transaction and success outcome in `## Purpose`, plus panel-owned actions in
  `## Composition`. Panels, page context, and semantic relationships bind each action to its exact
  target (`inline row`, selected record, route record, panel/modal draft, or checked set). A
  selection-dependent action is disabled with no selection and never falls back to the first/default
  record. Ordered business steps remain in the use case; validation references remain in
  `## Validation and Business Rules`;
- a `## Subject` — the **one** entity the page is about and the only entity it may maintain;
  every other entity on the page is supporting (reference/select/navigate only). A pure
  dashboard/report declares `none`. This is the anchor for the `page-composition` "maintenance
  stays on the entity's own page" rule — the subject is what makes "may this panel be
  Maintenance?" a deterministic question. Whether the page is a maintenance page or a
  workflow/task surface is **derived** from this + `§ Composition` (does it have a Maintenance
  panel for its subject?), not declared as a separate section;
- a `## Page Context` — the implied context (route params, navigation source, primary panel,
  shell filters, user selections) that constrains what panels display without redefining sources;
- a `## Composition` declaring the preferred page pattern, UI profile, Canvas/Panels, semantic
  panel relationships, and subpanels — owned by `ui-patterns` and `page-composition`;
- **Data Covered** (per panel — fields shown or captured, including list-panel columns),
  **Filters**, **Validation & business rules**, **Page states**
  (loading / empty / normal / error / access-denied), and **Navigation** (in/out);
- a trace to its **capability / use case**.

Operation coverage (panel operations resolving to entity operations) is governed by the
`operation-coverage` capability, not restated here. This capability ensures the page-spec
**document** is complete and well-formed.

**Generation specificity (no placeholder pages).** A generated page/prototype must reflect *this*
page's source spec — its business purpose, primary actor, data covered (per panel), actions,
filters/search, validation, state indicators (empty/error/success where relevant), navigation, and
sample data appropriate to the page. It must **not** be a near-identical placeholder that differs
from other pages only by title, heading, filename, route, menu label, generic sections, or generic
card labels (RULE-CORE-004 §Specificity). A generated page is **invalid** unless it traces to a
**UI-catalog entry** *and* a **page-spec** (or a user-confirmed prototype/source discovery that will
be reconciled into a page-spec).

**Manifest trace — a page-spec's `sourceRef.refs` list the ENTITIES it serves, not only its
capability.** A page serves the entities it renders, so its manifest entry MUST include, in
`sourceRef.refs`: its `## Subject` entity, every supporting entity its panels render
(`## Data Covered`), **and** its `## Primary Capability` — every one as a real
`specs/business/...` path. A page-spec whose refs name only the capability is a broken trace:
the manifest can no longer answer "which pages implement `<entity>`", and verification cannot
derive the page's `$item.entity` (so its data-coverage and operation checks have nothing to
join). `perEach: web-page` on the target's `## Outputs` names the *scope instance* the plan
produces one page for — it does **not** mean the refs are the capability alone; the refs are
whatever the page serves.

## Impact on web-ui

The live page must match its page spec — composition, data, filters, validation, states, and
navigation. A built page that diverges from its spec is drift.

## Template impact

- `page-spec` template → `## Primary Capability`, `## Subject`, `## Purpose` (primary transaction
  + success outcome), `## Composition` (panel-owned actions + exact target/terminal scope),
  `## Data Covered` (incl. **declared exclusions**), filters, validation, states, navigation, trace.

## Audit

Judge whether each page spec designs a **real, specific screen for its capability**, or is a
generic composition shell that would fit any entity. There is no running app — read the page spec
against the capability and entity it serves.

For each page spec: does `## Composition` name **concrete panels** bound to real entities/operations
(a maintenance panel for *this* entity with *its* actions — edit, transfer, deactivate — scoped to a
selected record), or generic "detail panel / list panel" with no real operations? Do its actions
map to the entity's actual operations (and does every role-permitted operation the capability needs
have a home on some page), or is the operation set a placeholder? Is `## Data Covered` the entity's
real fields (with honest declared exclusions), or a vague "shows the record"? Does the page realise
the capability's use-cases — a use-case with no page that serves it is an uncovered surface.

Report each page as **substantive** (concrete panels, real operation bindings, covers its use-cases)
or **generic** (composition present but panels/operations are placeholder / entity-agnostic). A page
spec with every section filled but no real screen behind it is not a design.

## Checks
## Checks

- Does each page spec declare a **`## Primary Capability`** as a resolvable
  `{{business-capability:<slug>}}` whose slug maps to a real capability under
  `specs/business/capabilities/` — not free text and not omitted? This is the trace that lets a
  page (and its tests) be attributed to a capability without guessing from the file name.
  · evidence: `## Primary Capability` tagged slug vs. `specs/business/capabilities/<slug>/`
  · when: static
- Is each page-spec complete — a `## Primary Capability`, a `## Subject`, a purpose with primary
  transaction and success outcome, a `## Composition` with `uiProfile`, `pagePattern`, panels,
  relationships, and panel-owned actions,
  plus data, filters, validation, states, and navigation, tracing to a
  capability/use case?
  · evidence: `specs/design/UI/pages/<slug>.md`
  · when: static
- Does the page maintain only its declared `## Subject` — every **Maintenance** panel is on the
  subject entity, and every other entity appears only as a **Reference** panel? (A `none`-subject
  page has no Maintenance panel.)
  · evidence: `## Subject` vs. each panel's source + Purpose in `## Composition`
  · when: static
- **Subject ↔ Composition consistency:** does the declared `## Subject` **match** the entity whose
  panel is `purpose: Maintenance` in `## Composition`? Subject is the explicit semantic anchor and
  Composition is the structural source; they are two declarations that must agree. A mismatch —
  Subject names entity X but the Maintenance panel is on entity Y (or Subject is `none` yet a
  Maintenance panel exists, or vice versa) — is a defect (drift between the page's stated purpose
  and its structure), not silently reconciled toward either.
  · evidence: `## Subject` entity vs. the `purpose: Maintenance` panel's source in `## Composition`
  · when: static
- Is each generated page specific to its own spec (not a placeholder differing only by
  title/heading/route/label), and does it trace to a UI-catalog entry **and** a page-spec?
  · evidence: page vs. its `UI/ui-catalog.md` row + `specs/design/UI/pages/<slug>.md`
  · when: static

```check scope=plan
# Validate the UI-DESIGN itself (page spec vs upstream spec), before code is
# generated. Cross-cutting over all page-spec artifacts → scope=plan / $plan.trace.
# Deterministic: a page spec must carry its capability, page pattern, panels, and
# data coverage. $t.pageSpecComplete is decided model-side and is tolerant of the
# form these are written in (the strict template heading OR the real authored
# variant — e.g. `capability:` frontmatter or `## Primary Capability`; `## Panels`
# or `## Composition`); $t.missingSections names any aspect genuinely absent so the
# finding is specific, not a static laundry list.
# Manifest trace: a page-spec's sourceRef.refs MUST include the entity it serves.
# $t.entity is derived (model-side) from refs matching specs/business/entities/<name>.md;
# it is empty when the page's refs name only the capability. Enforces the ref convention
# so a page whose refs dropped the entity is caught mechanically (not just at review).
EVERY $t IN $plan.trace WHERE $t.path MATCHES "specs/design/UI/pages/.*\.md$"
THEN  $t.entity EXISTS
  ELSE "page-spec sourceRef.refs name no entity (only its capability) — add the page's ## Subject entity (and every entity its panels render) to refs, so the manifest can answer 'which pages implement <entity>' and verification can derive the page's entity"
EVERY $t IN $plan.trace WHERE $t.path MATCHES "specs/design/UI/pages/.*\.md$"
THEN  $t.pageSpecComplete IS "true"
  ELSE "page spec is incomplete — missing: ${$t.missingSections}"
# `relationships:` is NOT required here — a single-panel page (e.g. a lookup entity's
# Table-with-edit-in-place, page-defaulting's documented shape) has nothing to relate.
# page-composition's own check scopes this correctly: multi-panel pages must declare
# relationships; single-panel pages are exempt (see page-composition.md Checks).
# Semantic — the model pre-computes the fields that don't match the entity
# ($t.missingDataFields) so the finding STATES them up front; the AI confirms whether
# each is a real gap or just naming variance a slug-compare missed.
EVERY $t IN $plan.trace WHERE $t.path MATCHES "specs/design/UI/pages/.*\.md$"  AND  $t.entity EXISTS
ASK   "Missing fields (page shows, entity lacks): ${$t.missingDataFields}. Confirm each is a real gap the ${$t.entity} entity should provide (a design defect), or naming variance to reconcile. [full lists — page: ${$t.dataFields}; entity: ${$spec.entity[$t.entity].properties}]"
```
