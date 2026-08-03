---
type: target
id: TARGET-PERSISTENCE
title: persistence
applies_when:

requires:
  - testing
  - documentation
inputs:
  - tech-stack
  - derived: from tech-stack — the database it selects, reachable, plus its connection string
---

# persistence

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

Persistence must reflect the entity model without making entities artificially owned by one capability.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| migration | db/migrations/{n}_{name}.up.sql | — | always |
| repository | src/server/{cap}/{Cap}Repository.ts | business-capability | always |
| seed-data | db/seeds/{n}_seed.sql | — | always |
| rule-enforcement | src/server/{cap}/{Cap}Repository.ts (constraint) | business-rule | always |
| db-report | reports/evidence/db-report.json | — | always |

**`db-report.json` is the proof the database actually exists** — a captured `mde:db-report`
run against the live `DATABASE_URL` (health + schema summary + detail). It is a **required
output**, so a persistence plan's manifest must contain it and the verifier's mandated-output
gate fails when it is missing: a plan cannot claim it built persistence while having no evidence
the database is real and reachable. Its health section must show `pass` and its summary must
list the tables the plan's migrations declare — a report showing `fail`, or an empty schema
where migrations should have produced tables, is a blocker, not a satisfied output.

## Composed behavior

### Audit history  `[feature: audit-history]`

An entity that requires auditing declares it in design: the **audit fields** it carries
(`created_at` / `created_by` / `updated_at` / `updated_by` at minimum) and, when full change
history is required, a **history mechanism** (a `<entity>_history` table or an append-only
change log) — recorded in the `## Storage View`. Auditing is opt-in per entity and driven by a
business rule or use case that asks for it; the design names which entities are audited and to
what depth (fields-only vs. full history).

### Authentication (real auth + guarded dev bypass)  `[feature: authentication]`

