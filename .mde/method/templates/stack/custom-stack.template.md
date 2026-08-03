---
id: TEMPLATE-STACK-CUSTOM
type: template
kind: stack-template
title: Custom Application Stack
status: active
source_path: method/templates/stack/custom-stack.template.md
artifact: technology-stack
stackTemplate: custom
used_by_commands:
  - mde start
---
# Custom Application Stack

## Stack axes

Record the stack as independent **axes** in `specs/design/tech-stack.md` (the
authoritative record — see the Application Design target): at minimum **frontend**, **backend**,
**data-source** (real-api ↔ fake-json-api), **testing**, and **auth**. The `data-source` axis lets one
frontend serve both prototype (fake JSON API) and production (real API), realized by the
capability-aware resolver in the Prototyping target. Each axis is a declared choice, not a
hardwired constant (obligation-vs-presentation — see `targets/catalog.md`).

### Auth axis

Record the authentication technique. **Auth is opt-in: the default is `none` — no auth generated
unless you set a real mechanism.** Fill in for this custom stack:

| auth sub-axis | choice | notes |
|---|---|---|
| mechanism | `<none \| local-db \| oauth/oidc \| sso/saml \| passwordless>` | **`none` = default, no auth.** `local-db` = users table (username+password). |
| scheme | `<session \| jwt>` | (when auth on) signed + expiring. |
| password hashing | `<bcrypt \| argon2 \| scrypt \| platform>` | (local-db only) never plaintext. |
| secrets | environment | signing/session secrets from env (`env-contract`). |

For **local-db**, the app owns an **identity entity** (User/Account) with a credential aspect
(hashed password + role link) — the AI creates it if the business model lacks one; it flows through
the normal entity → schema → seed pipeline (see the `authentication` feature). With `none`, no auth
is generated.

```yaml
applicationStack:
  name: <application-name>
  targets:
    - type: <target-type>
      name: <target-name>
      location: <artifact-location>
      tech: <human-readable-technology-selection>

    # Required axis even for a custom stack: declare the data-source.
    - type: server
      name: data-source
      location: <fake-api-tooling-location>
      tech: real-api (<backend> /api) ↔ fake-json-api (model→seed→JSON)
```

## Standard root operations

Custom stacks must still expose the method's standard root operations. Record the exact
project-root commands in `specs/design/tech-stack.md`, using committed scripts,
Make targets, package-manager scripts, or equivalent runners.

```yaml
operations:
  install: "<command to install/restore dependencies>"
  start: "<command to start the reviewable app>"
  dev: "<command to start development servers/watchers>"
  build: "<command to compile/typecheck/bundle>"
  test: "<command to run the full test suite>"
  test:unit: "<command to run unit tests>"
  test:api: "<command to run API tests>"
  test:ui: "<command to run UI/E2E tests>"
  migrate: "<command to apply migrations, if applicable>"
  seed: "<command to load seed data, if applicable>"
  db:reset: "<command to reset/apply/seed DB, if applicable>"
```

If an operation is not applicable, omit it or record `not-applicable` with the reason.
Do not leave app startup, testing, or database setup discoverable only by prose.

## Environment

Record the app's env keys in `specs/design/tech-stack.md`, including — when auth is real — an
**`AUTH_BYPASS`** (dev only) flag per the `authentication` feature: **absent/unset ⇒ real auth
runs**; it activates the seeded-user bypass **only** when explicitly `true` **and** the stack's
prod signal is not production; a production config must fail closed. Never commit a bypassing
value.
