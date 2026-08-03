---
type: feature
id: logging
title: Logging
origin: mde
impacts:
  - server
  - architecture
default: n/a
---

# Logging

## Purpose

Logging is an **explicit, consistent** cross-cutting concern — a single structured mechanism
used the same way everywhere — not `console.log` scattered ad hoc or invented per module.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **arc42** — https://arc42.org/overview
  - ARC42-08 (Cross-cutting concepts)
- **OWASP ASVS** — https://owasp.org/www-project-application-security-verification-standard/
  - SEC-ASVS-07 (Error handling and logging)


## Impact on architecture

Logging is a named cross-cutting concern with **one mechanism** (a logger the app constructs once
and shares). It is not a substitute for audit history (business "who changed what" lives in
`audit-history`); logging is operational.

**Where log lines are emitted (log points).** A **hard core** is always logged; the rest is a
judgment the generator makes toward useful, non-noisy operational visibility.

| Log point | Rule |
|---|---|
| **request boundary in / out** | **must** — one line as a request enters, one as it completes (with outcome/status) |
| **caught errors** | **must** — logged where handled, never swallowed silently |
| transaction outcome | good practice — commit / rollback of a write's unit of work (a read has none) |
| service / use-case operations | good practice — a line at `info` for a significant business operation |
| DB calls | good practice — `debug` only; avoid logging every query/row |

Good practice is to log the points that let a reader **trace a request end to end and diagnose a
failure** — and to avoid the two failure modes: too little (a request you cannot follow) and too
much (per-row noise, or the same event double-logged at multiple layers). The two **must** points —
**request boundary and caught errors** — are non-negotiable because they are the minimum a request
needs to be traceable: and, per [[required-operation-ui-coverage]], the boundary line is the trace a
test's captured log must show to prove it did real work.

**Required structured labels (a contract — not `e.g.`).** Every log emitted while serving a
request carries these named fields, taken from the propagated request context (see
[[context-propagation]] — logging *consumes* that context, it does not establish it):

| Label | Meaning |
|---|---|
| `correlationId` | one id per inbound request, stable for its whole lifetime (from the request context) |
| `principalId` | the acting principal (from the request context) |
| `level` | error / warn / info / debug (set at the log call) |

The correlation guarantee — that a service/repository log line carries the **same** `correlationId`
as its route — is the [[context-propagation]] invariant; logging relies on it. The names above are
the contract: not a request-id under a different key per module.

## Impact on server

Generated source logs through the shared logger, not raw `console.*` / `print`, with a
consistent level discipline (error / warn / info / debug). It logs at the **hard-core points**
above (request boundary in/out; caught errors) and reasonably beyond, without per-row noise.
Errors are logged where handled (not swallowed silently), and logs **never** contain secrets or
full sensitive payloads (the logger's redaction list covers auth headers / `password` / `token`).

**Destination is env-configured — `LOG_PATH` (and level via `LOG_LEVEL`).** The log destination
is **not hardcoded**: the logger reads `LOG_PATH` from `.env` (see [[env-contract]]) and writes
there. When `LOG_PATH` is unset it **defaults to `logs/app.log`** under a root `logs/` directory
(created if absent) and always also mirrors to stdout. This is what lets a test run capture the
app's log to a known file by setting `LOG_PATH` for that run (see
[[required-operation-ui-coverage]] — log-as-test-evidence). `logs/` is gitignored runtime output.
The logging setup lives in one place; modules obtain the logger rather than each configuring their
own. Log lines carry the request context's `correlationId` + `principalId` (from
[[context-propagation]]) — logging stamps the propagated context; it does not build it.

## Checks

- Does generated source log through one shared structured logger (not ad-hoc `console.*`),
  with consistent levels, and never logging secrets/sensitive payloads?
  · evidence: source — logger usage + the single logging setup
  · when: static
- Are the **hard-core log points** present — a line at the **request boundary in/out** and at
  **caught errors** (never swallowed) — and do request-serving log lines carry the required labels
  `correlationId` + `principalId` (from the request context)?
  · evidence: request-boundary source + error-handling + log-call labels
  · when: static

```check scope=plan target=server
# trace = every artifact the plan produced (each with a path, type, content).
# This check: no server source file may use ad-hoc console.* — only the shared logger
#   module may. (Skips the logger file itself, which wraps console, and .d.ts types.)
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/server/.*\.(ts|js)$"
  AND $t.path NOT MATCHES "(logger)\.(ts|js)$"
  AND $t.path NOT MATCHES "\.d\.ts$"
THEN  $t.content NOT MATCHES "\bconsole\.(log|info|warn|error|debug)\("
  ELSE "server source uses ad-hoc console.* — log through the shared structured logger instead; see ref"
```

```check scope=plan
# logCallBlob = only the lines that are actual logger calls / .child() context (not the
#   whole file), so a label defined in a type but never logged does NOT pass.
# This check: log calls must carry 'correlationId'. A single request-context object —
#   logger.child({ correlationId, principalId }) or ctx carrying them — satisfies it
#   (merging the fields is the intended design). Propagation across layers is the [ASK].
WHEN  "server" IN $plan.loaded
THEN  $plan.logCallBlob MATCHES "correlationId"
  ELSE "no log call carries 'correlationId' — request lines cannot be correlated (the label may be typed but is never logged); see the logging label contract + request-context pattern"
```

```check scope=plan
# This check: log calls must carry 'principalId' (see logCallBlob above) so a request
#   is attributable to its acting principal.
WHEN  "server" IN $plan.loaded
THEN  $plan.logCallBlob MATCHES "principalId"
  ELSE "no log call carries 'principalId' — a request cannot be attributed to its acting principal (the label may be typed but is never logged)"
```

```check scope=plan
# Judgment layer: log-point discipline + redaction a regex can't decide. (Context
# threading is [[context-propagation]]'s ASK, not repeated here.)
WHEN  "server" IN $plan.loaded
ASK   "Are the hard-core log points present (a line at the request boundary in/out, and caught errors logged where handled rather than swallowed) without over-logging (no per-row DB noise, no double-logging the same event across layers)? Do logs never contain secrets or full sensitive payloads (auth headers, password, token redacted)?"
```
