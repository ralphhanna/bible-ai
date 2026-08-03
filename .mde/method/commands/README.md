# Command Instructions

Commands are event-specific profiles.

Load core rules plus the active command instruction. Load target profiles and templates only when relevant.

Commands own operational mechanics such as start, go (build), evaluate, change, cancel, drift checks, reconciliation commits, branch creation, release validation, and merge/tag behavior.

You **carry these out yourself** — there is no `mde` CLI or runtime to invoke. Edit files directly, and run **git** directly for branch/commit/merge/tag (e.g. `mde start branch`, `mde go`, `mde release branch`). The only spawned programs are the method's own `scripts/*.mjs` (via `node`).
