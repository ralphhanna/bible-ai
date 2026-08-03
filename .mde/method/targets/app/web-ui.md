---
type: target
id: TARGET-WEB-UI
title: Web UI Target Profile
applies_when:
  - a plan creates or modifies UI, prototypes, or frontend source
requires:
  - testing
  - documentation
---

# Web UI Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

**You are the builder.** What follows names what a good UI must achieve — **functional, usable,
consistent** — and fences off the ways it breaks. Guidance ("follow good practice, avoiding …")
is yours to reason from; only **"must / is a defect"** statements are hard guardrails. Build the
design well within these fences — the rules constrain, they do not dictate. (MDE strategy: the AI
drives design; the method fences it.)

UI must implement page specs and UI catalog entries, not generic screens.

There is **one** UI artifact — the **live page** (React/Vite source under
`src/web/src/pages/<page>.tsx`). MDE does **not** use a separate hand-built HTML mock-up
tier; a prototype is the *same live page* rendered against a fake JSON API (see the
[Prototyping target](prototyping.md)). The behavioural and operational expectations below
apply to that live page.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream
concept each output is produced for (here: `web-page` = a page spec; `entity-operation` = a
CRUD/lifecycle op). The verifier checks the plan's manifest produced each mandated output, one per
scope instance.

| output | path | perEach | when |
|---|---|---|---|
| page | src/web/src/pages/{page}.tsx | web-page | always |
| page-screenshot | reports/evidence/screenshots/{page}.png | web-page | always |
| operation-panel | src/web/src/pages/{page}.tsx (part rendering {entity}.{op}) | entity-operation | always |

