---
type: feature
id: source-trace-header
title: Source trace header
origin: mde
impacts:
  - server
default: n/a
---

# Source trace header

## Purpose

Traceability at two granularities, so artifacts are explainable **and** capabilities are
declared where they are realized, not inferred from code shape:
- **File-level header** — each governed source file carries a lightweight trace back to what it
  derives from (the capability that governs the file, entity, page spec, use case, rule).
- **Inline capability marker** — a capability that spans layers (schema → repository → service →
  API) is **marked at each site that implements it**, so a reader (human or the next agent) and
  the verifier can see *where* the capability is realized rather than pattern-matching intent out
  of the code.

## Impact on server

Each governed source file has a lightweight MDE header (or equivalent file-level trace).
Generated source traces to a capability, primary entity, page spec, use case, business rule,
or explicit user instruction.

**Inline capability markers.** Where a cross-layer capability is implemented in code, the
implementing statement/block carries a marker naming it:

```
// MDE: <capability-id> — <what this line/block does for the capability>
```

The marker sits immediately above (or on) the code that realizes the capability. Examples:

```ts
// MDE: optimistic-locking — guard on the client's version, increment on write
`UPDATE employees SET …, version = version + 1, … WHERE id = $1 AND version = $10 RETURNING *`

// MDE: audit-history — set audit fields on the mutation path
`… updated_at = now(), updated_by = $11 …`
```

This is the file header's finer-grained sibling: the header says *which capability governs this
file*; the marker says *where in the file a capability is realized*. Declaration over inference —
generation **states** the capability at its implementation site rather than leaving the verifier
to guess it from a SQL/regex shape. Capabilities that mandate an inline marker say so in their own
`## Impact`; verification checks the marker is present at the required layer and (via `[ASK]`)
that the marked code truly implements it.

## Template impact

- the lightweight source-header block prepended to governed source files.
- the inline `// MDE: <capability> — <note>` marker at cross-layer implementation sites.

## Checks

- Does each governed source file carry a lightweight header tracing to a capability/entity/
  page-spec/use-case/rule/instruction?
  · evidence: source file headers
  · when: static
- Where a cross-layer capability is implemented, does the implementing site carry an
  `// MDE: <capability> — <note>` marker (declared, not inferred)? Presence per layer is checked
  by the owning capability; here the marker's **form** is validated.
  · evidence: inline `// MDE:` markers at implementation sites
  · when: static

```check scope=plan
# Cross-cutting: every GOVERNED source artifact must carry a valid trace header —
# regardless of which capability produced it. So this is a scope=plan check that
# scans $plan.trace (all manifest items), not a per-item check on this capability's
# own entries. "Governed" = the app's own logic (.ts/.tsx/.js/.jsx/.mjs), NOT
# stylesheets, markup, type-declarations (.d.ts/.d.mts), or copied assets.
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "\.(ts|tsx|js|jsx|mjs)$"
  AND $t.path NOT MATCHES "\.d\.(ts|mts)$"
  AND $t.path NOT MATCHES "(mde-annotate-bridge|annotations-core|annotations-router)"
THEN  $t.content MATCHES "MDE trace"
  ELSE "governed source file is missing its MDE trace header"
EVERY $t IN $plan.trace WHERE $t.type IS "source"
  AND $t.path MATCHES "\.(ts|tsx|js|jsx|mjs)$"
  AND $t.content MATCHES "MDE trace"
THEN  $t.content MATCHES "capability\s*=\s*\S"
  ELSE "MDE trace header is invalid — it does not name a capability (capability=…)"
```
