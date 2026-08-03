---
type: feature
id: apache-folder-deploy
title: Apache folder deployment (reverse-proxy, not ports)
origin: mde
impacts:
  - deployment
default: n/a
---

# Apache folder deployment (reverse-proxy, not ports)

## Purpose

On a Linux host, the app is served by **Apache under URL folders** (`https://host/<app>/`,
`https://host/<app>/api/`, `https://host/workbench/`) via **reverse proxy** — **not** by exposing raw
ports to users. Multiple apps live under one host as different folders, with no port juggling. This is
the production half of the one base-path model (the dev half is the workbench acting as the local
proxy); the routing is **identical** in both, so dev mirrors prod.

Each surface internally still listens on a port; Apache maps the public folder to that internal port.
The app/workbench must support the base path (see the `base-path-routing` capability) so assets and
routes resolve under the folder.

## Impact on deployment

A plan that deploys to a Linux host produces an **Apache reverse-proxy configuration** that maps each
public folder to the surface's internal port, e.g.:

```apache
# https://host/<app>/        -> app web (internal :WEB_PORT)
ProxyPass        /<app>/api/  http://127.0.0.1:API_PORT/<app>/api/
ProxyPassReverse /<app>/api/  http://127.0.0.1:API_PORT/<app>/api/
ProxyPass        /<app>/      http://127.0.0.1:WEB_PORT/<app>/
ProxyPassReverse /<app>/      http://127.0.0.1:WEB_PORT/<app>/
# https://host/workbench/    -> workbench (web + its /api)
ProxyPass        /workbench/  http://127.0.0.1:8081/workbench/
ProxyPassReverse /workbench/  http://127.0.0.1:8081/workbench/
```

Ports come from the app's `.env` (the source of truth — same values the dev proxy uses). The deploy
is documented as a one-host, multi-app folder layout. No raw app/api/workbench port is exposed
publicly — only Apache's 80/443.

## Checks

- Does the deployment produce an **Apache reverse-proxy config** mapping public folders
  (`/<app>/`, `/<app>/api/`, `/workbench/`) to internal ports — serving by folder, not by exposed
  port?
  · evidence: the Apache vhost/proxy config in the deploy artifacts
  · when: static
- Do the proxied folders match the base paths the app/workbench are built for (the
  `base-path-routing` capability), and do the ports come from `.env` (same as dev)?
  · evidence: base path ↔ ProxyPass folder consistency; ports sourced from `.env`
  · when: static
- Is the routing the **same model as dev** (workbench-as-proxy) — no separate dev-only vs deploy-only
  scheme?
  · evidence: one base-path model documented for both dev and Apache
  · when: static