**Persistence generation reads the recorded auth mechanism (`tech-stack.md` auth axis) and must
implement whatever schema it requires — creating it when the business model does not already have
it.** The default mechanism is **local-db (username + password)**. Most business specs will **not**
have modeled an identity entity, so the AI **must add** one: an **identity entity** (e.g. `User` /
`Account`) carrying a **credential aspect** — the stored `password-hash` (never plaintext, per the
stack's hashing scheme) plus whatever the scheme needs (salt, token/reset fields) — and a
relationship to the app's roles. Do not skip it because BA never mentioned a user table; a
local-db auth app is incomplete without it. Because identity is an **entity with an aspect**, it
then flows through the **normal** entity → `## Storage View` → schema/migration → seed pipeline
([[schema-from-entities]], [[audit-history]] for the credential aspect); there is **no** separate
auth-only schema mechanism — the AI creates the entity and lets the standard pipeline realize it.

- The identity entity's storage view realizes the credential columns (hash, not plaintext) and the
  role link; migrations create the table like any other entity's.
- **Seeds create real users** — the seeded people the dev bypass acts as become real rows with
  **hashed** passwords ([[meaningful-seed-data]]), so the real login path works against seed data
  and the bypass and real path share one user set.
- For a **non-local mechanism** (OAuth/OIDC, SSO), there may be **no** password column at all — the
  identity entity stores the external subject id / provider instead. The persistence shape follows
  the recorded mechanism; the method does not force a password column when the mechanism has none.

### Constraints and keys  `[feature: constraints-and-keys]`

Foreign keys/constraints are deliberate and aligned with the design model. Audit/history fields
are explicit when needed, not accidental. PostgreSQL-specific behavior is documented when used.

### Entity model  `[feature: entity-model]`

The design phase fills the entity file's `## Storage View`:

- columns,
- database types,
- indexes,
- constraints,
- migrations.

Do not create a separate `specs/design/entities/` file. The entity remains single-sourced.

Business properties become persistence columns or relationships only during design. Aspects may introduce technical columns such as `id`, `version`, `created_at`, or `updated_at` in Storage View.

### Meaningful seed data  `[feature: meaningful-seed-data]`

Seed data (`db/seeds/*`) is **meaningful** and **conforms to the physical model** (Storage Views,
enums); governed values come from the model, only free-text is fabricated. It carries a
**realistic volume**: at least the configured `minRecords` floor (**default 30**) per primary
entity, so listing/filter/sort/paging are meaningful downstream. Set
`capabilitySettings.meaningful-seed-data.minRecords` in `specs/design/mde-policy.md` to override
for this application. Generated from the model — never hand-authored row by row.

### Optimistic locking  `[feature: optimistic-locking]`

An entity that is concurrently editable declares a **version field** in its `## Storage View`
(e.g. an integer `version` or a `row_version`/`updated_at` used as a concurrency token). The
design records which entities require optimistic locking and which token they use (the default
is no locking — it is opt-in per entity, with a reason when an editable entity omits it).

### Persistence integration test (real schema, no mocked DB)  `[feature: persistence-integration-test]`

A plan touching `db/migrations/*` or `db/seeds/*` must be exercised against a real schema, not
mocks. A persistence layer exercised only through mocks is unverified.

### Repository pattern  `[feature: repository-pattern]`

The repository is the single place the schema is queried for its capability — so schema
changes have one consumer to update, and the persistence-integration test drives the **real**
repository against the **real** schema (see `persistence-integration-test`).

### Runnable migrate/seed (no orphaned SQL)  `[feature: runnable-migrate-seed]`

A plan introducing persistence adds: `package.json` scripts (or stack equivalent) to apply the
schema and load seeds — `migrate`, `seed`, `db:reset` — backed by a real migration tool or a
committed runner script; plus a documented one-command bring-up (install → migrate → seed →
start). **Orphaned SQL** — migration/seed files no script or source applies — is a defect even
if the files are correct.

**Each migration applies atomically.** A single migration — its schema statements *and* the
record marking it applied — either all takes effect or none does. A migration that fails
part-way must leave the database as if it never ran, not half-migrated. (A real migration tool
gives this; a hand-rolled runner must too.)

### Schema from entities  `[feature: schema-from-entities]`

Schema/migrations follow the confirmed entity model + each entity's `## Storage View`. Entities
remain shared concepts unless explicitly scoped otherwise. Foreign keys/constraints are
deliberate and aligned with design; audit/history fields are explicit when needed.
PostgreSQL-specific behavior is documented when used.

### Storage View (physical model)  `[feature: storage-view-model]`

The design phase fills each entity's `## Storage View` section (schema columns + DB types,
indexes, uniqueness/constraints) using the entity template. It MUST NOT create a separate
`design/entities/` file or restate the business attributes already above.

**Each filled entity gets its own manifest entry.** Verification discovers "the entities this
design plan is responsible for" (`$plan.storageDesignEntities`) **from the manifest**, not by
re-scanning `specs/business/entities/` on disk — so an entity whose `## Storage View` was filled
but whose file was never recorded as a manifest entry (`action: modify`, `outputType:
entity-spec` or `business-spec`) is **invisible** to the design-completeness check below, and the
gap goes undetected rather than failing loudly. So every entity the plan fills a Storage View
for MUST appear in `output.manifest` as its own entry — do not fold it into
`specs/design/persistence-design.md`'s entry alone (that document's own `sourceRef` legitimately
self-references its own path, not the entities it designed for; it does not substitute for the
per-entity entries).

### Transaction boundaries  `[feature: transaction-boundaries]`

The repository layer participates in the caller's transaction (same connection) rather than
auto-committing per call, so the service's boundary is honoured at the database.

### Versioned migrations  `[feature: versioned-migrations]`

The agent computes the diff between the current schema and the target schema, and applies it as
**one** migration — one up/down pair per version bump, not one per table/entity/plan. Each new
migration increments the version (`00N_<name>.up/.down.sql`).

