---
type: feature
id: carbon-ui-profile
title: Carbon web UI profile
origin: external-adopted
impacts:
  - web-ui
default: on
---

# Carbon web UI profile

## Purpose

Adopt IBM Carbon as MDE's default web component and interaction profile while preserving MDE's
technology-independent Page Specs. Projects may explicitly replace this profile, but must name an
equivalent governed UI profile.

Carbon is Apache-2.0 licensed. Authoritative references:

- Components: https://carbondesignsystem.com/components/overview/components/
- Patterns: https://carbondesignsystem.com/patterns/overview/
- Search: https://v10.carbondesignsystem.com/patterns/search-pattern/
- Filtering: https://v10.carbondesignsystem.com/patterns/filtering/
- Data Table: https://carbondesignsystem.com/components/data-table/usage/
- Tree View: https://carbondesignsystem.com/components/tree-view/usage/
- Forms: https://carbondesignsystem.com/patterns/forms-pattern/
- Buttons: https://carbondesignsystem.com/components/button/usage/
- Themes: https://carbondesignsystem.com/elements/themes/overview/
- Empty states: https://carbondesignsystem.com/patterns/empty-states-pattern/

## Impact on web-ui

Unless the project declares another UI profile:

- use Carbon components, tokens, spacing, typography, interaction behavior, accessibility guidance,
  action hierarchy, loading/empty/error states, and responsive conventions;
- map MDE `Search`/`Filter` panels to Carbon search/filter controls;
- map `List`/`Grid` to Data Table or Structured List as appropriate;
- map `Tree` to Tree View;
- map `Form`/`Editor` and panel actions to Carbon forms and buttons;
- compose `Detail`, `Info`, `Comparison`, `MatchResult`, and `StateTransition` from Carbon content,
  status, form, notification, and structured-list components;
- compose `Summary` from Carbon tile/content-switcher components; `Chart` from `@carbon/charts`
  (or the project's declared charting adapter) styled with Carbon tokens;
- use Carbon themes/tokens rather than copying IBM-branded page styling or hardcoding colors;
- keep Calendar, Map, Timeline, Diagram, and Kanban implementations adapter-selected while styling
  their surrounding controls and states consistently with the profile.

The stack adapter records exact packages/imports. For React, prefer `@carbon/react` and
`@carbon/icons-react` versions compatible with the project's toolchain.

## Checks

- Does the project declare Carbon or another concrete UI profile and compatible technology adapter?
  · evidence: application policy / tech stack + dependencies
  · when: static

- Do generated pages use the declared profile's components and tokens rather than page-local
  substitutes and hardcoded styling?
  · evidence: dependencies, imports, shared components, and page source
  · when: static + AI review at go / review app
