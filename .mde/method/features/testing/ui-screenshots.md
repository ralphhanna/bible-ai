---
type: feature
id: ui-screenshots
title: UI screenshots
origin: mde
impacts:
  - testing
  - web-ui
default: n/a
---

# UI screenshots

## Purpose

A UI-bearing plan captures screenshots from the running UI during tests — proving the rendered
UI was actually exercised, not just that the suite passed.

## Impact on testing

Capture at least one screenshot **per implemented page** and **per E2E happy-path workflow**
(plus asserted error/empty/validation states reached). Generate them from the running UI during
tests (Playwright `page.screenshot()` etc.) — never hand-supplied or reused design images.
Store under `reports/evidence/screenshots/`, list each in `evidence.md`, record in the manifest. A
UI-bearing plan with missing required screenshots does not pass; an uncapturable screen is
reported as a gap, not faked.

Screenshots must be emitted by the same browser automation that performs the UI/E2E scenarios.
Stale images, manually copied images, static mockups, or screenshots captured outside the test run
do not prove the current scenarios interacted with the current app. A passing UI report with no
browser-driven screenshots is incomplete evidence.

**Attach screenshots to the test report — not only to disk.** A screenshot written to a file
is invisible to the Cucumber HTML report; the report embeds only images the step/hook
**attaches**. So each captured screenshot is attached to the running scenario as well as
written under `reports/evidence/screenshots/` — in a Cucumber world, capture the buffer and attach it
with its media type, e.g.

```ts
const buf = await this.page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
await this.attach(buf, 'image/png');   // embeds it in cucumber.html
```

so the generated `cucumber.html` shows each scenario's screenshot inline next to its steps. A
report with passing UI scenarios but **no embedded screenshots** does not satisfy this — the
proof must be visible in the report, not just sitting in the evidence folder.

**The Cucumber HTML report has a declared path.** The generated report is not dropped in an
ad-hoc location the reviewer has to hunt for — it is written to a **fixed** path so tooling and
humans always find it:

| Suite | HTML report path |
|---|---|
| UI / E2E (`test:ui`) | `reports/evidence/tests-ui/index.html` |
| API (`test:api`) | `reports/evidence/tests-api/index.html` |
| Business rules (`test:rules`) | `reports/evidence/tests-business-rules/index.html` |

The Cucumber `html` formatter's output target (in each suite's `cucumber.mjs`/config) points at
these paths. `reports/evidence/tests-ui/`, `reports/evidence/tests-api/`, and `reports/evidence/tests-business-rules/` are
report output (like `reports/evidence/screenshots/`), so writing them does not breach any read-only
boundary. A suite that runs but writes its HTML report somewhere else — or nowhere — does not
satisfy this.

## Impact on web-ui

Screenshots are the operational proof the live pages render and the states are reachable.

## Checks

- For UI-bearing plans, were screenshots captured from the running UI (one per page + per happy
  path), stored under evidence, listed in `evidence.md`, recorded in the manifest (uncapturable
  → reported, not skipped)?
  · evidence: `reports/evidence/screenshots/` + `evidence.md`
  · when: requires-environment
- Are the captured screenshots **attached to the Cucumber report** (via `this.attach(buf,
  'image/png')`) so the generated `cucumber.html` shows them inline — not merely written to the
  evidence folder?
  · evidence: image attachments embedded in `cucumber.html`
  · when: requires-environment
- Is each suite's Cucumber HTML report written to its **declared path** — `reports/evidence/tests-ui/`
  for the UI/E2E suite, `reports/evidence/tests-api/` for the API suite, `reports/evidence/tests-business-rules/`
  for the business-rules suite — not an ad-hoc location?
  · evidence: the suite's Cucumber config `html` formatter target; the report file present at
    that path after a run
  · when: static (config target) + requires-environment (report present after run)