Migrations under `db/migrations/*` are versioned and ship as an **up/down pair**. Each versioned
change is **two files**: `<NNN>_<name>.up.sql` (apply) and `<NNN>_<name>.down.sql` (roll back the
*same* change — drop what the up created, revert what it altered). A migration with an up but **no
down** is a defect: the change cannot be reversed. The down is the deliberate inverse, not a
placeholder; for a genuinely irreversible/destructive change the down states so explicitly and the
change carries the user's confirmation and evidence. Migrations (both files) and seed data are
recorded in the manifest.

**Applied migrations are tracked — the runner is idempotent, not a blind re-run.** The app
maintains a **`schema_migrations`** table that records which migrations have been applied, so
`mde:db-report`/the runner knows the DB's current version and re-running the migrate step does
**not** re-apply already-applied migrations. The runner, on each apply: ensures the tracking table
exists, reads the applied set, applies **only** the pending `<NNN>_<name>.up.sql` in version order,
and records each one it applies. Applying every `.up.sql` unconditionally on every run — with no
tracking — is a defect (it is not idempotent and breaks on a partially-migrated DB).

The tracking table is a fixed contract:

```sql
CREATE TABLE schema_migrations (
  version    VARCHAR(100) PRIMARY KEY,           -- the migration's <NNN> version id
  name       VARCHAR(255) NOT NULL,              -- the migration name (<NNN>_<name>)
  checksum   VARCHAR(255),                       -- hash of the up.sql, to detect a changed migration
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

- **`version`** is the primary key — a migration applied twice is impossible; the runner skips
  any version already present.
- **`checksum`** lets the runner detect a **changed already-applied migration** (the file was
  edited after being applied) — a mismatch is reported, not silently ignored (an applied migration
  should be immutable; edit forward with a new migration instead).
- A **down** (rollback) removes its version's row so the DB version moves back.
- The `schema_migrations` table is infrastructure, not a business entity — it is not modelled as an
  entity spec; it is created/owned by the migration runner.

**Database apply safety.** *Generating* migration files is repository work (Git-reversible);
*applying* them to a database is runtime work (not assumed rollback-safe — see RULE-CORE-001
"Database/runtime exception"). Before applying schema/data changes, the plan must record a rollback
strategy — **backup-restore** or **reverse-migration** (the paired `.down.sql` above is the
reverse-migration strategy). Destructive, forward-only, or data-changing migrations require explicit
user confirmation before apply.

## Validation checks

### Audit history  `[feature: audit-history]`

- For each entity the design marks as audited, are the declared audit fields present in the
  schema (and the history table/log present when full history is required)?
  · evidence: schema/migrations vs. the audited-entity list in design
  · when: static
- Is history written on the mutation path (not optional/bypassable), and are audit rows not
  app-editable?
  · evidence: repository/trigger/service write path
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

### Constraints and keys  `[feature: constraints-and-keys]`

- Are FKs/constraints deliberate and aligned with design, and are audit/history fields explicit
  where needed?
  · evidence: schema/migrations vs. entity design
  · when: static

### Entity model  `[feature: entity-model]`

- Does each entity define purpose, properties, aspects, lifecycle/status where relevant, operations, and open questions?
  · evidence: `specs/business/entities/<entity-slug>.md`
  · when: static

- Are attributes and relationships expressed as properties with `kind = attribute | relationship`?
  · evidence: `## Properties`
  · when: static

- Is the display label expressed as a property role rather than a duplicated section?
  · evidence: `## Properties` role column
  · when: static

- Are all code/number properties (e.g. `*Code`, `*No`, `*Number`, `*Id`-style codes) ones the
  **business actually uses** — quoted by people, keyed on by an external system/import, or named
  by a business rule — with that basis recorded in notes/source? No fabricated code/number
  attribute is present just to manufacture a key or look "enterprisey." The business layer models
  no "key"; where the business has no natural code, the entity has **none** — identity is the
  surrogate-key aspect + display-label.
  · evidence: `## Properties` code/number rows vs. notes/source basis, business rules, open questions
  · when: static

- Are system IDs, UUIDs, version fields, and audit metadata kept out of Properties and represented as Aspects / Storage View details?
  · evidence: `## Properties`, `## Aspects`, `## Storage View`
  · when: static

