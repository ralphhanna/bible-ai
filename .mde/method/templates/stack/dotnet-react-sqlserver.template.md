---
id: TEMPLATE-STACK-DOTNET-REACT-SQLSERVER
type: template
kind: stack-template
title: .NET React SQL Server Stack
status: active
source_path: method/templates/stack/dotnet-react-sqlserver.template.md
artifact: technology-stack
stackTemplate: dotnet-react-sqlserver
used_by_commands:
  - mde start
---
# .NET React SQL Server Stack

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
| mechanism | `none` | **default — no auth generated.** Set to `local-db` (app-owned username+password) to turn auth on. Other opt-ins: `oauth`/`oidc`, `sso`/`saml` (Entra ID), `passwordless`. |
| scheme | cookie (ASP.NET auth) | (when auth on) signed + expiring; bearer/JWT is the alternative. |
| password hashing | ASP.NET Core Identity hasher (PBKDF2) | (local-db only) never plaintext. |
| secrets | environment / user-secrets | signing/session secrets from env (`env-contract`), never hard-coded. |

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
      tech: ASP.NET Core + C#

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
      tech: real-api (ASP.NET /api) ↔ fake-json-api (model→seed→JSON)

    - type: persistence
      name: db
      location: db
      tech: SQL Server + SQL migrations

    - type: testing
      name: api-tests
      location: tests/api
      tech: xUnit + ASP.NET Core TestHost

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
command from the project root. For .NET stacks, use committed scripts or Make targets when
the operation needs to coordinate the API, frontend, and database.

```yaml
operations:
  install: "dotnet restore && npm install --prefix src/web"
  start: "pwsh ./scripts/app-start.ps1"
  dev: "pwsh ./scripts/app-dev.ps1"
  build: "dotnet build && npm run build --prefix src/web"
  test: "dotnet test && npm run test --prefix src/web"
  test:unit: "dotnet test tests/unit"
  test:api: "dotnet test tests/api"
  test:ui: "npm run test:ui --prefix src/web"
  migrate: "pwsh ./scripts/db-migrate.ps1"
  seed: "pwsh ./scripts/db-seed.ps1"
  db:reset: "pwsh ./scripts/db-reset.ps1"
```

The plan that introduces the stack must create any referenced `scripts/*` runners and
include them in the manifest. Do not leave the operations as documentation-only examples.

## Environment

- Config via `appsettings.json` + environment variables / user-secrets; `.env.example`/example
  settings committed, real secrets git-ignored.
- Keys: `ConnectionStrings__Default`, `ConnectionStrings__Test`, `ASPNETCORE_ENVIRONMENT`
  (`Development`/`Production`), `PORT`, `AUTH_BYPASS`.
- `AUTH_BYPASS` (dev only) — the auth dev bypass flag (see the `authentication` feature).
  **Absent/unset ⇒ real auth runs.** Activates the seeded-user bypass **only** when explicitly
  `true` **and** `ASPNETCORE_ENVIRONMENT != Production`; a production config must fail closed.
  Never set to a bypassing value in committed example settings.

<!-- Bootstrap recipe: this stack's scaffold detail is thin (committed scripts/* runners +
     src/web Vite app + solution/project files). No separate .scaffold.md; the operations map above
     + the server target's app-start/install contracts drive the empty-project scaffold. -->

