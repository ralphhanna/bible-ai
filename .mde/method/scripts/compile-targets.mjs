#!/usr/bin/env node
// MDE — compile targets from features.
//
// Targets are NOT fully generated: each has an authored SKELETON (identity:
// id, title, applies_when, Purpose) carried over from the current authored
// target (one-time bootstrap), and a COMPOSED body — the contributing
// features' `Impact on <target>` and `Checks`, copied in with a
// [feature: <id>] ref so every section traces back to its source.
//
//   skeleton (authored)  +  feature sections (composed, with refs)  =  target
//
// Input : .mde/method/features/**/*.md   (impacts: + Impact on <t> + Checks)
//         .mde/method/targets/<t>.md          (skeleton source: id/title/applies_when/Purpose)
// Output: .mde/method/targets/<t>.md  (skeleton from targets.old/)
//
// Run:  node .mde/method/scripts/compile-targets.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const methodDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const capsDir = path.join(methodDir, 'features');
// Skeletons (id / title / applies_when / Purpose) are read from the authored
// originals in targets.old/ if present, else from the current targets/ (which
// already carry their skeleton). Compiled output is written to targets/.
const skeletonDir = fs.existsSync(path.join(methodDir, 'targets.old'))
  ? path.join(methodDir, 'targets.old')
  : path.join(methodDir, 'targets');
const outDir = path.join(methodDir, 'targets');

// Targets are DISCOVERED from the skeleton files, not hardcoded — drop a new
// authored skeleton in the skeleton dir (optionally inside a phase folder like
// requirements/ design/ app/) and it compiles automatically. A target is any
// <name>.md that isn't a non-target doc (README/catalog/index). The name is the
// basename; its relative subfolder is preserved so the compiled file is written
// back to the SAME location (flat or foldered).
const NON_TARGET = new Set(['README', 'catalog', 'index']);
// Compiled phase-view subdirs (targets/audit/*, and any future targets/<phase>/*) are
// OUTPUTS of this compile, not target skeletons — skip them, or an audit view named
// audit/api.md would shadow the real app/api.md in TARGET_REL (last-wins) and the target
// would compile from an empty skeleton.
const PHASE_VIEW = new Set(['audit', 'verification', 'generation', 'testing-view']);
function walkDirs(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (PHASE_VIEW.has(e.name)) continue; out.push(...walkDirs(p, base)); }
    else if (e.name.endsWith('.md') && !NON_TARGET.has(path.basename(e.name, '.md'))) {
      out.push({ name: path.basename(e.name, '.md'), rel: path.relative(base, p) });
    }
  }
  return out;
}
// Map target name -> its path relative to the targets dir (e.g. "web-ui" ->
// "app/web-ui.md"). Names are unique across folders.
const TARGET_REL = new Map(walkDirs(skeletonDir).map((t) => [t.name, t.rel]));
const TARGETS = [...TARGET_REL.keys()].sort();

// ---- helpers ---------------------------------------------------------------

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.md') && e.name !== 'README.md' && e.name !== 'index.md') out.push(p);
  }
  return out;
}

function parseFrontmatter(text) {
  // Normalize CRLF → LF so feature files authored on Windows parse correctly.
  // A CRLF file would otherwise fail this LF-only regex, yield empty frontmatter
  // (no impacts), and make the compiler emit empty targets — destroying profiles.
  text = text.replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  let key = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) { key = kv[1]; fm[key] = kv[2].trim() ? kv[2].trim() : []; }
    else {
      const item = line.match(/^\s*-\s*(.*)$/);
      if (item && key && Array.isArray(fm[key])) fm[key].push(item[1].trim());
    }
  }
  return { fm, body: text.slice(m[0].length) };
}