- Does each entity have a display label for user presentation, distinct from raw technical id?
  · evidence: property role `display-label`
  · when: static

- Is the entity single-sourced in `specs/business/entities/` and not duplicated inside capability folders or `specs/design/entities/`?
  · evidence: repository layout
  · when: static

- Do relationship properties define business cardinality, participation, and role names where material, and are relationship entities used when the relationship has its own lifecycle, quantities, identity, or history?
  · evidence: entity relationship properties vs. use cases and rules
  · when: static + AI review

- Do durable concepts implied by use-case triggers, quantities, state changes, and outcomes resolve to entities or have an explicit reason not to?
  · evidence: use-case object roles and state-change tables vs. entity catalogue
  · when: AI review

- Does every aspect an entity declares in `## Aspects` resolve to a **known aspect** — one
  a feature owns (in `aspects-catalogue.json`)? An unrecognized aspect (a typo, or a concept
  no feature implements) is silently ineffective, so it is a defect.
  · evidence: entity `## Aspects` vs. `targets/aspects-catalogue.json`
  · when: static

### Meaningful seed data  `[feature: meaningful-seed-data]`

- Is seed data meaningful, conforming to the physical model, with at least the configured
  `minRecords` floor (default 30) per primary entity?
  · evidence: `db/seeds/*` vs. Storage Views + per-entity row counts
  · when: static

### Optimistic locking  `[feature: optimistic-locking]`

- Does each concurrently-editable entity declare a version token in its `## Storage View`
  (or explicitly omit locking with a reason)?
  · evidence: entity Storage View vs. the editable-entity list
  · when: static
- Are UPDATEs version-guarded (conditioned on the read version, incrementing it) so a stale
  write is rejected rather than overwriting?
  · evidence: repository/SQL update path
  · when: static
- Does a version mismatch return a conflict response (not 200) carrying current state?
  · evidence: API conflict-path code + a `.capability` conflict scenario
  · when: static (code) + requires-environment (test run)

<!-- Spec-driven (scope=plan): fires for every touched entity whose spec DECLARES
     locking — not keyed on the manifest capability tag. Deterministic layers: schema
     version column (via allColumnsPresent) + repository version-guarded/incrementing
     UPDATE carrying the // MDE: optimistic-locking marker (joined to the entity's repo
     via the manifest trace, matched against the entity's own table). The [ASK] covers
     the layers a regex cannot judge: service/API surface the conflict (409, current
     state) and a conflict test proves a stale write is rejected. -->
```check scope=plan subject="Version Columns" whenFailed="lockable entities are missing the version column in the schema" whenPassed="lockable entities have the version column"
# locked = the entity's spec declares the Version / optimistic-locking aspect.
# allColumnsPresent = the migration table has every Storage-View column (incl. version).
# This check (schema layer): a locked entity's table must carry the version column.
EVERY $e IN $plan.expectedTables WHERE $e.locked IS "true"
THEN  $e.allColumnsPresent IS "true"
  ELSE "locked entity's table is missing its version column; see ref"
```

```check scope=plan subject="Locking Enforcement" whenFailed="lockable entities do not enforce version-guarded updates" whenPassed="lockable entities enforce version-guarded updates"
# lockingRealized = the entity's repository UPDATE guards on the read version and
#   increments it (WHERE …version=… , version=version+1) AND marks the site with
#   // MDE: optimistic-locking (a version column with no enforcement doesn't count).
# This check (code layer): locking must be enforced in the repository, not just declared.
EVERY $e IN $plan.expectedTables WHERE $e.locked IS "true"
THEN  $e.lockingRealized IS "true"
  ELSE "locked entity's repository UPDATE is not version-guarded/incrementing (WHERE …version=… , version=version+1), or is missing the // MDE: optimistic-locking marker — version column without enforcement; see ref"
  ASK "For ${$e.entity}: does a stale-version update surface a CONFLICT end-to-end (service raises it, API returns 409 with current state, not a silent 200), and is there a conflict test proving a stale write is rejected?"
```

