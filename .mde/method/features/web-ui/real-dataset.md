---
type: feature
id: real-dataset
title: Real dataset (from the data source)
origin: mde
impacts:
  - web-ui
default: n/a
---

# Real dataset (from the data source)

## Purpose

A listing page shows the **real seeded dataset** rendered from the data-source response — not 1–3
placeholders, hand-written rows, or a canned swap.

## Impact on web-ui

Each listing page renders its records **from the data source** (fake JSON API in prototype, real
API in production) via a **render loop over the response** — so it shows the full seeded dataset
(`meaningful-seed-data` owns how many records exist; this capability just renders them, it does
not define a count). Hand-written rows, 1–3 placeholders, or a canned swap is a failure.

## Audit

You did not build this. Judge whether the data on screen is **really from the API** — or a
hardcoded fallback that makes a broken backend look fine. Drive the running app and:

- **Break the API path and watch the page.** Stop the API (or point it at a dead URL) and
  reload. A real data-backed page shows an error / empty state; a **silently-falling-back**
  page shows the *same convincing data* — proving it never needed the API. This is the
  observed cheat: `apiClient.ts` carries demo fallback data and returns it when a call fails,
  so pages look functional even when the backend is broken.
- **Compare the on-screen records to the seed data via a real fetch**, and check the run's
  server log shows the list request actually happened. Data on screen with no corresponding
  server read is fallback data, not the dataset.

Report the page as **live** (data traces to a real API read this run) or **fallback**
(renders convincing data with the API broken/absent). Silent fallback outside an explicit,
labelled demo/offline mode is a failure — it is the single thing that most makes a dead app
look alive.

## Checks

- Does each listing page render its records from the data-source response via a render loop
  (showing the seeded dataset), not hand-written rows or 1–3 placeholders?
  · evidence: page source (render loop) + rendered data
  · when: static (source) + requires-environment (rendered count)
