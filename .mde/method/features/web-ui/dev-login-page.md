---
type: feature
id: dev-login-page
title: Login page (login UI)
origin: mde
impacts:
  - web-ui
default: on
---

# Login page (login UI)

## Purpose

A **Login page** is the app's front door — the `/login` entry point and the route guard that
sends un-logged-in traffic there. It is the **UI** of authentication; the **mechanism and modes**
are owned by [[authentication]]. The same page adapts to the active mode:

- **dev / fake mode** — the user picks a **seeded person** (a dropdown/list by display-label) and
  enters the app *as* them; no credential verified. This is the default for development and test
  and gives E2E a deterministic entry.
- **real mode** — the page collects the credential the [[authentication]] feature verifies, and a
  failed attempt is rejected (no identity set).

It is the entry-point companion to [[user-profile-header]] (shows the current user) and
[[role-switcher]] (changes them in-app). This feature governs the **login screen + guard**; it
does not define the verification/session mechanism — that is [[authentication]].

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **OWASP ASVS** — https://owasp.org/www-project-application-security-verification-standard/
  - SEC-ASVS-02 (Authentication)


## Impact on web-ui

The app has a **`/login` page** that selects the acting user from the project's **seeded people**
(`specs/business/roles/` + seed data) — a dropdown / list of users **by display-label** (name and
role), not a raw id/credential field (see [[reference-display]]). Choosing one:

- establishes the client identity state the rest of the app reads (the same state the switcher
  toggles and the header profile shows);
- routes into the app; **sign out** (from the profile control) returns here.

**Route guard — unauthenticated access redirects to `/login`.** When no acting user is set, any
app route redirects to `/login`; only `/login` itself is reachable un-logged-in. After choosing a
user, the app routes to the originally-requested page (or a default landing) and the header
profile appears. **Sign out** clears the identity state and returns to `/login`. This is a
**routing/UX gate, not a security boundary** — it makes the login page meaningful and gives tests
a realistic entry flow; it is consistent with the fake-login framing below (the guard checks
"is an acting user selected?", not a verified credential). The guard is one shared wrapper
(route element / layout), not re-implemented per page.

In **dev/fake mode** (the default UI behavior):

- The page **selects** an identity (seeded person); it does **not** verify a credential. Any real
  verification/session security is the [[authentication]] feature's real mode — this page never
  reimplements it, and dev mode must not be presented as real security.
- It is **generated** (not a shipped auth library), whenever UI is in scope and the project has
  roles/users. A project with no roles may omit it (the app opens directly).
- **Deterministic for tests** — E2E tests reach a known acting user through this page (or a
  documented test shortcut that sets the same identity state), so role-scoped behaviour is
  testable. Because the guard redirects un-logged-in traffic to `/login`, **a test must log in
  first** (or seed the identity state) before it can reach an app page — the login step is part of
  the E2E setup, not an obstacle. Keep a **stable selector** for the user chooser and submit (see
  [[stable-selectors]]).

## Audit

Judge whether the selected identity is **actually propagated to the API** and **exercises
role-scoped behaviour** — not just displayed in the shell. The common gap: login stores a local
selected user used only for greeting/routing, while API calls never send that identity, so
role-scoped access is never truly tested.

Drive the running app: pick a user, then perform an action and inspect the request the app
sends — does it carry the selected identity/roles (a header/token), and does the server log show
the request attributed to that principal? Then pick a **different-role** user and confirm the app
**behaves differently** where roles matter (an action allowed for one role is blocked for
another). If every role can do everything, or the identity never leaves the browser, role scoping
is not exercised.

Report identity as **propagated** (requests carry it, server attributes them, roles change
behaviour) or **cosmetic** (selected user only shown, API calls anonymous / role-agnostic).

## Checks

- Is there a `/login` page that selects the acting user from **seeded people by display-label**
  (name/role), establishes the app's identity state, and routes into the app — with sign-out
  returning to it?
  · evidence: login page source + the identity state it sets + the route wiring
  · when: static
- Is there a **route guard** so that un-logged-in access to any app route redirects to `/login`
  (only `/login` reachable un-logged-in), implemented once as a shared wrapper — and after login
  the app routes on (to the requested page or a default)?
  · evidence: router/guard source — the redirect-when-no-user wrapper around app routes
  · when: static
- Is it clearly a **fake dev/test login** — no password verification / real token security — and
  reachable deterministically by E2E tests via stable selectors (tests log in before hitting app
  pages)?
  · evidence: login page source (no auth verification) + a test that logs in through it
  · when: static

```check scope=item
# A generated UI with roles should have a login/user-select entry point. Checks for a
# login route/page artifact. Catches the gap: no front door to establish the acting
# user. (Whether it is genuinely a *fake* login — no real auth — is the semantic check.)
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/pages/.*[Ll]ogin.*\.tsx$"
THEN  $item.content MATCHES "([Ll]ogin|sign ?in|[Ss]elect user|acting user)"
  ELSE "login page present but does not read as a user-select entry point — a fake dev/test login should let the user pick a seeded person to act as"
```

```check scope=item
# Route guard: the app's router/shell must redirect un-logged-in traffic to /login.
# Checks the routing source (App/router/guard) for a login redirect / protected-route
# wrapper. Catches the gap: a login page exists but no guard, so app pages are
# reachable without logging in and /login is dead-ends nothing.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/(App\.tsx|.*[Rr]out.*\.tsx|.*[Gg]uard.*\.tsx)$"
  AND $item.content MATCHES "([Ll]ogin|/login)"
THEN  $item.content MATCHES "([Nn]avigate|[Rr]edirect|[Pp]rotected|[Rr]equireAuth|requireUser|[Gg]uard)"
  ELSE "router references /login but has no redirect guard — un-logged-in access to app routes must redirect to /login (one shared protected-route wrapper)"
```