<!-- page-screenshot is a DURABLE PROJECT OUTPUT (the app's current UI), not plan
     evidence — it lives at project level under `reports/evidence/screenshots/` and is checked
     app-wide, replaced when the UI changes. See the note in targets/testing.md. -->

## Composed behavior

### Actionable controls  `[feature: actionable-controls]`

All visible buttons are actionable, disabled with explanation, or replaced with a clear
placeholder message. Filters/search visibly update rendered data; tabs/dialogs/confirmations/
toasts/inline validation respond; approval/reject flows and representative state changes work
(e.g. a status badge updating after an action). Rule-bearing UI shows warnings/errors/
confirmations where relevant.

**A persisting control (Save / Create / Submit / approve / a use-case operation) must perform a
real, data-backed operation — a local-only state update is a fake.** A lifecycle action follows
the governed presentation and terminal-scope rules in [[lifecycle-transition-control]]. When the capability's real
API exists, such a control proves an end-to-end path: a concrete **API method + route**, the
**payload** it sends, a **DB-backed route → service → repository** behind it, and **optimistic
version handling** where the entity is versioned (send the version, handle the conflict). A
button that only mutates component state, or posts to nothing, is a dead/placeholder control even
though the screen appears to change. The only local-only state permitted is **transient form
state** (the in-progress edit before Save). Until the real `/api/<cap>` exists the prototype
posts to the fake API per the Prototyping target — but it still goes through the data path, not a
hardcoded in-memory swap.

The owning panel and its relationships determine the target: inline row, visibly selected record,
route record, panel/modal draft, or checked set. When selection is required and absent, the control
is disabled. Terminal actions complete or abandon only their declared panel context. Bulk controls
surface partial successes and failures according to the Page Spec.

### Annotations (reviewer feedback on live pages)  `[feature: annotations]`

A standard UI facet, produced **whenever UI is in scope** (cheap, domain-agnostic) — the user
does not have to request a "prototype." Delivered as a **shipped library** (copied into the
project once at `assets/annotations/`), not generated per project — regenerating fiddly
selector / re-attach logic each time is waste and a correctness risk.

**Dev-only — gated by an `.env` flag.** Annotations are a review/development affordance, not a
shipping feature: the toolbar/bridge mount only when a dev flag is on (e.g. `VITE_DEV_ANNOTATE` /
`MDE_DEV_TOOLS`), and are absent/disabled in a production build. (Same treatment as the
role/user switcher.)

Annotations attach to the **real application server, never the fake-API data layer** — they
are cross-cutting app/review metadata, not business data, and must survive the fake→real
capability transition. The annotation client calls a **relative** `/api/annotations` (routed to
the app server), not the capability resolver; the router persists to one JSON file. No new
server, no new port.

Requires **stable selectors / accessible labels** on important elements (`id` /
`data-testid` first, DOM path as fallback), so notes re-resolve to the same element across
reloads. This is the Web-UI "stable selectors" expectation, here motivated by annotation
targeting.

### App start contract — start script + health round-trip  `[feature: app-start-contract]`

The web app provides the **`mde:start`** script (web port from `.env`/`WEB_PORT`/vite config; resolves
conflicts by ownership) and exposes the **`/__mde/health`** token round-trip (served by the web tier
or its dev server). The live-app view a tool embeds is the web port from `.env`; identity is proven by
the round-trip, so a tool never embeds or kills a foreign app on the same port.

**Full-stack start (split web+api):** when the web and API are separate processes, the contracted
start (`mde:start` / `dev:full`) brings up **both** — the web dev server *and* the API — in one
command, so the embedded live-app view actually renders *and* its data calls resolve. The workbench
Start button invokes this; a start that lights up only the API leaves the web port dark (the iframe
stays empty and the restart poll times out). Compose the tiers (e.g. `concurrently`) rather than
shipping a one-tier start.

### Base-path routing — one model for dev and Apache deploy  `[feature: base-path-routing]`

The web app derives its base path from config and applies it everywhere a URL is formed:
- the bundler base (e.g. Vite `base`), so assets load from `/<app>/…` not `/…`;
- the router `basename`, so client routes resolve under the folder;
- the API base URL, so calls go to `/<app>/api/…`.
A web app built this way works unchanged on a dev port behind the workbench proxy and under Apache —
nothing hardcodes root. The same build is portable across both.

**The API base must be SAME-ORIGIN and folder-relative — never a hardcoded host.**
The frontend calls its API at the base-path-prefixed **relative** path (`<base>/api/…`,
e.g. `/<app>/api/employee-records`), so the call goes to the app's *own* origin and the
reverse proxy (workbench in dev, Apache in prod) routes `/<app>/api/*` to the API tier. Do
**not** call an absolute cross-origin URL like `http://localhost:3001/api/…`: it only works
when the page is served from that exact origin (a standalone tab), breaks the moment the app
is framed/proxied at a different origin, and forces CORS. Same-origin needs no CORS at all.
Derive the API base from the same base-path config as assets/routes (bundler base / injected
base var), with a sensible default of the current origin + base — never a literal host:port.

**Bundler env must live where the bundler reads it.** Env the bundler injects (e.g. Vite's
`VITE_*`) is loaded from the **bundler's `root`/`envDir`**, not wherever a `.env` happens to
sit. A var placed in a directory the bundler does not scan is silently undefined, and a
`const base = import.meta.env.VITE_X || ''` fallback then changes behavior invisibly (an empty
API base becomes a root-relative `/api` that hits the *proxy* origin, not the app). Place the
bundler's env in its env dir, and do not paper over a missing required base with a silent
empty-string fallback.

### Carbon web UI profile  `[feature: carbon-ui-profile]`

Unless the project declares another UI profile:

- use Carbon components, tokens, spacing, typography, interaction behavior, accessibility guidance,
  action hierarchy, loading/empty/error states, and responsive conventions;
- map MDE `Search`/`Filter` panels to Carbon search/filter controls;
- map `List`/`Grid` to Data Table or Structured List as appropriate;
- map `Tree` to Tree View;
- map `Form`/`Editor` and panel actions to Carbon forms and buttons;
- compose `Detail`, `Info`, `Comparison`, `MatchResult`, and `StateTransition` from Carbon content,
  status, form, notification, and structured-list components;
- compose `Summary` from Carbon tile/content-switcher components; `Chart` from `@carbon/charts`
  (or the project's declared charting adapter) styled with Carbon tokens;
- use Carbon themes/tokens rather than copying IBM-branded page styling or hardcoding colors;
- keep Calendar, Map, Timeline, Diagram, and Kanban implementations adapter-selected while styling
  their surrounding controls and states consistently with the profile.

The stack adapter records exact packages/imports. For React, prefer `@carbon/react` and
`@carbon/icons-react` versions compatible with the project's toolchain.

### Capability-aware data-source switch (fake → real)  `[feature: data-source-switch]`

Each page must resolve to the **real** `/api/<cap>` once `src/server/<cap>/Routes.ts`
exists, and to the **fake** JSON API otherwise; no page hard-codes a base URL. The fake-API
pipeline serves a capability until its real API exists; the resolver realizes the axis, so the
UI promotes to production with **no page rewrite** — only the resolver flips as real APIs appear.

### Human date display (business dates, no raw ISO)  `[feature: date-display-format]`

A rendered **business date** field is formatted before display — via a shared helper
(`formatDate`, `Intl.DateTimeFormat`, `toLocaleDateString`, or a date library) — so the value
shown is human-readable and consistent across pages. Formatting lives in **one shared place** (a
util/hook), not re-implemented per page.

- **Never render a raw ISO business date.** A hire/due/start date shown as `2025-01-15` or, worse,
  `2025-01-15T05:00:00.000Z` is drift — that is the storage/API shape, not a display value.
- **Timestamps are out of scope.** `createdAt`/`updatedAt`/audit times are not business dates;
  do not force them through business-date formatting. Where a timestamp *is* surfaced, a full
  date-time or relative-time presentation is fine.
- **Storage/transport stays ISO.** This governs **presentation** only: entities, APIs, and seed
  data keep ISO 8601. The page formats at the edge, when rendering.
- **Consistency.** All pages format business dates the same way, so the app does not mix
  `1/15/2025`, `2025-01-15`, and `Jan 15, 2025` across screens.

### Design-system styling  `[feature: design-system-styling]`

Styling follows `.mde/ui-patterns/ui-design-system.md`: pages compose shared tokens/components,
not page-level inline styling. `mde go` checks this mechanically with
`verify-method-followed.mjs`: catalog/design-system stack agree, declared tokens/components
exist in source, governed page source does not replace shared composition with inline styles.
(The page's **composition** — its canvases and panels — is governed separately by the
`page-composition` capability; this capability is about styling/visual composition, not page
structure.)

Unless the project explicitly declares another governed profile, [[carbon-ui-profile]] supplies
the standard components, patterns, states, accessibility guidance, and tokens. Project visual
references under `.mde/ui-patterns/` specialize the product presentation without replacing the
profile or the semantic Page Spec.

### Login page (login UI)  `[feature: dev-login-page]`

The app has a **`/login` page** that selects the acting user from the project's **seeded people**
(`specs/business/roles/` + seed data) — a dropdown / list of users **by display-label** (name and
role), not a raw id/credential field (see [[reference-display]]). Choosing one:

- establishes the client identity state the rest of the app reads (the same state the switcher
  toggles and the header profile shows);
- routes into the app; **sign out** (from the profile control) returns here.

**Route guard — unauthenticated access redirects to `/login`.** When no acting user is set, any
app route redirects to `/login`; only `/login` itself is reachable un-logged-in. After choosing a
user, the app routes to the originally-requested page (or a default landing) and the header
profile appears. **Sign out** clears the identity state and returns to `/login`. This is a
**routing/UX gate, not a security boundary** — it makes the login page meaningful and gives tests
a realistic entry flow; it is consistent with the fake-login framing below (the guard checks
"is an acting user selected?", not a verified credential). The guard is one shared wrapper
(route element / layout), not re-implemented per page.

In **dev/fake mode** (the default UI behavior):

- The page **selects** an identity (seeded person); it does **not** verify a credential. Any real
  verification/session security is the [[authentication]] feature's real mode — this page never
  reimplements it, and dev mode must not be presented as real security.
- It is **generated** (not a shipped auth library), whenever UI is in scope and the project has
  roles/users. A project with no roles may omit it (the app opens directly).
- **Deterministic for tests** — E2E tests reach a known acting user through this page (or a
  documented test shortcut that sets the same identity state), so role-scoped behaviour is
  testable. Because the guard redirects un-logged-in traffic to `/login`, **a test must log in
  first** (or seed the identity state) before it can reach an app page — the login step is part of
  the E2E setup, not an obstacle. Keep a **stable selector** for the user chooser and submit (see
  [[stable-selectors]]).

### Environment contract (.env — identity, ports, one DB)  `[feature: env-contract]`

The web bundler reads `VITE_BASE_PATH` from the injected process env (not a stale
`.env` file the bundler does not load) to emit correctly prefixed asset URLs. It must
not hardcode a base path or assume it is served from `/`. (This is the same
same-origin, config-sourced rule the `base-path-routing` capability enforces for
the web tier.)

### Governed values from specs  `[feature: governed-values-from-specs]`

Governed values come from entity `## Storage View` enums/CHECK values,
`specs/business/roles/`, and business rules — not fabricated. Free-text (names, descriptions,
dates) may be fabricated. A page/dataset listing a status or role the business specs don't
define is drift, even if it looks realistic. Holds by construction because prototype data is
model-derived (see `model-derived-data-pipeline`).

### Guided workflows  `[feature: guided-workflows]`

A standard UI facet, **generated** and produced **whenever UI is in scope and the project
defines capability workflows** — no longer opt-in, and the user does not have to request a
"prototype" to get it. If a capability has `workflow.md` stages, its guided workflow is built;
only a capability with no workflow has none (nothing to build, not a Non-goal decision).

Generated into a workflow catalog (deriving from Specs, not duplicating requirement text)
plus a `/workflows` library and an active-step rail on the live pages.

Source of truth: capability `workflow.md` stages → use cases → page specs.

### State Transition subpanel (governed lifecycle change)  `[feature: lifecycle-transition-control]`

The `StateTransition` subpanel is owned by the panel/action that proposes or commits the change and
shows:

- **Current State** — the persisted state;
- **New State / Decision** — only valid reachable outcomes;
- **Impact** — consequences for affected objects, dates, permissions, or processes;
- **Rules** — guards, permissions, validation results, and blocking conditions.

The rendering follows the business semantics:

- **Edit-with-state:** when state is one field in a broader record edit, the proposed state is
  committed by that panel's Save action with the other edits.
- **Terminal decision:** when the use case is Submit, Approve, Reject, Cancel, Acknowledge, Reopen,
  or another lifecycle decision, the named action may commit immediately after required review or
  confirmation. It is terminal only for its declared panel context, not the whole page.

In both cases, the action targets the exact inline, selected, routed, draft, modal, or checked
record context defined by [[page-composition]]. It never falls back to a first/default record.
Abandoning the active context discards the proposed transition and leaves Current State unchanged.
Where the entity is versioned, the committing action carries the version and handles conflicts.

### Live-page navigation  `[feature: live-page-navigation]`

For each live page, client routing contains **real links** to the app's sibling pages (at
least the primary catalog pages) with the current page marked active. A decorative menu (dead
links, `href="#"`) does not satisfy this; each target page must exist.

**When the UI renders a workflow** — any multi-step guide, rail, wizard, or stepper that walks
the user through a capability's stages (whether or not a prototype facet is enabled) — its
steps must **completely and faithfully represent** that capability's `workflow.md` stages: one
step per ordered stage, same order, label matching the stage. A stage may not be dropped,
merged, re-labeled, or re-ordered because it lacks a convenient existing route; a stage with no
live page to route to is a **gap to report** (pending/owed UI), not a stage to silently omit. A
workflow UI showing fewer steps than its source has stages misrepresents the business process
and is a defect — independent of any prototyping scope.

### Model-derived data pipeline (derive everything, author nothing)  `[feature: model-derived-data-pipeline]`

Applies whenever UI is in scope and a capability is served by the fake JSON API fallback (its
real `/api/<cap>` not yet built). It is not tied to a "prototype" request — it is how the UI gets
real-shaped data before the real API exists.

- The **model is the only source of truth**; seed data is its first projection, the JSON is a
  second projection of the *same* seed data.
- **One transform script**, never per-page hand-written JSON — N hand-authored files would be
  N drift points.
- **Make-or-break rule:** if seed, transform, or JSON is hand-crafted, the strategy backfires
  (a third drift source: model ↔ seed ↔ fake-JSON). **Generate; do not author.**
- Governed values (statuses, roles, enums) come from the model by construction; only free-text
  (names, descriptions) may be fabricated.

### Info / Metadata panel (identity, provenance, and audit context)  `[feature: object-info-metadata]`

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

### UI coverage (design §6)  `[feature: operation-coverage]`

A panel claims operations; the live page renders them.

### Operations against data (not canned swaps)  `[feature: operations-against-data]`

A filter narrows the **actual result set** and re-renders (the visible count genuinely changes
with the query); sort reorders; pagination slices; selecting a row reads from it. A matching
query returns fewer-but-nonzero rows containing the term; a no-match query returns **zero**.
The control must perform the operation over the data, observably — not swap in a canned row or
a descriptive sentence.

### Page composition (Canvas / Panel / Relationship)  `[feature: page-composition]`

A built page realizes the declared composition:

- canvas type lays out/coordinatess panels,
- panels render the right source for the declared purpose,
- services appear as the correct user capabilities,
- relationships wire panels together and preserve their declared business semantics,
- maintenance panels allow the declared editable business properties to be maintained,
- reference panels remain summary/context unless explicitly allowed to edit.

Whether the rendering realizes the composition is judged at `mde go` and `mde review app`.

### Page spec  `[feature: page-spec]`

The live page must match its page spec — composition, data, filters, validation, states, and
navigation. A built page that diverges from its spec is drift.

### Real dataset (from the data source)  `[feature: real-dataset]`

Each listing page renders its records **from the data source** (fake JSON API in prototype, real
API in production) via a **render loop over the response** — so it shows the full seeded dataset
(`meaningful-seed-data` owns how many records exist; this capability just renders them, it does
not define a count). Hand-written rows, 1–3 placeholders, or a canned swap is a failure.

### Related-entity display (Display Label)  `[feature: reference-display]`

**Displaying a reference.** A reference to another entity is rendered using the target entity
property marked with role **`display-label`** (a single property or a derived label such as
`firstName + " " + lastName`). Never surface the technical `id`/UUID as the way a user recognizes
the related record. A **unique property** (e.g. `email`, `orderNumber`, defined as a unique
constraint in the Storage View) is for lookup and disambiguation — show it only when it *is* the
display-label property, or alongside the label to disambiguate when the business asks for it. A list, picker, or detail field that displays a
foreign `id` (or a meaningless code) where a related entity should appear is drift — use the
display-label property.

**Entering/choosing a reference (create/edit forms).** A reference field a user *sets* is a
**selection control over the related entity's display-label options** — a dropdown / picker /
searchable combobox listing `Employee` by name, `Reviewer` by name — **not** a free-text field
where the user types a raw id or code. A form field labelled `Employee ID` / `Reviewer ID`, or a
text input expecting a value like `mgr-001`, is drift: label it by the entity (`Employee`,
`Reviewer`), present the choices by display-label, and submit the underlying `id` behind the
scenes. The user picks a **name**; the raw key is never typed or shown as the entry surface.

### Role / user switcher  `[feature: role-switcher]`

A standard UI facet, **generated** (not a shipped library) from the project's roles
(`specs/business/roles/` + a role→nav map). Produced whenever UI is in scope and the project has
roles — the user does not have to ask for a "prototype"; it is part of building the UI. When a
project has no roles, this facet is a **no-op** and may be omitted.

**Dev-only — gated by an `.env` flag.** The switcher is a review/development affordance, not a
shipping feature: it is mounted only when a dev flag is on (e.g. `VITE_DEV_ROLE_SWITCHER` /
`MDE_DEV_TOOLS`), and absent/disabled in a production build. It never replaces real
authentication. Source of truth: `specs/business/roles/`.

### Row selection affordance (advisory)  `[feature: row-selection-affordance]`

**Prefer a clickable row over a per-row "Select" button.** When a row in a list can be selected
by **clicking the row itself**, and there is a **clear visual cue** that the row is selectable and
which row is selected — a pointer cursor on hover, a hover state, and a distinct selected/active
style — an explicit per-row `Select` button is redundant chrome. Advise against adding it in that
case: the row *is* the affordance.

Add an explicit selection control only when the AI judges it genuinely warranted — for example
when selecting a row is not obviously distinct from opening it, or the interaction needs a clear
separate "choose this one" step. **Left to the AI's judgment**; the method only advises the
lighter, cue-driven default.

This complements — it does not override — [[actionable-controls]] (controls must do something),
[[reference-display]] (navigate/choose by display-label, not raw id), and [[stable-selectors]]
(selectable elements remain test/annotation-addressable whether the affordance is a row or a
button).

### Shared access enforcer  `[feature: shared-access-enforcer]`

In the prototype the enforcer hides/disables operations a role may not perform — a view
filter, not security (routes stay reachable).

### Single-tier live page (one tier = production)  `[feature: single-tier-live-page]`

When UI is in scope, the live pages are produced directly — there is no separate "prototype"
request and no mock-up tier. A built page is the live page, and the Web-UI operational
expectations apply to it (real data from the data source, working filters/nav/controls,
design-system styling). The drift guards (governed values trace to Business Specs; styling has a
single source) hold regardless.

**One file per page.** Each page spec is realized as its **own** page component file at
`src/web/src/pages/<page>.tsx` — one file per page in the UI catalog. Pages are **not**
collapsed into `App.tsx` or a single shared file: `App.tsx` wires routing and mounts the
pages; each page's markup/behaviour lives in its own `pages/<page>.tsx`. A single file
containing many pages is drift — it defeats per-page ownership, review, and traceability.

Locations (one tree, no separate prototype UI):

| Thing | Location |
|---|---|
| Each page (one file per page) | `src/web/src/pages/<page>.tsx` (one per page spec — live = production) |
| App shell / routing | `src/web/src/App.tsx` (mounts pages; not the pages themselves) |
| API client | `src/web/src/api/` (resolves data source; no hard-coded base URL) |
| Fake-API server + transform | `tools/fake-api/` (dev tooling) |
| Seed data | `db/seeds/` |

### Stable selectors  `[feature: stable-selectors]`

Stable selectors or accessible labels exist for important elements (`id` / `data-testid` first,
DOM path as fallback). This is the expectation the annotations capability and E2E tests both rely
on to address elements.

### UI catalog  `[feature: ui-catalog]`

Navigation must be consistent with the catalog — real client-routing links between the catalog's
pages, current page active, each target page exists — so the built app's page graph matches the
inventory.

### UI page patterns (bounded-first composition)  `[feature: ui-patterns]`

Generated pages realize the declared page pattern using the selected UI profile and technology
adapter. The implementation must preserve declared panel sources, selection, relationships,
action target, terminal scope, business results, and responsive priority. It must not imitate a visual
reference while dropping its business bindings.

### UI screenshots  `[feature: ui-screenshots]`

Screenshots are the operational proof the live pages render and the states are reachable.

### UI states (empty/loading/error/success)  `[feature: ui-states]`

Empty, loading, error, and success states are represented where relevant to the page. Each
asserted error/empty/validation state is reachable and rendered.

### User profile in header (avatar, top-right)  `[feature: user-profile-header]`

The app shell renders a **user-profile control in the top-right of the header, present on every
page** (it lives in the shell/layout, not per-page). It shows:

- an **avatar** — the user's image if present, otherwise a generated fallback (e.g. initials from
  the display-label);
