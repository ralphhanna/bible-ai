---
type: target
id: TARGET-INTEGRATION
title: Integration Target Profile
applies_when:
  - a plan connects the application to an external, existing, legacy, or third-party system
  - a plan creates or changes an outbound or inbound API client, event consumer or publisher, file exchange, synchronization process, webhook, or shared-data boundary
  - a plan imports external contracts for implementation rather than analysis only
---

# Integration Target Profile

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

Integrations are explicit application boundaries. The application owns its domain model;
an adapter translates between that model and the external system's contract. External
transport details and vendor types must not leak into capability domain or service logic.

## Outputs

The artifacts a plan loading this target must produce. `perEach` is the **Scope Type** — the upstream concept each output is produced for (a business capability, entity, use case, business rule, role, page, integration; `—` = one per app). The verifier reads this to check the plan's manifest produced each mandated output, one per scope instance.

| output | path | perEach | when |
|---|---|---|---|
| integration-spec | specs/design/integrations/{system}.md | integration | integration-in-scope |

## Composed behavior

### Adapter isolation  `[feature: adapter-isolation]`

Capability domain/services depend on an application-owned interface, while a **dedicated
adapter** owns vendor/transport types, mapping, authentication, retries, and external error
translation. Direct vendor coupling in domain code is a failure.

### Compatibility and versioning  `[feature: compatibility-versioning]`

Contract versioning and compatibility behavior are defined (how version changes are detected
and handled).

### Contract and failure-path tests  `[feature: contract-and-failure-tests]`

Contract tests and applicable failure-path tests exist; the test environment is accurately
recorded. Evidence is labeled as fixture/mock, emulator, sandbox, or production-like.

### Idempotency and retries  `[feature: idempotency-and-retries]`

Retries/replays are safe through idempotency or explicit duplicate detection and
reconciliation. Timeout, idempotency, duplicate handling, consistency, and recovery are
defined.

### Integration specification  `[feature: integration-spec]`

`specs/design/integrations/<system-slug>.md` exists for every in-scope external system and
records ownership, mapping, authentication/secrets, timeout/retry/idempotency, compatibility,
failure recovery, observability, and test environment.

### Ownership and mapping  `[feature: ownership-and-mapping]`

Data and decision **ownership** is explicit for every exchanged entity/field (source of truth,
direction). The mapping between the external contract and the internal model is defined (owned
by the adapter).

### Reconciliation path  `[feature: reconciliation-path]`

There is an operational reconciliation path for asynchronous or synchronized data
(observability + a defined way to reconcile discrepancies). Unresolved destructive
synchronization, conflict resolution, or ownership decisions are kept as open `discussion.md`
entries during evaluation.

### Secrets and timeouts  `[feature: secrets-and-timeouts]`

Committed source contains **no secrets** (secrets externalized), and external calls have
**explicit timeouts**. Sensitive data handling is explicit.

## Validation checks

### Adapter isolation  `[feature: adapter-isolation]`

- Does capability code depend on an app-owned interface (not vendor types), with a dedicated
  adapter owning transport/mapping/auth/retries/error-translation?
  · evidence: source boundaries (domain vs. adapter)
  · when: static

### Compatibility and versioning  `[feature: compatibility-versioning]`

- Are contract versioning and compatibility behavior defined?
  · evidence: integration spec compatibility section
  · when: static

### Contract and failure-path tests  `[feature: contract-and-failure-tests]`

- Do contract + failure-path tests exist, run in a capable environment, with output captured
  and evidence accurately labeled (fixture/mock/emulator/sandbox/production-like)?
  · evidence: test source + run logs under `evidence/logs/`
  · when: static (existence) + requires-environment (run)

### Idempotency and retries  `[feature: idempotency-and-retries]`

- Are retries/replays safe (idempotency or explicit duplicate detection + reconciliation), with
  timeout/consistency/recovery defined?
  · evidence: integration spec + adapter source + failure-path tests
  · when: static

### Integration specification  `[feature: integration-spec]`

- Does every in-scope external system have a non-placeholder integration spec recording
  ownership, mapping, auth/secrets, timeout/retry/idempotency, compatibility, recovery,
  observability, and test environment?
  · evidence: `specs/design/integrations/<slug>.md`
  · when: static

### Ownership and mapping  `[feature: ownership-and-mapping]`

- Is data/decision ownership explicit for every exchanged entity/field, with the external↔
  internal mapping defined?
  · evidence: integration spec ownership + mapping sections
  · when: static

### Reconciliation path  `[feature: reconciliation-path]`

- Is there an operational reconciliation path for async/synchronized data (observability +
  defined reconciliation)?
  · evidence: integration spec reconciliation/observability sections
  · when: static

### Secrets and timeouts  `[feature: secrets-and-timeouts]`

- Does committed source contain no secrets, and do external calls have explicit timeouts?
  · evidence: source scan + integration spec
  · when: static