// Filter a `## Checks` section for one target. A ```check``` block may carry a
// `target=<id>` attribute in its header, meaning "compose me ONLY into that target's
// profile" — so a source-level check on a feature that also impacts a design target
// does not leak into the design target (and fire on a design-only plan). A block with
// NO `target=` goes to every target the feature impacts (backward-compatible). Prose
// between blocks is kept as-is; only mismatched fenced check blocks are dropped.
function checksForTarget(checksText, target) {
  if (!checksText || !/```check/.test(checksText)) return checksText;
  return checksText.replace(/```check([^\n]*)\n[\s\S]*?\n```/g, (block, header) => {
    const t = (header.match(/\btarget\s*=\s*([\w-]+)/) || [])[1];
    if (!t || t === target) return block;   // untagged → all targets; tagged → only its target
    return '';                               // tagged for a DIFFERENT target → drop here
  }).replace(/\n{3,}/g, '\n\n').trim();
}

// Return the text of a `## <heading>` section (until the next `## ` or EOF).
function section(body, headingRe) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^## /.test(lines[i]) && headingRe.test(lines[i])) { start = i; break; }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start + 1, end).join('\n').trim();
}

// ---- read features ---------------------------------------------------------

const caps = [];
for (const file of walk(capsDir)) {
  const text = fs.readFileSync(file, 'utf8');
  const { fm, body } = parseFrontmatter(text);
  caps.push({
    id: fm.id || path.basename(file, '.md'),
    title: fm.title || fm.id,
    impacts: Array.isArray(fm.impacts) ? fm.impacts : [],
    // aspects this feature OWNS — each declared `<name> | <declaredAt>`. Gathered
    // into aspects-catalogue.json below (the derived vocabulary). The feature owns
    // the term + its implementation (this file); the catalogue is just the index.
    aspects: Array.isArray(fm.aspects) ? fm.aspects : [],
    body,
    file,
  });
}

// ---- read target skeletons (from current authored targets) -----------------

function skeleton(target) {
  const rel = TARGET_REL.get(target) || `${target}.md`;
  const file = path.join(skeletonDir, rel);
  if (!fs.existsSync(file)) return { id: `TARGET-${target.toUpperCase()}`, title: target, appliesWhen: [], purpose: '' };
  const text = fs.readFileSync(file, 'utf8');
  const { fm, body } = parseFrontmatter(text);
  return {
    id: fm.id || `TARGET-${target.toUpperCase()}`,
    title: fm.title || target,
    appliesWhen: Array.isArray(fm.applies_when) ? fm.applies_when : [],
    // requires: dependency edges — the targets this one drags in (verification #1).
    requires: Array.isArray(fm.requires) ? fm.requires : [],
    // inputs: preconditions — what must exist before this target can be worked on
    // (goal-runner walk-back). Each entry is a string; a `kind:` prefix
    // (`tech-stack` / `derived: …` / `user: …`) is a text convention, not parsed here.
    inputs: Array.isArray(fm.inputs) ? fm.inputs : [],
    purpose: section(body, /Purpose/i) || '',
    // Outputs: the AUTHORITATIVE list of artifacts this target mandates (a table).
    // Authored on the target, carried through compile (like Purpose). The verifier
    // reads this to check the plan's manifest produced each mandated output.
    outputs: section(body, /Outputs/i) || '',
  };
}

// Parse a target's `## Outputs` markdown table (columns: output | path | perEach | when)
// into structured rows for the catalogue — so catalogue.json is the single source for
// "which target mandates which output type", not just an unparsed prose blob. Skips the
// header + separator rows; tolerant of extra whitespace and a leading/trailing pipe.
function parseOutputs(outputsMd) {
  if (!outputsMd) return [];
  const rows = [];
  for (const line of outputsMd.replace(/\r\n/g, '\n').split('\n')) {
    const s = line.trim();
    if (!s.startsWith('|')) continue;
    const cells = s.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length < 4) continue;
    const [output, p, perEach, when] = cells;
    if (!output || /^-+$/.test(output) || /^output$/i.test(output)) continue;   // separator / header
    rows.push({ output, path: p, perEach: perEach === '—' || perEach === '-' ? null : perEach, when: when || 'always' });
  }
  return rows;
}

// ---- compile each target ---------------------------------------------------

fs.mkdirSync(outDir, { recursive: true });
const summary = [];
// The target catalogue — every target's real id + its requires: edges, written once
// here (the single place targets are discovered/compiled) so the verifier never
// re-discovers targets by walking targets/**/*.md itself; it reads this JSON.
const catalogue = [];