- the user's **display-label** (name) — never a raw `id`/technical key (see [[reference-display]]);
- a menu with at least **sign out** and, where the role/user switcher applies, **switch user**
  (the switcher lives in this control rather than as a separate widget).

The current user is read from the client identity state the switcher/login establishes — the same
seeded people the project's `specs/business/roles/` + seed data define. It is **generated** as
part of building the UI (not a shipped library), whenever UI is in scope. When a project has no
roles/users, the control degrades to a minimal placeholder or is omitted.

## Validation checks

### Actionable controls  `[feature: actionable-controls]`

- Do filters, dialogs, tabs, toasts, validation, and approve/reject flows actually respond, and
  is every visible control wired to an action (no dead buttons)?
  · evidence: handlers in page source + E2E driving the controls
  · when: static (handlers present) + requires-environment (E2E proof)
- Does every persisting control (Save / Create / Submit / approve / state transition) call a real
  API method + route with a payload, backed by a route → service → repository data path (with
  optimistic version handling where the entity is versioned) — rather than a local-only state
  mutation or a post to nothing?
  · evidence: control handler → api client call → server route/service/repository; E2E showing
    the change persists across reload
  · when: static (path present) + requires-environment (persistence proof)
- Does every modifying control operate on the object bound by its owning panel and relationships,
  remain disabled when its required selection is absent, and avoid an implicit first/default
  record? Does each terminal action end only its declared panel context?
  · evidence: Page Spec panel/action/relationship vs. handler payload, selected state, and disabled state
  · when: static + requires-environment

