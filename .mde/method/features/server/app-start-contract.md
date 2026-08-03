---
type: feature
id: app-start-contract
title: App start contract — start script + health round-trip
origin: mde
impacts:
  - api
  - web-ui
default: n/a
---

# App start contract — start script + health round-trip

## Purpose

Every app must be **startable and identifiable in a standard way**, so tooling (the workbench, CI, a
human) can launch it and **verify the running process belongs to *this* app folder** — not a different
project squatting the same port. The app owns its ports (from `.env`) and resolves conflicts; callers
never guess the start command or blindly kill ports.

The contract has three parts:

1. **Start script** — `npm run mde:start` (or the stack's equivalent contracted entry). It reads the
   app's ports from `.env`, starts the app, and resolves port conflicts (see below). It is the single
   entry point a caller invokes — callers do not guess `dev`/`start`. **It must start the *whole* app:
   every tier the app needs to be usable.** For a split web+api app that means **both** the web (dev)
   server and the API server — one command, both tiers. A `mde:start`/`dev:full` that brings up only
   one tier (e.g. the API but not the web server the live-app view embeds) is a **broken contract**:
   the user sees a half-running app and the tool's port poll times out. When tiers are separate
   processes, the start script composes them (e.g. `concurrently -n api,web "npm:dev" "npm:dev:web"`)
   so a single invocation lights up every port the app exposes.
2. **Health endpoint** — `GET /__mde/health` returns **identity + ownership** in one
   response: `{ "status": "pass|warn|fail", "app": "<APP_ID>", "component":
   "web|api", "token": "<value>", "folder": "<app-root>" }`. The **identity** fields
   (`status`/`app`/`component`) let a caller tell *which app and tier* answers a port
   before loading it; the **ownership** fields (`token`/`folder`) let it prove the app
   belongs to *this folder* — `token` echoes the value read from the app's own
   `.mde/runtime/health-token`. Identity + status are the required floor; anything
   else the server adds (`version`, `uptimeSeconds`, `checks.database`, metrics…) is
   optional. One endpoint, both jobs — no separate identity/health surfaces.
3. **Ownership round-trip** — to verify the app on a port belongs to this folder: write a random
   nonce to `.mde/runtime/health-token`, call `GET /__mde/health`, and compare. **Match** ⇒ the
   running app is this folder's app (only it can read this folder's file). **Mismatch / no response**
   ⇒ a foreign app holds the port ⇒ resolve: reuse if ours, else free it or reassign from `.env`.

Run the round-trip **before** starting (reuse-vs-conflict) and **after** (confirm what came up is ours).

## Impact on api

The API app provides the **`mde:start`** script (ports from `.env`; resolves a busy port by ownership,
not blind kill) and the **`GET /__mde/health`** endpoint that echoes the token from
`.mde/runtime/health-token`. The API's port comes from `.env` (e.g. `PORT`/`FAKE_API_PORT`), not a
hardcoded default. A caller can prove the running API belongs to this folder via the round-trip.

## Impact on web-ui

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

## Checks

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
