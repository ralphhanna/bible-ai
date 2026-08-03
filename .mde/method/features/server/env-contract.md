---
type: feature
id: env-contract
title: Environment contract (.env — identity, ports, one DB)
origin: mde
impacts:
  - server
  - web-ui
  - api
default: n/a
---

# Environment contract (.env — identity, ports, one DB)

## Purpose

A generated app declares its runtime identity and preferred ports in `.env`, in a
standard shape MDE and the Workbench can read — so apps are identified by name,
run on non-colliding ports, and never hardcode host/port/API-URL. This is what
lets two generated apps coexist locally (no port fight) and lets the workbench
verify *which* app is on a port before loading it.

## Impact on server

The app ships a committed **`.env.example`** (the real `.env` is gitignored)
declaring, at minimum:

- **Identity:** `APP_ID` (short unique slug), `APP_NAME` (single source of truth
  for names), `APP_VERSION`.
- **Web tier:** `WEB_HOST`, `WEB_PORT` (preferred), `WEB_PORT_RANGE` (fallback band).
- **API tier** (only when the app has a real API — omit for single-tier /
  fake-API apps): `API_HOST`, `API_PORT`, `API_PORT_RANGE`.
- **One database per environment:** a single `DATABASE_URL` when the app has a DB. A test
  needing isolation configures its own in its own test setup. MDE never runs two APIs or
  juggles two DBs.
- **Logging:** `LOG_LEVEL` (error/warn/info/debug) and `LOG_PATH` — the log
  destination the shared logger writes to (see [[logging]]). When `LOG_PATH` is
  unset it **defaults to `logs/app.log`** under a root `logs/` directory (the app
  creates `logs/` if absent); it always also mirrors to stdout. Env-configured,
  never hardcoded — this is what lets a test run capture the app's log to a known
  file by setting `LOG_PATH` (see [[required-operation-ui-coverage]] —
  log-as-test-evidence). `logs/` is runtime output (gitignored), not a governed
  artifact.

**Port ranges are per-app and disjoint** across the project's apps — the
anti-collision guarantee (app A uses 52xx/31xx, app B uses 53xx/32xx). A range
that overlaps another app's is a defect.

**Component names are derived, not authored:** `{APP_NAME}-{component}` →
`mde-hr-web`, `mde-hr-api`. Nothing declares them twice.

**Derived keys are injected at launch, not authored in `.env`:** MDE sets `PORT`
(the selected port for this component), `MDE_COMPONENT` (`web`/`api`),
`MDE_APP_ROOT`, `VITE_BASE_PATH` (`/<app-id>/`, so the web bundler emits
prefixed URLs), and `VITE_API_URL` (`http://host:<api.port>`) into the process
env. The app **reads** these; it must **not** hardcode a port, host, base path, or
API host.

## Impact on web-ui

The web bundler reads `VITE_BASE_PATH` from the injected process env (not a stale
`.env` file the bundler does not load) to emit correctly prefixed asset URLs. It must
not hardcode a base path or assume it is served from `/`. (This is the same
same-origin, config-sourced rule the `base-path-routing` capability enforces for
the web tier.)

## Impact on api

The API client reads `VITE_API_URL` / `API_HOST` + `API_PORT` from the injected
process env rather than hardcoding an API host/port or a `http://localhost:<port>`
literal. (This is the same same-origin, config-sourced rule the `base-path-routing`
capability enforces for the API base.)

## Checks

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