```check scope=plan
# Dead-control smell (deterministic, HANDLER-level): a click handler that goes
# straight to a placeholder — onClick={() => onAction(…)} / setToast / alert /
# console.log — is a button "posting to nothing". (A file-level "has any api call"
# test is too coarse: a page can load data via the API yet wire its ACTION buttons
# to a toast.) A real action handler calls the API client, not just a message.
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/web/.*\.(tsx|jsx)$"
THEN  $t.content NOT MATCHES "onClick=\{\(\)\s*=>\s*(onAction|setToast|alert|console\.log)\("
  ELSE "dead control — a button's onClick only fires a toast/message (placeholder), not a real action; the button does not operate"
```

```check scope=plan
# Unscoped-collection-Save smell: a modifying handler must use the panel's bound
# row/selection/route/draft/checked set, never a fixed first/default record.
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/web/src/pages/.*\.(tsx|jsx)$"
THEN  $t.content NOT MATCHES "on(Save|Click)=\{[^}]*\b(update|save)[A-Za-z]*\((state\.)?[A-Za-z]+\[0\]"
  ELSE "unscoped modifying action — handler targets collection[0] instead of the object bound by its owning panel and relationships"
```

### Annotations (reviewer feedback on live pages)  `[feature: annotations]`

- Is the annotations library present and **mounted on the app server** (not the fake API)?
  · evidence: the toolbar mounted in the app shell + the router mounted on the app server
  · when: static
- Are annotations a **copied library**, not regenerated bespoke code, and do they call a
  relative `/api/annotations` on the real server rather than the capability resolver?
  · evidence: `assets/annotations/` present; client calls `/api/annotations`
  · when: static
