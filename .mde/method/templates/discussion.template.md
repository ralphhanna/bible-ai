---
id: TEMPLATE-DISCUSSION
type: template
title: Plan Discussion
artifact: plan
used_by_commands:
  - mde start
  - mde change
---

# Discussion

The two-way reasoning trail of Discovery — a **curated record of plan-shaping points** (not a
transcript). Each point raised by the AI or the user becomes an entry.

**Chronological.** Entries are kept in the **order they happened** — the conversation as it unfolded,
never reordered into sections. `D<n>` numbers run in sequence.

**Resolve in place.** An item is never moved to another file when its status changes; it opens and is
later resolved in the same entry.

**Input and Decisions are derived views, not sections.** The user's actual words are captured as
`kind: input` entries; a settled decision is a resolved `kind: decision` entry. To see "just the
input" or "just the decisions," **filter the stream by `kind`** — do not split the file. This keeps
the chronology intact while making input and decisions precisely findable.

Entry header — the heading is the entry's **title** (what it is about); the metadata is a second line
beneath it:

```md
## D<n> · <short title>
· kind: <kind> · status: <status> · origin: <origin>
```

- `kind` ∈ `input | question | decision | risk | conflict | idea`
  - **`input`** — the user's actual request/direction, captured **as given** (the authored source
    everything else derives from). Origin is always `user`.
- `status` ∈ `open | resolved`
- `origin` ∈ `ai | user`

Invariant: every entry has a `**Raised:**` line, and a `**Resolution:**` line **iff**
`status: resolved`. A `kind: input` entry records what the user said (no resolution needed). A
`decision` should reference the entries it follows from (e.g. `(from D2, D3)`) so the input → decision
trail is traceable. The metadata line stays mechanically parseable.

## D1 · {{short title — what the user asked}}
· kind: input · status: resolved · origin: user
**Raised:** {{the user's actual request/direction, as given}}

## D2 · {{short title}}
· kind: question · status: open · origin: ai
**Raised:** {{the open question}}
{{optional reasoning; no Resolution line while open}}

## D3 · {{short title — the settled outcome}}
· kind: decision · status: resolved · origin: user
**Raised:** {{what was put forward (from D1, D2)}}
**Resolution:** {{the settled outcome}}
{{optional reasoning}}
