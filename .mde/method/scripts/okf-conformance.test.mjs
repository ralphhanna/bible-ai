// okf-conformance.test.mjs — assert the MDE Method bundle is a conformant OKF bundle.
//
// OKF's hard conformance rule (GoogleCloudPlatform/knowledge-catalog SPEC.md): every
// non-reserved `.md` file has a parseable YAML frontmatter block with a non-empty `type`.
// `index.md` and `log.md` are reserved (exempt). This test enforces exactly that over
// `.mde/method/` — so a rule/feature/command/target/audit-view added without `type:`
// fails here, keeping the bundle conformant as the method grows.
//
// (App-bundle specs are produced from templates; their conformance is covered where the
// templates are exercised. This test guards the authored/compiled Method bundle.)

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const methodDir = join(dirname(fileURLToPath(import.meta.url)), '..');   // .mde/method

// Reserved / infrastructure files that are NOT knowledge concepts (OKF exempts
// index.md/log.md; MDE adds its own doc/bootstrap files). These carry no `type`.
const RESERVED = new Set([
  'index.md', 'log.md', 'README.md', 'catalog.md',
  'boot.md',              // project bootstrap doc, not a concept
  'RULES_OVERVIEW.md',    // an index of the rules (index-like)
  'audit-prompt.md',      // a prompt fragment used by the loop, not a concept
]);

// Spec TEMPLATES carry the type of the spec they GENERATE (entity, page, …) — an
// app-bundle type, not a method type. Their own file is a `template`, but the
// frontmatter `type` describes the output. Exempt them from the method-vocabulary
// check (they are validated as app-bundle types elsewhere).
const isSpecTemplate = (rel) => /templates\/(business-specs|design(-specs)?)\//.test(rel);

function allMarkdown(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...allMarkdown(p));
    else if (name.endsWith('.md') && !RESERVED.has(name)) out.push(p);
  }
  return out;
}

function frontmatterType(text) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { hasFrontmatter: false, type: null };
  const t = m[1].match(/^type:\s*(\S.*)$/m);
  return { hasFrontmatter: true, type: t ? t[1].trim() : null };
}

test('OKF: every method-bundle concept .md has parseable frontmatter with a non-empty type', () => {
  const offenders = [];
  for (const file of allMarkdown(methodDir)) {
    const { hasFrontmatter, type } = frontmatterType(readFileSync(file, 'utf8'));
    const rel = relative(methodDir, file).replace(/\\/g, '/');
    if (!hasFrontmatter) offenders.push(`${rel} — no YAML frontmatter`);
    else if (!type) offenders.push(`${rel} — frontmatter has no non-empty 'type'`);
  }
  assert.equal(offenders.length, 0,
    `OKF conformance: ${offenders.length} method file(s) missing a 'type':\n  ` + offenders.join('\n  '));
});

test('OKF: method-bundle types come from the expected profile vocabulary', () => {
  // The Method bundle should only carry method-domain types (plus 'template' for the
  // template files). This catches a mis-typed file (e.g. a rule accidentally 'feature').
  const allowed = new Set(['method-rule', 'feature', 'command', 'target', 'audit-view', 'template']);
  const wrong = [];
  for (const file of allMarkdown(methodDir)) {
    const rel = relative(methodDir, file).replace(/\\/g, '/');
    if (isSpecTemplate(rel)) continue;   // its `type` is the generated spec's, not a method type
    const { type } = frontmatterType(readFileSync(file, 'utf8'));
    if (type && !allowed.has(type)) {
      wrong.push(`${rel} — type '${type}' not in method vocabulary`);
    }
  }
  assert.equal(wrong.length, 0, `Unexpected method-bundle types:\n  ` + wrong.join('\n  '));
});
