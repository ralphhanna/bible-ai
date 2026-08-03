---
type: page
template: page-spec
artifact: design-specs
version: 1
mergePolicy: user-owned   # page Specs is human-curated (specs-boundaries.md); user-owned after first write
---

# Page Spec: {{page_name}}

<!-- Semantic references (semantic-references feature): where this spec NAMES a known MDE object
     in prose, tag it {{kind:slug}} — {{web-page:slug}}, {{entity:slug}}, {{business-capability:slug}},
     {{use-case:slug}}, {{role:slug}}. (Distinct from the {{snake_case}} fill-in placeholders below.)
     Tag on first mention; do not tag objects that don't exist. -->

## Page ID

{{page_id}}

## Primary Capability

The **one** business capability this page primarily serves — a page has a primary capability the
same way an entity does. Declare it as a **resolvable tagged reference** so the page traces cleanly
back to its capability (this is what lets coverage/testing attribute the page to a capability
without guessing from the file name):

{{business-capability:<slug>}}

<!-- Required. The slug MUST resolve to a real capability under
     specs/business/capabilities/<slug>/. A page that serves several capabilities still names one
     PRIMARY here; secondary capabilities may be tagged in prose. Do not leave this as free text —
     the tagged slug is the machine-readable trace. -->

## Purpose

Why this page exists, and how/when/by whom it is used (its expected usage).

{{page_purpose}}

## Subject

{{subject_entity}} — the **one** entity this page is about. It is the only entity the page
may **maintain** (a Maintenance panel). Every other entity the page shows or uses is a
**supporting** entity: reference/select/navigate only, its own maintenance living on its own
page. A page with no single subject (a pure dashboard/report) declares `none` and maintains
nothing.

## Primary Actor

{{primary_actor}}

## Roles

The roles whose menu/navigation includes this page — **a navigation list, not access control.**
Enforcement stays on the entity operations (the shared access enforcer); this list only decides
which roles see the page in their menu. **Default** it to the union of the roles permitted on
the operations this page's panels render, then edit to reflect intent (e.g. an employee
self-service page lists `employee` only, even though HR can also read the same entity).

- {{role_id}}

## Supported Use Cases

- {{use_case_id}} — {{use_case_name}}

## UI Catalog Entry

{{ui_catalog_page_id}}

## Page Context

The implied context the page carries — it **constrains what panels display but does not redefine
panel sources** (a `/client/:id` page filters its panels to that client; it does not change a
panel's source from Client to something else). Omit a row when it does not apply.

| Context | Source | Notes |
|---|---|---|
| {{context_item}} | {{route_param_or_nav_or_panel_or_filter_or_selection}} | {{notes}} |

<!-- Context may originate from: route parameters · navigation source · primary panel ·
shell-level filters · user selections. Leave the table empty for a context-free page. -->

## Composition

Declare the preferred page pattern first, then the concrete Canvas / Panel / Relationship
composition that realizes it. Purpose, subject, transaction, and entry context are understood
before pattern selection (see `ui-patterns` and `page-defaulting`).

```yaml
uiProfile: {{carbon_or_declared_alternative}}

pagePattern:
  primary: {{Search-Filter-List|Profile|Parent-Children|Compare-Match|Summary-Drilldown|Custom}}
  composed: [ {{optional_second_pattern}} ]
  customReason: {{required_only_for_Custom}}
  visualReferences: [ {{optional_project_ui_pattern_assets}} ]

canvases:
  - id: {{canvas_id}}
    type: {{canvas_type}}          # Standard/MultiPanel | Dashboard | Calendar | Timeline | Kanban | Map | Diagram | Workflow | Custom
    panels:
      - id: {{panel_id}}
        source: {{entity_or_view_or_relationship}}
        panelType: {{Search|Filter|List|Grid|Tree|Detail|Form|Editor|Summary|Info|Chart|Comparison|MatchResult|StateTransition}}
        purpose: {{maintenance_or_reference}}         # Maintenance | Reference. ONLY the page's Subject entity may be Maintenance; every supporting entity is Reference.
        services: [ {{edit_operate_open_...}} ]   # Maintenance → Edit/Operate. Reference → Select/Filter/Open only (Open → the entity's own Maintenance page); never Edit/Operate or create/update/delete on a Reference panel.
        operations: [ `{{entity}}.list`, `{{entity}}.update`, … ]   # the entity-op ids this panel renders (coverage join)
        subpanels:
          - id: {{subpanel_id}}
            type: {{Info|StateTransition}}
            # Info -> owner is the parent panel (read-only, no commit of its own).
            # StateTransition -> owner is the interaction id that commits it
            # (state changes as part of that scoped edit, per ## Interaction Model below).
            owner: {{parent_panel_id_for_Info | interaction_id_for_StateTransition}}

    relationships:
      - from: {{panel}}
        to: {{panel}}
        type: {{Dependent|Selected|Reference|Compare|Match|Aggregate|Compose|Control}}
        trigger: {{optional_trigger}}
```

A panel's **operations** are how the page *claims coverage*: each id must resolve to an
operation declared on the source entity's `## Operations` (inventing one the model doesn't
define is up-drift — reconcile to the entity first). The roles/scope that gate each operation
come from the entity, not the page. `mde evaluate` derives the required operation set from the
entities; a required operation no panel claims is a coverage gap; each claimed operation must be
**performed** by a UI test (Testing target).