for (const target of TARGETS) {
  const sk = skeleton(target);
  const contributors = caps
    .filter((c) => c.impacts.includes(target))
    .sort((a, b) => a.id.localeCompare(b.id));

  const impactRe = new RegExp(`Impact on ${target}\\b`, 'i');
  const behaviorBlocks = [];
  const checkBlocks = [];

  for (const c of contributors) {
    const impact = section(c.body, impactRe);
    if (impact) behaviorBlocks.push(`### ${c.title}  \`[feature: ${c.id}]\`\n\n${impact}`);
    const checks = checksForTarget(section(c.body, /Checks/i), target);
    if (checks) checkBlocks.push(`### ${c.title}  \`[feature: ${c.id}]\`\n\n${checks}`);
  }

  const fmList = (arr) => arr.map((x) => `  - ${x}`).join('\n');
  const out = `---
type: target
${sk.id ? `id: ${sk.id}\n` : ''}title: ${sk.title}
applies_when:
${fmList(sk.appliesWhen)}${sk.requires && sk.requires.length ? `\nrequires:\n${fmList(sk.requires)}` : ''}${sk.inputs && sk.inputs.length ? `\ninputs:\n${fmList(sk.inputs)}` : ''}
---

# ${sk.title}

<!-- COMPILED by compile-targets.mjs from features. Skeleton (Purpose +
     applies_when) is authored; the sections below are composed from the
     contributing features, each tagged [feature: <id>]. Do not hand-edit
     the composed sections — edit the feature and recompile. -->

## Purpose

${sk.purpose || '_(authored skeleton purpose — fill in)_'}
${sk.outputs ? `\n## Outputs\n\n${sk.outputs}\n` : ''}
## Composed behavior

${behaviorBlocks.join('\n\n') || '_(no feature impacts this target)_'}

## Validation checks

${checkBlocks.join('\n\n') || '_(no feature checks for this target)_'}
`;

  const outRel = TARGET_REL.get(target) || `${target}.md`;
  const outFile = path.join(outDir, outRel);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, out);
  summary.push(`  ${target.padEnd(22)} ${contributors.length} features`);
  catalogue.push({
    id: sk.id.replace(/^TARGET-/i, '').toLowerCase(),
    requires: sk.requires || [],
    inputs: sk.inputs || [],
    // outputs: the artifact types this target mandates (parsed from its ## Outputs
    // table) — so the catalogue answers "which target produces which output type"
    // without re-parsing every target file.
    outputs: parseOutputs(sk.outputs),
    path: outRel.replace(/\\/g, '/'),
  });
}

const catalogueFile = path.join(outDir, 'catalogue.json');
fs.writeFileSync(catalogueFile, JSON.stringify(catalogue.sort((a, b) => a.id.localeCompare(b.id)), null, 2) + '\n');

// ---- audit views (per target, phase-isolated) ------------------------------
// §4.2/4.3: each phase compiles into its OWN view so a phase-session receives only its
// instructions (the generator never sees ## Verification; the auditor never sees
// ## Generation). Audit compiles to targets/audit/<target>.md — filed BY TARGET, but
// the audit SESSION reads them all as one flat, app-wide reference: it runs with no
// plan / no targets / no manifest, judging the finished RUNNING app against a witness
// the author does not control (the app's own log). So each `## Audit` must be
// reference-free — what to observe in the running app, never a plan/target artifact.
const auditDir = path.join(outDir, 'audit');
// A feature's `## Audit` files under ONE target — its PRIMARY (first real target in
// `impacts:`), not every impacted target. Fanning it out duplicated a server-endpoint
// audit into api + architecture + server, mislabeling e.g. architecture.md as "really the
// server". One audit block, one home = the feature's first impacted target.
const isRealTarget = new Set(TARGETS);
const primaryTargetOf = (c) => (c.impacts || []).find((t) => isRealTarget.has(t));
let auditTargets = 0;
for (const target of TARGETS) {
  const blocks = caps
    .filter((c) => primaryTargetOf(c) === target)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => ({ id: c.id, title: c.title, audit: section(c.body, /Audit/i) }))
    .filter((c) => c.audit)
    .map((c) => `### ${c.title}  \`[feature: ${c.id}]\`\n\n${c.audit}`);
  if (!blocks.length) continue;
  fs.mkdirSync(auditDir, { recursive: true });
  const view = `---
type: audit-view
title: Audit — ${target}
---

# Audit — ${target} — COMPILED from features' \`## Audit\`

<!-- COMPILED by compile-targets.mjs. Do not hand-edit — edit each feature's ## Audit
     section and recompile. Each ## Audit speaks in GENERAL terms (what quality looks like
     for this concern). SCOPE is applied by the CALLER at run time, not authored here: an
     audit run for a plan adds "perform these checks for this plan's scope only"; an
     app-wide run (review app) adds none. The auditor is a FRESH session — it did not build this. -->

You did not build this. Do not trust that an artifact or control *exists* — judge whether
it *behaves*, by driving the real running app (or reading the specs, for BA/design targets)
and corroborating against a witness the author does not control (the app's own request/write
log, a read-back after a mutation, the spec's own content).

## How to report — every finding must be actionable

Do not write a vague narrative. For **each concern** you audit, produce one row:

| field | what it must contain |
|---|---|
| **concern** | the specific artifact/control/operation judged (name it: \`client.create\`, "Employee Directory save button", "review-period-constraint") — never "the API" or "the UI" in general |
| **verdict** | **genuine** · **fake** · **not-exercised** (you could not drive it — say why) |
| **witness** | the concrete evidence you observed: a server-log line, a read-back result after a mutation, the missing route/operation, the placeholder text quoted. A verdict with no witness is not a finding |
| **severity** | **high** (core substance is fake — a mutating action that never persists, a rule not enforced) · **medium** · **low** |
| **fix** | the concrete next action to make it genuine (name the file + what to change) — so the finding is directly actionable in a repair plan |

End with a **summary**: counts (**N genuine · M fake · K not-exercised**), and the **fakes ranked
most-severe first** with their fix. A \`fake\` on an in-scope artifact is a real defect — state it
plainly; do not soften it to "could be improved". "It exists / it responded 200 / the section is
filled" is never a genuine verdict on its own.

${blocks.join('\n\n')}
`;
  fs.writeFileSync(path.join(auditDir, `${target}.md`), view);
  auditTargets++;
}
if (auditTargets) summary.push(`  ${'audit/*'.padEnd(22)} ${auditTargets} target view(s)`);

