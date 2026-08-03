---
type: feature
id: user-identity
title: User identity context
origin: mde
impacts:
  - architecture
  - server
  - api
default: n/a
---

# User identity context

## Purpose

The acting user's identity — id, roles, and tenant — is a **single context object** built once
at the request boundary and **passed down through the layers**, so every layer reads the same
principal rather than re-deriving it or pulling it from globals. This is **not** authentication
(how the user proves who they are); it is the in-process representation of *who is acting*, used
by access enforcement and scoping.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **OWASP ASVS** — https://owasp.org/www-project-application-security-verification-standard/
  - SEC-ASVS-04 (Authorization and access control)


## Impact on architecture

A **principal / identity context** object (acting user id, role ids, tenant id, and any scope
attributes the operations need) is constructed at the inbound boundary (route/middleware) and
**threaded explicitly** through service → repository as a parameter or request-scoped context —
not read from a global/singleton or re-parsed deep in the stack. The **shared access enforcer**
consumes this object (it does not build its own); the resolved access-scope filters are
evaluated against it.

## Impact on server

The identity context is a typed object created at the boundary and passed (explicitly or via a
request-scoped container) to the code that needs it. Services/use-cases receive it as input;
repositories receive whatever scope value they filter on, sourced from it. No business layer
reads identity from process globals or re-decodes a token.

## Impact on api

Each request resolves the identity context at the boundary (from the authenticated session /
token — auth itself is out of scope here) and makes it available to the handler. Endpoints that
enforce access do so via the enforcer reading this context, not via ad-hoc checks.

## Checks

- Is there a single identity/principal context object (user, roles, tenant) built at the
  boundary and passed through the layers — not read from globals or re-derived deeper down?
  · evidence: source — where the context is constructed and how it is propagated
  · when: static
- Does the shared access enforcer consume this context (rather than building its own identity),
  and do services/repositories receive identity/scope as input?
  · evidence: enforcer + service/repository signatures
  · when: static