- **Is the app-side bridge file actually copied into the app and wired in (behind the dev
  flag)?** The `mde-annotate-bridge.js` master must be copied to the app's served web public dir
  (e.g. `src/web/public/mde-annotate-bridge.js`) **and** referenced by a `<script>` tag in the
  app shell (mounted behind the dev `.env` flag), and the annotations router mounted on the app
  server. Any plan that builds UI whose served app is missing the bridge file, the `<script>`
  reference, or the router mount has **not** delivered the facet — this is a verification failure,
  not a warning. (The library existing only under `.mde/assets/` does not count: it must
  reach the running app.)
  · evidence: `src/web/public/mde-annotate-bridge.js` exists; app-shell template references it
    behind the dev flag; annotations router mounted on the app server
  · when: static
- Do important elements carry **stable selectors** (`id`/`data-testid`) so notes re-resolve?
  · evidence: page source selectors
  · when: static
- **Does an E2E test prove app annotation works end-to-end?** Embedded-app handshake
  (`mde-wb-hello` → `mde-app-ready`), enter annotate mode, click an element, and assert an
  `mde-annotation` message is posted / a note round-trips `/api/annotations` and re-resolves on
  reload. Absent or failing ⇒ the facet is not delivered.
  · evidence: the annotation E2E spec + its run output under `evidence/logs/`
  · when: static (test present) + requires-environment (E2E proof)

### App start contract — start script + health round-trip  `[feature: app-start-contract]`

- Does the app provide a contracted **`mde:start`** script that reads its ports from `.env` (not
  hardcoded) and resolves a busy port by ownership rather than blind-killing?
  · evidence: `package.json` `mde:start` (or stack equivalent) reading `.env`
  · when: static
- Does the app expose **`GET /__mde/health`** returning both **identity**
  (`status: pass|warn|fail`, `app` = `APP_ID`, `component` = `web`/`api`) and
  **ownership** (the token written to `.mde/runtime/health-token`, plus the app-root
  folder)? Identity lets a caller verify *which app/tier* answers a port before
  loading it; the token round-trip proves the app belongs to *this folder*.
  · evidence: health handler returning status/app/component + echoing
    `.mde/runtime/health-token`; a round-trip test
  · when: static (handler) + requires-environment (round-trip against a running app)
- On a port conflict, is it resolved by **ownership** (reuse if ours; free/reassign if foreign), never
  by killing whatever holds the port?
  · evidence: `mde:start` conflict-handling path
  · when: static
- For a split web+api app, does the contracted start bring up **every tier** (web dev server **and**
  API) in one command — not just one tier?
  · evidence: `mde:start`/`dev:full` composing both tiers (e.g. `concurrently "npm:dev" "npm:dev:web"`);
    both ports listening after one invocation
  · when: static (script) + requires-environment (both ports up after start)
  · why: the workbench Start invokes one command and embeds the web port; a one-tier start leaves the
    app half-running and times out the poll

```check scope=plan
# WB start contract (deterministic): a plan that produces a runnable app (server/web
# source or a package.json) must define the contracted `mde:start` script the
# workbench invokes — without it the WB Start button has nothing to call. Reads the
# produced package.json content.
WHEN $plan.producesRunnableApp IS "true"
THEN  $plan.packageJson MATCHES "\"mde:start\"\s*:"
  ELSE "no contracted 'mde:start' script in package.json — the workbench Start button has no entry point to launch the app"
```

### Base-path routing — one model for dev and Apache deploy  `[feature: base-path-routing]`

- Does the web app take its base path from config (bundler `base` + router `basename` + API base
  URL), with **no hardcoded root** for assets/routes/API calls?
  · evidence: build config + router setup reading the base; assets resolve under the folder
  · when: static
- **No hardcoded API host.** Does the web source avoid absolute cross-origin API URLs
  (`http://localhost:<port>`, `http://127.0.0.1:<port>`, any literal `host:port`) as the API
  base — calling the API SAME-ORIGIN at the base-relative `<base>/api/…` instead?
  · evidence: api client / config; grep the web source finds no absolute API host literal
  · when: static
- **API base has no silent empty fallback.** Does the API base resolve to the app's origin +
  base path (not `import.meta.env.VITE_X || ''` → root-relative `/api` that would hit the proxy
  origin), and is any bundler env var it reads placed in the **bundler's env dir** (Vite `root`),
  not a directory the bundler does not scan?
  · evidence: api base construction; the bundler env file location matches the bundler root
  · when: static
- Does the API mount under a configurable path prefix (not assume `/`), path-aware for
  cookies/CORS/redirects?
  · evidence: API bootstrap reading the prefix; a route reachable under the prefix
  · when: static (mount) + requires-environment (reachable under the prefix behind the proxy)
- **CORS is not a single-origin literal.** Does the API avoid a hardcoded single-origin CORS
  allow-list (e.g. only the standalone dev port) — relying on same-origin, or a config-driven
  allow-list — so the app is not broken when framed/proxied at a different origin?
  · evidence: CORS config source; no literal single-origin that only matches the standalone case
  · when: static
- Does the same build/config work **both** on a dev port behind the workbench proxy **and** under
  Apache folders (one model, no dev-only assumptions)?
  · evidence: base path sourced once from config; verified via the app-start health round-trip at the
    based path
  · when: requires-environment

### Carbon web UI profile  `[feature: carbon-ui-profile]`

- Does the project declare Carbon or another concrete UI profile and compatible technology adapter?
  · evidence: application policy / tech stack + dependencies
  · when: static

- Do generated pages use the declared profile's components and tokens rather than page-local
  substitutes and hardcoded styling?
  · evidence: dependencies, imports, shared components, and page source
  · when: static + AI review at go / review app

### Capability-aware data-source switch (fake → real)  `[feature: data-source-switch]`

- Does the API client resolve **per capability** (real `/api/<cap>` when `Routes.ts` exists,
  else fake), and does **no page hard-code a base URL**?
  · evidence: API client source + page imports
  · when: static
- Does every page still on the fake API **genuinely lack** a real API for its capability
  (else it is drift)?
  · evidence: per-page resolved source vs. `src/server/<cap>/Routes.ts` presence
  · when: static

### Human date display (business dates, no raw ISO)  `[feature: date-display-format]`

- Is every user-visible **business date** (hire/due/start/end/review/effective dates — not
  `createdAt`/`updatedAt`/audit timestamps) rendered through a formatting helper, so no raw ISO
  date string reaches the DOM as displayed text?
  · evidence: page source for business-date fields + the shared format helper
  · when: static
- Is business-date formatting defined **once** (a shared util/hook) and reused, rather than
  re-implemented per page?
  · evidence: a single formatting module referenced by the pages
  · when: static

