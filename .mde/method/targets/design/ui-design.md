---
type: target
id: TARGET-UI-DESIGN
title: UI Design Target Profile
applies_when:
  - a plan designs pages, page composition, or the UI catalog
  - a plan designs navigation or how required operations are covered by the UI
---

# UI Design Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

**You are the designer.** This target names what a good UI must achieve — a **functional,
usable, consistent** application — and fences off the ways it breaks. Guidance ("follow good
practice, avoiding …") is yours to reason from and adapt to the case; only **"must / is a
defect"** statements are hard guardrails. Design the pages yourself, within these fences — do not
wait to be handed a layout or pattern. (MDE strategy: the AI drives design; the method fences it.)

UI Design specifies the application's pages — their composition (Page/Canvas/Panel), the page/pattern catalog, navigation, and operation coverage — as Design Specs the team builds the UI from. It is the design counterpart of the Web UI (implementation) target.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| page-spec | specs/design/UI/pages/{page}.md | web-page | always |
| ui-catalog | specs/design/UI/ui-catalog.md | — | always |

## Composed behavior

### Live-page navigation  `[feature: live-page-navigation]`

Navigation is consistent with the UI catalog + navigation diagram — they describe the same
page graph.

### UI coverage (design §6)  `[feature: operation-coverage]`

A panel claims operations via its `## Composition` `operations:` (`<entity>.<op>`); a page serves
a use case via its `## Supported Use Cases`. For a **complete-design** plan, coverage of the
**for-sure** dimensions is the plan's contract: `mde evaluate` derives "every required operation
rendered and every in-scope use case served" into `acceptance.md`, and an uncovered for-sure
element = that plan failed. A BA/partial plan's un-covered elements are **pending**, not defects.
Inversely, a panel op-id resolving to no permitted entity operation is **up-drift** — always a
failure (within-plan); reconcile to the entity. App-wide gaps are found by `mde review app`.

### Page composition (Canvas / Panel / Relationship)  `[feature: page-composition]`

Each page spec declares:

- page context and route,
- one or more canvases,
- each canvas type,
- panels inside each canvas,
- panel source/type/purpose/placement/services,
- semantic relationships between panels,
- subpanels owned by a panel or panel action,
- panel actions, exact target context, terminal scope, and role-specific behavior.

### Page defaulting (derive the UI from the business design)  `[feature: page-defaulting]`

**Analyze before you shape — pattern and layout come last, not first.** Before the generator
selects any interaction pattern, canvas type, or layout for a page, it must **first understand and
document** the page's:

- **purpose & expected usage** — why the page exists, how/when/by whom it is used (the `## Purpose`);
- **subject** — the one entity the page is about (the `## Subject`);
- **primary transaction & success outcome** — the main thing the user accomplishes and what "done"
  looks like (the `## Purpose`);
- **entry contexts** — how the user arrives (route params, navigation source, prior selection —
  the `## Page Context`).

These are **written down first** (across `## Purpose`, `## Subject`, and `## Page Context`). The
generator then selects the closest preferred page pattern from
[[ui-patterns]], and derives the canvas, panels, services, relationships, and layout from the
documented business need. Selecting a pattern or layout **before** that understanding is documented is the
defect this guards against: the shape *falls out of* a documented understanding of the page, it is
not chosen up front and back-filled. Everything below (coverage, shape, list-first, role scope)
operates on that understanding.

**Derive the baseline as exactly this set of pages, in `page-composition` terms:**

- **One page per primary entity** — a Search/Filter/List page that opens the entity's separate
  Profile page, or (for a simple lookup entity) a single Table panel with edit-in-place.
- **Each secondary entity** maintained **inside its parent's page** (an in-place child Panel), or
  its own Maintenance page when it has no natural parent.
- **One page per use case that needs its own** — a cross-entity/matching page, a View/aggregate
  page, or a Workflow page (single-entity use cases fold into the entity's page as a Service).

That set — entity maintenance pages + the use-case pages — **is** the baseline. Each page's canvas
type and panel services follow from its sources and the use-case operations that touch them.
(**Primary** = an entity that is the subject of many use cases, gets its own page; **secondary** =
an entity appearing only as a step, maintained in its parent or on its own page.)

**Deriving each page's shape** from the entity's children and use cases — good practice is to let
the shape *fall out* of the sources rather than pick a pattern first. It typically lands as one of:
- **List → Profile** — a primary entity with children: a List Page (navigate/open) + a Profile
  Page (Detail Maintenance Panel + one child Panel per related collection; some edited in place,
  some Reference panels that navigate to the child's own Maintenance Page).
- **Table Panel with edit-in-place** — a simple lookup entity with no children: one Page, one
  List Panel with the `Edit` service (rows edited in the table, no separate profile).
- **Master-Detail** — list + selected-record Detail Panel linked by a `Selected` relationship, when
  browse-with-detail fits better than a separate profile.

**List-first default — a page over a collection leads with a List/selection panel, never a bare
Detail.** Any page whose primary source is an entity a user *browses, picks from, or operates on
in bulk* (a list, board, matching, or workspace page) **defaults its first panel to a List of
that source** — so the user sees and selects context before any Detail. A Detail panel is
the **target of a selection**, not the entry point, unless the page is genuinely single-record by
context (a route like `/employee/:id`, or a self-scoped "my profile"). Concretely: a staffing
board defaults a List of assignable employees to pick from; a project page defaults a List of
projects; a review workspace defaults a List of the employee's existing reviews. A collection
page that opens straight into one record's Detail with no list to choose from has skipped this
default — add the leading List panel. (This is the most common defaulting miss; treat a
Detail-only collection page as a defaulting defect, not a style choice.)

**Place each use case.**
- single-entity use case → folds into that entity's Maintenance Page as a Panel **Service**.
- cross-entity / relationship use case → its own Page: a Canvas coordinating the involved
  entities' panels with **Transfer** + **Links** (the matching/staffing shape).
- view / aggregate use case → a Page whose Panel **Source is a View**, on the canvas type that
  fits the projection.
- process / stage use case → a **Workflow** canvas.

**Current + missing, for process pages.** For a page whose job is to drive a per-period process
to completion (a review per employee per cycle, approvals, onboarding), good practice is to
surface not only what exists but **what is missing and the action that creates it** — subjects
with a record and subjects without one, with the create/initiate action on the missing set.
Avoid a workflow page that only lists existing records with no way to see or act on what's
absent. (Ordinary maintenance pages are exempt.)

**Canvas type follows the use case's shape** — good practice maps maintenance → MultiPanel;
matching → MultiPanel + Transfer; scheduling → Calendar/Timeline; approvals → Workflow; KPI →
Dashboard; geographic → Map. Default to MultiPanel; reach for a specialized canvas only when the
data shape calls for it.

**Default panel services from the use-case operations** that touch each source (an `Operate`
use case adds `Operate`, a matching use case adds `Transfer`, a maintenance use case adds
`Edit`).

**Default role scope before layout — who reaches the page, and who edits vs. only reads.** Role
is a first-class defaulting input, not an afterthought. For every derived page, default three
things from the entity operations' permitted roles and the use case's primary actor:
- **Menu/navigation visibility** — which roles see the page in their menu. A self-scoped page
  (e.g. an employee's own profile) defaults to its owning role only; it is **not** a general menu
  item for everyone even when other roles *can* read the entity. (Other roles reach that record
  through their own list/search, not a menu link to "the profile page.")
- **Edit vs. read-only by role** — a page (or panel) defaults to **read-only** for roles that
  hold only read operations on its source, and to editable only for roles with the write/operate
  operations. An admin/maintenance page is editable for its admin role and **read-only for
  everyone else who can see it** — do not default a single editable view shared across roles.
- **Default query scope** — for list/workspace pages, the acting role's scope **drives the
  default query** (a manager defaults to their direct reports; an employee to their own records;
  HR/admin to all). The page does not default to "all rows for everyone."

Enforcement still lives on the entity operations (the shared access enforcer); this defaulting
decides the page's *shape and navigation* so it matches the role model rather than presenting one
all-powerful view that the enforcer then has to fight.

The above is the **coverage pass**: it ensures every entity, use case, and operation has a
*place* (a panel) somewhere. It does **not** decide the final navigation — that is the next pass.

**Shape pass — consolidate places into the fewest coherent routable pages.** Coverage produces
panels; this pass groups them into the pages a user actually navigates:

- **A page earns a route** when it is a distinct **user goal**, a **navigation entry point**, a
  **permission boundary**, or a **sustained workspace**. Panels that don't meet that test live
  **inside** a page as tabs/sections, not as their own routes (e.g. a person's goals, feedback,
  and reviews are tabs within **My Profile**, not separate pages).
- **Workbench over sprawl** — good practice is to gather a role's related tasks into one
  workspace rather than scatter them across many small task pages; group by how a manager, an
  employee, or an admin actually works. Avoid a page-per-task sprawl.
- **Reference / lookup entities** (departments, job roles, skills, statuses) are **panels inside
  an Admin or domain page**, not pages of their own — unless one carries a real workflow.
- **Page-budget sense check:** if the page list reads like a sitemap generated from the entity
  tables (one page per table), it has skipped this pass — consolidate.

**Suggestions are a short, separate list — not part of the baseline.** Beyond the derived pages,
offer **a few** cross-cutting pages a designer would typically add — usually one app **home/
overview**, one **search**, one **reports** landing. List them under a `## Suggestions` heading,
one line each with a reason, **for the user to accept.** A suggestion becomes a page only when the
user accepts it; until then the baseline stands as derived.

### Page spec  `[feature: page-spec]`

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

### Required-operation UI coverage (§7)  `[feature: required-operation-ui-coverage]`

The denominator is the rendered, role-permitted operations from `operation-coverage`.

### Semantic references in generated text  `[feature: semantic-references]`

Page specs and the UI catalog tag **every concept** they reference as `{{kind:slug}}`.

### UI catalog  `[feature: ui-catalog]`

`specs/design/UI/ui-catalog.md` is a table with **one row per panel**:

| Page | Route | Capability | Canvas Type | Panel | Panel Type | Source | Purpose | Services |
|---|---|---|---|---|---|---|---|---|

- **Page / Route / Capability / Canvas Type** — the page-level columns (repeat for each of the page's
  panels); Canvas is the type (MultiPanel, Dashboard, Timeline, …).
- **Panel / Panel Type / Source / Purpose / Services** — the panel-level columns: the panel's name, its
  `panelType` (Detail | List), its `source` (entity / view / relationship), its **Purpose**
  (Maintenance | Reference), and its `services`.

Each row's panel matches the page-spec's `## Composition`. The catalog is the flat index over the
page set the `page-defaulting` capability derives and the user confirms — the single place to see
every panel and whether it is maintained or referenced.

**One page → many rows. Worked example (copy this shape, do not collapse a page to one row):**

`employee-profile.md` is a `MultiPanel` canvas with three panels, so it is **three rows** — not one
row with "employee maintenance, skills, assignments" in a single cell:

| Page | Route | Capability | Canvas Type | Panel | Panel Type | Source | Purpose | Services |
|---|---|---|---|---|---|---|---|---|
| employee-profile | /employees/:id | employee-records | MultiPanel | employee | Detail | Employee | Maintenance | Edit, Operate |
| employee-profile | /employees/:id | employee-records | MultiPanel | skills | List | Relationship (Employee↔Skill) | Maintenance | Edit |
| employee-profile | /employees/:id | employee-records | MultiPanel | assignments | List | Relationship (Employee↔Assignment) | Reference | Open |

The page/route/capability/canvas columns **repeat** on each panel row. A page-level table (one row
per page with panels listed in a prose cell) is **wrong for the catalog** — that page-level view is
`page-defaulting`'s page-set summary, a *different* artifact. The catalog is always panel rows.

### UI page patterns (bounded-first composition)  `[feature: ui-patterns]`

Every Page Spec declares:

- `pagePattern.primary` and optional `pagePattern.composed`;
- any matching project visual references;
- the canvas, panels, semantic relationships, and panel-owned actions that realize the pattern;
- a reason when `pagePattern.primary: Custom` is used.

The Page Spec is authoritative. Pattern names are concise design decisions; composition and
interaction sections make those decisions concrete.

## Validation checks

### Business transaction analysis  `[feature: business-transaction-analysis]`

- Does the main flow preserve the business condition named by the trigger and explicitly resolve,
  reduce, defer, reject, or record it in the outcome?
  · evidence: trigger + main flow + outcome
  · when: AI review
- Is the driving business object identified and carried through the transaction, or is its absence
  explicitly justified because the trigger is an immediate event with no durable business object?
  · evidence: use-case object roles + entity model
  · when: AI review
- Is the business goal expressed as a business outcome rather than only a record create/update or
  status-change operation?
  · evidence: Business Goal vs. Data Created / Changed / Viewed
  · when: AI review
- Are result, supporting, and materially impacted objects identified, with their resulting states
  reconciled?
  · evidence: object roles + state-change table + outcome
  · when: AI review
- Do durable concepts implied by needs, quantities, history, and lifecycle resolve to entities, or
  have a documented reason not to?
  · evidence: use-case wording vs. entity model + open questions
  · when: AI review
- Where fulfilment is quantified, are requested, fulfilled, remaining, multiplicity, and reversal
  semantics defined?
  · evidence: use case + rules + entity properties
  · when: AI review
- Does each complex or quantified transaction surface its important situations as **test
  conditions** (situation + one expected business result) that agree with the use case, entity
  cardinalities, lifecycle, and business rules — rather than forcing executable examples or
  per-step state tables into the business use case?
  · evidence: use-case Test Conditions section
  · when: static + AI review

### Live-page navigation  `[feature: live-page-navigation]`

- Does each live page have real client-routing links to the catalog's primary pages, current
  page active, each target page existing (no dead/`href="#"` menu)?
  · evidence: page routing source / E2E navigation
  · when: static (links present) + requires-environment (E2E drives them)
- Where the UI renders a workflow (guide/rail/wizard/stepper), does it have **one step per
  ordered stage** in the capability's `workflow.md` — same order, matching labels, no stage
  dropped/merged/re-labeled (a stage with no live route reported as a gap, not omitted)?
  · evidence: workflow UI steps vs. `workflow.md` Stages (count + order + labels)
  · when: static

### UI coverage (design §6)  `[feature: operation-coverage]`

- **Up-drift (always):** does every panel operation id resolve to a declared, role-permitted
  entity operation?
  · evidence: page-spec `## Composition` panel operations vs. entity `## Operations`
  · when: static
- **Down-coverage, for-sure dimensions (complete-design plans only):** is every role-permitted
  in-scope operation rendered by a panel, and every in-scope use case served by a page?
  · evidence: `operation-coverage.md` (entity-operations + use-cases sections) vs. `acceptance.md`
  · when: static

The down-coverage question has no single owning plan — a required operation and the panel that
should render it may come from two entirely different plans, so it can only be answered whole-app
(see `.mde/mde.specs/design/verification.md`). Gated on `operation-coverage.md` existing (the
complete-design signal), same condition the script-level gate used before this moved here; the
report not existing yet is "pending design", not a failure, and this check simply does not fire.

```check scope=system
WHEN  $app.hasFile["specs/design/UI/operation-coverage.md"] IS "true"
ASK   "Read every entity's ## Operations table across specs/business/entities/**, every panel's operations: list in every page-spec's ## Composition under specs/design/UI/pages/**, and every page's ## Supported Use Cases, across the whole project. List any role-permitted entity operation (<entity>.<op>) that no panel renders, and any in-scope use case that no page serves. Do not report up-drift here (a panel operation id with no declaring entity) — that is a separate, always-on, plan-scoped check."
```
- **Coverage report present and current:** does `operation-coverage.md` exist with one section per
  dimension the design defines (entity-operations, use-cases, and any open-door dimensions
  present), each element marked covered or uncovered?
  · evidence: `specs/design/UI/operation-coverage.md`
  · when: static

### Page composition (Canvas / Panel / Relationship)  `[feature: page-composition]`

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

### Page defaulting (derive the UI from the business design)  `[feature: page-defaulting]`

- **Analyze-before-shape:** does each page spec document its understanding first (`## Purpose`,
  `## Subject`, `## Page Context`) — purpose,
  expected usage, primary transaction, primary + supporting business objects, entry contexts, and
  success outcome — with its composition (pattern/canvas/layout) reading as **derived from** that
  analysis rather than a pattern picked first and back-filled?
  · evidence: `## Purpose` / `## Subject` / `## Page Context` present and coherent with `## Composition`
  · when: static + AI review at go / review app
- **Coverage:** does every entity, use case, and operation have an **accessible place** (a panel)
  somewhere in the UI — not necessarily its own page?
  · evidence: panels across the page set vs. entities + use cases + operations
  · when: static
- **Shape:** does each routable page meet the routable-page test (distinct user goal, navigation
  entry, permission boundary, or sustained workspace), with reference/lookup entities and related
  tasks consolidated into workbenches/admin pages rather than a page per table?
  · evidence: the page set vs. the routable-page test
  · when: static
- Are any **suggested** pages a short, separate `## Suggestions` list (each with a reason), kept
  out of the baseline until the user accepts them?
  · evidence: the summary's Suggestions section
  · when: static
- **List-first:** does every collection page (browse / board / matching / workspace over an
  entity) lead with a List or selection panel of its source, rather than opening into a bare
  Detail with no way to pick context? (Single-record-by-context pages — `/x/:id`, self-scoped —
  are exempt.)
  · evidence: each collection page's first panel vs. its source
  · when: static
- **Role scope:** does each page default its menu visibility, edit-vs-read-only, and default
  query from the entity operations' permitted roles and the use case's actor — rather than one
  editable, all-rows view shared across roles?
  · evidence: page spec role/visibility/scope vs. entity operation roles
  · when: static
- **Current + missing:** does each operational/workflow page surface what is missing and the
  action that creates it (not only existing records), where the use case expects records to be
  created to completion?
  · evidence: workflow page panels vs. the lifecycle/use case
  · when: static

### Required-operation UI coverage (§7)  `[feature: required-operation-ui-coverage]`

- Does every role-permitted entity operation a page part renders have a UI/E2E scenario that
  performs it through the running UI (traced to the operation id + an `acceptance.md` row)?
  · evidence: `.feature` UI scenarios per operation + screenshots
  · when: requires-environment
- Do the UI/E2E step definitions use full browser automation against the running app — launch or
  connect to a browser, visit real routes, interact with controls, and wait for/assert rendered
  outcomes — rather than reading source files or mutating local test variables?
  · evidence: UI step definitions + runner config + captured browser screenshots/report
  · when: static (step wiring shape) + requires-environment (scenarios run)
- Does each scenario for a **mutating** operation assert an **observable outcome** (created record
  retrievable / change persists across reload / search returns the seeded match) — not merely that
  a control is visible or "backed by the API"?
  · evidence: `.feature` scenario Then-steps assert behaviour, not presence
  · when: static (assertion shape) + requires-environment (outcome reached)
- Does each suite set **`LOG_PATH`** (`.env`) so the app's run log is captured to a known,
  evidence-referenced file (conventionally `reports/evidence/tests-{ui,api}/run.log`), and does each
  mutating/search scenario's captured log show the **real request path it claims** (a boundary
  request for the operation; a write's transaction) — a silent log for a claimed operation being
  a defect?
  · evidence: the suite's `LOG_PATH` + the captured log referenced from `evidence.md` +
    per-scenario operation trace in the log
  · when: requires-environment

### Semantic references in generated text  `[feature: semantic-references]`

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

### UI catalog  `[feature: ui-catalog]`

- Does the UI catalog list **one row per panel** (page / route / capability / canvas type + panel /
  panel type / source / purpose / services), with each row matching a panel in its page-spec's
  `## Composition`?
  · evidence: `specs/design/UI/ui-catalog.md` vs. the page specs
  · when: static

### UI page patterns (bounded-first composition)  `[feature: ui-patterns]`

- Does every Page Spec select one preferred pattern, or document why a custom pattern is required?
  · evidence: Page Spec `pagePattern`
  · when: static

- When patterns are composed, are there no more than two unless the documented use case requires
  more?
  · evidence: Page Spec `pagePattern.composed` + purpose/use case
  · when: static

- Does the generated page realize the declared pattern without losing panel sources,
  relationships, panel action targets, terminal scope, or business rules?
  · evidence: Page Spec vs. page source and UI review
  · when: static + AI review at go / review app
