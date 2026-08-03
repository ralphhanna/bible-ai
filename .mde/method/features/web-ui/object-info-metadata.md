---
type: feature
id: object-info-metadata
title: Info / Metadata panel (identity, provenance, and audit context)
origin: mde
impacts:
  - web-ui
default: on
---

# Info / Metadata panel (identity, provenance, and audit context)

## Purpose

Every rendered business object carries a **concrete, machine-readable identity** and a
**mandatory Info / Metadata panel affordance** that reveals it along with the record's system metadata.

- **Object identity** — a stable `data-object-id` = **`<api-entity-name>/<system-key>`**
  (e.g. `employee/000205`, `project/00010`) on every panel/row/record that renders an entity.
  It is the canonical, URI-style reference to *this exact object*, so external tools (E2E tests,
  automation, review, deep-links, annotators, agents) address the object concretely rather than
  guessing from DOM structure or display text. It is also the anchor for future per-object
  features (bookmarking, notes, sharing).
- **Info / Metadata panel** — an "ⓘ" info icon/button opens this read-only supporting panel showing the
  object's canonical `data-object-id` **plus** its system metadata: **system id** (surrogate key),
  **created by / created at**, **updated by / updated at** (and a link to change history where the
  entity keeps one). This keeps technical/audit detail **out of the primary UI** but **one click
  away** for support, audit, and debugging.

This is the **display counterpart** to [[audit-history]] and the entity's **aspects**
([[entity-model]]) — persistence *stores* the identity/audit fields; this feature *surfaces* them.
It is where the otherwise-hidden identifiers and timestamps legitimately appear.

## The `data-object-id` value

- **`api-entity-name`** — the entity name used in **API calls** (the `/api/<cap>` resource name),
  **not** the display label and not a UI slug that diverges from the API. Tools that already call
  the API can resolve the same object from the handle.
- **`system-key`** — the entity's **surrogate key as stored**, whatever its form (a padded
  sequence like `000205`, a UUID, …). It is the raw system id, never the display-label.
- Emitted as a **stable attribute**, sibling to `data-testid` (see [[stable-selectors]]):
  `data-testid` addresses a UI *role*; `data-object-id` names the *domain object*. Every entity
  row in a List panel and the record in a Detail panel carries its own `data-object-id`.

## Impact on web-ui

**Every panel whose source is an entity carries object identity and an Info / Metadata affordance.**

- Each rendered object element (a List row, a Detail record) carries
  `data-object-id="<api-entity-name>/<system-key>"`. This holds for **all** panel purposes —
  Maintenance **and** Reference (a referenced Project on an assignment workspace is still
  `project/00010`). A `View`/`Relationship` panel with no single entity identity carries the
  identity of each underlying entity row it renders.
- Each such panel renders an **info control** (icon/button, conventionally top-right of the record
  or row actions) that **carries a stable `info-button` class** — one dedicated, consistent class
  across the whole app so a host application can **hide or restyle the affordance globally** (e.g.
  `.info-button { display: none }`) if it does not want it. The control opens a popover/panel
  showing, read-only:
  - the object's **`data-object-id`** — its canonical reference;
  - **system id** — the surrogate key/UUID. This (with the handle) is the **one sanctioned place**
    to show the raw id; the rest of the UI shows the display-label, never the raw id
    (see [[reference-display]]);
  - **created by** / **updated by** — by the actor's **display-label** (name), not their raw id;
  - **created at** / **updated at** — **timestamps** (the case [[date-display-format]] carves out
    of business-date display): a full date-time (or relative time), formatted, never raw ISO;
  - a link/section for **change history** when the entity keeps one ([[audit-history]]).

The affordance and identity are **generated** as part of building any entity-bound panel, driven
by the entity's **aspects** — an entity with a surrogate key always has a `data-object-id`; audit
fields appear when the entity declares audit aspects. Metadata is **read-only** here (audit rows
are not app-editable, per [[audit-history]]).

## Impact on ui-design

Each page-spec panel that sources an entity declares the **info affordance** (and thereby the
object identity) as an `Info` subpanel in its services/composition — it is a mandatory panel affordance, not an
optional extra, wherever the panel source is an entity with a surrogate key.

## Checks

- Does **every entity-bound panel** (List row and Detail record, Maintenance and Reference) carry a
  stable **`data-object-id="<api-entity-name>/<system-key>"`** naming the concrete object?
  · evidence: page source — each entity row/record binds `data-object-id` from the api entity
    name + surrogate key
  · when: static

- Does **every entity-bound panel** provide a read-only **info (ⓘ) affordance** — a control with
  the stable **`info-button`** class — revealing the object's `data-object-id` **plus** system
  metadata (**system id**, **created/updated by** as names, **created/updated at** as formatted
  timestamps), distinct from the primary fields? This is mandatory on every such panel, independent
  of whether the page's primary fields already mention audit data. The single `info-button` class
  lets a host app hide/restyle every affordance at once.
  · evidence: detail/list page source — the `info-button` control + the metadata/identity it binds
  · when: static

- Is the info panel the **only** place the raw system id surfaces (the rest of the UI uses
  display-labels), with by-fields shown as names and at-fields as formatted timestamps?
  · evidence: page — info panel vs. the primary fields
  · when: static

```check scope=plan
# Object identity — DETERMINISTIC, entity-driven (not guarded by the page already
# mentioning audit fields, which let a metadata-free detail view pass silently).
# Every page that renders an entity-bound panel must bind data-object-id so each
# object is concretely addressable.
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/web/src/pages/.*\.tsx$"
  AND $t.entity EXISTS
THEN  $t.content CONTAINS "data-object-id"
  ELSE "page renders an entity but no element carries data-object-id (<api-entity-name>/<system-key>) — the object is not concretely addressable by tools; add it to each row/record"
```

```check scope=plan
# Info-affordance — entity-driven (fires whenever the panel's source entity has a
# surrogate key / audit aspects, per the spec — NOT only when the page text already
# names createdAt). Closes the blind spot where a detail view omitting metadata
# entirely was never checked.
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/web/src/pages/.*\.tsx$"
  AND $t.entity EXISTS
  AND $spec.entity[$t.entity].hasAuditOrSurrogateAspect IS "true"
THEN  $t.content CONTAINS "info-button"
  ELSE "entity-bound page provides no info affordance (no `info-button` control) to reveal system id / data-object-id / created-updated by-at — add a read-only info panel (mandatory on every entity panel; the shared `info-button` class lets apps hide it)"
```