```check scope=item
# Static — no raw ISO date literal rendered in a page. Flags a hardcoded ISO date
# (YYYY-MM-DD, optionally with a time part) sitting in page source, the smell from
# the report. Timestamps aren't literals in page source (they come from the API as
# createdAt/updatedAt), so this literal check does not touch them; the timestamp
# carve-out is enforced by the semantic check above. Formatting helpers
# (Intl/toLocale*/format*) are the expected path for real date values.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/pages/.*\.tsx$"
THEN  $item.content NOT MATCHES "\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?"
  ELSE "page contains a raw ISO date literal — format business dates for display (Intl/toLocale/format helper); raw ISO is storage, not display"
```

### Design-system styling  `[feature: design-system-styling]`

- Does each page compose the design system's shared components/tokens rather than re-declaring
  styling inline (declared tokens/components exist in source; no inline-style replacement)?
  · evidence: `verify-method-followed.mjs` output + page source
  · when: static

```check scope=plan
# CSS/design compliance — cross-cutting over all page/component artifacts, so
# scope=plan scanning $plan.trace. Two precise rules (calibrated against real pages):
#  1. PAGES must compose the design system (className). Components under
#     components/ ARE the design system, so they're exempt from this one.
#  2. NO hardcoded colors anywhere in page/component styling — colors must be
#     design-system TOKENS (var(--…)), never raw hex. A style={{ color:'#fff' }}
#     bypasses the token system; token-based inline style (var(--…)) is allowed.
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/web/src/pages/.*\.tsx$"
THEN  $t.content CONTAINS "className"
  ELSE "page does not compose the design system (no className usage)"
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/web/src/(pages|components)/.*\.tsx$"
THEN  $t.content NOT MATCHES "(color|background|border)\s*:\s*['\"]?#[0-9a-fA-F]{3,8}"
  ELSE "hardcoded color in styling — use a design-system token (var(--…)), not a raw hex"
```

```check scope=plan target=web-ui
# Design-system REALIZATION: what .mde/ui-patterns/ui-design-system.md declares must be
# implemented in the generated web source. Model-side ($plan.designSystem, computed against
# THIS plan's CSS/component source): declared tokens exist as `--x:` in CSS; declared shared
# components appear in components/ source; ui-patterns.md does not assert a stack tech the
# design system rejects. Guarded on the DS doc existing. (Replaces validateUiDesign in
# verify-method-followed.mjs — the token/component/stack checks; the inline-styling and
# className checks are the scope=plan block above.)
WHEN  $plan.designSystem.present IS "true"
THEN  $plan.designSystem.tokensImplemented IS "true"
  ELSE "declared design-system token(s) not implemented in web CSS: ${$plan.designSystem.missingTokens} — add each as `--token: value` to the web stylesheet"
WHEN  $plan.designSystem.present IS "true"
THEN  $plan.designSystem.componentsImplemented IS "true"
  ELSE "declared shared component(s) not implemented in web source: ${$plan.designSystem.missingComponents} — implement each under src/web/src/components/"
WHEN  $plan.designSystem.present IS "true"
THEN  $plan.designSystem.stackContradiction IS "false"
  ELSE "ui-patterns.md stack asserts a technology ui-design-system.md rejects — reconcile the two stack declarations"
```

### Login page (login UI)  `[feature: dev-login-page]`

- Is there a `/login` page that selects the acting user from **seeded people by display-label**
  (name/role), establishes the app's identity state, and routes into the app — with sign-out
  returning to it?
  · evidence: login page source + the identity state it sets + the route wiring
  · when: static
- Is there a **route guard** so that un-logged-in access to any app route redirects to `/login`
  (only `/login` reachable un-logged-in), implemented once as a shared wrapper — and after login
  the app routes on (to the requested page or a default)?
  · evidence: router/guard source — the redirect-when-no-user wrapper around app routes
  · when: static
- Is it clearly a **fake dev/test login** — no password verification / real token security — and
  reachable deterministically by E2E tests via stable selectors (tests log in before hitting app
  pages)?
  · evidence: login page source (no auth verification) + a test that logs in through it
  · when: static

```check scope=item
# A generated UI with roles should have a login/user-select entry point. Checks for a
# login route/page artifact. Catches the gap: no front door to establish the acting
# user. (Whether it is genuinely a *fake* login — no real auth — is the semantic check.)
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/pages/.*[Ll]ogin.*\.tsx$"
THEN  $item.content MATCHES "([Ll]ogin|sign ?in|[Ss]elect user|acting user)"
  ELSE "login page present but does not read as a user-select entry point — a fake dev/test login should let the user pick a seeded person to act as"
```

```check scope=item
# Route guard: the app's router/shell must redirect un-logged-in traffic to /login.
# Checks the routing source (App/router/guard) for a login redirect / protected-route
# wrapper. Catches the gap: a login page exists but no guard, so app pages are
# reachable without logging in and /login is dead-ends nothing.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/(App\.tsx|.*[Rr]out.*\.tsx|.*[Gg]uard.*\.tsx)$"
  AND $item.content MATCHES "([Ll]ogin|/login)"
THEN  $item.content MATCHES "([Nn]avigate|[Rr]edirect|[Pp]rotected|[Rr]equireAuth|requireUser|[Gg]uard)"
  ELSE "router references /login but has no redirect guard — un-logged-in access to app routes must redirect to /login (one shared protected-route wrapper)"
```

### Environment contract (.env — identity, ports, one DB)  `[feature: env-contract]`

- Is a `.env.example` committed with the required keys — identity (`APP_ID`,
  `APP_NAME`, `APP_VERSION`), web tier (`WEB_HOST`, `WEB_PORT`, `WEB_PORT_RANGE`),
  api tier when present, and a single `DATABASE_URL` when the app has a DB?
  · evidence: `.env.example`
  · when: static
- Are the app's port **ranges disjoint** from every other app in the project (no
  overlap between any two apps' `WEB_PORT_RANGE` / `API_PORT_RANGE`)?
  · evidence: each app's `.env.example` port ranges
  · when: static
- Does the source avoid **hardcoded ports / hosts / API-URLs** — reading `PORT`,
  the API base, and the bundler base from env instead (no `http://localhost:<port>`
  literal as an API base, no `import.meta.env.X || ''` silent-empty fallback)?
  · evidence: server/web source; api client / config
  · when: static
- Is there exactly **one** `DATABASE_URL` per environment (no required second
  test-DB in the app contract)?
  · evidence: `.env.example`
  · when: static

### Governed values from specs  `[feature: governed-values-from-specs]`

- Do the page's governed values (roles/statuses/enums/departments) all resolve to values
  defined in business specs (not invented)?
  · evidence: page/dataset values vs. business-spec vocabularies
  · when: static

### Guided workflows  `[feature: guided-workflows]`