<!-- Mechanical (validator): each panel's source resolves (entity/view/relationship); purpose and
services come from the model's sets; every in-scope entity has a Maintenance panel somewhere;
panel operations resolve to declared entity operations. Whether the built page truly realizes the
composition — a Maintenance panel editing all fields, etc. — is AI judgment at mde go / mde review app. -->

<!-- Every entity-bound panel (any purpose) also carries, per the object-info-metadata feature:
     (1) a data-object-id="<api-entity-name>/<system-key>" on each rendered row/record — the
         concrete, tool-addressable identity of the object; and
     (2) a mandatory info affordance — a control with the shared `info-button` class — that
         reveals that data-object-id plus system metadata (system id, created/updated by-as-name,
         created/updated at-as-timestamp), read-only. Do not list these as Data Covered fields;
         they are a standing panel affordance, not business fields. -->

The composition is derived from the entity and use cases, fitted to the closest preferred pattern,
then reviewed and overridden by the user. A pattern supplies a proven shape; it never supplies
missing business behavior.

## Interaction Model

**Primary transaction:** {{the_main_thing_the_user_accomplishes}}
**Success outcome:** {{what_done_looks_like}}

An interaction is scoped: it has a trigger, working object/selection, ordered steps, validation,
and outcomes. An outcome completes or abandons that interaction, not necessarily the page.
`Submit` is interpreted by its declared operation and outcome; the label alone is insufficient.

```yaml
interactions:
  - id: {{interaction_id}}
    parent: {{page_or_parent_interaction}}
    trigger: {{add-new|edit|select|open|approve|other}}
    mode: {{create|edit|view|operate}}
    workingObject: {{new_draft|selected_record|route_record|checked_set|other}}
    targetScope: {{inline|selected-detail|modal|route-record|bulk|read-only}}
    selectionOwner: {{panel_id_or_none}}
    noSelection: {{disabled|empty|not-applicable}}
    steps:
      - user: {{user_action}}
        page: {{page_response}}
    validation:
      - {{business_rule_or_validation}}
    outcomes:
      commit:
        action: {{visible_action_label}}
        operation: `{{entity}}.{{operation}}`
        target: {{exact_bound_record}}
        effects:
          - {{persisted_or_state_effect}}
        success: {{post_success_state_or_navigation}}
      abandon:
        action: Cancel
        effects:
          - {{discard_or_restore_working_state}}
```

Every committing outcome names its exact target. No generated handler may substitute the first or
default record (`collection[0]`). Every editable input traces to `## Data Covered (Captured)`.

**How `targetScope` and `selectionOwner` bind — this is what prevents a Save wired to
`collection[0]`.** Pick the row that matches the interaction; `selectionOwner`/`noSelection` are
**required** whenever `workingObject` is `selected_record` or `checked_set`:

| `targetScope` | `workingObject` | `selectionOwner` | `noSelection` | Target is… |
|---|---|---|---|---|
| `inline` | `selected_record` | the editing panel itself | `not-applicable` | the row being edited in place — no separate selection step |
| `selected-detail` | `selected_record` | the List/selection panel's id | `disabled` (Save/commit is disabled, not hidden) | the record selected in `selectionOwner`, shown in this Detail panel |
| `modal` | `new_draft` or `selected_record` | the panel that opened the modal | `not-applicable` (new) / `disabled` (edit) | the modal's own draft, or the record it was opened for |
| `route-record` | `route_record` | `none` | `not-applicable` | the record named by the route param — no selection UI needed |
| `bulk` | `checked_set` | the List panel's id | `empty` (commit is disabled with 0 checked) | every row in the checked set — the operation runs once per record (see partial-failure note below) |
| `read-only` | any | — | — | no commit; this interaction has no `outcomes.commit` |

A `selected-detail` interaction with no visible, currently-selected row **must** disable its commit
action — never fall back to the first/default record. This is the one rule every generator must get
right; when in doubt, prefer `route-record` (the URL names the record) over `selected-detail` (state
must track it).