### Persistence integration test (real schema, no mocked DB)  `[feature: persistence-integration-test]`

- **Static - no faked DB:** no repository/persistence test fakes the project's own database.
  - evidence: test source review
  - when: static
- **Static - test is a pure consumer:** the integration test does not boot its own app tier
  (`createApp()`/`express()`/`.listen(...)`/`new Server`) or reset the database in-process
  (`DROP`/`TRUNCATE TABLE`, `migrate.reset/latest`, `resetDatabase`). Per the `mde:test`
  contract (`app-runtime-scripts`), the test hits the app **already running** (its `baseURL`)
  and the **one** `DATABASE_URL` — it starts no second server or database.
  - evidence: test source review — no in-process server construction or DB reset
  - when: static
- **Required - real integration test:** the suite resets the one `DATABASE_URL` (real
  migrations and seeds applied there), points tests at it, and runs a real repository query
  (insert->read round-trip per table-owning capability). A stale, unreset database is a failure.
  - evidence: integration run output (`evidence/logs/`) + `migrate.log`/`seed.log`
  - when: requires-environment
- **Required - the change actually landed in the DB:** after applying the up migration to the
  isolated target, **generate a real schema dump** via the stack's own `db:schema-dump` operation
  (`tech-stack.md` Operations Map — the command is whatever the chosen database's own tooling
  produces a real, structural schema dump; this method names no database engine) and **read it
  against every touched entity's `## Storage View`**: does each declared
  table exist, with every declared column — i.e. the migration's changes really took place, not
  merely that the SQL ran without error. The static `schema-from-entities` check proves the
  migration *declares* the table; this proves the database *has* it. Save the dump as evidence
  and record the comparison result (table-by-table, column-by-column) in `evidence.md`.
  - evidence: the `db:schema-dump` output saved under `evidence/logs/schema-dump.*`, compared
    against entity Storage Views, with the comparison result recorded in `evidence.md`
  - when: requires-environment
- **Reversibility (down) applies cleanly:** applying the paired **down** migration to the target
  rolls the change back without error (and, where non-destructive, restores the prior state) — the
  down is exercised, not just present.
  - evidence: down-apply output in `evidence/logs/`
  - when: requires-environment

<!-- check: the deterministic ($-model) form of the `when: static` checks above.
     The runner assembles the model, scopes $item to THIS capability's manifest
     entries by default, resolves $-paths, applies operators, and emits a complaint
     when a THEN fails. Prose `when: requires-environment`/semantic checks stay
     above for the AI pass — only the mechanizable ones get a check block. -->
```check scope=item
# Static — no faked DB: my test artifacts must not mock the project's own database.
WHEN  $item.type IS "test"
THEN  $item.content NOT MATCHES "(mock|stub|fake|vi\.fn|jest\.fn).*(query|pool|client|db)"
  ELSE "faked project DB (RULE-CORE-004 — mock external services only, never the app's own DB)"
# Static — pure consumer: a test must not boot its own app tier or reset the DB in-process.
# It hits the app mde:start launched (baseURL) and the one DATABASE_URL (see app-runtime-scripts).
WHEN  $item.type IS "test"
THEN  $item.content NOT MATCHES "(createApp\s*\(|express\s*\(\)|\.listen\s*\(|new\s+Server\b|(DROP|TRUNCATE)\s+TABLE|migrate\.(reset|latest)\s*\(|resetDatabase\s*\()"
  ELSE "test self-starts the app tier or resets the DB in-process — mde:test must be a pure consumer of the app mde:start launched (hit the running app's URL + the one DATABASE_URL), not boot a second server/DB"
```

<!-- Semantic (AI judgment) — a schema dump's format is stack-specific (raw SQL DDL, an
     ORM's introspection JSON, a plain-text schema listing, …), so no single regex/DSL
     check can parse "does this dump have column X" across every stack. The AI
     reads the captured dump directly against each touched entity's Storage View — the
     same comparison schema-from-entities.md does statically against the MIGRATION FILES,
     here done against the LIVE dump so a hand-patched migration (a column added later,
     out of band) or a migration that silently failed to apply cannot hide the gap. -->
