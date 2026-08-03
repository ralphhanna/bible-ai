// target-catalogue.mjs — resolve targets: tech-stack universe, loaded/excluded/
// required targets, a target's own Outputs table, and the compiled target catalogue.
// No hardcoded target ids anywhere here — every id comes from a file (impact.md,
// scope.md, tech-stack.md, targets/catalogue.json, or a target's own frontmatter).

import fs from 'fs';
import path from 'path';
import { readText, safeRead, walkFiles } from './manifest-item.mjs';

// Normalize a target reference to its short id (the form used by requires:, the
// tech-stack targets:, and the target filenames). impact.md may use the frontmatter
// id form `TARGET-SOURCE-GENERATION`; requires:/tech-stack use `source-generation`.
export function normalizeTargetId(t) {
  return String(t || '').replace(/^TARGET-/i, '').toLowerCase().trim();
}

// Parse tech-stack targets: block (the applicability universe).
export function techStackTargets(root) {
  const text = readText(root, 'specs/design/tech-stack.md') || '';
  const targets = [];
  const m = text.replace(/\r\n/g, '\n').match(/targets:\n([\s\S]*?)(?:\n```|\n## |\n$)/);
  if (m) for (const line of m[1].split('\n')) {
    const t = line.match(/-\s*type:\s*(.+)/);
    if (t) targets.push(normalizeTargetId(t[1]));
  }
  return [...new Set(targets)];   // dedupe (one target may back several tiers)
}

// Parse tech-stack.md's operations map — either a fenced `operations:` YAML block
// or a "## Operations Map" markdown table (| Operation | Command |), the two forms
// the stack template supports. Returns a Map<name, command>.
function parseOperationsMap(markdown) {
  const operations = new Map();
  const block = markdown.match(/```ya?ml\s*[\s\S]*?\boperations:\s*\n([\s\S]*?)```/i);
  if (block) {
    for (const line of block[1].split(/\r?\n/)) {
      const m = line.match(/^\s{2,}([a-z][a-z0-9:-]*):\s*(.+?)\s*$/i);
      if (!m) continue;
      const quoted = m[2].match(/^(["'])(.*?)\1(?:\s+#.*)?$/);
      operations.set(m[1], quoted ? quoted[2] : m[2].replace(/\s+#.*$/, '').trim());
    }
    return operations;
  }
  const opsSection = (markdown.match(/^##\s+Operations Map\s*\n([\s\S]*?)(?=^##\s+|$(?![\s\S]))/im) || [])[1] || '';
  for (const line of opsSection.split(/\r?\n/)) {
    if (!line.trim().startsWith('|') || /^\|\s*-/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    const name = cells[1];
    const command = cells[2];
    if (!name || !command || /^operation$/i.test(name) || /^command$/i.test(command)) continue;
    operations.set(name.replace(/`/g, ''), command.replace(/`/g, ''));
  }
  return operations;
}

// techStackOperations: the standard-root-operations contract, computed once so the
// feature's check block reads flags instead of re-parsing tech-stack.md/package.json
// itself. Required keys are conditional on what the project actually has (tests/,
// db/migrations, db/seeds, db/) — a stack-agnostic, structure-driven set, not a
// hardcoded per-target list. Empty when there is no src/ (nothing generated yet).
export function techStackOperations(root) {
  if (!fs.existsSync(path.join(root, 'src'))) return [];
  const techStack = readText(root, 'specs/design/tech-stack.md') || '';
  const operations = parseOperationsMap(techStack);
  const packageText = readText(root, 'package.json') || '';
  let scripts = {};
  let packageJsonValid = true;
  if (packageText) {
    try { scripts = JSON.parse(packageText).scripts || {}; } catch { packageJsonValid = false; }
  }
  const required = ['install', 'start', 'build'];
  if (fs.existsSync(path.join(root, 'tests'))) required.push('test');
  if (fs.existsSync(path.join(root, 'db', 'migrations'))) required.push('migrate');
  if (fs.existsSync(path.join(root, 'db', 'seeds'))) required.push('seed');
  if (fs.existsSync(path.join(root, 'db'))) required.push('db:reset', 'db:schema-dump');

  // One entry per required key PLUS every mapped npm-script operation (so a
  // no-op check can also catch operations tech-stack.md maps but never required
  // above). `ok` folds every failure mode into one flag the check reads:
  // required-but-unmapped, npm script that doesn't exist, or a placeholder no-op.
  const seen = new Set();
  const out = [];
  for (const name of required) {
    seen.add(name);
    const command = operations.get(name) || '';
    out.push({ name, command, ok: String(!!command && packageJsonValid) });
  }
  for (const [name, command] of operations) {
    if (seen.has(name)) continue;
    const npmMatch = command.match(/^npm\s+(?:run\s+)?([a-z0-9:_-]+)$/i);
    if (!npmMatch || npmMatch[1] === 'install' || npmMatch[1] === 'test') continue;
    const scriptName = npmMatch[1];
    const scriptExists = Object.hasOwn(scripts, scriptName);
    const body = scriptExists ? String(scripts[scriptName]) : '';
    const isNoOp = /^\s*echo\b/i.test(body) || /\bexit\s+0\b/i.test(body);
    out.push({ name, command, ok: String(packageJsonValid && scriptExists && !isNoOp) });
  }
  return out;
}

// The recorded auth mechanism from the tech-stack auth axis ("mechanism | <value>" row,
// or "mechanism: <value>"). Auth is **opt-in**: a MISSING/silent axis reads as `none`
// (no auth generated), so a plain app build does not produce auth until a project
// explicitly records `mechanism: local-db` (or oauth/sso). Returns a lowercased slug
// like "none" | "local-db" | "oauth" | "oidc" | "sso".
export function authMechanism(root) {
  const text = (readText(root, 'specs/design/tech-stack.md') || '').replace(/\r\n/g, '\n');
  const m = text.match(/mechanism[^\n|]*[|:]\s*`?([a-z][\w/-]*)/i);
  return m ? m[1].toLowerCase() : 'none';
}

// Resolve a target's file whether it sits flat (targets/<t>.md) or inside a
// phase folder (targets/requirements|design|app/<t>.md). Returns text or ''.
export function readTargetFile(mdeMethodDir, target) {
  const targetsDir = path.join(mdeMethodDir, 'targets');
  const flat = path.join(targetsDir, `${target}.md`);
  const flatText = safeRead(flat);
  if (flatText) return flatText;
  for (const sub of ['requirements', 'design', 'app']) {
    const t = safeRead(path.join(targetsDir, sub, `${target}.md`));
    if (t) return t;
  }
  return '';
}

// The REAL target catalogue — read from targets/catalogue.json, which
// compile-targets.mjs writes as part of compiling targets from features (the
// single place targets are discovered). The verifier never re-discovers targets
// itself (no walking targets/**/*.md, no parsing target frontmatter here) — it
// only reads this generated, versioned artifact. Used to catch a fabricated/
// misspelled name in impact.md ## Loaded Targets (e.g. "TARGET-BACKEND" —
// sounds plausible, is not a real target; the actual id is "TARGET-API") that
// would otherwise silently parse as a target-shaped token and match nothing,
// no error, forever. Missing/stale catalogue.json (e.g. an older method
// checkout before this was introduced) degrades to an empty catalogue — the
// invalid-target check simply does not fire, rather than false-failing every
// plan.
export function allTargetIds(mdeMethodDir) {
  const raw = safeRead(path.join(mdeMethodDir, 'targets', 'catalogue.json'));
  if (!raw) return [];
  try {
    const catalogue = JSON.parse(raw);
    return Array.isArray(catalogue) ? catalogue.map((t) => normalizeTargetId(t.id)) : [];
  } catch { return []; }
}

// The known-aspect vocabulary — read from targets/aspects-catalogue.json (compiled
// from features' `aspects:` declarations). Returns lowercased aspect names. An entity
// declaring an aspect not in this set is unknown (a typo, or a concept no feature
// implements). Missing/stale catalogue degrades to [] — the validity check then no-ops
// rather than flagging every aspect (an older checkout before this existed is not a bug).
export function knownAspects(mdeMethodDir) {
  const raw = safeRead(path.join(mdeMethodDir, 'targets', 'aspects-catalogue.json'));
  if (!raw) return [];
  try {
    const cat = JSON.parse(raw);
    return Array.isArray(cat) ? cat.map((a) => String(a.name || '').toLowerCase()).filter(Boolean) : [];
  } catch { return []; }
}

// --- target dependency model (verification #1) -----------------------------
// Read a target's `requires:` frontmatter from the method (the dependency edges).
// mdeRoot is passed so this works whether verifying the dev repo or an app that
// mirrors .mde/method.
export function targetRequires(mdeMethodDir, target) {
  const text = readTargetFile(mdeMethodDir, target);
  if (!text) return [];
  const fm = text.replace(/\r\n/g, '\n').split('\n---\n')[0];
  const m = fm.match(/requires:\n([\s\S]*?)(?:\n[a-z_]+:|$)/);
  if (!m) return [];
  return m[1].split('\n').map((l) => normalizeTargetId(l.replace(/^\s*-\s*/, ''))).filter(Boolean);
}

// Transitive closure of requires over a set of loaded targets.
export function requiresClosure(mdeMethodDir, loaded) {
  const seen = new Set(loaded);
  const queue = [...loaded];
  while (queue.length) {
    for (const r of targetRequires(mdeMethodDir, queue.shift())) {
      if (!seen.has(r)) { seen.add(r); queue.push(r); }
    }
  }
  return [...seen];
}

// Loaded targets recorded in impact.md's "## Loaded Targets" list (the canonical
// section the impact template uses). Each line names a target id (bullets may carry
// extra text after the id — take the first token).
// Returns null when the section is ABSENT (legacy plan shape — caller cannot
// scope by target and falls back), versus [] when the section is present but
// empty (a deliberate "this plan loads no target"). The two must stay distinct:
// collapsing them is what let a review plan inherit the whole app's checks.
export function loadedTargets(root, planDir) {
  const text = readText(root, `${planDir}/impact.md`) || '';
  const m = text.replace(/\r\n/g, '\n').match(/## Loaded Targets\n([\s\S]*?)(?:\n## |$)/);
  if (!m) return null;
  // Tolerant of BOTH formats the section appears in:
  //   - bullet list:  `- TARGET-WEB-UI`  /  `- web-ui · reason: …`
  //   - table:        `| TARGET-WEB-UI | Reason |`
  // Extract the target id from each line by finding the first TARGET-* token or the
  // first bare word, whichever the line offers — so neither format is missed.
  const ids = [];
  for (const raw of m[1].split('\n')) {
    const line = raw.trim();
    if (!line) continue;                                            // blank
    if (/^\|[\s|:-]*\|?$/.test(line)) continue;                     // TABLE separator (|---|---|)
    if (/^\|\s*target\s*\|/i.test(line)) continue;                  // table header row
    // TARGET-XXX anywhere on the line (table cells, bullets), else first bullet token.
    const tm = line.match(/TARGET-[A-Z][A-Z0-9-]*/i);
    let id = tm ? tm[0]
      : line.replace(/^\s*[-*|]\s*/, '').split(/[\s·|(]/)[0].trim();
    // Prose in this section is NOT a target id. Without a TARGET-* prefix, only
    // accept a token that looks like an id at all — a bare English word ("no",
    // "none", "n/a") is the author saying there are none, and inventing a target
    // from it produced a bogus invalid-target failure that pushed the author to
    // empty the section, silently removing all scoping. Anything unrecognized is
    // ignored here; a real misspelling still surfaces via invalidLoaded below.
    if (!tm && (!/^[a-z][a-z0-9-]*$/i.test(id) || /^(no|none|n\/a|na|nil|empty|tbd)$/i.test(id))) continue;
    id = normalizeTargetId(id);
    if (id) ids.push(id);
  }
  return [...new Set(ids)];
}

// Parse the structured "## Excluded targets" block from scope.md.
export function excludedTargets(root, planDir) {
  const text = readText(root, `${planDir}/scope.md`) || '';
  const out = [];
  const m = text.replace(/\r\n/g, '\n').match(/## Excluded targets\n([\s\S]*?)(?:\n## |\n$)/);
  if (m) for (const line of m[1].split('\n')) {
    const e = line.match(/-\s*target:\s*([^\s·|]+)/);
    if (e) out.push(normalizeTargetId(e[1]));
  }
  return out;
}

// Read a target's authoritative ## Outputs table (the artifacts it mandates).
// Each row: { output, path, perEach, when }. The verifier checks the plan's
// manifest produced each (perEach expands per spec instance). Source of truth is
// the TARGET, never the plan.
export function targetOutputs(mdeMethodDir, target) {
  const text = readTargetFile(mdeMethodDir, target);
  if (!text) return [];
  const m = text.replace(/\r\n/g, '\n').match(/## Outputs\n([\s\S]*?)(?:\n## |$)/);
  if (!m) return [];
  const rows = [];
  for (const line of m[1].split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|') || /^\|\s*-+/.test(t)) continue;
    const c = t.split('|').map((x) => x.trim());
    if (c.length < 5 || /^output$/i.test(c[1])) continue;   // skip header
    // Some Outputs rows annotate WHICH SECTION of the file satisfies the mandate, e.g.
    // "specs/business/entities/{entity}.md (## Storage View)" — that parenthetical is
    // for the human reader, not part of the artifact path. Split it out so pathMatches()
    // compares only the real path (an artifact-level check; it cannot see inside a file
    // for a specific heading) — the section note is kept for the failure message.
    const pathCell = c[2];
    const sm = pathCell.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    const p = sm ? sm[1].trim() : pathCell;
    const section = sm ? sm[2].trim() : null;
    rows.push({ target, output: c[1], path: p, section,
      perEach: c[3] === '—' ? null : c[3], when: c[4] || 'always' });
  }
  return rows;
}

// Enumerate instances of a spec set (authoritative, from specs — never the plan).
// Each instance is an OBJECT carrying every placeholder name a target's ## Outputs path
// template may reference for this Scope Type (see PLACEHOLDER_KEY below) — not a bare
// slug — so a path like "specs/business/capabilities/{cap}/use-cases/{uc}.md" can be
// filled in correctly (cap = parent capability dir, uc = the file's own slug), instead
// of the parent capability's slug being wrongly substituted for the whole template's
// first placeholder (which silently produced non-existent paths like
// specs/business/capabilities/{uc-slug}/use-cases/{uc}.md).
//
// business-capability instances come from the capability DIRECTORY name itself
// (specs/business/capabilities/<cap>/), not a file — a capability has no file of its
// own to enumerate other than overview.md, whose slug is a byproduct, not the source.
export function specInstances(root, kind) {
  if (kind === 'business-capability') {
    const base = path.join(root, 'specs/business/capabilities');
    let dirs; try { dirs = fs.readdirSync(base, { withFileTypes: true }); } catch { return []; }
    return dirs.filter((d) => d.isDirectory())
      .map((d) => ({ slug: slug(d.name), cap: slug(d.name) }));
  }
  const dirs = {
    'use-case': ['specs/business/capabilities', 'specs/business/usecases', 'specs/business/use-cases'],
    'business-rule': ['specs/business/capabilities'],
    'entity': ['specs/business/entities'],
    'page': ['specs/design/UI/pages'],
  }[kind] || [];
  const seen = new Set();
  const out = [];
  for (const d of dirs) {
    for (const f of walkFiles(path.join(root, d))) {
      if (!f.endsWith('.md') || /README\.md$/i.test(f)) continue;
      const rel = path.relative(root, f).replace(/\\/g, '/');
      if (kind === 'use-case' && !/use-?cases?\//.test(rel)) continue;
      if (kind === 'business-rule' && !/business-rules\//.test(rel)) continue;
      const fileSlug = slug(path.basename(f, '.md'));
      // Parent capability = the segment right before use-cases//business-rules/ under
      // specs/business/capabilities/<cap>/{use-cases,business-rules}/<slug>.md. Empty
      // string for flat layouts (specs/business/usecases/) with no capability parent.
      const capM = rel.match(/specs\/business\/capabilities\/([^/]+)\/(?:use-cases|business-rules)\//);
      const key = `${capM ? capM[1] : ''}/${fileSlug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ slug: fileSlug, cap: capM ? slug(capM[1]) : '' });
    }
  }
  return out;
}

function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// Which instance property a path-template placeholder name maps to. {uc}/{rule}/{page}/
// {entity} all mean "this instance's own slug"; {cap}/{Cap} mean its parent capability.
const PLACEHOLDER_KEY = { cap: 'cap', Cap: 'cap', uc: 'slug', rule: 'slug', entity: 'slug', page: 'slug', name: 'slug', slug: 'slug' };

// Fill EVERY {placeholder} in a target output's path template from an instance object
// (not just the first one) — {Cap} additionally PascalCases the value (matching the
// TypeScript file-naming convention, e.g. src/server/{cap}/{Cap}Routes.ts).
export function fillPathTemplate(template, inst) {
  return template.replace(/\{([A-Za-z]+)\}/g, (m, name) => {
    const key = PLACEHOLDER_KEY[name];
    if (!key) return m;                      // unknown placeholder — leave as-is
    const val = inst[key] || '';
    if (name === 'Cap') return val.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
    return val;
  });
}

// {n} is a migration/seed SEQUENCE NUMBER the target template cannot predict (it's
// assigned at generation time, e.g. 001, 002, 007) — unlike {cap}/{entity}/{page},
// which come from real spec files. So {n}_{name}-shaped paths (db/migrations/,
// db/seeds/) can't be resolved to ONE expected literal path; instead this checks
// whether ANY produced path already matches the {n}_{name} shape for this instance,
// and substitutes the discovered {n} so the report shows the real filename rather
// than a guessed one. Falls back to the template's own {n} (fillPathTemplate leaves
// it as the literal text "{n}") when no match exists yet — a genuine gap, not a
// resolution failure.
export function resolveNumberedPath(template, filled, producedPaths) {
  if (!/\{n\}/.test(template)) return filled;
  // Turn filled (e.g. "db/migrations/{n}_employee.up.sql") into a matcher that
  // accepts any digits where {n} sits. A per-schema migration path
  // ("db/migrations/{n}_{name}.up.sql") has no instance to fill {name}, so filled
  // collapses to "db/migrations/{n}_.up.sql" — the plan chooses the descriptive name
  // (007_add_reviews), which the verifier cannot know. Treat the empty run left where an
  // unfilled placeholder was (an "_" or "-" immediately abutting the {n} boundary or a
  // file-extension dot) as a wildcard segment, so {n}_ matches 007_<anyname>.
  const re = new RegExp('^' + filled
    .split(/\{n\}/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    // an unfilled {name} left a bare "_"/"-" right after {n} → allow any name there
    .map((part, i) => i === 1 ? part.replace(/^(_|\\-)/, '$1[^/]*') : part)
    .join('\\d+') + '$', 'i');
  const hit = producedPaths.find((p) => re.test(p.replace(/\\/g, '/')));
  return hit || filled;
}
