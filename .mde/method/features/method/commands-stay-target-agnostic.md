---
type: feature
id: commands-stay-target-agnostic
title: Commands stay target/feature-agnostic
origin: mde
impacts:
  - method-change
default: n/a
---

# Commands stay target/feature-agnostic

## Purpose

Enforce **RULE-CORE-001 "Commands are target-agnostic"** with an actual check, not just prose.
A command profile (`.mde/method/commands/*.md`) must operate over *whatever targets are loaded* —
it must never name or enumerate a specific target, feature, or target-mandated artifact, nor
hardcode a gate that belongs in a feature. The *what/when* lives in features (tagged to a
target); the command runs it generically. If a method change adds behaviour by editing a command,
that is the wrong file — the behaviour belongs in a feature whose target the command already
iterates.

## Impact on method-change

When a method-change plan adds or modifies a **command** (`.mde/method/commands/*.md`), check the
change does not introduce target/feature/artifact-specific logic into the command. A new
required artifact, check, or gate must be added as a **feature** (impacting the right target),
not as inline command text. A command edit that names a specific target/feature/artifact, lists
required artifacts, or hardcodes a domain gate is a violation — move it to a feature and have
the command defer to the loaded targets instead.

## Checks

- For every command file this plan changed, is it free of target/feature/artifact-specific
  logic — it iterates the loaded targets and defers *which artifacts/checks/gates* to them, naming
  no specific target, feature, diagram, or required-artifact list?
  · evidence: the changed `commands/*.md` vs. RULE-CORE-001 "Commands are target-agnostic"
  · when: static
- Was any new required artifact / check / gate added as a **feature** (tagged to a target),
  rather than as inline command text?
  · evidence: new/changed feature under `features/` rather than command prose
  · when: static
