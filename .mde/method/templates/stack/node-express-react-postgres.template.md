---
id: TEMPLATE-STACK-NODE-EXPRESS-REACT-POSTGRES
type: template
kind: stack-template
title: Node Express React PostgreSQL Stack
status: active
source_path: method/templates/stack/node-express-react-postgres.template.md
artifact: technology-stack
stackTemplate: node-express-react-postgres
scaffold: node-express-react-postgres.scaffold.md
used_by_commands:
  - mde start
  - mde go
---
# Node Express React PostgreSQL Stack (selection)

This is the **stack selection** record — the axes, targets, runtime, and environment that go into
`specs/design/tech-stack.md`. The **bootstrap recipe** (npm scripts, tsconfig, project layout,
required scaffold outputs, file conventions) lives in the companion
`node-express-react-postgres.scaffold.md`, read by the plan that scaffolds the empty app — not
needed to *select* the stack.

## Stack axes

The stack is recorded as independent **axes** in `specs/design/tech-stack.md` (the
authoritative record — see the Application Design target): **frontend**, **backend**, **data-source**
(real-api ↔ fake-json-api), **testing**, and **auth**. The `data-source` axis is what lets one
frontend serve both prototype (fake JSON API) and production (real API); it is realized by
the capability-aware resolver in the Prototyping target. Each axis is a declared choice, not
a hardwired constant (obligation-vs-presentation — see `targets/catalog.md`).

### Auth axis

Records the authentication technique. **Auth is opt-in: the default is `none` — a plain app build
generates no auth.** A project turns it on by setting `mechanism` to a real value; then the
`authentication` feature generates against the recorded technique (the method mandates the security
policy; the technique is this choice). Recorded in `tech-stack.md`; defaults shown:

| auth sub-axis | choice (default) | notes |
|---|---|---|
| mechanism | `none` | **default — no auth generated.** Set to `local-db` (users table, username+password) to turn auth on. Other opt-ins: `oauth`/`oidc`, `sso`/`saml`, `passwordless`. |
| scheme | session cookie | (when auth on) how identity persists per request; signed + expiring. `jwt` is the alternative. |
| password hashing | `bcrypt` | (local-db only) argon2/scrypt acceptable. Never plaintext. |
| secrets | environment | signing/session secrets from env (`env-contract`), never hard-coded. |

When set to **local-db**, the app owns an **identity entity** (User/Account) with a credential
aspect (hashed password + role link) — the AI creates it if the business model lacks one, and it
flows through the normal entity → schema → seed pipeline (see the `authentication` feature). A
non-local mechanism stores an external subject id instead of a password. With `none`, no auth
boundary, login, or identity schema is generated.

## Targets

```yaml
applicationStack:
  name: <application-name>
  # `type` MUST be a method TARGET id (matches .mde/method/targets/<id>.md) so the
  # verification model can scope the applicability universe and the requires: graph.
  # `name` is this app's tier name for that target. One target may back several
  # tiers (api tests + ui tests are both `testing`; server + fake-api are both
  # server) — the `type` repeats, the `name` differs.
  targets:
    - type: api
      name: server
      location: src/server
      tech: Express + TypeScript on Node

    - type: web-ui
      name: web
      location: src/web
      tech: React + TypeScript + Vite

    # data-source axis: what the web-ui's API client talks to. Prototyping uses the
    # fake JSON API (model-derived, see the Prototyping target); production uses the real
    # API. Resolved per capability — real /api/<cap> once src/server/<cap>/Routes.ts exists.
    - type: server
      name: data-source
      location: tools/fake-api
      tech: real-api (Express /api) ↔ fake-json-api (model→seed→JSON)

    - type: persistence
      name: db
      location: db
      tech: PostgreSQL + SQL migrations

    - type: testing
      name: api-tests
      location: tests/api
      tech: Mocha + Chai + Supertest + TypeScript

    - type: testing
      name: ui-tests
      location: tests/ui
      tech: Playwright + Cucumber + Axe + TypeScript

    - type: documentation
      name: docs
      location: docs
      tech: Markdown + Mermaid

    - type: documentation
      name: docs-site
      location: .
      tech: MkDocs
```

## Runtime & Build

- Node `>=20.0.0`
- Package manager: `npm`
- Module system: ESM (`"type": "module"` in `package.json`)
- Tools: `tsx` (dev server), `tsc` (typecheck), `vite` (web bundle)

## Operations map

Record the standard root operations in `specs/design/tech-stack.md` (the scaffold's `package.json`
implements them — see the scaffold recipe):

```yaml
operations:
  install: "npm run install:app"
  start: "npm run start"
  dev: "npm run dev"
  build: "npm run build"
  test: "npm test"
  test:unit: "npm run test:unit"
  test:api: "npm run test:api"
  test:ui: "npm run test:ui"
  migrate: "npm run migrate"
  seed: "npm run seed"
  db:reset: "npm run db:reset"
```

## Environment

- `.env` at repo root, loaded by `import 'dotenv/config'` at the server entry point. `dotenv` is a required dependency.
- `.env.example` is committed. `.env` is in `.gitignore`.
- Keys: `DATABASE_URL`, `PORT`, `NODE_ENV`, `VITE_API_BASE`, `AUTH_BYPASS`.
- `DATABASE_URL` is the one database, shared by development/runtime and tests (see
  [[env-contract]]). Default local DB name: `<application-name>` (for example, `mde-demo`).
- Uses this format: `postgresql://USER:PASS@HOST:PORT/DB` (Node `pg` driver).
  NOT `postgresql+psycopg://` (SQLAlchemy).
- `PORT` read as `Number(process.env.PORT ?? 3000)`.
- `AUTH_BYPASS` (dev only) — the auth dev bypass flag (see the `authentication` feature). **Absent/unset
  ⇒ real auth runs.** It activates the seeded-user bypass **only** when explicitly `true` **and**
  `NODE_ENV !== production`; a production config must fail closed. Never set in `.env.example` to a
  bypassing value.
