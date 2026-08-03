---
type: feature
id: design-system-styling
title: Design-system styling
origin: mde
impacts:
  - web-ui
default: n/a
---

# Design-system styling

## Purpose

Pages compose the project's shared design-system tokens/components rather than re-declaring
shell/button/badge/table styling inline — so pages are visually consistent by construction.

## Impact on web-ui

Styling follows `.mde/ui-patterns/ui-design-system.md`: pages compose shared tokens/components,
not page-level inline styling. `mde go` checks this mechanically with
`verify-method-followed.mjs`: catalog/design-system stack agree, declared tokens/components
exist in source, governed page source does not replace shared composition with inline styles.
(The page's **composition** — its canvases and panels — is governed separately by the
`page-composition` capability; this capability is about styling/visual composition, not page
structure.)

Unless the project explicitly declares another governed profile, [[carbon-ui-profile]] supplies
the standard components, patterns, states, accessibility guidance, and tokens. Project visual
references under `.mde/ui-patterns/` specialize the product presentation without replacing the
profile or the semantic Page Spec.

## Checks

- Does each page compose the design system's shared components/tokens rather than re-declaring
  styling inline (declared tokens/components exist in source; no inline-style replacement)?
  · evidence: `verify-method-followed.mjs` output + page source
  · when: static

```check scope=plan
# CSS/design compliance — cross-cutting over all page/component artifacts, so
# scope=plan scanning $plan.trace. Two precise rules (calibrated against real pages):
#  1. PAGES must compose the design system (className). Components under
#     components/ ARE the design system, so they're exempt from this one.
#  2. NO hardcoded colors anywhere in page/component styling — colors must be
#     design-system TOKENS (var(--…)), never raw hex. A style={{ color:'#fff' }}
#     bypasses the token system; token-based inline style (var(--…)) is allowed.
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/web/src/pages/.*\.tsx$"
THEN  $t.content CONTAINS "className"
  ELSE "page does not compose the design system (no className usage)"
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "src/web/src/(pages|components)/.*\.tsx$"
THEN  $t.content NOT MATCHES "(color|background|border)\s*:\s*['\"]?#[0-9a-fA-F]{3,8}"
  ELSE "hardcoded color in styling — use a design-system token (var(--…)), not a raw hex"
```

```check scope=plan target=web-ui
# Design-system REALIZATION: what .mde/ui-patterns/ui-design-system.md declares must be
# implemented in the generated web source. Model-side ($plan.designSystem, computed against
# THIS plan's CSS/component source): declared tokens exist as `--x:` in CSS; declared shared
# components appear in components/ source; ui-patterns.md does not assert a stack tech the
# design system rejects. Guarded on the DS doc existing. (Replaces validateUiDesign in
# verify-method-followed.mjs — the token/component/stack checks; the inline-styling and
# className checks are the scope=plan block above.)
WHEN  $plan.designSystem.present IS "true"
THEN  $plan.designSystem.tokensImplemented IS "true"
  ELSE "declared design-system token(s) not implemented in web CSS: ${$plan.designSystem.missingTokens} — add each as `--token: value` to the web stylesheet"
WHEN  $plan.designSystem.present IS "true"
THEN  $plan.designSystem.componentsImplemented IS "true"
  ELSE "declared shared component(s) not implemented in web source: ${$plan.designSystem.missingComponents} — implement each under src/web/src/components/"
WHEN  $plan.designSystem.present IS "true"
THEN  $plan.designSystem.stackContradiction IS "false"
  ELSE "ui-patterns.md stack asserts a technology ui-design-system.md rejects — reconcile the two stack declarations"
```
