---
type: feature
id: authentication
title: Authentication (real auth + guarded dev bypass)
origin: mde
impacts:
  - architecture
  - api
  - server
  - persistence
default: n/a
---

# Authentication (real auth + guarded dev bypass)

## Purpose

**Authentication** is how the app establishes *who the acting user actually is* — the step
[[user-identity]] leaves as a seam ("resolved from the authenticated session/token — auth itself
is out of scope"). This feature fills that seam.

**One code path, always generated.** The app generates **real** authentication — a login endpoint
that verifies a credential, a signed/expiring session or token, and a boundary check on every
request. There is **no second "fake mode" implementation**. For development and test, a **guarded
bypass** — a single early-return at the auth boundary, toggled by an environment flag — injects a
seeded dev user instead of requiring a real login. The real auth code always exists and always
runs unless the bypass is explicitly, safely enabled.

**AuthN is not authorization.** This feature answers *who are you*; *what you may do* is
[[entity-operations-and-access]] (the per-entity ACL) enforced by [[shared-access-enforcer]].
AuthN runs first and produces the principal that authZ then evaluates.

**The mechanism and technique are a tech-stack choice, not a method mandate.** *That* the app
authenticates, the single boundary, the bypass guardrails, and the security policy are the method's
concern; *how* it authenticates is the **auth axis in `specs/design/tech-stack.md`**
([[tech-stack-selection]] names `auth` as a stack axis):

- **mechanism** — where identities/credentials come from: **`local-db` (username + password) is the
  default**; alternatives (`oauth`/`oidc`, `sso`/`saml`, passwordless) are opt-in;
- **scheme** — session vs token/JWT;
- **hashing** — bcrypt / argon2 / scrypt / platform default (local-db only).

The method never hardcodes a specific library or algorithm; it requires the choice be **recorded**
in the stack and used consistently. **When the axis is silent, the AI implements the default —
`local-db` — including creating the identity schema it needs** (see Impact on persistence); it does
not leave the app without authentication because BA never modeled a user.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **arc42** — https://arc42.org/overview
  - ARC42-08 (Cross-cutting concepts)
- **OpenAPI** — https://spec.openapis.org/oas/v3.2.0.html
  - API-OAS-05 (Authentication/security schemes)
- **OWASP ASVS** — https://owasp.org/www-project-application-security-verification-standard/
  - SEC-ASVS-02 (Authentication)
  - SEC-ASVS-03 (Session management)


## Impact on architecture

A single **authentication boundary** (middleware/guard) resolves the acting user at the inbound
edge and hands [[user-identity]] the principal — the rest of the stack is auth-agnostic:

- **One path, one boundary.** Real verification runs at the boundary; the principal it produces is
  the **single hand-off** to [[user-identity]]. Downstream layers (services, repositories, the
  access enforcer) never see credentials/tokens — only the resolved principal.
- **The dev bypass is one early-return at that boundary**, not a second resolver and not
  `if (dev)` branches scattered through handlers. When the bypass is active, the boundary returns a
  seeded principal *instead of* verifying; when it is not, the real check runs. Same downstream
  shape either way.
- **Security basics:** credentials are never stored in plaintext (hash+salt via the stack's
  scheme), sessions/tokens are signed and expire, and secrets come from the environment
  ([[env-contract]]), never hard-coded.

## The dev bypass — fail-closed and prod-guarded

The bypass exists so dev/test need not perform a real login, but it is a controlled hole and must
be disciplined:

- **Off by default.** Absent/unset flag ⇒ real auth runs. The bypass activates **only** when the
  flag is *explicitly* set true.
- **Cannot activate in production.** The bypass is refused when `NODE_ENV` (or the stack's prod
  signal) is `production`: the app **fails closed** — it either ignores the flag or refuses to
  boot with the bypass on in a prod config. A production build must be unable to run bypassed.
- **Loud, never silent.** When the bypass is active, it is visible — a startup log/banner and,
  ideally, a UI indicator — so no one mistakes a bypassed app for a secured one.
- **The real path is exercised.** Because the real login/verify code always exists, at least one
  E2E test drives the **real** auth path (not only the bypass), so it cannot silently rot.

## Impact on api

Each request is authenticated at the boundary before the handler runs:

- A **login endpoint** verifies the credential and issues a session/token; subsequent requests
  carry it and it is validated — an unauthenticated/invalid request is rejected with **`401`**. The
  resolved principal is attached to the request for [[user-identity]] and the access enforcer.
- **AuthN vs authZ status codes:** unauthenticated (no/invalid identity) is **`401`**;
  authenticated-but-not-permitted (authZ, the enforcer) is **`403`** — keep them distinct.
- When the dev bypass is active, the boundary attaches the seeded principal and skips the `401`
  gate — endpoints behave identically downstream because the principal shape is unchanged.

## Impact on server

The real auth is generated once, using the technique **recorded in the stack's auth axis** (never
a library the method hardcodes):

- an **auth boundary** module (middleware/guard) that verifies the session/token and resolves the
  principal, with the **guarded bypass** as an explicit early-return keyed on the env flag +
  prod-guard (above);