```check scope=plan
# hasSchemaDump = a captured schema-dump artifact exists under evidence/logs/ for this
# plan (model-computed: a file matching schema-dump.* in the plan's evidence/logs/).
WHEN  $plan.persistenceInScope IS "true"
  AND $plan.hasSchemaDump IS "false"
ASK   "This plan touches persistence but evidence/logs/ has no captured db:schema-dump output. Confirm: was db:schema-dump run against the isolated test target after migrating, and if so where was its output saved? If it was never run, that is the defect to report — not a pass."
```

```check scope=plan
EVERY $e IN $plan.expectedTables
ASK   "Read the captured schema dump under evidence/logs/ (whatever format the stack's db:schema-dump produced) and confirm entity '${$e.entity}' Storage View — table '${$e.table}' — actually exists in the LIVE dump with every declared column present, not just in the migration source. Name any table or column the dump is missing that the Storage View declares; that is a real defect (the migration source can lie about what actually got applied)."
```

### Repository pattern  `[feature: repository-pattern]`

- Does each persistence-owning capability access the database through a repository (interface +
  implementation), with services depending on the interface and no direct DB access above it?
  · evidence: source layering (repository modules; no driver use in routes/services/pages)
  · when: static
- Does row↔domain mapping live in the repository (not leaked into services/UI)?
  · evidence: repository source
  · when: static

### Runnable migrate/seed (no orphaned SQL)  `[feature: runnable-migrate-seed]`

- Is there a runnable path to apply migrations + seeds (`migrate`/`seed`/`db:reset` scripts or
  a committed runner) and a documented one-command DB bring-up — no orphaned SQL?
  · evidence: operations map + runner; `migrate.log`/`seed.log` apply output
  · when: static (scripts exist) + requires-environment (apply output)
- Does each migration apply atomically — schema change and applied-record together, all-or-nothing?
  · evidence: the runner (migration tool, or a hand-rolled runner that wraps each migration in a transaction)
  · when: static (runner inspection)

### Schema from entities  `[feature: schema-from-entities]`

- Does the schema match the entity design / Storage View, with deliberate FKs/constraints?
  · evidence: migrations vs. entity Storage Views
  · when: static
- For each touched entity, does the migration **create its Storage-View table** with **every
  declared column** present?
  · evidence: `create table <table>` + columns vs. the entity's `## Storage View`
  · when: static
- Do APIs/services avoid leaking raw database details unnecessarily?
  · evidence: repository/service boundaries
  · when: static

```check scope=plan subject="Database Tables" whenFailed="entity tables are missing from the migration" whenPassed="entity tables are created"
# expectedTables = one entry per entity the plan touched that declares a Storage View.
# tableExists = the migration creates a table with the entity's Storage-View table name.
# This check: every entity's table must exist in the migration (schema follows the spec).
EVERY $e IN $plan.expectedTables
THEN  $e.tableExists IS "true"
  ELSE "entity has a Storage View but the migration creates no matching table — schema not derived from the entity; see ref"
```

```check scope=plan subject="Table Columns" whenFailed="tables are missing declared columns" whenPassed="tables have all declared columns"
# allColumnsPresent = every column the entity's Storage View lists appears in its
#   create-table body. (missingColumns names the ones that don't.)
# This check: the table must have every declared column, not just exist.
EVERY $e IN $plan.expectedTables WHERE $e.tableExists IS "true"
THEN  $e.allColumnsPresent IS "true"
  ELSE "migration table is missing columns the entity's Storage View declares; see ref (missingColumns)"
```

### Storage View (physical model)  `[feature: storage-view-model]`

- Is the physical model recorded in each entity's `## Storage View` (not a separate
  `design/entities/` file)?
  · evidence: entity files' `## Storage View`
  · when: static
- Does the storage view match the business attributes/relationships above it?
  · evidence: entity file consistency
  · when: static
