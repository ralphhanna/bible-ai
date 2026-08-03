---
type: feature
id: user-profile-header
title: User profile in header (avatar, top-right)
origin: mde
impacts:
  - web-ui
default: on
---

# User profile in header (avatar, top-right)

## Purpose

Every page shows **who is acting** — a user-profile control at the **top-right** of the header,
with an **avatar** and the user's display-label (name). It gives the app a consistent identity
affordance and a home for the sign-out / switch-user action.

This is the **presentation** of the current identity ([[user-identity]] is the backend principal;
[[role-switcher]] is the dev control to change who is acting). Like those, it is a **dev/review
affordance, not authentication** — it shows the current user; it does not prove identity.

## Impact on web-ui

The app shell renders a **user-profile control in the top-right of the header, present on every
page** (it lives in the shell/layout, not per-page). It shows:

- an **avatar** — the user's image if present, otherwise a generated fallback (e.g. initials from
  the display-label);
- the user's **display-label** (name) — never a raw `id`/technical key (see [[reference-display]]);
- a menu with at least **sign out** and, where the role/user switcher applies, **switch user**
  (the switcher lives in this control rather than as a separate widget).

The current user is read from the client identity state the switcher/login establishes — the same
seeded people the project's `specs/business/roles/` + seed data define. It is **generated** as
part of building the UI (not a shipped library), whenever UI is in scope. When a project has no
roles/users, the control degrades to a minimal placeholder or is omitted.

## Checks

- Does the app shell render a user-profile control at the **top-right of the header on every
  page** (in the shell/layout, not duplicated per page), showing an **avatar** + the user's
  **display-label** (not a raw id)?
  · evidence: shell/layout source — the header profile control + avatar + name binding
  · when: static
- Does the control provide a menu with **sign out** (and **switch user** where the switcher
  applies), rather than being a static badge?
  · evidence: profile control source — the actions/menu
  · when: static

```check scope=item
# The app shell must carry a top-right profile control with an avatar. Checks the
# shell/layout/App source for a profile/avatar element. Generation smell this
# catches: a UI with no identity affordance in the header at all.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/(App\.tsx|.*([Ll]ayout|[Ss]hell|[Hh]eader).*\.tsx)$"
THEN  $item.content MATCHES "([Aa]vatar|[Pp]rofile|user-menu|userMenu)"
  ELSE "app shell has no top-right user-profile/avatar control — every page should show the acting user (avatar + name) in the header"
```
