---
type: feature
id: page-composition
title: Page composition (Canvas / Panel / Relationship)
origin: mde
impacts:
  - ui-design
  - web-ui
default: n/a
---

# Page composition (Canvas / Panel / Relationship)

## Purpose

Define a technology-independent UI composition model based on business concepts, not controls or widgets.

The model is:

```text
Page
  -> Canvas
      -> Panel
```

- **Page** — the identifiable routable unit; composed of one or more canvases.
- **Canvas** — a composition surface that coordinates one or more panels.
- **Panel** — the smallest business UI unit; it has one source, one purpose, and a set of services.

The page pattern is declared separately (see [[ui-patterns]]). The canvas supplies the page-wide
working surface; panels supply bounded business views; relationships explain how panels coordinate.

## Canvas types

Valid canvas types:

- `Standard` / `MultiPanel` — ordinary application page / workspace.
- `Dashboard` — KPI, status, summary, and alert panels.
- `Calendar` — objects positioned by date/time.
- `Timeline` — objects positioned on a time axis.
- `Kanban` — objects grouped by workflow state.
- `Map` — geographic/location surface.
- `Diagram` — ERD, BPMN, architecture, flowchart, or similar diagram.
- `Workflow` — process/stage navigation or progress.
- `Custom` — explicitly described custom surface.

## Panel model

Each panel declares:

- **Panel Type**: `Search`, `Filter`, `List`, `Grid`, `Tree`, `Detail`, `Form`, `Editor`,
  `Summary`, `Info`, `Chart`, `Comparison`, `MatchResult`, or `StateTransition`.
- **Source**: `Entity`, `View`, or `Relationship`.
- **Purpose**: `Maintenance` or `Reference`.
- **Placement**: layout guidance such as `Primary`, `Side`, `Bottom`, or `Inline`.
- **Services**: what the user can do in the panel.
- **Actions**: the terminal or committing operations exposed by that panel, with their exact
  business operation, target, result, and optional navigation.

## Panel actions and target binding

Panels and their relationships are the UI interaction model. A separate interaction structure is
not required. Each modifying action belongs to one panel and declares:

- **Label** — the visible action name;
- **Operation** — the resolvable entity/use-case operation it performs;
- **Target** — normally derived from the owning panel and its relationships;
- **Terminal For** — the active panel context it completes or abandons, when applicable;
- **Result** — the business result or state change;
- **Navigation** — the post-success destination, when applicable.

The target is derived by a small closed set of panel contexts:

| Panel context | Action target |
|---|---|
| In-place List edit | The row being edited |
| Detail reached by `Selected` | The visibly selected record in the source panel |
| Routable Profile/Detail | The record identified by the route context |
| Add Form/Editor | The new draft owned by that panel |
| Modal Form/Editor | The draft or record for which the modal was opened |
| Bulk List action | The visibly checked record set |

Where selection is required, no selection means the dependent panel is empty/disabled and its
modifying actions are disabled. It must never fall back to the first/default record. Bulk actions
state their partial-failure behavior.

An action is terminal only for its declared panel context, not automatically for the page.
`Cancel` may terminate `Add` or `Edit`; `Propose` may terminate assignment drafting; `Approve` or
`Reject` may terminate review/decision. Search, filter, select, open, and navigation normally
continue or change context rather than terminate the page.

## List panel behavior

A **List** panel is many records. Because "edit" over many records is undefined unless the panel
says *how*, a List declares which of two behaviors it has — this is what makes an editing List
complete (an editing List that declares neither is the defect behind a Save wired to the first
record):

| List panel | read | edit | delete | add |
|---|---|---|---|---|
| **List** (navigating)       | yes | select → **navigate** to the record's Maintenance page (`Open`) | select → delete | **navigate** to an add surface |
| **List with in-place edit** | yes | select → edit **in the row** | select → delete | add **in the row** |

- A plain **List navigates** to edit and add — it never edits in the panel, so it has no in-panel
  Save over the collection.
- A **List with in-place edit** edits and adds **in the row** — the target is that row.

A List panel that offers `Edit` but neither navigates (`Open` / a `Selected` relationship → Detail)
nor edits in-place is **incomplete** — resolve it to one of the two rows before generating.

## Panel services

Valid services:

- `Edit` — create or modify the panel source data where allowed. This includes changing the
  entity's **lifecycle state**: a lifecycle transition (`kind: lifecycle`) is a governed field
  of the edit, committed by **Save** — not a standalone action (see [[lifecycle-transition-control]]).
