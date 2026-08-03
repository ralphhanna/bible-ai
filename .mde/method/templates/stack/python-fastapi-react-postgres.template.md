---
id: TEMPLATE-STACK-PYTHON-FASTAPI-REACT-POSTGRES
type: template
kind: stack-template
title: Python FastAPI React PostgreSQL Stack
status: active
source_path: method/templates/stack/python-fastapi-react-postgres.template.md
artifact: technology-stack
stackTemplate: python-fastapi-react-postgres
used_by_commands:
  - mde start
---
# Python FastAPI React PostgreSQL Stack

## Stack axes

The stack is recorded as independent **axes** in `specs/design/tech-stack.md` (the
authoritative record — see the Application Design target): **frontend**, **backend**, **data-source**
(real-api ↔ fake-json-api), **testing**, and **auth**. The `data-source` axis is what lets one
frontend serve both prototype (fake JSON API) and production (real API); it is realized by
the capability-aware resolver in the Prototyping target. Each axis is a declared choice, not
a hardwired constant (obligation-vs-presentation — see `targets/catalog.md`).

### Auth axis

Records the authentication technique. **Auth is opt-in: the default is `none` — a plain app build
generates no auth.** Set `mechanism` to a real value to turn it on. Recorded in `tech-stack.md`;
defaults shown:

| auth sub-axis | choice (default) | notes |
|---|---|---|
| mechanism | `none` | **default — no auth generated.** Set to `local-db` (users table, username+password) to turn auth on. Other opt-ins: `oauth`/`oidc`, `sso`/`saml`, `passwordless`. |
| scheme | session cookie | (when auth on) signed + expiring; `jwt` is the alternative. |
| password hashing | `bcrypt` (via `passlib`/`bcrypt`) | (local-db only) argon2 acceptable. Never plaintext. |
| secrets | environment | signing/session secrets from env (`env-contract`), never hard-coded. |

When set to **local-db**, the app owns an **identity entity** (User/Account) with a credential
aspect (hashed password + role link) — the AI creates it if the business model lacks one; it flows
through the normal entity → schema → seed pipeline (see the `authentication` feature). A non-local
mechanism stores an external subject id instead of a password. With `none`, no auth is generated.

```yaml
applicationStack:
  name: <application-name>
  targets:
    - type: api
      name: server
      location: src/server
      tech: FastAPI + Python

    - type: web-ui
      name: web
      location: src/web
      tech: React + TypeScript + Vite

    # data-source axis: what the web-ui's API client talks to. Prototyping uses the
    # fake JSON API (model-derived, see the Prototyping target); production uses the real
    # API. Resolved per capability — real /api/<cap> once the capability's API exists.
    - type: server
      name: data-source
      location: tools/fake-api
      tech: real-api (FastAPI /api) ↔ fake-json-api (model→seed→JSON)

    - type: persistence
      name: db
      location: db
      tech: PostgreSQL + SQL migrations

    - type: testing
      name: api-tests
      location: tests/api
      tech: Pytest + HTTPX

    - type: testing
      name: ui-tests
      location: tests/ui
      tech: Playwright + TypeScript

    - type: documentation
      name: docs
      location: docs
      tech: Markdown + Mermaid

    - type: documentation
      name: docs-site
      location: .
      tech: MkDocs
```

## Standard root operations

Record stack-neutral operations in `specs/design/tech-stack.md` and implement each
command from the project root. For Python stacks, prefer committed scripts under
`scripts/` when a command needs setup logic beyond a single tool invocation.

```yaml
operations:
  install: "python -m pip install -r requirements.txt && npm install --prefix src/web"
  start: "python scripts/app_start.py"
  dev: "python scripts/app_dev.py"
  build: "python scripts/app_build.py"
  test: "python -m pytest && npm run test --prefix src/web"
  test:unit: "python -m pytest tests/unit"
  test:api: "python -m pytest tests/api"
  test:ui: "npm run test:ui --prefix src/web"
  migrate: "python scripts/db_migrate.py"
  seed: "python scripts/db_seed.py"
  db:reset: "python scripts/db_reset.py"
```

The plan that introduces the stack must create any referenced `scripts/*.py` runners and
include them in the manifest. Do not leave the operations as documentation-only examples.

## Environment

- `.env` at repo root (loaded via `pydantic-settings` / `python-dotenv`); `.env.example` committed, `.env` git-ignored.
- Keys: `DATABASE_URL`, `PORT`, `ENV` (`development`/`production`), `AUTH_BYPASS`.
- `DATABASE_URL` is the one database, shared by development/runtime and tests (see
  [[env-contract]]). Uses `postgresql+psycopg://USER:PASS@HOST:PORT/DB` (SQLAlchemy),
  distinct from the Node `pg` form.
- `AUTH_BYPASS` (dev only) — the auth dev bypass flag (see the `authentication` feature).
  **Absent/unset ⇒ real auth runs.** Activates the seeded-user bypass **only** when explicitly
  `true` **and** `ENV != production`; a production config must fail closed. Never set to a
  bypassing value in `.env.example`.

<!-- Bootstrap recipe: this stack's scaffold detail is thin (committed scripts/*.py runners +
     src/web Vite app). No separate .scaffold.md; the operations map above + the server
     target's app-start/install contracts drive the empty-project scaffold. -->

