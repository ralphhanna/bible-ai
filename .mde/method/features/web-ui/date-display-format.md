---
type: feature
id: date-display-format
title: Human date display (business dates, no raw ISO)
origin: mde
impacts:
  - web-ui
default: n/a
---

# Human date display (business dates, no raw ISO)

## Purpose

When a page shows a **business date** — a calendar day the user cares about, such as a hire date,
due date, start/end date, or review date — it presents it in a **human-readable** form, e.g.
`Jan 15, 2025` (or the app's chosen locale/format), never the raw storage value like
`2025-01-15T05:00:00.000Z` or `2025-01-15`.

**Scope: business dates, not timestamps.** System timestamps — `createdAt`, `updatedAt`,
audit/log times — are metadata, not business dates. This feature does **not** require formatting
them into a pretty date: they are often not shown at all, or shown as full date-time / relative
time when they are. The rule targets the *business-meaningful calendar dates* a user reads as
dates.

This is the temporal analogue of [[reference-display]]: just as a related entity is shown by its
human display-label rather than its raw `id`, a business date is shown human-formatted rather than
as its raw stored value.

## Impact on web-ui

A rendered **business date** field is formatted before display — via a shared helper
(`formatDate`, `Intl.DateTimeFormat`, `toLocaleDateString`, or a date library) — so the value
shown is human-readable and consistent across pages. Formatting lives in **one shared place** (a
util/hook), not re-implemented per page.

- **Never render a raw ISO business date.** A hire/due/start date shown as `2025-01-15` or, worse,
  `2025-01-15T05:00:00.000Z` is drift — that is the storage/API shape, not a display value.
- **Timestamps are out of scope.** `createdAt`/`updatedAt`/audit times are not business dates;
  do not force them through business-date formatting. Where a timestamp *is* surfaced, a full
  date-time or relative-time presentation is fine.
- **Storage/transport stays ISO.** This governs **presentation** only: entities, APIs, and seed
  data keep ISO 8601. The page formats at the edge, when rendering.
- **Consistency.** All pages format business dates the same way, so the app does not mix
  `1/15/2025`, `2025-01-15`, and `Jan 15, 2025` across screens.

## Checks

- Is every user-visible **business date** (hire/due/start/end/review/effective dates — not
  `createdAt`/`updatedAt`/audit timestamps) rendered through a formatting helper, so no raw ISO
  date string reaches the DOM as displayed text?
  · evidence: page source for business-date fields + the shared format helper
  · when: static
- Is business-date formatting defined **once** (a shared util/hook) and reused, rather than
  re-implemented per page?
  · evidence: a single formatting module referenced by the pages
  · when: static

```check scope=item
# Static — no raw ISO date literal rendered in a page. Flags a hardcoded ISO date
# (YYYY-MM-DD, optionally with a time part) sitting in page source, the smell from
# the report. Timestamps aren't literals in page source (they come from the API as
# createdAt/updatedAt), so this literal check does not touch them; the timestamp
# carve-out is enforced by the semantic check above. Formatting helpers
# (Intl/toLocale*/format*) are the expected path for real date values.
WHEN  $item.type IS "source"
  AND $item.path MATCHES "src/web/src/pages/.*\.tsx$"
THEN  $item.content NOT MATCHES "\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?"
  ELSE "page contains a raw ISO date literal — format business dates for display (Intl/toLocale/format helper); raw ISO is storage, not display"
```
