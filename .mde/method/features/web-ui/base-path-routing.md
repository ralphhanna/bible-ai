---
type: feature
id: base-path-routing
title: Base-path routing — one model for dev and Apache deploy
origin: mde
impacts:
  - web-ui
  - api
default: n/a
---

# Base-path routing — one model for dev and Apache deploy

## Purpose

Every web + API surface must run under a **configurable base-path folder** (e.g. `/<app>/`,
`/<app>/api/`), not assume it owns the server root. The **same** model is used in local dev (where
the workbench is a single-port reverse proxy: `localhost:8081/<app>/`) and in production (where
Apache reverse-proxies the same folders). One model — dev mirrors prod — so a base-path bug shows up
locally, not only after deploy. The base path comes from configuration (`.env` / build var), with a
sensible default, never hardcoded.

This pairs with the **app-start contract** (the `mde:start` script + `/__mde/health` round-trip): the
proxy detects/starts/routes an app behind its folder using that contract.

## Impact on web-ui

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

## Impact on api

The API mounts under a **path prefix** (e.g. `/<app>/api`), read from config — not rooted at `/`.
Cookies/CORS/redirects are path-aware so they work behind the folder. The API is reachable at its
prefix both on its dev port (via the proxy) and under Apache.

Because the frontend calls the API **same-origin** through the proxy (see web-ui), the API does
**not** rely on CORS for the app to function — a same-origin request needs none. A hardcoded
single-origin allow-list (e.g. only the standalone dev port) is a portability smell: it signals
the frontend is calling cross-origin, which breaks under the framed/proxied origin. Prefer
same-origin; where cross-origin is genuinely needed, the allow-list is config-driven, not a
literal that only matches the standalone case.

## Checks

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
