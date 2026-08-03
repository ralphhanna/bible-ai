# Annotations Library (shipped MDE asset)

A **domain-agnostic** reviewer-feedback library for MDE prototypes. Reviewers attach notes
to any visible page element; notes persist and re-display on reload. It knows nothing about
any project's domain — it targets elements by `id` → `data-testid` → DOM path — so it is
**copied into a project once**, not regenerated per project (Prototyping target →
Interactive / reviewable prototypes; principle: *domain-agnostic mechanism → shipped
library*).

## Files

| Asset file | Copy to (project) | Purpose |
|---|---|---|
| `annotations-core.mjs` | `src/web/src/lib/annotations/annotations-core.mjs` | Shared schema, targeting, semantic context, re-attachment, and API client used by prototypes and Workbench |
| `annotations-core.d.mts` | `src/web/src/lib/annotations/annotations-core.d.mts` | TypeScript declarations for the shared core |
| `annotations.tsx` | `src/web/src/lib/annotations/annotations.tsx` | React adapter: one-shot capture, markers, context-first create/edit/delete |
| `annotations-router.mjs` | `src/server/annotations-router.mjs` | Express router: `GET/PUT/POST /api/annotations` over one JSON file |

## Integration — exactly two touchpoints

1. **App server** (`src/server/app.ts`): mount the router on the **real app server**, never
   the fake-API. Annotations are app/review metadata and must survive the fake→real
   capability transition.
   ```ts
   import { annotationsRouter } from './annotations-router.mjs';
   app.use('/api/annotations', annotationsRouter());
   ```
2. **App shell** (`src/web/src/App.tsx`): mount the toolbar once, inside the shell.
   ```tsx
   import { AnnotationLayer } from './lib/annotations/annotations';
   // ... <AnnotationLayer /> near the top of the shell
   ```

Copy the core files and `annotations.tsx` together. The React component is intentionally a
thin UI adapter over `annotations-core.mjs`; the Workbench loads that same core directly
from the installed method assets.

The client calls a **relative** `/api/annotations` (routed to the app server via the dev
proxy / same origin) — it does **not** use the capability data-source resolver.

## Storage

One JSON file (default `runtime/annotations.json`, configurable via `ANNOTATIONS_FILE`).
Reviewer feedback is usually worth committing — decide whether to track or gitignore the
file per project.

## Not included (by design)

No real-time collaboration, no pixel-perfect markup, or guaranteed selector stability after
major DOM changes. A fuzzy fallback resolves many moves.
