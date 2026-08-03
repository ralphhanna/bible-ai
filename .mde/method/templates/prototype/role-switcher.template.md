---
id: TEMPLATE-PROTOTYPE-ROLE-SWITCHER
type: template
title: Prototype Role / User Switcher
artifact: prototype
used_by_commands:
  - mde go
relatedRules:
  - TARGET-PROTOTYPING
  - TARGET-WEB-UI
---

# Prototype Role / User Switcher (generated)

Shape for the **generated** role/user switcher facet (Prototyping target → Interactive /
reviewable prototypes). Generated per project from `specs/business/roles/`. It is a
prototype affordance — a **soft nav filter, not access control**; client state, not auth.

## What to generate

Three small modules in the web app (names illustrative; match the project's conventions):

1. **`<web>/ui/roles.<ext>`** — derived from `specs/business/roles/`:
   - `ROLES`: the role ids + labels (one per `roles/<slug>.md`).
   - `PERSON_SCOPED`: roles that act as a specific person (those whose pages show
     own/team data — typically the employee-equivalent and the manager-equivalent).
   - `ROLE_NAV`: role → visible page routes (a **soft filter**; every route stays
     reachable). Always include the landing/dashboard page for every role.
   - `navForRole(role)`: visible nav items for a role, in canonical nav order.

2. **`<web>/ui/identity.<ext>`** — an active-identity context: `{ role, personId|null }`,
   a provider, and a `useIdentity()` hook. **Client state only — no persistence** (reload
   resets to a sensible default role). Not authentication.

3. **`<web>/ui/RoleSwitcher.<ext>`** — a header control: a role dropdown; for person-scoped
   roles, a second dropdown to pick which seeded person (populated from the project's
   data source). Changing it updates the identity; pages and nav react.

## Wiring

- Wrap the app shell in the identity provider; render the switcher in the shell header.
- Filter the nav via `navForRole(activeRole)`; keep the current page marked active.
- Identity-dependent pages read the active person from `useIdentity()` (not a hardcoded id).

## Derivation rules (no invention)

- Roles, labels, and which roles are person-scoped come from Business Specs — do not
  invent roles. The role→nav map is a design choice recorded with the page set (UI catalog).

## Verification (at `mde go`)

- Switching role changes the visible nav (unit test on `navForRole` / `ROLE_NAV`).
- A person-scoped role shows a person picker; identity-driven pages follow the choice (E2E).
- All routes remain reachable regardless of role (soft filter, not a guard).

## Notes

A no-roles project omits this facet. This template defines the **shape**; the code is
generated from each project's model, never copied verbatim.
