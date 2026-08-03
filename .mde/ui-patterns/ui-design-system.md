# UI Design System

## About

The single source of truth for **how this project's UI looks** — the chosen styling
approach, the design tokens, and the shared component set every page draws from.

`ui-patterns.md` (sibling file) defines *which* pattern a page uses (list-table,
tabs-layout, …) and *which* components it needs; **this** file defines what those
components look like and the tokens they share, so that every page — and every
mock-up — is visually consistent by construction rather than by per-page discipline.

This file **carries the choice**. There is no separate setting elsewhere: the approach
declared in "Stack" below *is* the project's design-system decision.

## Stack

**Plain CSS custom properties + shared React components.** No Tailwind, no shadcn/ui,
no component library — vanilla CSS variables plus a small set of hand-written React
components. This matches what the app and the mock-ups already use; the point of this
file is to make that idiom **shared and named** instead of re-improvised on each page.

> Changing the stack (e.g. adopting Tailwind/shadcn) is a deliberate design decision —
> edit this file and reconcile the components below. Until then, plain CSS is the system.

## Tokens

The shared visual vocabulary. In the app these live in `src/web/src/styles/tokens.css`
as CSS custom properties; mock-ups inline the same values. Derived from the existing
mock-up styling so the live app and prototypes match.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#f6f8fb` | App background |
| `--color-surface` | `#ffffff` | Panels, cards |
| `--color-border` | `#d9e2ec` | Panel/card borders |
| `--color-line` | `#e5e7eb` | Table row dividers |
| `--color-text` | `#172033` | Body text |
| `--color-muted` | `#475569` | Secondary text/labels |
| `--color-primary` | `#2563eb` | Primary action, links |
| `--color-nav` | `#1f2937` | Sidebar background |
| `--color-nav-link` | `#dbeafe` | Sidebar link (idle) |
| `--color-danger` | `#dc2626` | Destructive action |
| `--radius` | `8px` | Panels/cards (`6px` for controls/buttons) |
| `--nav-width` | `220px` | Sidebar column width |
| `--space` | `12px` / `16px` / `24px` | Standard gaps / panel pad / page pad |
| `--font` | `Arial, sans-serif` | Base font family |

**Status badge palette** (pill, `border-radius:999px`):

| Tone | Bg / Text | Maps to |
|---|---|---|
| ok (default) | `#dcfce7` / `#166534` | active, available, approved, success |
| warn | `#fef3c7` / `#92400e` | onboarding, leave, partially_allocated, needs-review |
| muted | `#e5e7eb` / `#475569` | inactive, terminated, unknown |

Badge **tone** is chosen from the value's meaning; the **value text** itself always comes
from Business Specs (see the Web-UI target's "governed values" rule) — the palette styles
it, it does not rename it.

## Components

The shared React components every page composes. They live in `src/web/src/components/`.
A page must compose these rather than hand-writing the shell, buttons, badges, table, or
form fields in its own inline styles — that is how cross-page consistency is enforced.

| Component | Responsibility | Notes |
|---|---|---|
| `AppShell` | Sidebar nav (`--nav-width`) + breadcrumb + main content area | One per page; nav lists the catalog's primary pages, current page marked active |
| `Button` | `primary` \| `alt` \| `danger` variants | Uses `--color-primary` / `--color-danger`; `alt` is the grey secondary |
| `Badge` | Status pill, tone from the palette above | Accepts the governed value as text; picks tone by meaning |
| `Table` | Bordered list-table (header + `--color-line` row dividers) | For the `list-table` pattern; rows rendered from data |
| `Field` | `label` + control + inline error, accessibly wired | Label `htmlFor` ↔ control `id`; error has `role="alert"` (a11y) |
| `Tabs` | Tab list + active underline + panel switch | For the `tabs-layout` pattern |
| `Toast` | Transient success/error feedback | For save/submit confirmations |

## Consistency rules

- Every governed page composes `AppShell` + the components above; **no page re-declares
  the shell, button, badge, table, or field styling inline.**
- New tokens/components are added **here first**, then implemented in
  `src/web/src/components/` — never invented ad hoc in a page.
- Mock-ups use the same tokens/components (as plain CSS/HTML) so a prototype and its
  implemented page share one look. A live page that diverges from this system is styling
  drift (surfaced by `mde review app`).

## Implementation status

- **Declared:** tokens + component set (this file).
- **Implemented in `src/web`:** _not yet_ — the live pages (plan 003) still carry per-page
  inline styles. Building `src/web/src/styles/tokens.css` + `src/web/src/components/` and
  restyling the existing pages to compose them is a follow-on `mde` plan.