- For every capability that defines `workflow.md` stages, is a guided workflow built that
  **derives from** that `workflow.md` + use cases (no duplicated requirement text) and **routes
  into the live pages** rather than re-implementing them?
  · evidence: workflow catalog source + route references vs. capability workflow.md set
  · when: static

### State Transition subpanel (governed lifecycle change)  `[feature: lifecycle-transition-control]`

- Does every lifecycle change appear through a `StateTransition` subpanel showing Current State,
  valid New State/Decision, Impact, and Rules before commit?
  · evidence: Page Spec panel/subpanel/action and rendered page
  · when: static + AI review at go / review app

- Does the transition offer only outcomes reachable from the current state, with guards and
  consequences drawn from the entity lifecycle and operation specifications?
  · evidence: rendered options and supporting text vs. entity lifecycle
  · when: static

- Does the committing action use the appropriate declared model—record Save for edit-with-state,
  or a named terminal action for a scoped lifecycle decision—without duplicating both paths?
  · evidence: Page Spec action and handler/API behavior
  · when: static + AI review at go / review app

- Is the action bound to the exact panel target and terminal scope, with required selection,
  permissions, validation, confirmation, persistence, and optimistic version handling?
  · evidence: Page Spec panel/action/relationships and implementation path
  · when: static + requires-environment

- Are non-lifecycle use-case operations left as `Operate` actions rather than being folded into
  the lifecycle selector?
  · evidence: operation kinds vs. rendered controls
  · when: static

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

### Model-derived data pipeline (derive everything, author nothing)  `[feature: model-derived-data-pipeline]`

- Is the fake-API fallback data **generated** from the model (`db/seeds/` → one transform), with
  no hand-authored JSON and no invented governed values?
  · evidence: presence of the transform script; absence of hand-edited per-page JSON
  · when: static
- Is the fake-API pipeline **runnable** — a script regenerates the JSON from `db/seeds/`?
  · evidence: the regenerate script + its output
  · when: static

### Info / Metadata panel (identity, provenance, and audit context)  `[feature: object-info-metadata]`

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

### Operations against data (not canned swaps)  `[feature: operations-against-data]`

- Do filter/sort/page operations run against the data (matching query → fewer-but-nonzero rows
  containing the term; no-match → zero), rather than a canned row or descriptive sentence?
  · evidence: E2E exercising filter/sort/page
  · when: requires-environment

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

### Real dataset (from the data source)  `[feature: real-dataset]`

- Does each listing page render its records from the data-source response via a render loop
  (showing the seeded dataset), not hand-written rows or 1–3 placeholders?
  · evidence: page source (render loop) + rendered data
  · when: static (source) + requires-environment (rendered count)

### Related-entity display (Display Label)  `[feature: reference-display]`

- When a page shows a related entity (a reference/foreign field, picker, or join column), is it
  rendered by the related entity's **display-label** property rather than a raw `id`/UUID (a unique
  property shown only when it is the display-label property or explicitly for disambiguation)?
  · evidence: page rendering of reference fields vs. the entity property role `display-label`
  · when: static

- When a create/edit form **captures** a reference, is it a selection control (dropdown / picker /
  combobox) listing the related entity by **display-label** — labelled by the entity (`Employee`,
  `Reviewer`), not `Employee ID` / `Reviewer ID` — rather than a free-text field where the user
  types a raw id/code (`mgr-001`)?
  · evidence: form field for each reference vs. a display-label-populated select
  · when: static

- Does the repository's read query (`list`/`findById`) **`JOIN`** each referenced entity's table
  and alias its display-label column into the result, rather than selecting only the bare foreign
  id column?
  · evidence: repository SQL — a `JOIN` per foreign-key column, with an aliased display-label
    column in the `SELECT` list
  · when: static

- Does a `create`/`update` repository method or its calling service — when it already fetched the
  related entity for validation — **include that entity's display-label** in the returned/response
  shape, rather than returning the bare row (`RETURNING *`) with the display-label field left
  null/absent?
  · evidence: create/update method body — the fetched related entity's display-label flows into
    the returned object
  · when: static

```check scope=item
# Fields-vs-spec: an artifact for an entity that has a display-label must reference
# that label field, not just the id. Catches the classic "page shows employee id /
# department_id instead of the name" generation bug. $item.entity comes from the
# artifact's source.ref; the entity spec declares the display-label field.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/pages/.*\.tsx$"
  AND $spec.entity[$item.entity].displayLabel EXISTS
THEN  $item.content CONTAINS-ANY $spec.entity[$item.entity].displayLabelForms
  ELSE "page for this entity does not reference its display-label field — likely showing the id, not the name"
```

```check scope=item
# Reference INPUT smell: a form that labels a reference field "<X> ID" (Employee ID,
# Reviewer ID) or renders a raw-id text input is entering references by id, not by a
# name picker. A create/edit page should choose the related entity by display-label
# in a <select>/combobox — the raw key is submitted, never typed. Flags the exact
# defect (a visible "... ID" form label on a page that has form inputs).
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/pages/.*\.tsx$"
  AND $item.content MATCHES "<(input|form)"
THEN  $item.content NOT MATCHES ">\s*[A-Z][A-Za-z ]* ID\s*(\*?)\s*<"
  ELSE "form labels a reference as '<X> ID' — capture references with a name dropdown of the related entity's display-label, not a raw-id text field"
```

```check scope=item
# Repository join smell: a Repository file whose SELECT targets a foreign-key-shaped
# column (something_id) but contains NO "JOIN" anywhere in the file is very likely
# returning the bare foreign id with no way for the caller to show a name — the
# repository never fetched the referenced row at all. A file with NO foreign-key
# column in its SELECT (a leaf entity with no references) correctly never matches the
# WHEN and is not flagged. This is a smell, not a proof (a service-layer join, or a
# genuinely reference-free entity using an _id-shaped OWN column, can false-positive
# rarely) — the AI semantic pass judges borderline cases.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/server/.*Repository\.(t|j)s$"
  AND $item.content MATCHES "SELECT[\s\S]*?\w+_id\b[\s\S]*?FROM"
THEN  $item.content MATCHES "\bJOIN\b"
  ELSE "repository selects a foreign-key column (…_id) but has no JOIN anywhere in the file — the referenced entity's display-label is never fetched, so callers can only show the raw id; add a JOIN and alias the referenced table's display-label column into the SELECT"
```

