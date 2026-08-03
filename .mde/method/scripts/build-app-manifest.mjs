#!/usr/bin/env node
// Derive the root manifest/ from plans/<id>/output.manifest (JSONL).
// Super-simple consolidator: no framework, just aggregate + count.
//
// File model (the merge-on-release algorithm — see commands/release.branch.md):
//   manifest/index.json    — the accumulated, append-oriented record ("master manifest")
//   manifest/by-specs.json — derived reverse-trace ("by-spec"), always rebuilt from index
//   manifest/release.manifest — TEMP, per-release: entries for ONLY the branch's plans
//
// Modes (run from the project root):
//   build-app-manifest.mjs                    # write manifest/ from ALL plans on this branch
//   build-app-manifest.mjs --check            # verify currency, no writes
//   build-app-manifest.mjs --release P1 P2..  # write manifest/release.manifest for ONLY plans P1,P2 (release step 1)
//   build-app-manifest.mjs --append-release   # append manifest/release.manifest into index.json, re-derive by-specs.json, delete release.manifest (release steps 3–4)
//
// On a single branch the default mode is correct (it sees only that branch's plans).
// At release/merge the --release / --append-release pair keeps the master manifest
// APPEND-ONLY so merging a branch into main never rebuilds across other branches and
// never conflicts on the manifest. See release.branch.md.
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const plansDir = path.join(root, 'plans');
const outDir = path.join(root, 'manifest');
const checkOnly = process.argv.includes('--check');
const releaseIdx = process.argv.indexOf('--release');
const releaseMode = releaseIdx !== -1;
const releasePlanIds = releaseMode ? process.argv.slice(releaseIdx + 1).filter(a => !a.startsWith('--')) : [];
const appendRelease = process.argv.includes('--append-release');

function readEntries(file) {
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    try { out.push(JSON.parse(s)); }
    catch { console.warn(`skip bad JSON line in ${file}`); }
  }
  return out;
}

// Stamp the producing plan id onto an entry's `implementor`. The plan id is
// known here (it is the folder the entry was read from), so an entry that
// recorded a bare `implementor: "ai"` (or omitted the planId) still gets
// attributed to its plan in the consolidated index. An existing planId is
// left as-is (a plan may legitimately credit another), and any `intent_ref`
// or other implementor fields are preserved.
function stampPlanId(entry, planId) {
  const impl = entry.implementor;
  if (impl && typeof impl === 'object' && !Array.isArray(impl)) {
    if (impl.planId) return entry;                 // already attributed — keep it
    return { ...entry, implementor: { ...impl, planId } };
  }
  // Bare string ("ai") or missing — replace with a schema-shaped object,
  // preserving the old value as the actor when it was a non-empty string.
  const actor = typeof impl === 'string' && impl.trim() ? impl.trim() : undefined;
  return { ...entry, implementor: actor ? { planId, actor } : { planId } };
}

function collectEntries(planFilter) {
  const out = [];
  if (fs.existsSync(plansDir)) {
    for (const plan of fs.readdirSync(plansDir)) {
      if (planFilter && !planFilter.includes(plan)) continue;
      const f = path.join(plansDir, plan, 'output.manifest');
      if (fs.existsSync(f)) out.push(...readEntries(f).map((e) => stampPlanId(e, plan)));
    }
  }
  return out;
}

// --- Release step 1: build release.manifest from ONLY the named plans ---
if (releaseMode) {
  if (!releasePlanIds.length) {
    console.error('--release needs one or more plan ids, e.g. --release 014-foo 015-bar');
    process.exit(1);
  }
  const relEntries = collectEntries(releasePlanIds);
  const relFile = path.join(outDir, 'release.manifest');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(relFile, relEntries.map(e => JSON.stringify(e)).join('\n') + '\n');
  console.log(`release.manifest: ${relEntries.length} entries from ${releasePlanIds.join(', ')} -> manifest/release.manifest`);
  process.exit(0);
}

// --- Release steps 3–4: append release.manifest into index, re-derive by-specs, delete temp ---
if (appendRelease) {
  const relFile = path.join(outDir, 'release.manifest');
  const idxFile = path.join(outDir, 'index.json');
  if (!fs.existsSync(relFile)) { console.error('manifest/release.manifest not found (run --release first).'); process.exit(1); }
  const relEntries = readEntries(relFile);
  const master = fs.existsSync(idxFile) ? JSON.parse(fs.readFileSync(idxFile, 'utf8')) : { entries: [] };
  const merged = [...(master.entries || []), ...relEntries];   // APPEND-ONLY into master
  const byStatusM = {};
  for (const e of merged) byStatusM[e.status] = (byStatusM[e.status] || 0) + 1;
  const stamp = new Date().toISOString();
  fs.writeFileSync(idxFile, JSON.stringify({ generatedAt: stamp, totalEntries: merged.length, byStatus: byStatusM, entries: merged }, null, 2));
  fs.writeFileSync(path.join(outDir, 'by-specs.json'), JSON.stringify(deriveBySpecs(merged, stamp), null, 2));
  fs.rmSync(relFile);                                          // delete temp release.manifest
  console.log(`appended ${relEntries.length} release entries into index.json; re-derived by-specs.json; removed release.manifest`);
  process.exit(0);
}

const entries = collectEntries(null);