- credential verification via the stack's chosen scheme (hashing algorithm + session/token
  approach from `tech-stack.md`), with a **login/logout endpoint**; secrets via [[env-contract]];
- the bypass flag and any dev-user selector live in **one** place (the boundary), not spread
  through routes; the prod-guard assertion runs at startup.

## Impact on persistence

**Persistence generation reads the recorded auth mechanism (`tech-stack.md` auth axis) and must
implement whatever schema it requires — creating it when the business model does not already have
it.** The default mechanism is **local-db (username + password)**. Most business specs will **not**
have modeled an identity entity, so the AI **must add** one: an **identity entity** (e.g. `User` /
`Account`) carrying a **credential aspect** — the stored `password-hash` (never plaintext, per the
stack's hashing scheme) plus whatever the scheme needs (salt, token/reset fields) — and a
relationship to the app's roles. Do not skip it because BA never mentioned a user table; a
local-db auth app is incomplete without it. Because identity is an **entity with an aspect**, it
then flows through the **normal** entity → `## Storage View` → schema/migration → seed pipeline
([[schema-from-entities]], [[audit-history]] for the credential aspect); there is **no** separate
auth-only schema mechanism — the AI creates the entity and lets the standard pipeline realize it.

- The identity entity's storage view realizes the credential columns (hash, not plaintext) and the
  role link; migrations create the table like any other entity's.
- **Seeds create real users** — the seeded people the dev bypass acts as become real rows with
  **hashed** passwords ([[meaningful-seed-data]]), so the real login path works against seed data
  and the bypass and real path share one user set.
- For a **non-local mechanism** (OAuth/OIDC, SSO), there may be **no** password column at all — the
  identity entity stores the external subject id / provider instead. The persistence shape follows
  the recorded mechanism; the method does not force a password column when the mechanism has none.

## Checks

- Is authentication resolved at a **single boundary** producing the principal [[user-identity]]
  threads down — real verification always present (not a separate fake implementation), with the
  dev bypass as one guarded early-return, not credential handling scattered through handlers?
  · evidence: the boundary module + the bypass early-return + startup guard
  · when: static
- Are credentials verified using the **stack's recorded auth technique** (`tech-stack.md`) — never
  stored/compared in plaintext — with sessions/tokens signed and expiring, secrets from the
  environment, and unauthenticated requests rejected with `401` (distinct from authZ's `403`)?
  · evidence: `tech-stack.md` auth axis + login/verify path, token handling, env-sourced secrets, 401 vs 403
  · when: static
- Is the dev bypass **fail-closed**: off by default, unable to activate under a production config
  (startup refuses/ignores), and loud when active?
  · evidence: the bypass flag handling + the production guard + the active-bypass log/indicator
  · when: static
- Is the auth **technique** recorded in `tech-stack.md` (scheme + hashing/library) rather than an
  ad-hoc choice, and is the **real** auth path covered by at least one E2E test (not only the
  bypass)?
  · evidence: `specs/design/tech-stack.md` auth axis + an E2E test through the real login
  · when: static + requires-environment
- Does persistence realize what the **recorded mechanism** requires — for local-db, an identity
  entity with a credential aspect (hashed password column, role link) in the schema, and seeded
  users with **hashed** passwords (the bypass's seeded people as real rows)? For a non-local
  mechanism, no password column is forced (external subject id instead)?
  · evidence: identity entity `## Storage View` + migration + hashed-password seeds vs. the auth axis
  · when: static + requires-environment

```check scope=item
# Real-auth safety (POLICY, not technique): an auth/login source must not COMPARE a
# password in plaintext. Flags the classic `password === input` / `password ==`
# equality-compare smell. It does NOT prescribe a library — bcrypt/argon2/scrypt or
# the stack's chosen scheme all satisfy it by NOT doing a plaintext compare; the
# *technique* is the stack's call (tech-stack.md auth axis), the *no-plaintext* rule
# is the method's.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/server/.*(auth|login|session).*\.(ts|js|mjs)$"
THEN  $item.content NOT MATCHES "[Pp]assword\w*\s*===?\s*"
  ELSE "auth source compares a password in plaintext (`password === …`) — verify credentials via the stack's chosen hashing scheme (tech-stack.md), never a plaintext compare"
```

```check scope=item
# Bypass must be prod-guarded: an auth boundary that reads a bypass/dev flag must also
# reference a production guard (NODE_ENV/production) so the bypass can't activate in
# prod. Flags a bypass flag with no prod guard in the same file — fail-open risk.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/server/.*(auth|login|session|middleware).*\.(ts|js|mjs)$"
  AND $item.content MATCHES "(AUTH_BYPASS|BYPASS_AUTH|DEV_AUTH|authBypass|devLogin|bypass)"
THEN  $item.content MATCHES "(production|NODE_ENV|isProd|PROD)"
  ELSE "auth bypass flag present with no production guard in the same module — the bypass must fail closed (refused when NODE_ENV=production); add the prod guard"
```