- Is every UNIQUE constraint / unique index on a property the **business actually enforces
  uniqueness on** (a real rule — quoted id, external key, no-duplicates policy), not a fabricated
  code column added to manufacture a key? Uniqueness is decided here, not as a business property
  role; most entities need none (identity is the surrogate key).
  · evidence: `## Storage View` Constraints/Indexes vs. business rules and property source basis
  · when: static
- **Design completeness:** does **every** entity the plan designed have a filled `## Storage
  View` (a table + columns)? The implementation's `schema-from-entities` check depends on this.
  · evidence: each produced entity spec's `## Storage View`
  · when: static

<!-- Storage View is a DESIGN-stage output: the Business-Analysis plan creates the
     entity specs WITHOUT a Storage View (correct — the physical model is filled during
     design), and the DESIGN plan fills it. So this check must fire at DESIGN, not BA —
     otherwise it wrongly blames the BA plan for a gap the design plan owns. The
     WHEN-gate ties it to persistence-design; on a BA plan (no persistence-design
     loaded) it does not run. A missing Storage View is then attributed to the DESIGN
     plan, where the defect belongs. -->
```check scope=plan subject="Storage Views" whenFailed="designed entities have no Storage View (physical model undefined)" whenPassed="designed entities have a complete Storage View"
# designEntities = the app's entity specs (the ones this design plan is responsible for).
# hasStorageView = the spec's ## Storage View defines a table and at least one column.
# This check (DESIGN stage only — gated on persistence-design): every entity must have a
#   complete Storage View by the end of design. Missing = a DESIGN defect (the design
#   plan didn't fill the physical model), not a BA defect.
EVERY $ent IN $plan.storageDesignEntities
THEN  $ent.hasStorageView IS "true"
  ELSE "entity spec has no complete ## Storage View (table + columns) — the physical model is undefined; the design plan must fill it before code generation; see ref"
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

### Versioned migrations  `[feature: versioned-migrations]`

- Does each schema change compute the diff from the current schema and ship as **one** versioned
  pair, rather than one pair per entity/capability/plan?
  · evidence: `db/migrations/*` vs. the schema diff it applies
  · when: static
- Is every migration versioned and shipped as an **up/down pair** — each `<NNN>_<name>.up.sql`
  accompanied by a `<NNN>_<name>.down.sql` that reverses it?
  · evidence: paired `db/migrations/*.up.sql` + `*.down.sql`
  · when: static
- Are destructive/irreversible changes explicitly confirmed (down states the irreversibility;
  user confirmation + evidence recorded)?
  · evidence: down script + confirmation record
  · when: static
- Before any DB apply, is a rollback strategy recorded (backup-restore or reverse-migration), with
  destructive/forward-only/data-changing applies carrying explicit user confirmation?
  · evidence: plan record of rollback strategy + apply confirmation
  · when: requires-environment
- Are migrations (both files) and seed data recorded in the manifest?
  · evidence: manifest entries
  · when: static
- Does the migration runner track applied migrations in a **`schema_migrations`** table
  (version PK, name, checksum, applied_at) — ensuring the table exists, applying only **pending**
  migrations in version order, recording each, and skipping already-applied ones — rather than
  blindly re-applying every `.up.sql` on each run?
  · evidence: the migrate runner reads/writes `schema_migrations`; applies only pending versions
  · when: static (runner logic) + requires-environment (re-run applies nothing new)

```check scope=plan subject="Reversible Migrations" whenFailed="migrations have no down script (cannot be rolled back)" whenPassed="migrations have a down script"
# migrations = one entry per versioned migration (stem NNN_name), from the manifest.
# hasUp / hasDown = whether the stem has a .up.sql / .down.sql file.
# This check: every up migration must have a matching down, so the change can be rolled back.
EVERY $m IN $plan.migrations WHERE $m.hasUp IS "true"
THEN  $m.hasDown IS "true"
  ELSE "migration has an up but no down script — the change cannot be rolled back; add <stem>.down.sql; see ref"
```
