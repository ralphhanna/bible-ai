---
type: target
id: TARGET-ARCHITECTURE
title: Architecture Target Profile
applies_when:
  - a plan selects or changes the implementation architecture (design-time — diagrams, layering, decisions; source realization is checked under the server/api/persistence targets)
---

# Architecture Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

Architecture should preserve capability isolation and prevent AI-generated source from becoming tangled.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| architecture-doc | specs/design/architecture.md | — | always |
| architecture-diagram | docs/diagrams/architecture.md | — | always |
| interaction-diagram | docs/diagrams/interactions.md | — | always |
| shared-infra-source | src/server/shared/ | — | server |

## Composed behavior

### Adapter isolation  `[feature: adapter-isolation]`

The adapter is the integration boundary in the architecture + interaction diagrams (see
`architecture-diagram`, `interaction-diagrams`).

### Architecture design  `[feature: architecture-design]`

The recorded architecture is what the Architecture target's layering/boundary checks and the
architecture/interaction diagrams are verified against.

### Architecture diagram (static structure)  `[feature: architecture-diagram]`

When source/architecture is in scope, render a Mermaid `flowchart` in
`docs/diagrams/architecture.md` (under `## Architecture`): each in-scope capability as a
grouped `subgraph` of its layers, plus shared modules and DB/external systems; cross-capability
edges drawn **only** through APIs/interfaces (never into another capability's internals). Every
node traces to a capability design or a shared module.

### Authentication (real auth + guarded dev bypass)  `[feature: authentication]`

A single **authentication boundary** (middleware/guard) resolves the acting user at the inbound
edge and hands [[user-identity]] the principal — the rest of the stack is auth-agnostic:

- **One path, one boundary.** Real verification runs at the boundary; the principal it produces is
  the **single hand-off** to [[user-identity]]. Downstream layers (services, repositories, the
  access enforcer) never see credentials/tokens — only the resolved principal.
- **The dev bypass is one early-return at that boundary**, not a second resolver and not
  `if (dev)` branches scattered through handlers. When the bypass is active, the boundary returns a
  seeded principal *instead of* verifying; when it is not, the real check runs. Same downstream
  shape either way.
- **Security basics:** credentials are never stored in plaintext (hash+salt via the stack's
  scheme), sessions/tokens are signed and expire, and secrets come from the environment
  ([[env-contract]]), never hard-coded.

### Capability API boundary  `[feature: capability-api-boundary]`

The API boundary is the only sanctioned cross-capability edge (see `layering-boundaries`); its
existence also flips that capability's pages to the real API (see `data-source-switch`).

### Capability slices  `[feature: capability-slices]`

The application is structured as capability slices: each in-scope capability is a grouped
slice containing its layers (UI/page → API/route → service/use-case → repository/adapter),
plus shared modules and the database/external systems. The slice is the unit the architecture
diagram groups and the layering checks apply within.

### Capability vertical slices (source)  `[feature: capability-vertical-slices]`

The source layout realizes the architecture's capability slices (see `capability-slices`).

### Request context propagation  `[feature: context-propagation]`

The boundary establishes the context **once** and passes it down — a request-scoped object (e.g.
`{ correlationId, principalId }` plus the transaction handle) threaded into service and repository
calls. A layer that **re-derives** its own correlation id, resolves its own principal, or opens its
own transaction breaks the invariant: the whole point is that one request = one context, seen
identically at every layer. This is what lets a repository line be attributed to the same request
as the route that triggered it, and a multi-repository write share one transaction.

### Cross-cutting concerns  `[feature: cross-cutting-concerns]`

Cross-cutting concerns — validation, authentication/authorization, logging, error handling,
and transactions — are explicit (where they live, how they apply across layers), not implicit
or duplicated per route. Validation happens at API/UI and important business-rule boundaries.

**Request context (the blessed propagation pattern).** The per-request cross-cutting data —
`correlationId` (logging), `principalId` (identity/access), and the **transaction/connection**
(atomicity) — is carried in **one request-scoped context object** established at the request
boundary and **threaded through** the service and repository layers. This is deliberately a
*single* object passed around (e.g. `ctx: { correlationId, principalId, tx }`, or a
request-scoped `logger.child({ correlationId, principalId })` alongside the active connection) —
**not** three separately re-derived values per layer. Merging these into one context is the
intended design, not a smell: it is what makes logs correlate (`logging`), requests attributable
(`user-identity`), and multi-write use cases atomic (`transaction-boundaries`) with a single
threaded value. A layer that re-derives its own correlation id, or opens its own transaction
instead of using the context's, breaks the pattern. The individual capabilities own their field's
*content*; this concern owns that they travel **together, established once, passed down**.

### Entity operations and access control  `[feature: entity-operations-and-access]`

One **shared enforcer** reads the operations and enforces them: soft in the prototype (a view
filter), binding on the real API. `mde go` records the resolved row-filter so prototype and
real API share one contract (see `shared-access-enforcer`).

### Interaction diagrams  `[feature: interaction-diagrams]`

When significant use cases / cross-capability flows are in scope, render each as a Mermaid
`sequenceDiagram` in `docs/diagrams/interactions.md` (under `## Interaction Diagrams`), one per
key use case, titled with the use case it traces to. Participants are real collaborating
boundaries (actor → UI → API → service → repository → DB/external); show request + response per
step; mark error/alternate paths with `alt`/`opt`. One use case per diagram; cross-capability
flows cross boundaries only through APIs. Every diagram traces to a use case + the APIs/services
it exercises.

### Layering and boundaries  `[feature: layering-boundaries]`

- Capabilities communicate through APIs or defined interfaces; one capability must not reach
  into another's internals.
- UI calls APIs/adapters, not persistence directly; routes/controllers delegate to
  services/use-cases; services/use-cases own business behavior; repositories/adapters own
  persistence.
- External-system boundaries follow the Integration target (app-owned interface + adapter).

### Logging  `[feature: logging]`

Logging is a named cross-cutting concern with **one mechanism** (a logger the app constructs once
and shares). It is not a substitute for audit history (business "who changed what" lives in
`audit-history`); logging is operational.

**Where log lines are emitted (log points).** A **hard core** is always logged; the rest is a
judgment the generator makes toward useful, non-noisy operational visibility.

| Log point | Rule |
|---|---|
| **request boundary in / out** | **must** — one line as a request enters, one as it completes (with outcome/status) |
| **caught errors** | **must** — logged where handled, never swallowed silently |
| transaction outcome | good practice — commit / rollback of a write's unit of work (a read has none) |
| service / use-case operations | good practice — a line at `info` for a significant business operation |
| DB calls | good practice — `debug` only; avoid logging every query/row |

Good practice is to log the points that let a reader **trace a request end to end and diagnose a
failure** — and to avoid the two failure modes: too little (a request you cannot follow) and too
much (per-row noise, or the same event double-logged at multiple layers). The two **must** points —
**request boundary and caught errors** — are non-negotiable because they are the minimum a request
needs to be traceable: and, per [[required-operation-ui-coverage]], the boundary line is the trace a
test's captured log must show to prove it did real work.

**Required structured labels (a contract — not `e.g.`).** Every log emitted while serving a
request carries these named fields, taken from the propagated request context (see
[[context-propagation]] — logging *consumes* that context, it does not establish it):

| Label | Meaning |
|---|---|
| `correlationId` | one id per inbound request, stable for its whole lifetime (from the request context) |
| `principalId` | the acting principal (from the request context) |
| `level` | error / warn / info / debug (set at the log call) |

The correlation guarantee — that a service/repository log line carries the **same** `correlationId`
as its route — is the [[context-propagation]] invariant; logging relies on it. The names above are
the contract: not a request-id under a different key per module.

### Repository pattern  `[feature: repository-pattern]`

Each capability that owns persistence exposes a **repository** (or equivalent data-access
interface): services/use-cases depend on the repository interface, the repository owns the SQL
/ driver / mapping, and nothing above it touches the database directly. This is the concrete
form of the layering rule "repositories/adapters own persistence" — the repository is that
boundary.

### Semantic references in generated text  `[feature: semantic-references]`

Architecture narrative tags **every concept** it references as `{{kind:slug}}` rather than naming
it in bare prose.

### Shared access enforcer  `[feature: shared-access-enforcer]`

A single enforcer component consumes the entities' operations + resolved scope filters
(recorded by `mde go`) and applies them. There is no per-capability bespoke ACL code and no
`access-policy.md`.

### Transaction boundaries  `[feature: transaction-boundaries]`

The **service / use-case layer owns the transaction**: a use case that mutates more than once
(or across repositories) opens a transaction, and all its writes participate in it. Repositories
**accept** a transaction/connection rather than each opening their own — so the boundary is the
business operation, not the individual query. Read-only use cases need none.

### User identity context  `[feature: user-identity]`

A **principal / identity context** object (acting user id, role ids, tenant id, and any scope
attributes the operations need) is constructed at the inbound boundary (route/middleware) and
**threaded explicitly** through service → repository as a parameter or request-scoped context —
not read from a global/singleton or re-parsed deep in the stack. The **shared access enforcer**
consumes this object (it does not build its own); the resolved access-scope filters are
evaluated against it.

## Validation checks

### Adapter isolation  `[feature: adapter-isolation]`

- Does capability code depend on an app-owned interface (not vendor types), with a dedicated
  adapter owning transport/mapping/auth/retries/error-translation?
  · evidence: source boundaries (domain vs. adapter)
  · when: static

### Architecture design  `[feature: architecture-design]`

- Does architecture reference the declared stack and keep UI/API/service/persistence/
  integration concerns separated?
  · evidence: `specs/design/architecture.md`
  · when: static
- Is each architecture artifact traceable to business specs?
  · evidence: architecture ↔ capability/entity links
  · when: static

### Architecture diagram (static structure)  `[feature: architecture-diagram]`

- When source/architecture is in scope, is there a static architecture diagram in
  `docs/diagrams/architecture.md` showing capability slices + layers, with cross-capability
  edges only through APIs and every node tracing to a design?
  · evidence: `docs/diagrams/architecture.md`
  · when: static

### Authentication (real auth + guarded dev bypass)  `[feature: authentication]`

- Is authentication resolved at a **single boundary** producing the principal [[user-identity]]
  threads down — real verification always present (not a separate fake implementation), with the
  dev bypass as one guarded early-return, not credential handling scattered through handlers?
  · evidence: the boundary module + the bypass early-return + startup guard
  · when: static
- Are credentials verified using the **stack's recorded auth technique** (`tech-stack.md`) — never
  stored/compared in plaintext — with sessions/tokens signed and expiring, secrets from the
  environment, and unauthenticated requests rejected with `401` (distinct from authZ's `403`)?
  · evidence: `tech-stack.md` auth axis + login/verify path, token handling, env-sourced secrets, 401 vs 403
  · when: static
- Is the dev bypass **fail-closed**: off by default, unable to activate under a production config
  (startup refuses/ignores), and loud when active?
  · evidence: the bypass flag handling + the production guard + the active-bypass log/indicator
  · when: static
- Is the auth **technique** recorded in `tech-stack.md` (scheme + hashing/library) rather than an
  ad-hoc choice, and is the **real** auth path covered by at least one E2E test (not only the
  bypass)?
  · evidence: `specs/design/tech-stack.md` auth axis + an E2E test through the real login
  · when: static + requires-environment
- Does persistence realize what the **recorded mechanism** requires — for local-db, an identity
  entity with a credential aspect (hashed password column, role link) in the schema, and seeded
  users with **hashed** passwords (the bypass's seeded people as real rows)? For a non-local
  mechanism, no password column is forced (external subject id instead)?
  · evidence: identity entity `## Storage View` + migration + hashed-password seeds vs. the auth axis
  · when: static + requires-environment

```check scope=item
# Real-auth safety (POLICY, not technique): an auth/login source must not COMPARE a
# password in plaintext. Flags the classic `password === input` / `password ==`
# equality-compare smell. It does NOT prescribe a library — bcrypt/argon2/scrypt or
# the stack's chosen scheme all satisfy it by NOT doing a plaintext compare; the
# *technique* is the stack's call (tech-stack.md auth axis), the *no-plaintext* rule
# is the method's.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/server/.*(auth|login|session).*\.(ts|js|mjs)$"
THEN  $item.content NOT MATCHES "[Pp]assword\w*\s*===?\s*"
  ELSE "auth source compares a password in plaintext (`password === …`) — verify credentials via the stack's chosen hashing scheme (tech-stack.md), never a plaintext compare"
```

```check scope=item
# Bypass must be prod-guarded: an auth boundary that reads a bypass/dev flag must also
# reference a production guard (NODE_ENV/production) so the bypass can't activate in
# prod. Flags a bypass flag with no prod guard in the same file — fail-open risk.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/server/.*(auth|login|session|middleware).*\.(ts|js|mjs)$"
  AND $item.content MATCHES "(AUTH_BYPASS|BYPASS_AUTH|DEV_AUTH|authBypass|devLogin|bypass)"
THEN  $item.content MATCHES "(production|NODE_ENV|isProd|PROD)"
  ELSE "auth bypass flag present with no production guard in the same module — the bypass must fail closed (refused when NODE_ENV=production); add the prod guard"
```

### Capability API boundary  `[feature: capability-api-boundary]`

- Does each implemented capability expose its own API boundary, with endpoints mapping to use
  cases and cross-capability access only through APIs?
  · evidence: `src/server/<cap>/` routes
  · when: static
- Does **every entity operation** (CRUD **and** lifecycle) have a route handler implementing it,
  marked `// MDE: <entity>.<op>`? (The API twin of `gherkin-traceability` over the same
  operation set.)
  · evidence: a marked route handler per `entity.op`
  · when: static

### Capability slices  `[feature: capability-slices]`

- Is source organized by capability/vertical slice, each slice owning its layers with shared
  modules factored out?
  · evidence: source directory structure
  · when: static

### Capability vertical slices (source)  `[feature: capability-vertical-slices]`

- Is source organized by capability/vertical slice when capability-based?
  · evidence: source directory structure
  · when: static
- Does each server slice have **one file per layer** — `<Slice>Types`, `<Slice>Repository`,
  `<Slice>Service`, `<Slice>Routes` as separate files (a slice with a Service/Routes but no
  Repository, or layers collapsed into one file, is drift)?
  · evidence: slice directory file set
  · when: static
- Does every entity operation implemented by a slice carry the `// MDE: <entity>.<op>` marker at
  its Service method **and** its Repository method (the same convention Routes already carries)?
  · evidence: marked Service/Repository methods per `entity.op`
  · when: static

### Request context propagation  `[feature: context-propagation]`

- Is a **single request context** (`correlationId`, `principalId`, and the transaction/connection
  where writes occur) established once at the boundary and **passed** through the service/repository
  layers — rather than each layer re-deriving its own id, principal, or transaction?
  · evidence: request-boundary source (context construction) + lower-layer signatures receiving it
  · when: static

```check scope=plan
# Judgment layer: threading is a design property a regex can't fully decide. The request
# context (correlationId + principalId + the transaction/connection for writes) is a SINGLE
# object established at the boundary and passed down — a repository sees the SAME context as
# its route. This is the invariant [[logging]] then relies on to correlate log lines.
WHEN  "server" IN $plan.loaded
ASK   "Is one request context (correlationId, principalId, and the transaction/connection where writes occur) established once at the request boundary and PASSED through the service and repository layers — so a repository operates under the SAME correlationId and transaction as its route, rather than re-deriving its own? Writes within a request must share one transaction, not open a fresh connection per repository."
```

### Cross-cutting concerns  `[feature: cross-cutting-concerns]`

- **(design)** Are cross-cutting concerns (validation, auth, logging, errors, transactions)
  explicit in the architecture rather than scattered ad hoc?
  · evidence: architecture doc
  · when: static
- **(source)** Is a **request context** (`correlationId` + `principalId` + transaction/connection)
  established at the boundary and passed through the layers as one object — not re-derived per
  layer?
  · evidence: boundary middleware building the context + service/repo signatures taking it
  · when: static (shape) + AI review (threading)

```check scope=plan
# Judgment: the ONE request context established at the boundary and threaded down.
# SOURCE check — gated on server, so a design-only plan never fires it.
# Deterministic sub-parts live in logging (labels reach logs) and transaction-boundaries
# (a transaction is used in services); this [ASK] owns that they are the SAME object
# passed through, not three re-derived values.
WHEN  "server" IN $plan.loaded
ASK   "Is there ONE request-scoped context (correlationId, principalId, and the transaction/connection) built at the request boundary and passed through the service/repository layers — rather than each layer re-deriving its own id or opening its own transaction? A single context object threaded down is the intended design."
```

### Entity operations and access control  `[feature: entity-operations-and-access]`

- Does each owned entity declare `## Operations` (Create/Update, Read as List + Read-one,
  Search/Delete present-or-reasoned, plus lifecycle + use-case actions), each with permitted
  roles + a resolvable scope predicate?
  · evidence: entity `## Operations` sections
  · when: static
- Is access modeled only on operations (no `access-policy.md`, no `kind: access` rule)?
  · evidence: absence of access-policy artifacts
  · when: static

```check scope=plan subject="Entity Operations" whenFailed="designed entities declare no operations" whenPassed="designed entities declare their operations"
# designEntities = every entity spec this plan produced.
# hasOperations = the spec's ## Operations lists at least one operation.
# This check (design stage): a designed entity must enumerate its operations — the
#   authoritative set every downstream coverage check (API, tests, ACL) depends on.
EVERY $ent IN $plan.designEntities
THEN  $ent.hasOperations IS "true"
  ELSE "entity spec declares no ## Operations — the operation set is undefined; API/test/ACL coverage cannot be verified against it; see ref"
```

```check scope=plan subject="Access Design" whenFailed="entities have operations with no permitted roles defined" whenPassed="entities define permitted roles for all operations"
# allOperationsHaveRoles = every operation in the spec lists ≥1 permitted role
#   (operationsMissingRoles names any that don't).
# This check (design stage): access is defined AT DESIGN TIME — every operation states
#   who may perform it. Without this the implementation ACL check has no roles to
#   enforce; "no permission check" at code gen is really an undefined design here.
EVERY $ent IN $plan.designEntities WHERE $ent.hasOperations IS "true"
THEN  $ent.allOperationsHaveRoles IS "true"
  ELSE "entity has operations with no permitted roles defined — access is undefined in the design (see operationsMissingRoles); the implementation cannot enforce what the design didn't specify; see ref"
```

<!-- designOpCoverage (app.designOpCoverage in model.mjs): every operation an ENTITY declares
     (specs/business/entities/*.md ## Operations) must be REALIZED by a use case — referenced by
     an `operation:` uri in some use case's ## Realization section. The coverage denominator is the
     use-case realization, NOT a restated API table in the capability overview (code-first: the
     HTTP contract is the generated openapi.yaml, access lives on the entity operation). An op no
     realization names is orphaned; an op a realization names that no entity declares has drifted
     from the BA. scope=system: entity operations are a whole-app set, so this runs at
     `mde review app`, not per-plan. Vacuous until realizations exist (inScope guards it). -->
```check scope=system
WHEN  $app.designOpCoverage.inScope IS "true"
THEN  $app.designOpCoverage.complete IS "true"
  ELSE "design does not realize every declared entity operation — ${$app.designOpCoverage.missingCount} of ${$app.designOpCoverage.entityOpCount} entity operations are referenced by no use-case ## Realization (missing: ${$app.designOpCoverage.missing}). Every operation an entity declares must be realized by a use case (or removed if the domain never uses it); a design that realizes a subset has silently narrowed the BA."
```

### Interaction diagrams  `[feature: interaction-diagrams]`

- When significant use cases are in scope, are there interaction diagrams in
  `docs/diagrams/interactions.md` (one per key flow) with real collaborating boundaries,
  request/response per step, and error paths, each tracing to a use case?
  · evidence: `docs/diagrams/interactions.md`
  · when: static

### Layering and boundaries  `[feature: layering-boundaries]`

- Do capabilities communicate only through APIs/interfaces, with no capability reaching into
  another's internals?
  · evidence: source import graph / boundaries
  · when: static
- Are layers respected (UI→API/adapter, routes→services, services own logic, repos own
  persistence)?
  · evidence: source layering
  · when: static

### Logging  `[feature: logging]`

- Does generated source log through one shared structured logger (not ad-hoc `console.*`),
  with consistent levels, and never logging secrets/sensitive payloads?
  · evidence: source — logger usage + the single logging setup
  · when: static
- Are the **hard-core log points** present — a line at the **request boundary in/out** and at
  **caught errors** (never swallowed) — and do request-serving log lines carry the required labels
  `correlationId` + `principalId` (from the request context)?
  · evidence: request-boundary source + error-handling + log-call labels
  · when: static

```check scope=plan
# logCallBlob = only the lines that are actual logger calls / .child() context (not the
#   whole file), so a label defined in a type but never logged does NOT pass.
# This check: log calls must carry 'correlationId'. A single request-context object —
#   logger.child({ correlationId, principalId }) or ctx carrying them — satisfies it
#   (merging the fields is the intended design). Propagation across layers is the [ASK].
WHEN  "server" IN $plan.loaded
THEN  $plan.logCallBlob MATCHES "correlationId"
  ELSE "no log call carries 'correlationId' — request lines cannot be correlated (the label may be typed but is never logged); see the logging label contract + request-context pattern"
```

```check scope=plan
# This check: log calls must carry 'principalId' (see logCallBlob above) so a request
#   is attributable to its acting principal.
WHEN  "server" IN $plan.loaded
THEN  $plan.logCallBlob MATCHES "principalId"
  ELSE "no log call carries 'principalId' — a request cannot be attributed to its acting principal (the label may be typed but is never logged)"
```

```check scope=plan
# Judgment layer: log-point discipline + redaction a regex can't decide. (Context
# threading is [[context-propagation]]'s ASK, not repeated here.)
WHEN  "server" IN $plan.loaded
ASK   "Are the hard-core log points present (a line at the request boundary in/out, and caught errors logged where handled rather than swallowed) without over-logging (no per-row DB noise, no double-logging the same event across layers)? Do logs never contain secrets or full sensitive payloads (auth headers, password, token redacted)?"
```

### Repository pattern  `[feature: repository-pattern]`

- Does each persistence-owning capability access the database through a repository (interface +
  implementation), with services depending on the interface and no direct DB access above it?
  · evidence: source layering (repository modules; no driver use in routes/services/pages)
  · when: static
- Does row↔domain mapping live in the repository (not leaked into services/UI)?
  · evidence: repository source
  · when: static

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

### Transaction boundaries  `[feature: transaction-boundaries]`

- Does each multi-write use case run inside a single transaction owned by the service/use-case
  layer, with repositories participating (not each opening their own)?
  · evidence: service/use-case source + repository signatures
  · when: static
- Does a mid-operation failure roll back the whole unit (no partial commit), with no transaction
  opened in routes or held across user think-time?
  · evidence: transaction-handling source + a failure-path test
  · when: static (code) + requires-environment (failure test)

<!-- Deterministic part is only "the MECHANISM exists" — a transaction helper
     (withTransaction/unitOfWork/BEGIN) is present in the source when persistence is in
     scope. "Every MULTI-WRITE use case uses it, with rollback, repos participating" is
     NOT reliably greppable (it needs to know which use cases do >1 write), so it is an
     [ASK]. We deliberately do not fake a deterministic assertion we cannot trust. -->
```check scope=plan
# serviceBlob = the concatenated source of the service layer (src/server/*Service.ts).
# This check: a transaction must actually be USED in a service — a call to a helper
#   (withTransaction/unitOfWork/…) or a request context carrying it (ctx.tx, tx.query).
#   A helper merely DEFINED in db.ts that no service calls doesn't count. Whether each
#   multi-write use case is atomic (rollback, repos participating) is the [ASK] below.
WHEN  "persistence" IN $plan.loaded
THEN  $plan.serviceBlob MATCHES "(withTransaction|unitOfWork|beginTransaction|runInTransaction)\s*[(<]|\b(ctx|context)\.(tx|trx|transaction|connection)\b|\b(tx|trx)\.(query|commit)\b"
  ELSE "no transaction is used in the service layer (a helper/context.tx may be defined but no use case wraps its writes) — multi-write use cases are not atomic; see transaction-boundaries + the request-context pattern"
```

```check scope=plan
# Judgment layer: the boundary is correct, not just present.
WHEN  "persistence" IN $plan.loaded
ASK   "Does each MULTI-WRITE use case run inside ONE transaction owned by the service/use-case layer (repositories accept the active connection, not each opening their own), with a mid-operation failure rolling back the whole unit and no transaction opened in routes or held across user think-time?"
```

### User identity context  `[feature: user-identity]`

- Is there a single identity/principal context object (user, roles, tenant) built at the
  boundary and passed through the layers — not read from globals or re-derived deeper down?
  · evidence: source — where the context is constructed and how it is propagated
  · when: static
- Does the shared access enforcer consume this context (rather than building its own identity),
  and do services/repositories receive identity/scope as input?
  · evidence: enforcer + service/repository signatures
  · when: static