```check scope=plan
# Semantic (AI judgment) — the deterministic join-smell check above can only see
# "does this file contain the word JOIN anywhere," which cannot confirm the join is
# actually WIRED to the SELECTed foreign-key column, or that a create/update method
# that already fetched the related entity (for validation) actually carries that
# entity's display-label into what it returns rather than discarding it. The AI reads
# each Repository/Service file the smell check flagged (or any create/update method
# with FK validation) and judges: does every response shape genuinely include the
# related entity's display-label, end to end, not just the word JOIN being present
# somewhere unrelated?
EVERY $t IN $plan.trace WHERE $t.type IS "source"  AND  $t.path MATCHES "src/server/.*(Repository|Service)\.(t|j)s$"
ASK   "In ${$t.path}: for every method that returns a row/object carrying a foreign-key reference (employee_id, project_id, manager_id, …), does the returned shape also carry that related entity's display-label (e.g. employeeName, projectName) — via a real SQL JOIN for list/read, or by threading through an already-fetched related entity for create/update — rather than leaving the caller with only the raw id? List any method whose response has a foreign-key field but no corresponding display-label field."
```

### Role / user switcher  `[feature: role-switcher]`

- When UI is in scope and the project has roles, is the **role/user switcher present**, generated
  from `specs/business/roles/`, and **gated behind a dev `.env` flag** (mounted in dev, absent in
  a production build)?
  · evidence: the switcher control in the app shell + the dev-flag gate
  · when: static
- Is nav filtering a **soft view filter** (all routes reachable, no guards), not access
  control or authentication?
  · evidence: routing/nav source
  · when: static

### Row selection affordance (advisory)  `[feature: row-selection-affordance]`

- Where row click performs selection, does the row provide visible hover/selectable and selected
  states without adding a redundant per-row Select button? Where selection and opening are
  different operations, is their distinction clear and keyboard accessible?
  · evidence: Page Spec List action/relationship and rendered list behavior
  · when: AI review at go / review app (advisory)

### Shared access enforcer  `[feature: shared-access-enforcer]`

- Is access enforced by one shared enforcer reading entity operations + recorded scope
  filters (soft in prototype, binding on real API), not bespoke per-capability ACL?
  · evidence: enforcer source consumed by prototype + API
  · when: static
- Is **every entity operation** ACL-enforced — present in the enforcer, with the enforcer's
  permitted roles covering the spec's `## Operations` "Permitted roles"?
  · evidence: enforcer operation→roles map vs. entity `## Operations`
  · when: static
- Are the row-level **Scope** rules (e.g. "employees who report to the acting manager") applied
  as the recorded row-filter predicate per operation?
  · evidence: scope predicate in the enforcer/service
  · when: static (presence) + AI review (correctness)

```check scope=plan
# Row-level scope is judgment, not greppable. SOURCE/API concern (the enforcer is code
# on the real API), so gate on api — a design-only plan (no api loaded) never fires it.
WHEN  "api" IN $plan.loaded
ASK   "Are the entity ## Operations 'Scope' rules (e.g. 'employees who report to the acting manager', 'the acting employee') applied as a row-filter predicate per operation on the real API — not just the role check? Point to where each scoped operation restricts rows."
```

### Single-tier live page (one tier = production)  `[feature: single-tier-live-page]`

- Do the live pages live at `src/web/src/pages/` (**one tree**), with fake-API tooling under
  `tools/fake-api/` — **no separate mock-up/prototype UI location**?
  · evidence: directory layout
  · when: static
- Is there **one file per page** — each page spec realized as its own `src/web/src/pages/<page>.tsx`,
  not collapsed into `App.tsx` or a single file?
  · evidence: one `pages/<page>.tsx` per page in `UI/ui-catalog.md`
  · when: static

### Stable selectors  `[feature: stable-selectors]`

- Do important elements carry stable selectors / accessible labels (`id`/`data-testid`)?
  · evidence: page source selectors
  · when: static

```check scope=plan
# UI design compliance — DETERMINISTIC core, cross-cutting over all page artifacts
# (scope=plan scanning $plan.trace): every page must carry stable selectors
# (data-testid) so it is test- and annotation-addressable.
EVERY $t IN $plan.trace WHERE $t.type IS "source"  AND  $t.path MATCHES "src/web/src/pages/.*\.tsx$"
THEN  $t.content CONTAINS "data-testid"
  ELSE "page has no stable selectors (data-testid) — not test/annotation-addressable"
```

<!-- semantic (AI pass, not a `check` block): "does every action the page spec's
     ## Actions declares have a corresponding stable selector / control?" needs
     the AI to distinguish primary page actions (a button + testid) from inline
     sub-actions ("Add skill" within a profile). $spec.page[$item.page].actions
     lists them; the AI judges coverage. A crude substring match over-flags inline
     actions, so the precise action↔selector mapping is a semantic check. -->

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

### UI screenshots  `[feature: ui-screenshots]`

- For UI-bearing plans, were screenshots captured from the running UI (one per page + per happy
  path), stored under evidence, listed in `evidence.md`, recorded in the manifest (uncapturable
  → reported, not skipped)?
  · evidence: `reports/evidence/screenshots/` + `evidence.md`
  · when: requires-environment
- Are the captured screenshots **attached to the Cucumber report** (via `this.attach(buf,
  'image/png')`) so the generated `cucumber.html` shows them inline — not merely written to the
  evidence folder?
  · evidence: image attachments embedded in `cucumber.html`
  · when: requires-environment
- Is each suite's Cucumber HTML report written to its **declared path** — `reports/evidence/tests-ui/`
  for the UI/E2E suite, `reports/evidence/tests-api/` for the API suite, `reports/evidence/tests-business-rules/`
  for the business-rules suite — not an ad-hoc location?
  · evidence: the suite's Cucumber config `html` formatter target; the report file present at
    that path after a run
  · when: static (config target) + requires-environment (report present after run)

### UI states (empty/loading/error/success)  `[feature: ui-states]`

- Are empty, loading, error, and success states represented where relevant?
  · evidence: page source for each state + E2E reaching them (screenshots)
  · when: static (states present) + requires-environment (rendered proof)

### User profile in header (avatar, top-right)  `[feature: user-profile-header]`

- Does the app shell render a user-profile control at the **top-right of the header on every
  page** (in the shell/layout, not duplicated per page), showing an **avatar** + the user's
  **display-label** (not a raw id)?
  · evidence: shell/layout source — the header profile control + avatar + name binding
  · when: static
- Does the control provide a menu with **sign out** (and **switch user** where the switcher
  applies), rather than being a static badge?
  · evidence: profile control source — the actions/menu
  · when: static

```check scope=item
# The app shell must carry a top-right profile control with an avatar. Checks the
# shell/layout/App source for a profile/avatar element. Generation smell this
# catches: a UI with no identity affordance in the header at all.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/(App\.tsx|.*([Ll]ayout|[Ss]hell|[Hh]eader).*\.tsx)$"
THEN  $item.content MATCHES "([Aa]vatar|[Pp]rofile|user-menu|userMenu)"
  ELSE "app shell has no top-right user-profile/avatar control — every page should show the acting user (avatar + name) in the header"
```