**Bulk partial failure.** A `bulk` commit runs its operation once per record in the checked set; not
all may succeed. State the partial-failure behavior in `outcomes.commit.effects` (e.g. "each record
succeeds/fails independently; failures listed with reason, successes not rolled back") — a bulk
interaction with no stated partial-failure behavior is incomplete.

## Data Covered

The fields each panel covers — **every panel**, not only the editable one. List panels cover the
columns they show; Detail/Reference panels cover the fields they show or capture. Fields are
business **properties** (kind `attribute` or a relationship's display-label); exclude aspects
(surrogate key, audit trail, optimistic locking/version), computed/derived values, and technical
storage columns. Lifecycle state is presented through a governed `StateTransition` subpanel
(Current State, New State, Impact, Rules) owned by the scoped edit interaction; it is committed
with that interaction, not exposed as an unrelated `Operate` button.

One row per field, grouped by panel. **Captured** = the user can edit it (Maintenance only);
**Shown** = displayed read-only (a List column or Reference field). A field pulled in through a
`relationships` link (e.g. a `Reference` relationship shows a related entity's display-label inline)
is owned by the panel that **renders** it, not the panel it was fetched from — group it under the
displaying panel and mark it `Shown`.

| Panel | Field | Shown/Captured | Required | Validation |
|---|---|---|---:|---|
| {{panel}} | {{field}} | {{shown_or_captured}} | {{yes_no}} | {{validation}} |

**Excluded from this page (declared)** — user-maintainable properties of a maintained entity that
this page **intentionally does not** capture (a deliberate partial form — e.g. a quick-add that
takes 3 of 12 fields). Declaring them here, with a reason, makes the partial form *conforming*
rather than a data-coverage gap. Exclusions are **declared, never inferred**; omit the table when
the page covers every maintainable property.

| Property | Reason excluded |
|---|---|
| {{entity.property}} | {{why this page doesn't capture it — e.g. set later on the full profile page}} |

## Actions

**This table is the flat rollup of every `outcomes.commit` declared in `## Interaction Model` —
it is not a second, independent list of buttons.** One row per interaction that commits; the
`Interaction` column names which interaction it rolls up, so the two sections cannot drift apart.
A page has no actions beyond what its interactions commit — if a button exists that isn't backed by
a scoped interaction, the interaction is missing, not the action.

Each action names the **entity operation** it performs (an id resolving to the entity's
`## Operations`). The roles/scope that permit it live on that operation (the entity is the ACL
authority) — the page does not re-declare them. An action whose operation no role may perform, or
that names an operation no entity declares, is a defect — `mde evaluate` checks the trace.

| Action | Interaction | Operation (entity-op id) | Result | Navigation/State Change |
|---|---|---|---|---|
| {{action}} | {{interaction_id}} | `{{entity}}.{{op}}` | {{result}} | {{navigation_or_state}} |

## API / Data Contract

The endpoints this page consumes and how the **fake JSON API** supplies them during
prototyping. There is no separate `.data.md` sidecar — this is the page's one data contract.

| Method | Path | Purpose | Response shape |
|---|---|---|---|
| {{method}} | /api/{{capability_slug}}/{{path}} | {{purpose}} | {{shape}} |

- The page resolves to the real `/api/{{capability_slug}}` once
  `src/server/{{capability_slug}}/Routes.ts` exists, else the fake JSON API
  (Prototyping target: capability-aware switch — no page rewrite at the flip).
- Fake-API data is **generated** from `db/seeds/` via the seed→JSON transform
  (`tools/fake-api/`) — **do not hand-author JSON.** Governed values (statuses, roles,
  enums) come from the model (`## Storage View` enums, `specs/business/roles/`); only
  free-text may be fabricated.
- Listing endpoints return the full seeded dataset (at least the configured
  `meaningful-seed-data` floor, **default ≥ 30 records**) so filter/sort/paging are meaningful.

## Filters / Search

- {{filter}}

## Validation and Business Rules

- {{business_rule_id}} — {{rule_summary}}

## Page States

- Loading
- Empty
- Normal
- Validation error
- Success
- Access denied, where applicable

## Navigation In

| Source Page/Flow | Trigger |
|---|---|
| {{source}} | {{trigger}} |

## Navigation Out

| Target Page | Trigger |
|---|---|
| {{target}} | {{trigger}} |

## Live Page / Prototype Trace

- Live page (one file, prototype = production): `src/web/src/pages/{{page_id}}.tsx`
- Prototyping is **explicit** — this spec does not by itself produce a page; a prototype is
  built only when requested (Prototyping target). When built, the page realizes the
  `## Composition` above (its canvases and panels), is styled by the design system,
  and renders **model-derived data** via the fake JSON API until this capability's real
  `/api/<cap>` exists.
- {{prototype_status_or_notes}}

## Notes

{{notes}}