- `Operate` — expose business **use-case** operations/actions (Promote Employee, Transfer,
  Send Reminder, …). `Operate` is **not** for lifecycle state changes — those belong to `Edit`
  via the state field + Save.
- `Open` — open the source's own Maintenance page (a Reference panel offers this to reach the full, editable page).
- `Inspect` — show technical/audit/system details when requested.
- `Order` — allow user-defined ordering.
- `Transfer` — move/copy/link items between panels.

Business operations are not themselves services. A panel may have service `Operate` and then
list the specific **use-case** operations it renders, such as `employee.promote` or
`employee.transfer`. `Operate` is for use-case actions; **lifecycle** state changes are not
`Operate` — they are part of `Edit`, committed by Save (see [[lifecycle-transition-control]]).

`Profile` is a **page pattern**, not a panel type. A collection page may show a compact `Detail`
panel for its selected row; `Open` navigates to the object's full Profile page.

`Tree` is a **panel type**, not a canvas: it renders a bounded hierarchical source within a canvas.

## Panel relationships

Panel relationships state why panels appear together and how they coordinate. They replace vague
layout-only links with business semantics.

Valid relationship types:

- `Dependent` / `Child` — target records belong to the source object.
- `Selected` / `Detail` — target displays the record selected in the source.
- `Reference` — target supplies related context without being owned or maintained here.
- `Compare` — sources are presented for human comparison.
- `Match` — the system evaluates compatibility and exposes score, gaps, conflicts, or eligibility.
- `Aggregate` / `Summary` — target summarizes the source collection.
- `Compose` / `Result` — multiple source panels contribute to a working/result object.
- `Control` / `Filter` — source criteria control the target collection.

## Subpanels

A subpanel is owned by a parent panel or panel action. It inherits that object's context and
does not establish an independent page context.

- `Info` is a read-only metadata subpanel for identity, provenance, ownership, version, timestamps,
  lifecycle state, and audit/history navigation (see [[object-info-metadata]]).
- `StateTransition` previews a governed lifecycle change: **Current State**, **New State**,
  **Impact**, and applicable **Rules**. It changes nothing until its owning panel action commits
  (see [[lifecycle-transition-control]]).

## Maintenance rule

Every entity must have at least one Maintenance panel.

The Maintenance panel is the canonical place where the entity is maintained. Reference panels show summary/context and navigate to the Maintenance panel when full maintenance is needed.

## Maintenance stays on the entity's own page

A page maintains only its **subject** — the entity its task or workflow is about
(Assignment Board maintains assignments; Employee Directory maintains employees).
Every **other** entity the page touches is a **supporting** entity: it is there to
be **selected, filtered, or navigated to**, not maintained here.

- A supporting entity must appear as a **Reference** panel with services limited to
  `Select` / `Filter` / `Open` (`Open` reaches its own Maintenance page). It must
  **not** be a **Maintenance** panel and must **not** carry `Edit`/`Operate` or
  `create` / `update` / `delete` / `change-status` operations.
- A **workflow / task** canvas (a `Workflow` canvas, or a `MultiPanel` workspace
  whose purpose is to perform an operation) exposes only the maintenance its task
  requires. It must not become a general CRUD surface for the lookups it consumes.
  If the workflow needs a supporting entity to exist first, the user creates it on
  **that entity's own page** and returns — the page does not grow "New <lookup>" /
  "Edit <lookup>" buttons.

Consequence: if a supporting entity has no page of its own, that is a **missing
page** in the design, not a licence to bolt its CRUD onto the page that references
it. Add the entity's own Maintenance page; keep the reference here read/select-only.

## Impact on ui-design

Each page spec declares:

- page context and route,
- one or more canvases,
- each canvas type,
- panels inside each canvas,
- panel source/type/purpose/placement/services,
- semantic relationships between panels,
- subpanels owned by a panel or panel action,
- panel actions, exact target context, terminal scope, and role-specific behavior.

## Impact on web-ui

A built page realizes the declared composition:

- canvas type lays out/coordinatess panels,
- panels render the right source for the declared purpose,
- services appear as the correct user capabilities,
- relationships wire panels together and preserve their declared business semantics,
- maintenance panels allow the declared editable business properties to be maintained,
- reference panels remain summary/context unless explicitly allowed to edit.

Whether the rendering realizes the composition is judged at `mde go` and `mde review app`.

## Checks

- Does each page spec declare valid Page -> Canvas -> Panel composition?
  · evidence: page spec composition
  · when: static