// Shape check — a manifest entry can be valid JSON yet the wrong shape (e.g. a flat
// {artificat, target, capability} an agent invented instead of the schema). Those parse
// fine but read as undefined downstream, silently emptying by-specs.json. Fail loudly
// before writing consolidated output so incomplete trace data is never committed.
const REQUIRED = ['artifact', 'outputType', 'action', 'implementor', 'sourceRef', 'rules', 'mergePolicy', 'status'];
let shapeProblems = 0;
for (const e of entries) {
  const missing = REQUIRED.filter(k => e[k] === undefined);
  if (missing.length) {
    shapeProblems++;
    const id = e.artifact || e.artificat || JSON.stringify(e).slice(0, 60);
    console.error(`manifest entry invalid (${id}): missing [${missing.join(', ')}]`);
  }
}
if (shapeProblems) {
  console.error(`${shapeProblems} manifest entr${shapeProblems === 1 ? 'y is' : 'ies are'} invalid; ` +
    `refusing to rebuild manifest/index.json or manifest/by-specs.json from incomplete trace data.`);
  process.exit(1);
}

// index.json — every entry plus a status tally.
const byStatus = {};
for (const e of entries) byStatus[e.status] = (byStatus[e.status] || 0) + 1;
const generatedAt = new Date().toISOString();
const index = { generatedAt, totalEntries: entries.length, byStatus, entries };

// by-specs.json — reverse trace for each specs/* file: which plan created it
// (created_by), the timeline of plan entries that touched it (history_entries), and
// which downstream artifacts cite it as a source (implemented_by, grouped by area).
// Shape matches the workbench traceability panel. Extracted so both the default
// build and --append-release re-derive it identically from a set of entries.
function deriveBySpecs(allEntries, stamp) {
  const specArtifacts = [...new Set(
    allEntries.map(e => e.artifact).filter(a => String(a || '').startsWith('specs/'))
  )];
  const specKey = p => String(p || '').split('#')[0];

  const specs_files = specArtifacts.map(spec => {
    const own = allEntries.filter(o => o.artifact === spec);
    const history_entries = own.map(o => ({
      planId: o.implementor?.planId ?? null,
      ranAt: o.ranAt ?? o.ts ?? null,
      action: o.action ?? null,
      status: o.status ?? null,
    }));
    const planIds = [...new Set(own.map(o => o.implementor?.planId).filter(Boolean))];
    const first = own[0];
    const last = own[own.length - 1];

    const created_by = first ? {
      implementor: {
        planId: first.implementor?.planId ?? null,
        intent_ref: first.implementor?.intent_ref ?? null,
        plan_ref: first.implementor?.plan_ref ?? null,
      },
      planIds,
      history: own.length,
      status: last?.status ?? first.status ?? null,
      history_entries,
    } : null;

    const cites = allEntries.filter(o =>
      o.artifact !== spec && Array.isArray(o.sourceRef?.refs)
      && o.sourceRef.refs.some(r => specKey(r) === spec));
    const implemented_by = {};
    for (const o of cites) {
      const group = String(o.artifact || 'artifact').split('/')[0] || 'artifact';
      (implemented_by[group] ||= []).push({
        artifact: o.artifact || '',
        outputType: o.outputType || '',
        created_by: o.implementor?.planId || '',
        last_by: o.implementor?.planId || '',
        status: o.status || '',
      });
    }

    return {
      spec,
      status: created_by?.status ?? null,
      mergePolicy: last?.mergePolicy ?? first?.mergePolicy ?? null,
      counts: { implementors: planIds.length, referencedBy: cites.length },
      created_by,
      implemented_by,
    };
  });
  return { generatedAt: stamp, specs_files };
}
const bySpecs = deriveBySpecs(entries, generatedAt);

// Compare ignoring the volatile generatedAt stamp, so a no-op regeneration reads
// as "current" instead of reporting drift / churning the working tree.
function stable(obj) {
  const { generatedAt: _ignored, ...rest } = obj;
  return JSON.stringify(rest, null, 2);
}

if (checkOnly) {
  // Read-only currency check: regenerate in Specs and diff against the tracked
  // files (ignoring generatedAt). Writes nothing — safe to run during verify.
  const targets = [
    ['manifest/index.json', index],
    ['manifest/by-specs.json', bySpecs],
  ];
  const drift = [];
  for (const [rel, fresh] of targets) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) { drift.push(`${rel} (missing)`); continue; }
    let current;
    try { current = JSON.parse(fs.readFileSync(abs, 'utf8')); }
    catch { drift.push(`${rel} (unreadable)`); continue; }
    if (stable(current) !== stable(fresh)) drift.push(`${rel} (stale)`);
  }
  if (drift.length) {
    console.error(
      `manifest check: DRIFT — ${drift.join(', ')}. ` +
      `Re-run build-app-manifest.mjs (write mode) inside \`mde go\` and commit.`
    );
    process.exit(1);
  }
  console.log('manifest check: OK (consolidated manifest is current; generatedAt ignored)');
  process.exit(0);
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
fs.writeFileSync(path.join(outDir, 'by-specs.json'), JSON.stringify(bySpecs, null, 2));

console.log(
  `Consolidated ${entries.length} entries from plan manifests ` +
  `-> manifest/index.json, manifest/by-specs.json`
);
