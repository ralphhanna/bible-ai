---
type: feature
id: ui-patterns
title: UI page patterns (bounded-first composition)
origin: mde
impacts:
  - ui-design
  - web-ui
default: on
---

# UI page patterns (bounded-first composition)

## Purpose

Give the AI a small, preferred pattern sandbox before it invents a custom page. Patterns are
semantic page compositions, not substitutes for business analysis. The use case supplies purpose,
subject, context, business objects, rules, and outcome; the pattern supplies a proven page shape.

This feature is the semantic catalog behind project visual references in `.mde/ui-patterns/`.
Images such as `search-results`, `detail-page`, `split-master-detail`, `form-page`,
`approval-queue`, `status-stepper`, and `stat-cards` are examples beneath these semantics, not
independent sources of business behavior.

## External Standards

_Documentation only — traceability to external standards for review context. This section is_
_never compiled into a target (compile-targets.mjs extracts only Purpose/Impact/Outputs/Checks)._

- **ISO/IEC 25010** — https://www.iso.org/obp/ui/en/
  - QUAL-04 (Interaction capability/usability)


## Preferred page patterns

1. **Search–Filter–List** — discover or narrow a collection, then navigate/open a result.
2. **Profile** — one routable business object: identity/status header, Detail panels,
   dependent/related panels, and panel-owned actions. Profile is a page, never a panel.
3. **Parent–Children** — one parent context with dependent child collections and child-scoped
   add/edit interactions.
4. **Compare–Match** — present sources for human comparison and/or system-evaluated match results.
5. **Summary–Drilldown** — summaries or measures lead to the supporting collection and detail.

Patterns may compose. Example: staffing uses `Search–Filter–List + Compare–Match`; selecting
`Open employee` navigates to the separate Employee Profile page.

## Selection policy

- Understand and record purpose, subject, primary transaction, entry context, and success outcome
  before selecting a pattern.
- Choose one preferred pattern as the foundation.
- Compose no more than two preferred patterns unless the use case requires more.
- Adapt panels and placement without breaking pattern semantics.
- Use a custom pattern only when the preferred set cannot satisfy the documented business task;
  record the unmet need and reason.
- A visual reference never overrides the Page Spec's business-object bindings or relationships.

## External standards boundary

MDE owns page purpose, pattern choice, canvas intent, panel sources, selection ownership, panel
relationships, panel actions, terminal scope, rules, and business effects. The selected UI profile
owns standard component behavior, layout mechanics, responsive rules, accessibility, states,
action hierarchy, and tokens.

Default references for the web profile:

- IBM Carbon patterns: https://carbondesignsystem.com/patterns/overview/
- IBM Carbon components: https://carbondesignsystem.com/components/overview/components/
- IBM Carbon themes: https://carbondesignsystem.com/elements/themes/overview/
- Material canonical layouts: https://m3.material.io/foundations/adaptive-design/canonical-layouts

## Impact on ui-design

Every Page Spec declares:

- `pagePattern.primary` and optional `pagePattern.composed`;
- any matching project visual references;
- the canvas, panels, semantic relationships, and panel-owned actions that realize the pattern;
- a reason when `pagePattern.primary: Custom` is used.

The Page Spec is authoritative. Pattern names are concise design decisions; composition and
interaction sections make those decisions concrete.

## Impact on web-ui

Generated pages realize the declared page pattern using the selected UI profile and technology
adapter. The implementation must preserve declared panel sources, selection, relationships,
action target, terminal scope, business results, and responsive priority. It must not imitate a visual
reference while dropping its business bindings.

## Checks

- Does every Page Spec select one preferred pattern, or document why a custom pattern is required?
  · evidence: Page Spec `pagePattern`
  · when: static

- When patterns are composed, are there no more than two unless the documented use case requires
  more?
  · evidence: Page Spec `pagePattern.composed` + purpose/use case
  · when: static

- Does the generated page realize the declared pattern without losing panel sources,
  relationships, panel action targets, terminal scope, or business rules?
  · evidence: Page Spec vs. page source and UI review
  · when: static + AI review at go / review app
