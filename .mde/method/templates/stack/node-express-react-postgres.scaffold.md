---
id: TEMPLATE-STACK-NODE-EXPRESS-REACT-POSTGRES-SCAFFOLD
type: template
kind: stack-scaffold
title: Node Express React PostgreSQL Stack — Bootstrap Recipe
status: active
source_path: method/templates/stack/node-express-react-postgres.scaffold.md
stackTemplate: node-express-react-postgres
used_by_commands:
  - mde go
---
# Node Express React PostgreSQL Stack — Bootstrap Recipe

The **bootstrap recipe** for this stack — read by the plan that scaffolds the empty app. The
*selection* record (axes, targets, runtime, environment) is the companion
`node-express-react-postgres.template.md`. This file is not needed to select the stack, only to
build it.

## npm scripts

The Node stack implements the standard root operations contract with `package.json`
scripts. Keep these operation names stable so tooling and reviewers can invoke the app
without reading stack-specific docs.

```json
{
  "scripts": {
    "install:app": "npm install",
    "start":       "tsx src/server/index.ts",
    "dev":         "concurrently \"npm:dev:server\" \"npm:dev:web\"",
    "dev:server":  "tsx src/server/index.ts",
    "dev:web":     "vite --config src/web/vite.config.ts",
    "build":       "npm run typecheck && vite build --config src/web/vite.config.ts",
    "typecheck":   "tsc -p tsconfig.json --noEmit",
    "test":        "npm run test:api && npm run test:ui",
    "test:unit":   "vitest run",
    "test:api":    "npm run db:reset && node --test tests/api/*.test.mjs",
    "test:ui":     "playwright test tests/ui",
    "migrate":     "npm run db:migrate",
    "seed":        "npm run db:seed",
    "db:reset":    "npm run migrate && npm run seed",
    "db:migrate":  "psql \"$DATABASE_URL\" -f db/migrations/<latest>.sql",
    "db:seed":     "psql \"$DATABASE_URL\" -f db/seeds/<seed-file>.sql"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

Relative imports in `.ts` files use `.js` extensions (`import { foo } from "./foo.js"`). The file on disk is `.ts`; TypeScript resolves the extension at compile time. Omitting it produces `ERR_MODULE_NOT_FOUND` at runtime.

## Project Layout

```
src/server/        Express app, routes, repositories, services
src/server/shared/ db pool, config, errors
src/web/           Vite root (index.html, vite.config.ts)
src/web/src/       React components, pages, API client
db/migrations/     NNN_description.sql, forward-only
db/seeds/          SQL seeds
tests/api/         API tests against DATABASE_URL (reset via db:reset before the run)
tests/ui/          Playwright + Cucumber + Axe
docs/{api,business,design,operate,requirements,users}/
mkdocs.yml         at repo root
reports/           build / test / bootstrap artifacts
```

## Database

- Native PostgreSQL on `localhost:5432` preferred. Docker only when explicitly requested.
- Driver: `pg` + `@types/pg`.
- Shared pool at `src/server/shared/db.ts`.
- `query<T extends QueryResultRow>(text, params)` awaits `pool.query<T>(...)` and returns `{ rows: T[] }`. Do not force-cast the Promise.
- Migrations: numbered SQL, forward-only, applied via `psql`.
- Test database setup: API/persistence test commands reset the one `DATABASE_URL` target
  (`db:reset`: migrate then seed) before the run, and only then import app/database modules.
  A stale, unreset database is not valid test evidence.

## Server

- `createApp(deps)` factory at `src/server/app.ts`. Entry at `src/server/index.ts` composes deps and calls `app.listen(PORT)`.
- Feature folders: `src/server/<feature>/{Routes,Repository,Service,Types}.ts`.
- Error JSON: `{ "error": "<code>", "message": "<human>", "details"?: {...} }`. HTTP status conveys class.
- CORS: `origin: process.env.CORS_ORIGIN ?? "http://localhost:5173"`.
- `GET /health` → `{ "status": "ok", "ts": "<ISO>" }`. No auth.

## Testing

- API: `node:test` or `mocha + chai + supertest`. Tests run against `DATABASE_URL`
  (real Postgres, reset via `db:reset` before the run; no mocks).
- UI: Playwright + Cucumber + `@axe-core/playwright`. Every governed page has at least one accessibility assertion.

## Source Footprint Format

```ts
/*
MDE-GENERATED-FILE
plan: <plan-id>
capability: <name-or-scope>
use-cases: <list-or-none>
rules: <rule-ids>
Specs: <specs paths>
contract: <one-sentence>
*/
```

SQL: `-- ` line comments. `.feature` files: `# ` line comments.

## Required Bootstrap Outputs

The plan that introduces this stack also scaffolds a working empty project. These artifacts MUST appear in the plan's `impact.md` Artifacts table and reach terminal status in `output.manifest`:

```
package.json
package-lock.json
tsconfig.json
src/server/index.ts          minimal Express: imports 'dotenv/config', listens on PORT, exposes GET /health
src/server/app.ts            createApp() factory; no routes yet
src/server/shared/db.ts      pool + query<T> helper
src/web/index.html           Vite entry
src/web/vite.config.ts
src/web/src/main.tsx         React root
src/web/src/App.tsx          empty shell rendering "App ready"
db/migrations/.gitkeep
db/seeds/.gitkeep
tests/api/.gitkeep
tests/ui/.gitkeep
docs/index.md
docs/{api,business,design,operate,requirements,users}/.gitkeep
mkdocs.yml
.env.example
.gitignore
reports/evidence/bootstrap-status.json
```

## Bootstrap Status Artifact

`reports/evidence/bootstrap-status.json` is the manifest-tracked record of the scaffold's runtime readiness. Schema:

```json
{
  "plan": "<plan-id>",
  "ts":   "<ISO timestamp>",
  "node": "<node version observed>",
  "gates": [
    { "name": "npm install",  "ran": true, "ok": true, "details": "<n> deps installed" },
    { "name": "typecheck",    "ran": true, "ok": true, "details": "tsc exit 0" },
    { "name": "build",        "ran": true, "ok": true, "details": "vite produced dist/web/" },
    { "name": "db reachable", "ran": true, "ok": true, "details": "pg_isready localhost:5432" },
    { "name": "health",       "ran": true, "ok": true, "details": "GET /health 200 in <ms>" },
    { "name": "npm test",     "ran": true, "ok": true, "details": "0 tests, 0 errors" }
  ]
}
```

The file is `outputType: report`, `mergePolicy: generated`. The AI writes it after running the listed checks. The manifest verifies the file exists; the content is AI-attested. A reviewer (or a future hook) can re-run the gates and compare.