- Does each canvas have a valid canvas type and real child panels?
  · evidence: page spec canvas section
  · when: static

- Does each panel name a resolvable source, type, purpose, placement guidance, and services?
  · evidence: page spec panel inventory vs. business/design specs
  · when: static

- Does every modifying action belong to a panel, resolve to a declared operation, and have one
  unambiguous target derived from its owning panel (`inline row`, `Selected` relationship,
  `route record`, `panel draft`, `modal record`, or `checked set`)?
  · evidence: page-spec panel actions + panel source/relationships/page context
  · when: static

- Where an action depends on selection, is the selection owner visible and is the action disabled
  when no record is selected, with no implicit first/default record? For bulk actions, is
  partial-failure behavior declared?
  · evidence: page-spec relationships, actions, and page states
  · when: static

- Is every terminal action scoped to the panel context it completes or abandons rather than
  being described as terminal to the whole page?
  · evidence: panel action `terminalFor` declarations
  · when: static

- Is `Profile` used only as a page pattern and `Tree` only as a panel type?
  · evidence: page spec pattern + canvas/panel inventory
  · when: static

- Does each multi-panel page declare semantic panel relationships, including selection owner,
  dependent/child bindings, compare/match inputs, and compose/result inputs where applicable?
  · evidence: page spec relationships
  · when: static

- Does every in-scope entity have a Maintenance panel somewhere?
  · evidence: panels across page specs / UI catalog
  · when: static

```check scope=plan target=ui-design
# Up-drift: every entity.op a page's ## Composition renders MUST resolve to an operation
# some entity actually declares. A page rendering an op no entity declares invented it —
# a UI defect, reconciled to the entity (or the entity gains the operation). $t.opsResolve
# / $t.unresolvedOps are decided model-side against every entity's ## Operations.
# (Replaces the up-drift half of validateOperationCoverage in verify-method-followed.mjs.)
EVERY $t IN $plan.trace WHERE $t.path MATCHES "specs/design/UI/pages/.*\.md$"
THEN  $t.opsResolve IS "true"
  ELSE "page renders operation(s) no entity declares (up-drift): ${$t.unresolvedOps} — reconcile each to a declared entity ## Operations id, or add the operation to the entity"
# Composition well-formedness: each page's ## Composition declares a KNOWN canvas type,
# and each panel uses known kind/purpose/service vocabulary. $t.compositionValid /
# $t.compositionIssues are decided model-side against the declared vocabularies (see the
# canvas-type list above + panel kind/purpose/service sets). (Replaces validateComposition
# in verify-method-followed.mjs.)
EVERY $t IN $plan.trace WHERE $t.path MATCHES "specs/design/UI/pages/.*\.md$"
THEN  $t.compositionValid IS "true"
  ELSE "page ## Composition is malformed: ${$t.compositionIssues} — use a known canvas type and known panel kind/purpose/service vocabulary"
```

```check scope=system
ASK "Read every entity spec under specs/business/entities/**, and every page spec's ## Composition section under specs/design/UI/pages/**, across the whole project. List any entity with NO Maintenance panel on any page (the Maintenance Rule). Do not report an entity as missing if it has no page-spec at all yet — that is a separate, more basic gap (a spec was never written), which this question does not distinguish from 'has a page but no Maintenance panel on it'; call out that difference explicitly for each entity you report."
```

- Do Reference panels navigate to the target entity's Maintenance panel when full maintenance is needed?
  · evidence: panel services and panel relationships
  · when: static

- Is every **Maintenance** panel for the page's **subject** entity (the entity the
  page/task is about), with supporting entities appearing only as **Reference**
  panels (`Select`/`Filter`/`Open`)? No page maintains a supporting/lookup entity it
  merely references — that entity's `create`/`update`/`delete`/`change-status`
  operations live on its own canonical Maintenance page.
  · evidence: page spec panel Purpose + Services vs. the page's subject entity
  · when: static

- Does no **workflow/task** page (a `Workflow` canvas or an operation-focused
  workspace) expose maintenance actions unrelated to its task — e.g. "New/Edit
  <lookup>" for an entity it only selects from?
  · evidence: page spec Actions/Services vs. page purpose; built page controls
  · when: static + AI review at go / review app

- Do rendered pages match the declared composition and services — and does a
  rendered page show no create/edit/delete controls for a supporting entity it only
  references?
  · evidence: built page vs. page spec
  · when: static + AI review at go / review app
