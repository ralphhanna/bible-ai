---
type: feature
id: operations-against-data
title: Operations against data (not canned swaps)
origin: mde
impacts:
  - web-ui
default: n/a
---

# Operations against data (not canned swaps)

## Purpose

A filter/sort/page operation performs over the actual result set and re-renders — replacing
the table with a hardcoded row, or describing what *would* happen, is a fake.

## Impact on web-ui

A filter narrows the **actual result set** and re-renders (the visible count genuinely changes
with the query); sort reorders; pagination slices; selecting a row reads from it. A matching
query returns fewer-but-nonzero rows containing the term; a no-match query returns **zero**.
The control must perform the operation over the data, observably — not swap in a canned row or
a descriptive sentence.

## Audit

Judge whether each page realises **every operation it is meant to** — not just the easy
subset. A page that renders a list and detail but silently omits create, edit, transfer,
skill-management, the assignment summary, etc. looks coherent while being half-built.

Drive the running app and exercise the page's full set of operations: type in the filter and
watch the count change; sort and confirm order changes; open create/edit and complete it;
run each declared action. For each: does it operate on the **real data** (a filter that
actually narrows, not a canned result), and is the operation **present at all**? A control or
whole operation that is simply absent — no button, no path — is an incompleteness the presence
checks miss.

Report the page as **complete** (every intended operation is present and operates on real
data) or **partial** (name the missing/decorative operations). "The main list works" is not a
pass if half the page's operations are absent.

## Checks

- Do filter/sort/page operations run against the data (matching query → fewer-but-nonzero rows
  containing the term; no-match → zero), rather than a canned row or descriptive sentence?
  · evidence: E2E exercising filter/sort/page
  · when: requires-environment