// ---- aspect catalogue ------------------------------------------------------
// Derived vocabulary: every aspect any feature OWNS (declared in its `aspects:`
// frontmatter as `<name> | <declaredAt>`). Features own the term + implementation;
// this file is the single readable list the source templates + the validator read,
// so nothing is hand-maintained and nothing can drift. Same derive-from-features
// pattern as the target catalogue above.
const aspectMap = new Map();   // name -> { name, declaredAt, implementedBy }
for (const cap of caps) {
  for (const decl of cap.aspects) {
    const [rawName, rawAt] = String(decl).split('|').map((s) => s.trim());
    const name = (rawName || '').toLowerCase();
    if (!name) continue;
    const declaredAt = (rawAt || '').toLowerCase() || 'entity';
    if (aspectMap.has(name)) {
      // Two features claiming the same aspect is a real conflict (single-owner rule).
      const prev = aspectMap.get(name);
      console.warn(`  ! aspect '${name}' declared by both '${prev.implementedBy}' and '${cap.id}' — single-owner expected`);
      continue;
    }
    aspectMap.set(name, { name, declaredAt, implementedBy: cap.id });
  }
}
const aspectCatalogue = [...aspectMap.values()].sort((a, b) => a.name.localeCompare(b.name));
const aspectFile = path.join(outDir, 'aspects-catalogue.json');
fs.writeFileSync(aspectFile, JSON.stringify(aspectCatalogue, null, 2) + '\n');

console.log('compiled targets/ from features:');
console.log(summary.join('\n'));
console.log(`\n-> ${outDir}`);
console.log(`-> ${catalogueFile} (${catalogue.length} targets)`);
console.log(`-> ${aspectFile} (${aspectCatalogue.length} aspects)`);
