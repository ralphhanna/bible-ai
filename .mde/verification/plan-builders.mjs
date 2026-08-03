// plan-builders.mjs — build per-plan derived model pieces from the manifest items:
// server slices, migrations, test evidence, coverage, cross-slice imports, and the
// small text-matching helpers (operation/route coverage heuristics, SQL table body).

import fs from 'fs';
import path from 'path';
import { readText, slugNorm } from './manifest-item.mjs';

// CRUD operation suffix → natural-language phrase(s) a Gherkin scenario would use for
// it. Gherkin is prose ("When the HR admin creates an employee"), so we match on the
// verb word rather than an HTTP method. An op suffix NOT in this map is treated as a
// lifecycle transition (matched by its own name — submit/acknowledge/close/…).
const CRUD_PHRASES = {
  readlist: ['list', 'view', 'directory', 'browse'], list: ['list', 'view', 'browse'],
  readone: ['view', 'open', 'detail'], read: ['view', 'open', 'detail'],
  get: ['view', 'open'], search: ['search', 'filter', 'find'], find: ['search', 'find'],
  view: ['view', 'open'],
  create: ['create', 'add', 'new'], add: ['add', 'create'],
  update: ['update', 'edit', 'change', 'save'], edit: ['edit', 'update', 'save'],
  updateownprofile: ['update', 'edit', 'profile'],
  delete: ['delete', 'remove'], remove: ['remove', 'delete'],
};

// CRUD op suffix → HTTP verb(s) a route would register.
const CRUD_VERBS_HTTP = {
  readlist: ['get'], list: ['get'], readone: ['get'], read: ['get'], get: ['get'],
  search: ['get'], find: ['get'],
  create: ['post'], add: ['post'],
  update: ['put', 'patch'], edit: ['put', 'patch'], updateownprofile: ['put', 'patch'],
  delete: ['delete'], remove: ['delete'],
};

// Is an operation covered by a Gherkin `.feature` SCENARIO?
//  - the entity must appear in the scenarios at all (slugHit), AND
//  - CRUD op: one of its natural-language phrases appears (create/list/edit/…);
//  - lifecycle op (not in CRUD_PHRASES): its own suffix appears (submit/approve/…).
// featureBlob is all `.feature` content+paths, lowercased. Coverage is a signal, not
// a proof — the AI/user confirm ambiguous cases in the loop.
export function operationCovered(op, slugForms, featureBlob) {
  if (!featureBlob) return false;                       // no .feature files at all
  const suffix = slugNorm(op.split('.').pop());
  const slugHit = slugForms.some((s) => s && featureBlob.replace(/[^a-z0-9]/g, '').includes(s));
  if (!slugHit) return false;
  const phrases = CRUD_PHRASES[suffix];
  if (phrases) return phrases.some((w) => new RegExp(`\\b${w}`).test(featureBlob));
  // lifecycle: the transition name itself must appear in a scenario
  return featureBlob.replace(/[^a-z0-9]/g, '').includes(suffix);
}

// Does a route registration plausibly implement this operation, even without the
// marker? Verb-mapped: a CRUD op → its HTTP verb in the route source; a lifecycle op →
// a sub-route named for the op suffix (…/submit, …/${transition}). Used only to tell
// "endpoint present but unmarked" apart from "no endpoint" in the report — NOT to pass
// the marker requirement.
export function routePlausiblyImplements(op, routeBlob) {
  if (!routeBlob) return false;
  const suffix = slugNorm(op.split('.').pop());
  const verbs = CRUD_VERBS_HTTP[suffix];
  if (verbs) {
    // any router.<verb>( present at all → a CRUD route of that kind exists in this
    // entity's route file (which is entity-scoped already via the trace join).
    return verbs.some((v) => new RegExp(`router\\.${v}\\s*\\(`, 'i').test(routeBlob));
  }
  // lifecycle: the op suffix names a sub-route, OR a dynamic transition route exists.
  return new RegExp(`/${suffix}\\b|:id/\\$\\{?transition|/\\$\\{?transition`, 'i').test(routeBlob)
    || routeBlob.toLowerCase().includes('/' + suffix);
}

