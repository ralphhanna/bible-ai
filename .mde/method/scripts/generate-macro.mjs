#!/usr/bin/env node
// Generate a replayable macro YAML from a built repo's plans.
//
//   node .mde/method/scripts/generate-macro.mjs [project-root] [> out.macro.yaml]
//
// Reads plans/<NNN-slug>/ in numeric order. For each executed (or
// partially-executed) plan it emits one macro `plans:` block whose steps replay
// the build literally: mde start (input = the plan's scope.md intent, verbatim) →
// mde evaluate → mde go. Cancelled/draft/blocked plans are skipped. One macro for
// the whole repo, in plan order. Replay with: mde run <macro-file>.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.cwd());
const plansDir = path.join(root, 'plans');
if (!fs.existsSync(plansDir)) {
  console.error(`No plans/ directory at ${root}`);
  process.exit(1);
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

// Plans are number-prefixed slugs: 001-..., 002-... — sort by the numeric prefix.
const planIds = fs.readdirSync(plansDir, { withFileTypes: true })
  .filter(d => d.isDirectory() && /^\d{3}-/.test(d.name))
  .map(d => d.name)
  .sort((a, b) => Number(a.slice(0, 3)) - Number(b.slice(0, 3)));

function lifecycleOf(planId) {
  const status = read(path.join(plansDir, planId, 'status.md'));
  const m = status.match(/lifecycle:?\s*([a-z-]+)/i);
  return m ? m[1].toLowerCase() : '';
}

// The literal intent the user gave: the spec's first Intent block (its
// `### N · Title`, `**Want:**`, and In-scope bullets), reproduced verbatim so the
// replayed `mde start` receives the same input. Falls back to the Want line, then
// the plan title.
function intentText(planId) {
  const spec = read(path.join(plansDir, planId, 'scope.md'));
  const intentBlock = spec.match(/^###\s+\d+[^\n]*\n([\s\S]*?)(?=^###\s+\d+|^##\s+|\Z)/m);
  if (intentBlock) {
    const heading = spec.match(/^###\s+\d+\s*·?\s*(.+)$/m)?.[1]?.trim();
    // Keep the Want and In-scope items only; stop at Deferred/Non-goals (those are
    // scope-split bookkeeping, not the original ask) so the replay input is faithful.
    const out = [];
    let inScope = false;
    for (const raw of intentBlock[1].split(/\n/)) {
      const l = raw.replace(/\*\*/g, '').trimEnd();
      if (/^\s*(Deferred|Non-goals?|Assumptions|Constraints)\s*:?/i.test(l)) break;
      if (/^Want:/i.test(l.trim())) { out.push(l.trim()); continue; }
      if (/^In scope:?/i.test(l.trim())) { inScope = true; out.push('In scope:'); continue; }
      if (inScope && /^\s*-\s+/.test(l)) { out.push('- ' + l.replace(/^\s*-\s*/, '')); continue; }
    }
    const body = out.join('\n');
    if (heading) return [heading, body].filter(Boolean).join('\n');
  }
  const want = spec.match(/\*\*Want:\*\*\s*(.+)/)?.[1]?.trim();
  return want || planId.replace(/^\d{3}-/, '').replace(/-/g, ' ');
}

function title(planId) {
  return planId.replace(/^\d{3}-/, '').replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// YAML block-scalar for multi-line input (indented under `input: >`).
function blockScalar(text, indent) {
  const pad = ' '.repeat(indent);
  return text.split('\n').map(l => (l ? pad + l : '')).join('\n');
}

const included = [];
const skipped = [];
for (const planId of planIds) {
  const life = lifecycleOf(planId);
  if (life === 'executed' || life === 'partially-executed') included.push(planId);
  else skipped.push(`${planId} (${life || 'unknown'})`);
}

const lines = [];
lines.push(`id: ${path.basename(root)}-replay`);
lines.push(`title: ${path.basename(root)} — replay macro`);
lines.push(`version: 1`);
lines.push(``);
lines.push(`# Generated from plans/ by generate-macro.mjs. Replay with: mde run <this-file>`);
lines.push(`# Steps use the plan's scope.md intent verbatim (literal replay).`);
lines.push(``);
lines.push(`run:`);
lines.push(`  mode: standard`);
lines.push(`  stop_on_error: true`);
lines.push(`  auto_approve: false`);
lines.push(``);
lines.push(`plans:`);
for (const planId of included) {
  lines.push(`  - id: ${planId}`);
  lines.push(`    title: ${title(planId)}`);
  lines.push(`    steps:`);
  lines.push(`      - id: ${planId}-start`);
  lines.push(`        command: mde start`);
  lines.push(`        input: >`);
  lines.push(blockScalar(intentText(planId), 10));
  lines.push(`      - id: ${planId}-evaluate`);
  lines.push(`        command: mde evaluate`);
  lines.push(`      - id: ${planId}-go`);
  lines.push(`        command: mde go`);
  lines.push(``);
}

process.stdout.write(lines.join('\n'));
if (skipped.length) {
  console.error(`\n# generate-macro: ${included.length} plan(s) included, skipped: ${skipped.join(', ')}`);
}
