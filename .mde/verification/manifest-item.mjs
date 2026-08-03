// manifest-item.mjs — read the plan manifest and build $item objects from it.
// The manifest is the source of truth for artifacts (paths, types) — checks never
// name folders. Content is loaded from each entry's path; known files are parsed.

import fs from 'fs';
import path from 'path';

export function readText(root, rel) {
  try { return fs.readFileSync(path.join(root, rel), 'utf8'); }
  catch { return null; }
}

export function safeRead(abs) { try { return fs.readFileSync(abs, 'utf8'); } catch { return null; } }

export function walkFiles(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return out; }
  for (const n of entries) {
    const p = path.join(dir, n);
    let st; try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) walkFiles(p, out); else out.push(p);
  }
  return out;
}

// Read a JSONL file into entries, AND report parse health so a malformed manifest
// fails loudly instead of looking empty. Returns { entries, present, lines, parsed }:
// a manifest with content but parsed < lines (or 0 parsed) is corrupt — the runner
// turns that into a hard [FAIL] rather than silently running every check over 0
// entries (which would blind-pass everything).
export function readJsonlWithHealth(root, rel) {
  const raw = readText(root, rel);
  const present = raw != null;
  const lines = present ? raw.split('\n').filter((l) => l.trim()) : [];
  const entries = [];
  for (const l of lines) { try { entries.push(JSON.parse(l)); } catch { /* count via parsed */ } }
  return { entries, present, lines: lines.length, parsed: entries.length };
}

export function readJsonl(root, rel) {
  return readJsonlWithHealth(root, rel).entries;
}

// Structure known file content so checks can address it (e.g. package.json scripts);
// otherwise content is the raw string.
function structureContent(rel, raw) {
  if (raw == null) return raw;
  if (rel.endsWith('package.json') || rel.endsWith('.json')) {
    try { return { raw, ...JSON.parse(raw) }; } catch { return raw; }
  }
  return raw;
}

// Canonicalize a manifest outputType so checks aren't coupled to one generation's
// naming. web-source/server-source/app-source/… → source; *-spec → spec.
// Other types (migration, seed, test, config, documentation, report) pass through.
function canonicalType(t) {
  const s = String(t || '').toLowerCase();
  if (/(^|[-_])source$/.test(s) || s === 'source') return 'source';
  if (/(^|[-_])spec$/.test(s) || s === 'spec') return 'spec';
  return s;
}

export function fromSource(entry, re) {
  const refs = srcRefs(entry);
  for (const ref of refs) {
    const m = String(ref).match(re);
    if (m) return m[1];
  }
  return undefined;
}

export function entityFromSource(entry) {
  return fromSource(entry, /entities\/([^/*.]+)\.md/);
}

// The upstream spec refs an artifact serves — the `sourceRef` field (a REFERENCE,
// not a description). Always returns an array.
export function srcRefs(entry) {
  const ref = entry && entry.sourceRef;
  return (ref && Array.isArray(ref.refs)) ? ref.refs : [];
}

// ALL entity slugs referenced by an item's sourceRef.refs (not just the first). A
// migration legitimately covers many entities; $item.entity stays single-valued for
// per-item checks, but set-building (expectedTables/expectedOperations) needs them all.
export function entitiesFromSource(entry) {
  const refs = srcRefs(entry);
  const out = [];
  for (const ref of refs) {
    const m = String(ref).match(/entities\/([^/*.]+)\.md/);
    if (m) out.push(m[1]);
  }
  return out;
}

// $item.page — the page a page-spec / page component is for. Derive from a
// specific spec ref (specs/design/UI/pages/<name>.md) first; if the ref is only a
// directory (…/pages) or absent, fall back to the page component's own filename
// (src/web/src/pages/EmployeeDirectory.tsx → employee-directory).
export function pageFromSource(entry, artifactPath) {
  const fromRef = fromSource(entry, /pages\/([^/*.]+)\.md/);
  if (fromRef) return fromRef;
  const m = String(artifactPath || '').match(/\/pages\/([A-Za-z0-9]+)\.(tsx|jsx)$/);
  if (m) return kebab(m[1]);   // "EmployeeDirectory" → "employee-directory"
  return undefined;
}

export function kebab(s) {
  return String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// slug-normalize: lowercase and drop everything but a–z0–9, so naming variants
// collapse to one comparable form ("PerformanceReview" / "performance-reviews" →
// "performancereview" / "performancereviews"). Trailing plural 's' is NOT stripped
// (kept deliberately simple); CONTAINS-ANY handles singular⊂plural as a substring.
export function slugNorm(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Build one $item from a manifest entry (+ its file content). Needs dataCoveredFields
// from spec-parser.mjs (page-spec Data Covered fields) — passed in to avoid a circular
// import (spec-parser has no need to know about manifest items).
export function toItem(root, entry, dataCoveredFields) {
  const p = entry.artifact || entry.path || '';
  const raw = readText(root, p);
  const rawType = entry.outputType || entry.type || '';
  return {
    // pass through every manifest field first, then normalize the well-known ones.
    ...entry,
    // $item.type is CANONICAL so checks bind across generations that name things
    // differently (web-source / server-source / *-source → source; *-spec → spec).
    // The original is kept as $item.rawType for a check that truly needs it.
    type: canonicalType(rawType),
    rawType,
    path: p,
    action: entry.action || '',
    status: entry.status || '',
    feature: entry.feature
      || (entry.features && entry.features[0])
      || (entry.implementor && entry.implementor.feature)
      || '',
    // $item.entity / $item.page — derived from the manifest's own sourceRef refs
    // (no new fields): entities/<name>.md → entity; pages/<name>.md → page.
    entity: entityFromSource(entry),
    page: pageFromSource(entry, p),
    // $item.dataFields — for a page-spec artifact, the field names its "## Data
    // Covered" table declares. Lets a UI-design check compare the DESIGN's fields
    // against the entity spec (design validation, before code is generated).
    dataFields: /UI\/pages\/.*\.md$/.test(p) ? dataCoveredFields(raw) : [],
    content: structureContent(p, raw),
    _entry: entry,
  };
}
