---
type: feature
id: role-switcher
title: Role / user switcher
origin: mde
impacts:
  - web-ui
default: on
---

# Role / user switcher

## Purpose

A header control to act **as a role**, and for person-scoped roles (those that view their
own/their team's data) **as a specific seeded person**. The nav is filtered by role — a
**soft view filter, not access control** (all routes stay reachable; no guards). Identity is
client state; it is a **dev/review affordance, not** authentication.

## Impact on web-ui

A standard UI facet, **generated** (not a shipped library) from the project's roles
(`specs/business/roles/` + a role→nav map). Produced whenever UI is in scope and the project has
roles — the user does not have to ask for a "prototype"; it is part of building the UI. When a
project has no roles, this facet is a **no-op** and may be omitted.

**Dev-only — gated by an `.env` flag.** The switcher is a review/development affordance, not a
shipping feature: it is mounted only when a dev flag is on (e.g. `VITE_DEV_ROLE_SWITCHER` /
`MDE_DEV_TOOLS`), and absent/disabled in a production build. It never replaces real
authentication. Source of truth: `specs/business/roles/`.

## Template impact

- **app-shell template** → the role/user switcher header control (mounted behind the dev `.env`
  flag).
- generated from `templates/prototype/role-switcher.template.md`.

## Checks

- When UI is in scope and the project has roles, is the **role/user switcher present**, generated
  from `specs/business/roles/`, and **gated behind a dev `.env` flag** (mounted in dev, absent in
  a production build)?
  · evidence: the switcher control in the app shell + the dev-flag gate
  · when: static
- Is nav filtering a **soft view filter** (all routes reachable, no guards), not access
  control or authentication?
  · evidence: routing/nav source
  · when: static