export { CRUD_VERBS_HTTP };

// The body of a `create table <name> ( … )` statement in a (lowercased) SQL blob, so
// a column check is scoped to that table — not matched against the whole migration
// (which would let a column belonging to a DIFFERENT table pass). Returns '' if not
// found. Parenthesis-balanced from the opening `(` after the table name.
export function sqlTableBody(sql, table) {
  const start = sql.search(new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?"?${table}"?\\b`));
  if (start < 0) return '';
  const open = sql.indexOf('(', start);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < sql.length; i++) {
    if (sql[i] === '(') depth++;
    else if (sql[i] === ')') { depth--; if (depth === 0) return sql.slice(open + 1, i); }
  }
  return sql.slice(open + 1);
}

// Group server files into capability slices: one entry per src/server/<slice>/
// (excluding the shared/ cross-cutting dir). Each layer is detected by filename
// suffix (…Types/Repository/Service/Routes, case-insensitive). Booleans are strings
// ("true"/"false") so the check DSL's IS reads cleanly; the Service/Repository file
// objects (with content) ride along for the layering-smell checks.
export function buildServerSlices(items) {
  const slices = new Map();
  for (const it of items) {
    const m = String(it.path).match(/src\/server\/([^/]+)\/([^/]+)\.(t|j)s$/i);
    if (!m) continue;
    const [, slice, file] = m;
    if (slice.toLowerCase() === 'shared') continue;
    if (!slices.has(slice)) slices.set(slice, { slice, files: [] });
    const s = slices.get(slice);
    s.files.push(it);
    if (/Types$/i.test(file)) s.typesFile = it;
    else if (/Repository$/i.test(file)) s.repositoryFile = it;
    else if (/Service$/i.test(file)) s.serviceFile = it;
    else if (/Routes$/i.test(file)) s.routesFile = it;
  }
  return [...slices.values()].map((s) => ({
    slice: s.slice,
    path: `src/server/${s.slice}/`,
    hasTypes: String(!!s.typesFile),
    hasRepository: String(!!s.repositoryFile),
    hasService: String(!!s.serviceFile),
    hasRoutes: String(!!s.routesFile),
    serviceFile: s.serviceFile,
    repositoryFile: s.repositoryFile,
    routesFile: s.routesFile,
  }));
}

// Versioned migrations grouped by stem: <NNN>_<name>.up.sql + .down.sql are a pair on
// stem "<NNN>_<name>". A bare <NNN>_<name>.sql (no .up/.down segment) is treated as an
// up with no down — the old single-file style, which the reversible check flags.
export function buildMigrations(items) {
  const byStem = new Map();
  for (const it of items) {
    const m = String(it.path).match(/db\/migrations\/([^/]+?)(?:\.(up|down))?\.sql$/i);
    if (!m) continue;
    const [, stem, dir] = m;
    if (!byStem.has(stem)) byStem.set(stem, { stem, up: false, down: false, files: [] });
    const rec = byStem.get(stem);
    rec.files.push(it.path);
    if (!dir || /up/i.test(dir)) rec.up = true;   // bare .sql counts as the up
    if (dir && /down/i.test(dir)) rec.down = true;
  }
  return [...byStem.values()].map((r) => ({
    stem: r.stem,
    path: `db/migrations/${r.stem}`,
    hasUp: String(r.up),
    hasDown: String(r.down),
  }));
}

// Test execution evidence (captured-command-output.md): a plan claiming its test suites
// ran must leave (a) a machine-readable report on disk — evidence/logs/test.log, or a
// Cucumber/Playwright report under reports/ (cucumber.json, results.json, an HTML index) —
// and (b) evidence.md must actually REFERENCE that report's filename, not just assert
// "tests passed" in prose. Absence of either is the "claimed passed, no captured artifact"
// defect this feature exists to prevent.
const REPORT_FILE_PATTERN = /(test\.log|cucumber\.json|results?\.json|junit.*\.xml|index\.html)$/i;
export function buildTestEvidence(projectRoot, planDir) {
  const planLogDir = path.join(projectRoot, planDir, 'evidence', 'logs');
  const reportsDir = path.join(projectRoot, 'reports');
  const foundReports = [];
  const scan = (dir, maxDepth) => {
    let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && maxDepth > 0) scan(full, maxDepth - 1);
      else if (e.isFile() && REPORT_FILE_PATTERN.test(e.name)) foundReports.push(path.relative(projectRoot, full).replace(/\\/g, '/'));
    }
  };
  scan(planLogDir, 0);
  scan(reportsDir, 3);
  const evidenceMd = readText(projectRoot, `${planDir}/evidence.md`) || '';
  // A report is "referenced" if evidence.md mentions its filename (basename) — cheap,
  // tolerant of path-prefix differences between where the file lives and how it's cited.
  const referenced = foundReports.filter((p) => evidenceMd.includes(path.basename(p)));
  // Server logs (captured-command-output.md): each suite that drives the running app
  // sets LOG_PATH to reports/evidence/tests-{suite}/run.log. Presence here proves the server
  // was actually exercised, distinct from a test report merely proving the suite
  // ran/asserted. Suites are DISCOVERED from what actually ran (reports/evidence/tests-*/
  // directories present), never a hardcoded name list — a stack may add suites
  // (contract tests, load tests, …) the method never named. "unit" is excluded: a
  // pure in-process unit suite has no server to log, so reports/evidence/tests-unit/ (if a
  // stack even writes one) is not held to this requirement.
  const ranSuites = fs.existsSync(reportsDir)
    ? fs.readdirSync(reportsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && /^tests-/.test(e.name) && e.name !== 'tests-unit')
        .map((e) => e.name.replace(/^tests-/, ''))
    : [];
  const missingServerLogSuites = ranSuites.filter((suite) =>
    !fs.existsSync(path.join(reportsDir, `tests-${suite}`, 'run.log')));
  return {
    reportsPresent: String(foundReports.length > 0),
    reportsFound: foundReports.join(', '),
    evidenceMdExists: String(evidenceMd.length > 0),
    referencedInEvidence: String(foundReports.length > 0 && referenced.length > 0),
    missingServerLogSuites: missingServerLogSuites.join(', '),
    hasMissingServerLog: String(missingServerLogSuites.length > 0),
  };
}

// run-app evidence (build-and-regression.md): a plan loading run-app must actually
// BUILD (build.log) and pass the FULL regression suite (test.log), each proven by a
// real captured log that shows a clean exit — not merely a declared manifest entry,
// and not a log that "prints instructions instead of running" (the cheat). Two axes:
//   *Declared — the plan's manifest lists the evidence artifact (run-app mandated it).
//   *LogClean — the log exists AND its captured content shows the run happened and
//               exited 0 (an exit-0 marker, not an error / non-zero / empty file).
export function buildRunApp(projectRoot, planDir, items) {
  const declares = (base) => items.some((i) =>
    typeof i.path === 'string' && new RegExp(`(^|/)evidence/logs/${base}$`).test(i.path.replace(/\\/g, '/')));
  // A log is "clean" when it exists, is non-trivial, shows no error/failure/non-zero
  // exit, and carries positive evidence a real run completed (an exit-0 / done / pass
  // marker). This distinguishes a genuine captured run from an empty stub or a script
  // that only printed "now run mde:build …".
  const logClean = (name) => {
    const txt = readText(projectRoot, `${planDir}/evidence/logs/${name}`) || '';
    if (txt.trim().length < 20) return false;                         // empty / stub
    if (/\b(error|failed|failure|exit\s*[1-9]|exit\s*code\s*[1-9]|non-zero)\b/i.test(txt)) return false;
    return /\b(exit\s*0|exit\s*code\s*0|passed|success|done|✓|built|compiled|\b0 failing\b)\b/i.test(txt);
  };
  return {
    buildDeclared: String(declares('build\\.log')),
    testDeclared: String(declares('test\\.log')),
    buildLogClean: String(logClean('build.log')),
    testLogClean: String(logClean('test.log')),
  };
}

// install-dev / readiness evidence (install-dev.md): db-connect.log must prove a REAL
// database round-trip, not a script that merely PRINTED instructions. Closes the cheat
// where install-dev prints "now run mde:install, db:reset, …" — producing a non-empty
// log that proves nothing. dbInScope: the app has a DB (a DATABASE_URL in .env.example
// or a db-connect.log declared/present at all). dbConnectReal: the log shows a real
// connection + trivial query, and NOT instruction-printing.
export function buildInstallDev(projectRoot, planDir) {
  const log = readText(projectRoot, `${planDir}/evidence/logs/db-connect.log`) || '';
  const envExample = readText(projectRoot, '.env.example') || '';
  const dbInScope = /DATABASE_URL/.test(envExample) || log.trim().length > 0;
  // "prints instructions" tell-tale: it tells the reader to run commands rather than
  // showing a connection result.
  const printsInstructions = /\b(now run|next run|then run|run\s+(npm|mde:|node)|please run)\b/i.test(log);
  // positive proof of a real round-trip.
  const realRoundTrip = /\b(select\s+1|connected|connection (?:ok|open|established)|1 row|row\(s\)|\?column\?|query (?:ok|returned)|SELECT\s+\d)\b/i.test(log)
    || /\{\s*"\?column\?"|"result"\s*:/.test(log);
  const dbConnectReal = log.trim().length >= 15 && realRoundTrip && !printsInstructions
    && !/\b(error|failed|refused|timeout|unreachable|ECONNREFUSED)\b/i.test(log);
  return {
    dbInScope: String(dbInScope),
    dbConnectReal: String(dbConnectReal),
  };
}

// Correlation-id (test-correlation-id.md): the request boundary must read an INBOUND
// X-Correlation-Id header, so a test's id can appear in the server log — making "the
// test reached the server" provable. serverPresent: this plan has server source (a
// boundary to check). serverReadsHeader: that source reads the inbound header (e.g.
// req.headers['x-correlation-id'] / get('X-Correlation-Id')), not only a self-generated id.
export function buildCorrelationId(items, projectRoot) {
  const serverItems = items.filter((i) => typeof i.path === 'string'
    && /(^|\/)src\/server\/.*\.(t|j)s$/i.test(i.path.replace(/\\/g, '/')));
  const blob = serverItems.map((i) => (i.content && typeof i.content === 'object' ? i.content.raw : i.content) || '').join('\n');
  const readsHeader = /x-correlation-id/i.test(blob)
    && /(headers?\s*\[\s*['"]x-correlation-id|get\(\s*['"]x-correlation-id|req\.(?:get|header)\(\s*['"]x-correlation-id)/i.test(blob);
  return {
    serverPresent: String(serverItems.length > 0),
    serverReadsHeader: String(readsHeader),
  };
}

// Coverage: parse the produced coverage report's total line-% and the policy floor.
// Report content comes from the manifest item at the DECLARED merged-coverage location
// (testing.md ## Outputs `coverage-report` + coverage-threshold.md's "Declared coverage
// locations" table): reports/evidence/coverage/coverage-summary.json — the merge of the per-suite
// unit/api/ui reports (reports/evidence/coverage/{unit,api,ui}/coverage-summary.json), so the floor
// reflects ALL layers, not the unit suite alone. The floor itself comes from
// specs/design/mde-policy.md (capabilitySettings.coverage-threshold.minCoverage, default
// 75). Returns strings so the check DSL compares cleanly.
export function buildCoverage(items, projectRoot) {
  const rpt = items.find((i) => /(^|\/)reports\/evidence\/coverage\/coverage-summary\.json$/i.test(i.path));
  let linePct = null;
  if (rpt && rpt.content) {
    const raw = typeof rpt.content === 'object' ? rpt.content.raw : rpt.content;
    try {
      const j = JSON.parse(raw);
      linePct = j.total && j.total.lines && typeof j.total.lines.pct === 'number' ? j.total.lines.pct : null;
    } catch { /* malformed report → linePct stays null */ }
  }
  // Per-suite reports — each must measure real source files, not a synthetic
  // self-referential placeholder (coverage-threshold.md "coverage cosplay"). Suites
  // are DISCOVERED from the manifest (whatever reports/evidence/coverage/<suite>/coverage-
  // summary.json entries the plan actually produced), never a hardcoded name list.
  // A suite is "cosplay" when its report exists but every entry key resolves to no
  // real file under the project's src/ — a synthetic label (api:cucumber-scenarios,
  // ui:cucumber-scenarios) never does. Keys may be absolute (V8/Istanbul often emit
  // the full OS path) or relative, forward- or back-slashed, so match on the file
  // actually EXISTING under src/ rather than a rigid path-prefix regex.
  const perSuiteItems = items.filter((i) => /(^|\/)reports\/evidence\/coverage\/[^/]+\/coverage-summary\.json$/i.test(i.path));
  const cosplaySuites = [];
  for (const item of perSuiteItems) {
    const suite = item.path.match(/reports\/evidence\/coverage\/([^/]+)\/coverage-summary\.json$/i)[1];
    if (!item.content) continue;
    const raw = typeof item.content === 'object' ? item.content.raw : item.content;
    try {
      const j = JSON.parse(raw);
      const keys = Object.keys(j).filter((k) => k !== 'total');
      const hasRealSource = keys.some((k) => {
        const normalized = String(k).replace(/\\/g, '/');
        const rel = normalized.includes('/src/') ? normalized.slice(normalized.indexOf('/src/') + 1) : normalized;
        return /^src\//.test(rel) && fs.existsSync(path.join(projectRoot, rel));
      });
      if (keys.length && !hasRealSource) cosplaySuites.push(suite);
    } catch { /* malformed per-suite report — not this check's concern */ }
  }
  // policy floor
  const policy = readText(projectRoot, 'specs/design/mde-policy.md') || '';
  const m = policy.match(/minCoverage:\s*(\d+(?:\.\d+)?)/);
  const minCoverage = m ? Number(m[1]) : 75;
  return {
    reportPresent: String(!!rpt),
    linePct: linePct == null ? 'n/a' : String(linePct),
    minCoverage: String(minCoverage),
    meetsFloor: String(linePct != null && linePct >= minCoverage),
    cosplaySuites: cosplaySuites.join(', '),
    hasCosplay: String(cosplaySuites.length > 0),
  };
}

// Server source files that import from ANOTHER capability slice's internals — a
// layering violation (capabilities communicate through APIs/interfaces, not by
// reaching into a sibling's files). For each src/server/<slice>/ file, flag a
// relative import (`../<other>/…` or `./<other>/…`, or `src/server/<other>/`) whose
// target slice is a KNOWN sibling slice ≠ its own. Manifest-derived.
export function buildCrossSliceImports(items) {
  const sliceOf = (p) => (String(p).match(/src\/server\/([^/]+)\//) || [])[1];
  const knownSlices = new Set(items.map((i) => sliceOf(i.path)).filter((s) => s && s !== 'shared'));
  const bad = [];
  for (const it of items) {
    const mine = sliceOf(it.path);
    if (!mine || mine === 'shared') continue;
    const content = it.content || '';
    // import targets: ../X/… , src/server/X/…
    const targets = [...content.matchAll(/(?:from\s+['"]|require\(\s*['"])(?:\.\.?\/)+([A-Za-z0-9_-]+)\//g)]
      .map((m) => m[1])
      .concat([...content.matchAll(/src\/server\/([A-Za-z0-9_-]+)\//g)].map((m) => m[1]));
    if (targets.some((t) => knownSlices.has(t) && t !== mine)) {
      bad.push({ path: it.path, slice: mine });
    }
  }
  return bad;
}
