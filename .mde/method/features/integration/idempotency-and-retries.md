---
type: feature
id: idempotency-and-retries
title: Idempotency and retries
origin: mde
impacts:
  - integration
default: n/a
---

# Idempotency and retries

## Purpose

Retries and replays are safe — through idempotency or explicit duplicate detection — and
timeout/consistency/recovery behavior is defined.

## Impact on integration

Retries/replays are safe through idempotency or explicit duplicate detection and
reconciliation. Timeout, idempotency, duplicate handling, consistency, and recovery are
defined.

## Checks

- Are retries/replays safe (idempotency or explicit duplicate detection + reconciliation), with
  timeout/consistency/recovery defined?
  · evidence: integration spec + adapter source + failure-path tests
  · when: static
