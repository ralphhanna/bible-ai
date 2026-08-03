---
type: feature
id: test-correlation-id
title: Test correlation id (tests prove they hit the server)
origin: mde
impacts:
  - testing
  - api
default: n/a
---

# Test correlation id (tests prove they hit the server)

## Purpose

A test that greps source or asserts against hardcoded data can "pass" without ever
reaching the app — the failure this whole model exists to catch. The correlation id
makes a test's contact with the server **provable**: each test sends an id the server
records, so verification can confirm — mechanically, against a witness the test author
does not control — that the test actually exercised the running app.

## Impact on testing

Every test that drives the running app carries a **stable TestID** (an authored
identifier — e.g. a Gherkin `@id:<slug>` tag or the scenario's stable name) and sends
it on **every** request to the server as an `X-Correlation-Id` header, valued
`<TestID>+<RunId>`. The **RunId** is one id per `mde:test` run, injected by the runner
(env, e.g. `MDE_RUN_ID`) — not authored — so the id ties this specific run's requests
to this run's server log, and a stale prior-run log cannot be reused as evidence.

The test author owns the TestID; the framework owns the RunId. Neither alone can fake
the pairing: the server log will only contain `<TestID>+<RunId>` if the test *sent* it
(so the test really ran) *and* the server *received and handled* it (so it reached the
app).

## Impact on api

The request boundary reads an **inbound** `X-Correlation-Id` header as the request's
correlation id (generating one only when the header is absent, so production is
unaffected), and logs it at the boundary. The recording itself is already guaranteed by
[[logging]]'s boundary log point — this feature only requires the id be sourced from the
inbound header so a test's id appears in the server's own log.

## Checks

- Do tests that drive the running app send `X-Correlation-Id: <TestID>+<RunId>` on their
  requests, with the RunId injected by `mde:test` (not hardcoded)?
  · evidence: test/support source setting the header; `mde:test` injecting the run id
  · when: static

- For each test claimed **passed** that drives the app, does a line carrying its
  `<TestID>+<RunId>` appear in this run's captured server log — proving the test reached
  the server, not just that a `.feature`/test file exists?
  · evidence: the preserved server log (per [[captured-command-output]]'s LOG_PATH) cross-referenced with the test report
  · when: requires-environment

<!-- correlationId.serverReadsHeader is model-computed: the request-boundary source reads
     an inbound X-Correlation-Id header (not only server-generated), so a test-set id can
     appear in the server log. Static-checkable from the boundary source; the per-test
     log correlation itself is requires-environment (needs a real run) and is the ASK. -->
```check scope=plan target=api
WHEN  $plan.correlationId.serverPresent IS "true"
THEN  $plan.correlationId.serverReadsHeader IS "true"
  ELSE "the request boundary does not read an inbound X-Correlation-Id header — a test's correlation id can never appear in the server log, so tests cannot be proven to have reached the app. Source the request's correlation id from the inbound header (generate one only when absent)."
```
