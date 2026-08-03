// model.mjs — assemble the $-addressable verification model for a project + plan.
// The manifest is the source of truth for artifacts (paths, types) — checks never
// name folders. Content is loaded from each entry's path; known files are parsed.
//
// Split into focused modules (each importable/testable on its own):
//   manifest-item.mjs    — read the manifest, build $item objects, entity/page trace joins
//   target-catalogue.mjs — tech-stack/loaded/excluded/required targets, a target's Outputs
//   spec-parser.mjs       — $spec: entity / business-rule / page-spec parsing
//   plan-builders.mjs     — per-plan derived pieces (server slices, migrations, coverage, …)
// buildModel() here is purely the orchestrator: it calls into the above and assembles
// the final $plan/$spec/$manifest shape checks address.

import fs from 'fs';
import path from 'path';

import {
  readJsonlWithHealth, toItem, srcRefs, entitiesFromSource, slugNorm,
} from './manifest-item.mjs';

import {
  normalizeTargetId, techStackTargets, authMechanism, allTargetIds, knownAspects,
  requiresClosure, loadedTargets, excludedTargets, targetOutputs,
  specInstances, fillPathTemplate, resolveNumberedPath, techStackOperations,
} from './target-catalogue.mjs';

import {
  slug, lazyKeyed, dataCoveredFields, parseEntitySpec, parseBusinessRuleSpec,
  businessRuleCovered, parsePageSpec,
} from './spec-parser.mjs';

// $app — whole-app, plan-independent roots for scope=system checks. Deliberately
// minimal (see .mde/mde.specs/design/verification.md "Resolved: scope=system, body
// is ASK — no join primitive"): a scope=system check's ASK body has the AI read the
// relevant spec trees itself, so the model doesn't need rich $app.entities/$app.pages
// joins — only what a WHEN maturity guard needs (e.g. "has this report been written
// yet"). hasFile is lazy/keyed like $spec — one fs.existsSync per access, cached.
function buildAppModel(projectRoot) {
  // designOpCoverage (app-wide): every operation an entity declares (specs/business/
  // entities/*.md ## Operations) must be REALIZED by a use-case — i.e. referenced by an
  // `operation:` uri in some use case's `## Realization` section (the design facet that
  // maps a step/condition to an entity operation). This is the design-completeness layer:
  // an operation no use-case realizes is orphaned (or deliberately technical); an op a
  // realization names that no entity declares has drifted from the BA. The coverage
  // denominator is the USE-CASE REALIZATION, not a restated API table in the capability
  // overview (code-first: HTTP endpoints/shape live in the generated openapi.yaml, access
  // lives on the entity operation — the overview no longer restates operations).
  // The realization `operation:` uri form is <entity-concept-id>#<entity.op>, e.g.
  //   specs/business/entities/project-assignment#project-assignment.create
  const entityOps = new Set();
  for (const inst of specInstances(projectRoot, 'entity')) {
    const espec = parseEntitySpec(projectRoot, inst.slug);
    for (const op of (espec && espec.operations) || []) entityOps.add(op);
  }
  const designOps = new Set();
  // entity.op appears in a realization as the fragment after '#' on an operation uri
  // (…entities/<entity>#<entity>.<op>), or as a bare `operation: <entity>.<op>`.
  const opUri = /#\s*([a-z0-9-]+\.[a-z0-9-]+)\b/ig;
  const opBare = /\boperation:\s*`?([a-z0-9-]+\.[a-z0-9-]+)`?/ig;
  const ucGlob = path.join(projectRoot, 'specs/business/capabilities');
  try {
    for (const cap of fs.readdirSync(ucGlob, { withFileTypes: true })) {
      if (!cap.isDirectory()) continue;
      const ucDir = path.join(ucGlob, cap.name, 'use-cases');
      let files; try { files = fs.readdirSync(ucDir); } catch { continue; }
      for (const f of files) {
        if (!f.endsWith('.md')) continue;
        const text = fs.readFileSync(path.join(ucDir, f), 'utf8').replace(/\r\n/g, '\n');
        // only the ## Realization section carries operation uris (design facet)
        const real = text.split(/^##\s+Realization\s*$/im)[1];
        if (!real) continue;
        let m;
        opUri.lastIndex = 0; while ((m = opUri.exec(real))) designOps.add(m[1].toLowerCase());
        opBare.lastIndex = 0; while ((m = opBare.exec(real))) designOps.add(m[1].toLowerCase());
      }
    }
  } catch { /* no use cases yet — coverage is vacuously satisfied */ }
  const norm = (s) => s.toLowerCase();
  const missing = [...entityOps].filter((op) => !designOps.has(norm(op)));         // declared, no design row
  const orphan = [...designOps].filter((op) => ![...entityOps].some((e) => norm(e) === op)); // design row, no entity
  const inScope = entityOps.size > 0 && designOps.size > 0;   // only meaningful once design exists

  // precededByGraph (app-wide): the capability journey is DERIVED from each use case's
  // `## Preceded By` section (refs to the use case(s) that must precede it — enhanced-use-case
  // model). This validates the graph mechanically: every ref RESOLVES to a real use case in the
  // SAME capability, and the edges are ACYCLIC (a cycle is a modeling error — a journey can't
  // loop). A dangling ref (predecessor that doesn't exist / lives in another capability) or a
  // cycle is a defect the AI review shouldn't have to catch.
  const ucSlugsByCap = new Map();          // cap -> Set(slug)
  const ucEdges = [];                      // { cap, from, to } (to = declared predecessor)
  const ucDangling = [];                   // `cap/slug -> ref` where ref resolves to no same-cap use case
  const pbHeader = /^##\s+Preceded\s+By\s*$/im;
  const ucTok = /\{\{\s*use-case\s*:\s*([a-z0-9-]+)\s*\}\}/ig;
  try {
    for (const cap of fs.readdirSync(ucGlob, { withFileTypes: true })) {
      if (!cap.isDirectory()) continue;
      const ucDir = path.join(ucGlob, cap.name, 'use-cases');
      let files; try { files = fs.readdirSync(ucDir); } catch { continue; }
      const slugs = new Set(files.filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')));
      ucSlugsByCap.set(cap.name, slugs);
    }
    for (const [cap, slugs] of ucSlugsByCap) {
      const ucDir = path.join(ucGlob, cap, 'use-cases');
      for (const slug of slugs) {
        const text = fs.readFileSync(path.join(ucDir, `${slug}.md`), 'utf8').replace(/\r\n/g, '\n');
        const pb = text.split(pbHeader)[1];
        if (!pb) continue;
        const section = pb.split(/\n##\s+/)[0];          // just the Preceded By section body
        let m; ucTok.lastIndex = 0;
        while ((m = ucTok.exec(section))) {
          const ref = m[1].toLowerCase();
          if (slugs.has(ref)) ucEdges.push({ cap, from: slug, to: ref });
          else ucDangling.push(`${cap}/${slug} -> ${ref}`);
        }
      }
    }
  } catch { /* no use cases — vacuous */ }
  // cycle detection per capability (DFS over from->to edges, to = predecessor)
  const ucCycles = [];
  for (const [cap, slugs] of ucSlugsByCap) {
    const adj = new Map([...slugs].map((s) => [s, []]));
    for (const e of ucEdges) if (e.cap === cap) adj.get(e.from).push(e.to);
    const state = new Map();   // 0=unvisited 1=in-stack 2=done
    const dfs = (n) => {
      state.set(n, 1);
      for (const nx of adj.get(n) || []) {
        if (state.get(nx) === 1) return true;                 // back-edge = cycle
        if (!state.get(nx) && dfs(nx)) return true;
      }
      state.set(n, 2); return false;
    };
    for (const s of slugs) if (!state.get(s) && dfs(s)) { ucCycles.push(cap); break; }
  }

  // realizationCoverage (app-wide): once a use case has a `## Realization` section (design pass
  // ran), EVERY numbered step (S1, S2, …) declared in `## Flow` and EVERY condition (step-scoped
  // or use-case-level) must have a matching entry in `## Realization` — no step or condition left
  // unrealized. A use case with NO `## Realization` is skipped (business-only, design not yet
  // run — that's the use-case-realization coverage question, not this one). This gate catches a
  // realization that silently drops a step/condition. Structural, keyed by step # and condition
  // title, so it's deterministic.
  const realizeGaps = [];       // "cap/slug: S3, <Condition Title>" — declared but not realized
  let realizeInScope = false;
  const norml = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  try {
    for (const [cap, slugs] of ucSlugsByCap) {
      const ucDir = path.join(ucGlob, cap, 'use-cases');
      for (const slug of slugs) {
        const text = fs.readFileSync(path.join(ucDir, `${slug}.md`), 'utf8').replace(/\r\n/g, '\n');
        const parts = text.split(/^##\s+Realization\s*$/im);
        if (parts.length < 2) continue;                 // no realization section — skip (design not run)
        realizeInScope = true;
        const business = parts[0], realization = parts[1];
        // declared steps: S1, S2… anywhere in the business half's ## Flow
        const flow = (business.split(/^##\s+Flow\s*$/im)[1] || '').split(/\n##\s+/)[0];
        const declaredSteps = [...new Set((flow.match(/\bS\d+\b/g) || []))];
        // declared conditions come from TWO places, and only condition titles — NOT the step
        // bullets (`- **S1** — …`). In ## Flow they live under a `conditions:` sub-block; in the
        // ## Conditions section they are the top-level bold entries. Bold titles that are a bare
        // step id (S\d+) are steps, not conditions — exclude them.
        const condTitle = /-\s+\*\*([^*]+?)\*\*/g;
        const declaredConds = new Set();
        const addConds = (blob) => {
          let cm; condTitle.lastIndex = 0;
          while ((cm = condTitle.exec(blob))) {
            const t = cm[1].trim();
            if (/^S\d+$/i.test(t)) continue;           // a step bullet, not a condition
            declaredConds.add(norml(t));
          }
        };
        // step-scoped conditions: only the text under each `conditions:` marker in the flow
        for (const seg of flow.split(/\bconditions:\s*/i).slice(1)) {
          addConds(seg.split(/\n\s*-\s+\*\*S\d+\*\*/)[0]);   // stop at the next step bullet
        }
        // use-case-level conditions: the whole ## Conditions section
        addConds((business.split(/^##\s+Conditions\s*$/im)[1] || '').split(/\n##\s+/)[0]);
        // realized steps + conditions (### Sn headers / condition: refs in the realization half)
        const realizedSteps = new Set((realization.match(/\bS\d+\b/g) || []));
        const realizedConds = new Set();
        // a condition is realized if its title appears (as `condition:` ref or a bold entry)
        const rTitle = /(?:condition:\s*["']?|-\s+\*\*)([^"'\n*]+?)(?:["']?\s*$|\*\*)/gim;
        let rm; rTitle.lastIndex = 0;
        while ((rm = rTitle.exec(realization))) realizedConds.add(norml(rm[1]));
        for (const s of declaredSteps) if (!realizedSteps.has(s)) realizeGaps.push(`${cap}/${slug}: ${s}`);
        for (const c of declaredConds) if (c && !realizedConds.has(c)) realizeGaps.push(`${cap}/${slug}: "${c}"`);
      }
    }
  } catch { /* vacuous */ }

  // untaggedConcepts (app-wide, naming-integrity gate): a use case's narrative prose must tag
  // every mention of a known concept `{{kind:slug}}`, not leave it as bare text (semantic-
  // references — the confabulation escape hatch). Mechanical detection is HIGH-PRECISION by
  // design: it only flags DISTINCTIVE concept names — multi-word slugs (a hyphen → e.g.
  // `performance-goal`, `assignment-request`), matched by their spaced form ("performance goal")
  // appearing in prose OUTSIDE a {{…}} tag. Single common-word slugs (`review`, `feedback`,
  // `client`) are too ambiguous for a mechanical gate (they occur in ordinary prose) and are left
  // to the AI-review check. So a hit here is a real untagged reference, not a guess.
  const conceptNames = [];   // { kind, slug, spaced }
  const addKind = (kind, insts) => {
    for (const i of insts) {
      if (!i.slug || !i.slug.includes('-')) continue;      // distinctive (multi-word) only
      conceptNames.push({ kind, slug: i.slug, spaced: i.slug.replace(/-/g, ' ') });
    }
  };
  addKind('entity', specInstances(projectRoot, 'entity'));
  addKind('business-rule', specInstances(projectRoot, 'business-rule'));
  addKind('use-case', specInstances(projectRoot, 'use-case'));
  addKind('web-page', specInstances(projectRoot, 'page'));
  try {   // roles live at specs/business/roles/<slug>.md (not a specInstances kind)
    for (const f of fs.readdirSync(path.join(projectRoot, 'specs/business/roles'))) {
      if (f.endsWith('.md') && !/README/i.test(f)) {
        const s = f.replace(/\.md$/, '');
        if (s.includes('-')) conceptNames.push({ kind: 'role', slug: s, spaced: s.replace(/-/g, ' ') });
      }
    }
  } catch { /* no roles dir */ }
  const untagged = [];   // "cap/slug: 'performance goal' (entity)"
  try {
    for (const [cap, slugs] of ucSlugsByCap) {
      const ucDir = path.join(ucGlob, cap, 'use-cases');
      for (const slug of slugs) {
        let text = fs.readFileSync(path.join(ucDir, `${slug}.md`), 'utf8').replace(/\r\n/g, '\n');
        // scan only the business NARRATIVE (Flow + Conditions); strip the ## Realization half
        // (uris there are refs, not prose) and blank out existing {{…}} tags so a tagged mention
        // never counts as untagged.
        text = text.split(/^##\s+Realization\s*$/im)[0].replace(/\{\{[^}]*\}\}/g, ' ');
        const lc = text.toLowerCase();
        for (const c of conceptNames) {
          // word-boundary match of the spaced form; the tag form is already blanked out above
          const re = new RegExp(`(^|[^a-z0-9-])${c.spaced.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9-]|$)`, 'i');
          if (re.test(lc)) untagged.push(`${cap}/${slug}: "${c.spaced}" (${c.kind})`);
        }
      }
    }
  } catch { /* vacuous */ }

  // ── Testing-layer coverage: the use-case CONDITION is the test denominator ──
  // The safety net that makes "prove conditions" sound: every operation and every rule must be
  // CLAIMED by a condition, so nothing falls through. Two facts collect the operations/rules named
  // inside a CONDITION's realization (not just a step); a third reads runtime evidence that each
  // rule actually fired.
  const condOps = new Set();      // entity.op named in some condition's realization  (A)
  const condRules = new Set();    // rule concept-id named in some condition's realization  (B1)
  // rule concept-id = the path after specs/business/**/business-rules/<slug> — collect the catalogue
  const ruleSlugs = new Set();
  for (const inst of specInstances(projectRoot, 'business-rule')) ruleSlugs.add(inst.slug);
  const ruleUri = /business-rules\/([a-z0-9-]+)\b/ig;   // last path segment = rule slug
  try {
    for (const [cap, slugs] of ucSlugsByCap) {
      const ucDir = path.join(ucGlob, cap, 'use-cases');
      for (const slug of slugs) {
        const text = fs.readFileSync(path.join(ucDir, `${slug}.md`), 'utf8').replace(/\r\n/g, '\n');
        const real = text.split(/^##\s+Realization\s*$/im)[1];
        if (!real) continue;
        // condition realizations = the `conditions:` sub-blocks + a use-case-level conditions block.
        // Everything after a `conditions:` marker (to the next `### S` step header) is condition scope.
        for (const seg of real.split(/\bconditions:\s*/i).slice(1)) {
          const scope = seg.split(/\n###\s+S\d+/i)[0];
          let m;
          opUri.lastIndex = 0; while ((m = opUri.exec(scope))) condOps.add(m[1].toLowerCase());
          opBare.lastIndex = 0; while ((m = opBare.exec(scope))) condOps.add(m[1].toLowerCase());
          ruleUri.lastIndex = 0; while ((m = ruleUri.exec(scope))) condRules.add(m[1].toLowerCase());
        }
      }
    }
  } catch { /* vacuous */ }
  const opCondMissing = [...entityOps].filter((op) => !condOps.has(norm(op)));   // A: op no condition proves
  const ruleCondMissing = [...ruleSlugs].filter((r) => !condRules.has(r));       // B1: rule no condition proves
  const testCovInScope = entityOps.size > 0 && condOps.size > 0;
  const ruleCovInScope = ruleSlugs.size > 0 && (condRules.size > 0 || condOps.size > 0);

  // B2 (runtime evidence): a rule is PROVEN only when the business-rules run log shows a rejection
  // (422) carrying that rule's concept-id — evidence the rule was invoked and blocked the
  // transaction (a conditional rule fires only on violating data, so a static "named in a
  // condition" claim is not proof). requires-environment: needs the app run + captured log.
  let brLog = '';
  for (const p of ['reports/evidence/tests-business-rules/run.log', 'reports/evidence/tests-api/run.log']) {
    try { brLog += '\n' + fs.readFileSync(path.join(projectRoot, p), 'utf8'); } catch { /* absent */ }
  }
  const ruleFired = new Set();   // rule slug whose concept-id appears near a 4xx in the log
  if (brLog) {
    const lc = brLog.toLowerCase();
    for (const r of ruleSlugs) {
      // proof: the rule slug appears in a line that also carries a rejection status (422/409/403)
      const line = new RegExp(`^.*\\b${r.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b.*$`, 'im');
      const mm = lc.match(line);
      if (mm && /\b(422|409|403|reject|blocked|violat)\b/i.test(mm[0])) ruleFired.add(r);
    }
  }
  const ruleNoEvidence = [...ruleSlugs].filter((r) => !ruleFired.has(r));
  const brLogPresent = brLog.trim().length > 0;

  return {
    // "true"/"false" strings (the model's boolean convention throughout — see e.g.
    // $plan.persistenceInScope) so a WHEN guard reads `$app.hasFile[...] IS "true"`,
    // not EXISTS — EXISTS tests presence/non-emptiness and would treat a real `false`
    // (file confirmed absent) the same as an unset/empty value, which is wrong here.
    hasFile: lazyKeyed((rel) => String(fs.existsSync(path.join(projectRoot, rel)))),
    designOpCoverage: {
      inScope: String(inScope),
      complete: String(inScope && missing.length === 0),
      missing: missing.join(', '),
      missingCount: String(missing.length),
      orphans: orphan.join(', '),
      orphanCount: String(orphan.length),
      entityOpCount: String(entityOps.size),
      designOpCount: String(designOps.size),
    },
    precededBy: {
      inScope: String(ucSlugsByCap.size > 0),
      ok: String(ucDangling.length === 0 && ucCycles.length === 0),
      dangling: ucDangling.join(', '),
      danglingCount: String(ucDangling.length),
      cycles: ucCycles.join(', '),
      cycleCount: String(ucCycles.length),
    },
    realizationCoverage: {
      inScope: String(realizeInScope),
      complete: String(realizeInScope && realizeGaps.length === 0),
      gaps: realizeGaps.join('; '),
      gapCount: String(realizeGaps.length),
    },
    untaggedConcepts: {
      inScope: String(ucSlugsByCap.size > 0 && conceptNames.length > 0),
      clean: String(untagged.length === 0),
      hits: untagged.join('; '),
      hitCount: String(untagged.length),
    },
    // A: every entity operation is claimed by a use-case CONDITION's realization
    opConditionCoverage: {
      inScope: String(testCovInScope),
      complete: String(testCovInScope && opCondMissing.length === 0),
      missing: opCondMissing.join(', '),
      missingCount: String(opCondMissing.length),
    },
    // B1 (static): every business rule is claimed by a condition's realization (rule: uri)
    ruleConditionCoverage: {
      inScope: String(ruleCovInScope),
      complete: String(ruleCovInScope && ruleCondMissing.length === 0),
      missing: ruleCondMissing.join(', '),
      missingCount: String(ruleCondMissing.length),
    },
    // B2 (runtime evidence): every rule actually FIRED — its concept-id appears with a rejection
    // status in the captured business-rules/API run log. requires-environment.
    ruleEvidence: {
      inScope: String(ruleSlugs.size > 0 && brLogPresent),
      complete: String(ruleSlugs.size > 0 && brLogPresent && ruleNoEvidence.length === 0),
      noEvidence: ruleNoEvidence.join(', '),
      noEvidenceCount: String(ruleNoEvidence.length),
      logPresent: String(brLogPresent),
    },
  };
}

import {
  operationCovered, routePlausiblyImplements, CRUD_VERBS_HTTP, sqlTableBody,
  buildServerSlices, buildMigrations, buildTestEvidence, buildRunApp, buildInstallDev,
  buildCorrelationId, buildCoverage,
  buildCrossSliceImports,
} from './plan-builders.mjs';

export { normalizeTargetId };

export function buildModel(projectRoot, planDir, mdeMethodDir) {
  // Default: the method that ships with the project being verified.
  mdeMethodDir = mdeMethodDir || path.join(projectRoot, '.mde', 'method');
  const mh = readJsonlWithHealth(projectRoot, `${planDir}/output.manifest`);
  const items = mh.entries.map((e) => toItem(projectRoot, e, dataCoveredFields));
  // For page-spec items, pre-compute the fields the page's Data Covered shows that do
  // NOT match any property on its entity — so a UI-design finding can STATE the missing
  // fields up front instead of dumping two lists to diff by eye. Tolerant of naming
  // variance (slug-compared); the AI still confirms borderline cases via the ASK.
  for (const it of items) {
    if (!/UI\/pages\/.*\.md$/.test(it.path) || !it.entity || !it.dataFields.length) continue;
    const spec = parseEntitySpec(projectRoot, it.entity);
    const entityProps = (spec && spec.properties) || [];
    const propSlugs = new Set(entityProps.map((p) => slugNorm(p)));
    it.missingDataFields = it.dataFields.filter((f) => !propSlugs.has(slugNorm(f)));
  }
  // For every page-spec artifact, pre-compute WHICH required aspects it lacks —
  // so the incompleteness finding names the actual gaps. Each aspect accepts
  // MULTIPLE equivalent forms (the strict template heading OR the real authored
  // form), so a page that carries the information under a valid variant is not
  // wrongly flagged. A `label` names the aspect; `test(content)` returns true
  // when the aspect is present in ANY accepted form.
  const PAGE_SPEC_ASPECTS = [
    { label: "capability", test: (c) => /^\s*capability:/im.test(c) || c.includes("## Primary Capability") },
    { label: "page pattern", test: (c) => /page\s*pattern/i.test(c) || c.includes("pagePattern:") || c.includes("## Pattern") },
    { label: "panels", test: (c) => /panels\s*:/i.test(c) || c.includes("## Panels") || c.includes("## Composition") },
    { label: "data coverage", test: (c) => c.includes("## Data Covered") || c.includes("## Panels") || /data\s*(source|binding|covered)/i.test(c) },
  ];
  // Declared operation ids across the WHOLE app (every entity's ## Operations) — the
  // authoritative set a page's rendered operations must resolve to. Up-drift = a page
  // renders an entity.op id that no entity declares (the page invented an operation).
  // This is a UI defect owned by the page, so it's checked per page-spec here.
  const allDeclaredOps = new Set();
  for (const inst of specInstances(projectRoot, 'entity')) {
    const espec = parseEntitySpec(projectRoot, inst.slug);
    for (const op of (espec && espec.operations) || []) allDeclaredOps.add(op);
  }
  // entity.op tokens named anywhere in a page-spec's ## Composition (a panel's
  // operations: list, or an inline entity.op reference).
  const compositionOpIds = (content) => {
    const m = content.replace(/\r\n/g, '\n').match(/## Composition\n([\s\S]*?)(?:\n## |$)/);
    const comp = m ? m[1] : '';
    return [...new Set([...comp.matchAll(/\b([a-z][a-z0-9-]*\.[a-z][a-z0-9_-]*)\b/gi)].map((x) => x[1]))];
  };

  // Composition well-formedness vocabularies (mirror page-composition.md's declared
  // canvas types + the panel kind/purpose/service sets). Replaces validateComposition:
  // a page's ## Composition must declare a KNOWN canvas type and its panels must use
  // known kind/purpose/service vocabulary. Returns the list of vocabulary violations.
  const CANVAS_TYPES = new Set(['standard', 'multipanel', 'dashboard', 'calendar', 'timeline', 'kanban', 'tree', 'map', 'diagram', 'workflow', 'custom']);
  const PANEL_KINDS = new Set(['detail', 'list']);
  const PANEL_PURPOSES = new Set(['maintenance', 'reference']);
  const PANEL_SERVICES = new Set(['edit', 'operate', 'open', 'inspect', 'order', 'transfer']);
  const compositionIssues = (content) => {
    const m = content.replace(/\r\n/g, '\n').match(/## Composition\n([\s\S]*?)(?:\n## |$)/);
    if (!m) return ['no ## Composition section'];
    const block = m[1];
    const issues = [];
    const canvasTypes = [...block.matchAll(/^\s*-?\s*type:\s*([a-z]+)\s*$/gim)].map((x) => x[1].toLowerCase());
    if (!canvasTypes.length) issues.push("no canvas 'type:' declared");
    for (const t of canvasTypes) if (!CANVAS_TYPES.has(t)) issues.push(`unknown canvas type '${t}'`);
    for (const pm of block.matchAll(/^\s*-?\s*source:\s*([a-z0-9-]+)\s*$([\s\S]*?)(?=^\s*-?\s*source:|^\s*links:|$(?![\s\S]))/gim)) {
      const source = pm[1], tail = pm[2];
      const kind = (tail.match(/^\s*kind:\s*([a-z]+)/im) || [])[1]?.toLowerCase();
      const purpose = (tail.match(/^\s*purpose:\s*([a-z]+)/im) || [])[1]?.toLowerCase();
      const services = (tail.match(/^\s*services:\s*\[?([a-z0-9 ,/]+)\]?/im) || [])[1] || '';
      if (kind && !PANEL_KINDS.has(kind)) issues.push(`panel '${source}' unknown kind '${kind}'`);
      if (purpose && !PANEL_PURPOSES.has(purpose)) issues.push(`panel '${source}' unknown purpose '${purpose}'`);
      for (const s of services.split(/[,/ ]+/).map((x) => x.trim().toLowerCase()).filter(Boolean)) {
        if (!PANEL_SERVICES.has(s)) issues.push(`panel '${source}' unknown service '${s}'`);
      }
    }
    return issues;
  };

  for (const it of items) {
    if (!/specs\/design\/UI\/pages\/.*\.md$/.test(it.path)) continue;
    const content = typeof it.content === "string" ? it.content : (it.content && it.content.raw) || "";
    it.missingSections = PAGE_SPEC_ASPECTS.filter((a) => !a.test(content)).map((a) => a.label);
    it.pageSpecComplete = it.missingSections.length === 0 ? "true" : "false";
    // Up-drift: rendered ops that resolve to no declared entity operation. Only
    // meaningful once the app has declared operations (else every op looks unresolved
    // because the model hasn't been authored) — empty set when no ops declared yet.
    it.unresolvedOps = allDeclaredOps.size
      ? compositionOpIds(content).filter((op) => !allDeclaredOps.has(op))
      : [];
    it.opsResolve = it.unresolvedOps.length === 0 ? "true" : "false";
    // Composition well-formedness: known canvas type + known panel vocab.
    it.compositionIssues = compositionIssues(content);
    it.compositionValid = it.compositionIssues.length === 0 ? "true" : "false";
  }

  // Entity aspect validity: every aspect an entity declares (## Aspects) must be a
  // KNOWN aspect — one in aspects-catalogue.json (compiled from the features that own
  // it). An unknown aspect (a typo, or a concept no feature implements) is silently
  // ineffective today; this makes it a finding. Degrades to no-op if the catalogue is
  // empty (older method checkout). Aspect names are matched by their leading token
  // (a `## Aspects` row like "surrogate-key | ... | yes | ..." → "surrogate-key").
  const aspectVocab = new Set(knownAspects(mdeMethodDir));
  const entityAspectRows = (content) => {
    const m = content.replace(/\r\n/g, '\n').match(/## Aspects\n([\s\S]*?)(?:\n## |$)/);
    if (!m) return [];
    const out = [];
    for (const line of m[1].split('\n')) {
      const row = line.trim().replace(/^[-*|]\s*/, '');
      if (!row || /^[-|:\s]+$/.test(row)) continue;               // separator/blank
      const first = row.split('|')[0].trim().toLowerCase().replace(/`/g, '');
      // skip a table header row (e.g. "Aspect | Description | ...")
      if (first === 'aspect' || !first) continue;
      // normalize to a slug token (the aspect name), e.g. "audit trail" -> "audit-trail"
      const slugName = first.replace(/\s+/g, '-');
      if (slugName) out.push(slugName);
    }
    return [...new Set(out)];
  };
  for (const it of items) {
    if (!/specs\/business\/entities\/[^/]+\.md$/.test(it.path)) continue;
    const content = typeof it.content === "string" ? it.content : (it.content && it.content.raw) || "";
    const declared = entityAspectRows(content);
    it.unknownAspects = aspectVocab.size ? declared.filter((a) => !aspectVocab.has(a)) : [];
    it.aspectsValid = it.unknownAspects.length === 0 ? "true" : "false";
  }
  // Manifest health: present with content but not all lines parsed as JSONL ⇒ corrupt
  // (e.g. someone wrote it as YAML). The runner fails loudly on this instead of running
  // every content check over 0 entries and blind-passing.
  // Design-system realization: does the generated web source implement what
  // .mde/ui-patterns/ui-design-system.md declares? Replaces validateUiDesign in
  // validate-project-contract.mjs: declared tokens implemented in CSS, declared
  // shared components implemented in component source, and no stack contradiction
  // with ui-patterns.md. Checked against THIS plan's generated source (a plan that
  // produces web source owns realizing the design system).
  const designSystem = (() => {
    const dsPath = path.join(projectRoot, '.mde', 'ui-patterns', 'ui-design-system.md');
    if (!fs.existsSync(dsPath)) return { present: 'false', missingTokens: [], missingComponents: [], stackContradiction: 'false' };
    const dsText = fs.readFileSync(dsPath, 'utf8').replace(/\r\n/g, '\n');
    const patternsPath = path.join(projectRoot, '.mde', 'ui-patterns', 'ui-patterns.md');
    const patternsText = fs.existsSync(patternsPath) ? fs.readFileSync(patternsPath, 'utf8').replace(/\r\n/g, '\n') : '';
    const sectionOf = (text, h) => {
      const m = text.match(new RegExp(`## ${h}\\n([\\s\\S]*?)(?:\\n## |$)`, 'i'));
      return m ? m[1] : '';
    };
    // Web source blobs from THIS plan's generated items.
    const srcItems = items.filter((i) => i.type === 'source');
    const rawOfItem = (i) => (i.content && typeof i.content === 'object' ? i.content.raw : i.content) || '';
    const cssBlob = srcItems.filter((i) => /\.css$/i.test(i.path)).map(rawOfItem).join('\n');
    const componentBlob = srcItems.filter((i) => /src\/web\/src\/components\/.*\.(t|j)sx?$/i.test(i.path)).map(rawOfItem).join('\n');
    // Declared tokens (`--x`) and components (first-column names) from the DS doc.
    const declaredTokens = [...new Set([...sectionOf(dsText, 'Tokens').matchAll(/`(--[a-z0-9-]+)`/gi)].map((m) => m[1]))];
    const declaredComponents = [];
    for (const line of sectionOf(dsText, 'Components').split('\n')) {
      if (!line.trim().startsWith('|') || /^\|\s*-/.test(line)) continue;
      const first = (line.split('|')[1] || '').trim().replace(/`/g, '');
      if (first && !['Component', 'Token', 'Tone'].includes(first)) declaredComponents.push(first);
    }
    const missingTokens = cssBlob ? declaredTokens.filter((t) => !cssBlob.includes(`${t}:`)) : [];
    const missingComponents = componentBlob ? declaredComponents.filter((c) => {
      const id = c.replace(/[^A-Za-z0-9_$]/g, '');
      return id && !new RegExp(`\\b${id}\\b`).test(componentBlob);
    }) : [];
    // Stack contradiction: ui-patterns.md asserts a tech the design system rejects.
    const dsStack = sectionOf(dsText, 'Stack').toLowerCase();
    const patStack = sectionOf(patternsText, 'Stack').toLowerCase().replace(/\s+/g, ' ');
    const asserts = (text, tech) => new RegExp(`(?<!no )\\b${tech}\\b`).test(text);
    let contradiction = false;
    if (patternsText) {
      for (const tech of ['shadcn', 'tailwind']) {
        if (dsStack.includes(`no ${tech}`) && asserts(patStack, tech)) contradiction = true;
      }
    }
    return {
      present: 'true',
      missingTokens, missingComponents,
      tokensImplemented: missingTokens.length === 0 ? 'true' : 'false',
      componentsImplemented: missingComponents.length === 0 ? 'true' : 'false',
      stackContradiction: contradiction ? 'true' : 'false',
    };
  })();

  const manifestMalformed = mh.present && mh.lines > 0 && mh.parsed < mh.lines;
  // loadedTargets returns null when the ## Loaded Targets section is ABSENT
  // (legacy plan shape) and [] when it is present but empty (a deliberate "this
  // plan loads no target"). Downstream target math wants an array either way, so
  // normalize here and keep the distinction in `loadedDeclared` for the one
  // consumer that must tell them apart: capability relevance in the runner.
  const loadedRaw = loadedTargets(projectRoot, planDir);
  const loadedDeclared = loadedRaw !== null;
  const loaded = loadedRaw || [];
  // A loaded token that isn't a real target id — a fabricated/misspelled name
  // (e.g. "TARGET-BACKEND" instead of the real "TARGET-API") that parses as a
  // target-shaped token but matches nothing in the catalogue. This is DIFFERENT
  // from `missing` below (a real, required target genuinely absent) — an invalid
  // entry silently occupies a slot in `loaded` while never triggering any
  // target-scoped check, so the plan LOOKS covered while actually being blind.
  const catalogue = allTargetIds(mdeMethodDir);
  const invalidLoaded = loaded.filter((t) => !catalogue.includes(t));
  const required = requiresClosure(mdeMethodDir, loaded);
  const excluded = excludedTargets(projectRoot, planDir);
  const universe = techStackTargets(projectRoot);
  // Same validation as invalidLoaded, applied to tech-stack.md's applicationStack
  // targets: `type:` block — a fabricated/misspelled type (e.g. "backend" instead
  // of "api") would otherwise silently narrow the applicability universe with no
  // error, potentially masking a genuinely-required target as "not part of this
  // app's stack" when it's just misnamed. Consumed by every command that reads
  // tech-stack targets (evaluate/go directly; `mde review app`'s target union via
  // this same model), not something review re-derives on its own.
  const invalidTechStackTargets = universe.filter((t) => !catalogue.includes(t));
  // The gap: required, applicable to this app (∩ universe), not loaded, not excused.
  // When tech-stack declares no targets, don't filter by universe (can't scope).
  const missing = required.filter((t) =>
    (universe.length === 0 || universe.includes(t)) &&
    !loaded.includes(t) &&
    !excluded.includes(t));

  // Evaluate an Outputs row's `when` column against the plan's loaded targets — with
  // NO hardcoded target-name lookup table. `when` is normally one or more target ids,
  // comma-separated, OR'd against `loaded` (e.g. `when: api,api-design` — true if
  // EITHER is loaded); a target's own id is authoritative, read straight from
  // targets/catalogue.json via `loaded`, never re-encoded here. Two conditions are
  // NOT target-shaped at all and stay as named, explicitly-commented exceptions
  // (there is no target whose id IS "auth" or "any entity was touched" — these are
  // real cross-cutting rules, not targets):
  //   - `always`               — every plan.
  //   - `use-cases-in-scope`   — the plan's manifest traces to a use-case spec.
  //   - `data-model-in-scope`  — persistence/persistence-design loaded, OR the plan
  //                              touched an entity regardless of which target loaded it.
  //   - `auth-in-scope`        — a server tier is loaded (api or source-generation) AND
  //                              tech-stack.md's auth axis records a real mechanism
  //                              (opt-in; a silent axis means no auth is generated —
  //                              see authMechanism). Depends on tech-stack.md, not on
  //                              any single target's loaded state.
  function whenHolds(when) {
    if (!when || when === 'always') return true;
    if (when === 'use-cases-in-scope') return items.some((i) => /use-?cases?\//.test(srcRefs(i).join(' ')));
    if (when === 'data-model-in-scope') return loaded.includes('persistence') || loaded.includes('persistence-design') || items.some((i) => i.entity);
    if (when === 'auth-in-scope') {
      return (loaded.includes('api') || loaded.includes('source-generation'))
        && !['none', 'off', 'no'].includes(authMechanism(projectRoot));
    }
    return when.split(',').map((t) => t.trim()).some((t) => loaded.includes(t));
  }
  // expectedOutputs: for each loaded target, its ## Outputs rows whose `when` holds,
  // expanding perEach against spec instances.
  //
  // SCOPED TO THE PLAN. `evaluate` works on a plan: a plan is responsible only for the
  // instances it actually TOUCHES — not every use-case/entity/rule in the whole app. So
  // a perEach expansion is filtered to instances the plan's manifest references (via any
  // entry's sourceRef.refs). Without this, a Client-Management plan is FAILed for not
  // producing specs for the other 25 use-cases it never owned — an out-of-scope, whole-app
  // completeness question that belongs to `mde review app` (--app-wide), not per-plan
  // evaluate. (An app-wide "does every instance have its outputs" sweep is review-app's job.)
  const producedPaths = items.map((i) => i.path);
  // The spec instances THIS PLAN touches: any instance whose spec file is referenced by a
  // manifest entry's sourceRef.refs (normalised to forward slashes). Matched by the
  // instance's own path or slug appearing in a referenced spec path.
  const referencedRefs = new Set();
  for (const it of items) for (const r of (it.sourceRef && it.sourceRef.refs) || [])
    if (typeof r === 'string') referencedRefs.add(r.replace(/\\/g, '/'));
  const planTouches = (inst) => {
    const p = (inst.path || '').replace(/\\/g, '/');
    if (p && [...referencedRefs].some((r) => r === p || r.endsWith('/' + p) || p.endsWith('/' + r))) return true;
    // fall back to slug match inside a referenced path (e.g. .../use-cases/<slug>.md)
    return inst.slug ? [...referencedRefs].some((r) => r.includes(`/${inst.slug}.md`) || r.includes(`/${inst.slug}/`)) : false;
  };
  const expectedOutputs = [];
  for (const t of loaded) {
    for (const o of targetOutputs(mdeMethodDir, t)) {
      if (!whenHolds(o.when)) continue;
      if (o.perEach) {
        for (const inst of specInstances(projectRoot, o.perEach)) {
          if (!planTouches(inst)) continue;               // out of this plan's scope — skip
          const filled = fillPathTemplate(o.path, inst);
          expectedOutputs.push({ ...o, instance: inst.slug,
            path: resolveNumberedPath(o.path, filled, producedPaths) });
        }
      } else {
        const filled = fillPathTemplate(o.path, {});
        expectedOutputs.push({ ...o, path: resolveNumberedPath(o.path, filled, producedPaths) });
      }
    }
  }
  // expectedOperations: every operation (ALL kinds — crud AND lifecycle) declared by
  // each entity the plan touched, sourced from the entity spec's ## Operations
  // (authoritative), keyed on the plan's own touched entities (manifest refs, not a
  // global scan). The mandate (Testing target, gherkin-traceability): EACH operation
  // must have its own Gherkin `.feature` SCENARIO — API/UI behaviour is expressed as
  // Cucumber, not raw supertest. So coverage is decided against the `.feature`
  // scenarios: an operation is covered when some scenario names it (its op suffix, or
  // — for CRUD — a verb-mapped phrase within the entity's scenarios). The runner just
  // reads `covered`. `featuresExist` lets the check fail coarsely first when a plan
  // with API/UI behaviour produced NO `.feature` files at all.
  // Entities a manifest item's sourceRef resolves to — DIRECTLY (a `entities/<e>.md`
  // ref) OR via a CAPABILITY ref (`capabilities/<cap>/overview.md`) whose overview
  // declares `{{entity:<e>}}`. A capability-vertical route/service/repository file
  // (EmployeeRecordsService) traces to its capability, not each entity; without the
  // capability→entities hop the operation joins miss and every operation is falsely
  // reported "no route/service/repository". Defined here (before touchedEntities) because
  // a WHOLE-APP plan's manifest items are all capability-vertical — direct-refs-only would
  // make touchedEntities empty and the entire operation-coverage loop vacuous.
  const capEntitiesCache = {};
  const entitiesInCapabilityRef = (ref) => {
    const m = String(ref).match(/capabilities\/([^/]+)\/overview\.md/i);
    if (!m) return [];
    const cap = m[1];
    if (capEntitiesCache[cap]) return capEntitiesCache[cap];
    const ovPath = path.join(projectRoot, `specs/business/capabilities/${cap}/overview.md`);
    const raw = fs.existsSync(ovPath) ? fs.readFileSync(ovPath, 'utf8') : '';
    const ents = [...raw.matchAll(/\{\{\s*entity:\s*([a-z0-9-]+)\s*\}\}/gi)].map((x) => slugNorm(x[1]));
    return (capEntitiesCache[cap] = [...new Set(ents)]);
  };
  const itemEntities = (i) => {
    const direct = entitiesFromSource(i);
    if (direct.length) return direct;
    return srcRefs(i).flatMap(entitiesInCapabilityRef);      // fall back to capability→entities
  };
  // touched entities = the union of ALL entity refs across the manifest, resolved through
  // the capability hop (so a whole-app plan whose items are capability-vertical still
  // yields every entity — not the empty set direct-refs-only produced).
  const touchedEntities = [...new Set(items.flatMap((i) => itemEntities(i)).filter(Boolean))];
  const featureItems = items.filter((i) => /\.feature$/i.test(i.path));
  const featureBlob = featureItems
    .map((i) => `${i.path}\n${i.content || ''}`)
    .join('\n')
    .toLowerCase();
  // Business-rule scenarios must live under tests/business-rules/ (gherkin-traceability,
  // testing.md ## Outputs `rule-test`) — a DEDICATED location, not scattered across each
  // capability's regular *.feature files, so a reviewer/tool finds every rule test in one
  // place. This scoped blob is used ONLY for the rule-location check below; the full
  // featureBlob above still backs operation-coverage etc. (rules may still be found
  // elsewhere, which is exactly the drift this separate check catches).
  const businessRuleFeatureBlob = featureItems
    .filter((i) => /(^|\/)tests\/business-rules\//i.test(i.path))
    .map((i) => `${i.path}\n${i.content || ''}`)
    .join('\n')
    .toLowerCase();
  // Route content per entity, trace-joined via manifest sourceRef.refs (a Routes file
  // whose refs resolve to the entity, directly or through its capability). Used for API
  // operation-coverage: an operation is API-covered when a route handler for its entity
  // carries the `// MDE: <entity>.<op>` marker (declaration over inference — routes
  // express ops as verb+path, not op id).
  const routeItemsFor = (e) => items
    .filter((i) => /Routes\.(t|j)s$/i.test(i.path) && itemEntities(i).includes(e));
  const routesFor = (e) => routeItemsFor(e).map((i) => i.content || '').join('\n');
  // Service/Repository content per entity, same trace-join as routes — used by
  // capability-vertical-slices' Service/Repository operation-marker check (the
  // `// MDE: <entity>.<op>` marker convention extended there to those layers). MUST use
  // itemEntities (not entitiesFromSource): a capability-vertical Service/Repository file
  // (clientManagementService.ts) traces to its CAPABILITY, not each entity — the same
  // reason routes need the hop. Direct-refs-only here silently missed every operation on a
  // capability-vertical slice ("missing service/repository counts"), while routes passed.
  const serviceItemsFor = (e) => items
    .filter((i) => /Service\.(t|j)s$/i.test(i.path) && itemEntities(i).includes(e));
  const repositoryItemsFor = (e) => items
    .filter((i) => /Repository\.(t|j)s$/i.test(i.path) && itemEntities(i).includes(e));
  const servicesFor = (e) => serviceItemsFor(e).map((i) => i.content || '').join('\n');
  const repositoriesFor = (e) => repositoryItemsFor(e).map((i) => i.content || '').join('\n');
  // The source file a per-operation finding points at: the entity's route file if one
  // exists (where the endpoint should be), else the entity spec (where the op is
  // declared). Every operation-scoped finding gets a clickable source ref this way.
  const opSourceRef = (e) => {
    const r = routeItemsFor(e)[0];
    return r ? r.path : `specs/business/entities/${slug(e)}.md`;
  };
  // ACL source: the access-enforcer + route content, where operation→roles enforcement
  // lives. An op is ACL-enforced when its id appears there associated with roles; the
  // roles the enforcer names must COVER the roles the spec permits. Row-level "Scope"
  // (e.g. "employees who report to the manager") is the [ASK], not this.
  const rawOf2 = (i) => (i.content && typeof i.content === 'object' ? i.content.raw : i.content) || '';
  const aclBlob = items
    .filter((i) => /(access|acl|authoriz|Routes)\.(t|j)s$/i.test(i.path)
      || /shared-access-enforcer/.test(srcRefs(i).join(' ')))
    .map(rawOf2).join('\n');
  // openapi-contract: the generated openapi.yaml, if the plan produced one. A
  // lightweight text scan (like operationCovered/routePlausiblyImplements above), not
  // a real YAML parse — consistent with this file's existing style. An operation is
  // OpenAPI-declared when its route's HTTP verb (mapped from the op suffix) appears as
  // an operation keyword in the document (`get:`/`post:`/…), scoped loosely since
  // openapi.yaml is one app-wide file, not entity-scoped like a Routes.ts.
  const openApiBlob = items
    .filter((i) => /(^|\/)openapi\.ya?ml$/i.test(i.path))
    .map(rawOf2).join('\n').toLowerCase();
  function openApiDeclares(op) {
    if (!openApiBlob) return false;
    const suffix = slugNorm(op.split('.').pop());
    const verbs = CRUD_VERBS_HTTP[suffix];
    if (verbs) return verbs.some((v) => new RegExp(`^\\s*${v}:`, 'm').test(openApiBlob));
    // lifecycle op: its suffix should appear as a path segment or operationId.
    return openApiBlob.includes(suffix);
  }
  const expectedOperations = [];
  for (const e of touchedEntities) {
    const spec = parseEntitySpec(projectRoot, e);
    const slugForms = [slugNorm(e), slugNorm(e) + 's'];    // entity + naive plural
    const routeBlob = routesFor(e);
    for (const op of (spec && spec.operations) || []) {
      // Marked: a route carries the explicit `// MDE: <entity>.<op>` header.
      const marker = new RegExp(`//\\s*MDE:\\s*${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const routeMarked = marker.test(routeBlob);
      const serviceMarked = marker.test(servicesFor(e));
      const repositoryMarked = marker.test(repositoriesFor(e));
      // Present (verb-mapped, unmarked): a route PLAUSIBLY implements the op even
      // without the marker — a CRUD verb on the entity path, or a lifecycle sub-route
      // named for the op suffix. Lets the report distinguish "endpoint exists but is
      // unmarked" from "no endpoint at all" (two very different findings).
      const routePresent = routeMarked || routePlausiblyImplements(op, routeBlob);
      expectedOperations.push({
        op, entity: e,
        sourceRef: opSourceRef(e),                                      // clickable source file
        covered: String(operationCovered(op, slugForms, featureBlob)),  // test (.feature) coverage
        apiCovered: String(routeMarked),                                // marked route
        routeMarked: String(routeMarked),
        routePresent: String(routePresent),                            // route exists (marked or verb-mapped)
        serviceMarked: String(serviceMarked),
        repositoryMarked: String(repositoryMarked),
        openApiDeclared: String(openApiDeclares(op)),  // operation-coverage check for openapi-contract
        aclEnforced: (() => {
          const enf = new RegExp(`['"\`]${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`).test(aclBlob);
          return String(enf);
        })(),
        rolesMatch: (() => {
          const specRoles = (spec && spec.operationRoles && spec.operationRoles[op]) || [];
          const enf = new RegExp(`['"\`]${op.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`).test(aclBlob);
          return String(enf && specRoles.length > 0 && specRoles.every((r) => aclBlob.includes(r)));
        })(),
        specRoles: ((spec && spec.operationRoles && spec.operationRoles[op]) || []).join(', '),
      });
    }
  }
  // expectedBusinessRules: EVERY business-rule file in the app (specInstances, project-
  // wide — a rule is scoped to its own file, not to which entity a plan touched, unlike
  // expectedOperations above). The mandate (gherkin-traceability): each rule needs a
  // .feature scenario that exercises its VIOLATION path — naming the rule is not enough,
  // a happy-path mention does not count (see businessRuleCovered's phrase check).
  // A business-rule spec is "complete" when it has a real id (not a <placeholder>)
  // and every required section is present and filled (not an empty/placeholder body).
  // Mirrors the former validateBusinessRules() in validate-project-contract.mjs.
  const RULE_REQUIRED_SECTIONS = ['Statement', 'Owning Capability', 'Affected Entities',
    'Trigger / Context', 'Constraint / Decision / Calculation', 'Testability'];
  const ruleSpecGaps = (raw) => {
    if (!raw) return ['(rule spec file missing)'];
    const gaps = [];
    const idM = raw.match(/^id:\s*(\S+)\s*$/m);
    if (!idM || /<.*>/.test(idM[1])) gaps.push('real id: in frontmatter');
    for (const h of RULE_REQUIRED_SECTIONS) {
      const bodyM = raw.match(new RegExp(`## ${h.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\n([\\s\\S]*?)(?:\\n## |$)`));
      const body = bodyM ? bodyM[1].trim() : '';
      if (!body || /<[^`>]*>/.test(body)) gaps.push(`## ${h}`);
    }
    return gaps;
  };

  const expectedBusinessRules = specInstances(projectRoot, 'business-rule').map((inst) => {
    const rule = parseBusinessRuleSpec(projectRoot, inst.cap, inst.slug);
    const gaps = ruleSpecGaps(rule && rule.raw);
    return {
      rule: inst.slug,
      capability: inst.cap,
      sourceRef: (rule && rule.path) || `specs/business/capabilities/${inst.cap}/business-rules/${inst.slug}.md`,
      specComplete: gaps.length === 0 ? 'true' : 'false',
      missingSections: gaps,
      covered: String(businessRuleCovered({ slug: inst.slug }, featureBlob)),
      // inCorrectLocation: the SAME violation-scenario check, but scoped to only
      // tests/business-rules/*.feature — distinct from `covered` so a rule tested
      // elsewhere (e.g. buried in a capability's regular .feature) is flagged as
      // MISLOCATED, not silently passing because it's covered somewhere.
      inCorrectLocation: String(businessRuleCovered({ slug: inst.slug }, businessRuleFeatureBlob)),
    };
  });
  const serverSlices = buildServerSlices(items);
  const crossSliceImports = buildCrossSliceImports(items);
  const migrations = buildMigrations(items);
  const testEvidence = buildTestEvidence(projectRoot, planDir);
  const runApp = buildRunApp(projectRoot, planDir, items);
  const installDev = buildInstallDev(projectRoot, planDir);
  const correlationId = buildCorrelationId(items, projectRoot);
  // Coverage threshold: read the produced coverage report's total line-% and compare
  // to the policy floor (capabilitySettings.coverage-threshold.minCoverage, default
  // 75). Existence of the report is the mandated-output gate; THIS is whether it meets
  // the floor. reportPresent/linePct/minCoverage/meetsFloor are model-computed so the
  // check reads them; "n/a" line-% ⇒ no report to measure (distinct from below-floor).
  const coverage = buildCoverage(items, projectRoot);
  // Concatenated server-source content (for plan-level "is X present anywhere in the
  // server code" checks). A single blob a MATCHES regex can scan — $plan.trace is
  // objects, not searchable text.
  const rawOf = (i) => (i.content && typeof i.content === 'object' ? i.content.raw : i.content) || '';
  const serverSourceBlob = items
    .filter((i) => /src\/server\/.*\.(t|j)s$/i.test(i.path))
    .map(rawOf).join('\n');
  // USE-site blobs (not definitions) — presence-of-a-name is a weak floor that passes
  // "defined but never used" (a helper in db.ts, a label in a type). These scan only
  // the layers that must USE the thing, so the check verifies use, not just existence.
  const serviceBlob = items    // service layer — where a transaction is USED
    .filter((i) => /src\/server\/.*Service\.(t|j)s$/i.test(i.path))
    .map(rawOf).join('\n');
  const logCallBlob = items    // server source, only lines at/near a logger call
    .filter((i) => /src\/server\/.*\.(t|j)s$/i.test(i.path) && !/logger\.(t|j)s$/i.test(i.path))
    .map(rawOf).join('\n')
    .split('\n')
    .filter((l) => /logger\.|\.child\(/.test(l))   // keep only log-call / child-context lines
    .join('\n');
  // package.json content the plan produced (root-most wins), for the WB start-contract
  // check — must define the `mde:start` script the workbench invokes. "" if none.
  const pkgItem = items
    .filter((i) => /(^|\/)package\.json$/.test(i.path))
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length)[0];
  // .content for a .json file is structured to {raw, ...parsed} — use the RAW text so
  // a MATCHES regex (e.g. "mde:start") tests the source, not String(object).
  const pkgContent = pkgItem && pkgItem.content;
  const packageJson = (pkgContent && typeof pkgContent === 'object' ? pkgContent.raw : pkgContent) || '';
  // does this plan produce runnable code that the workbench would start? (server or
  // web source, or a package.json) — gates the start-contract check to relevant plans.
  const producesRunnableApp = String(items.some((i) =>
    /(^|\/)package\.json$/.test(i.path) || /src\/(server|web)\//.test(i.path)));
  // designEntities: one entry per ENTITY SPEC the plan PRODUCED (a design output —
  // specs/business/entities/<name>.md in the manifest). Carries the design-completeness
  // flags the implementation checks (003) DEPEND ON: does the spec define a Storage
  // View (table + columns) and permitted roles for every operation? Reasons from
  // produced artifacts, so it runs on a design plan regardless of impact.md format.
  const designEntities = [];
  for (const it of items) {
    const em = String(it.path).match(/specs\/business\/entities\/([^/]+)\.md$/);
    if (!em) continue;
    const name = em[1];
    const spec = parseEntitySpec(projectRoot, name);
    if (!spec) continue;
    const opsWithoutRoles = (spec.operations || [])
      .filter((op) => !((spec.operationRoles && spec.operationRoles[op]) || []).length);
    designEntities.push({
      entity: name,
      sourceRef: it.path,
      hasStorageView: String(!!spec.table && spec.columns.length > 0),
      operationCount: String((spec.operations || []).length),
      hasOperations: String((spec.operations || []).length > 0),
      allOperationsHaveRoles: String((spec.operations || []).length > 0 && opsWithoutRoles.length === 0),
      operationsMissingRoles: opsWithoutRoles.join(', '),
    });
  }
  // expectedTables: for each touched entity with a ## Storage View, whether the
  // migration realizes its table and every declared column (schema-from-entities).
  // Migration SQL = concatenated db/migrations/*.sql content (lowercased). Coverage
  // is decided model-side; the check reads tableExists / missingColumns.
  const migrationItems = items.filter((i) => /db\/migrations\/.*\.sql$/i.test(i.path));
  const migrationSql = migrationItems.map((i) => i.content || '').join('\n').toLowerCase();
  const expectedTables = [];
  // expectedTables checks that a MIGRATION realizes each entity's Storage View. If the
  // plan produced NO migration (e.g. a design-only plan), there is nothing to verify at
  // the schema/audit/locking level — leave the set empty so those checks don't fire
  // "no migration table" on a plan that was never supposed to have one. (Whether the
  // DESIGN is complete is the separate design-stage check on $plan.designEntities.)
  const hasMigration = migrationItems.length > 0;
  for (const e of (hasMigration ? touchedEntities : [])) {
    const spec = parseEntitySpec(projectRoot, e);
    if (!spec || !spec.table) continue;              // no Storage View → nothing to check
    const table = spec.table.toLowerCase();
    const tableRe = new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?"?${table}"?\\b`);
    const tableExists = tableRe.test(migrationSql);
    const tableBody = tableExists ? sqlTableBody(migrationSql, table) : '';
    const missingCols = spec.columns.filter((c) => !new RegExp(`\\b${c.toLowerCase()}\\b`).test(tableBody));
    // Aspect flags (from the entity spec) — drive audit/locking checks by what the
    // entity DECLARES, not by how the manifest tagged the migration.
    const audited = spec.aspects.some((a) => /audit/i.test(a));
    const locked = spec.aspects.some((a) => /lock|version/i.test(a));
    // The entity's repository content, joined via the TRACE (manifest sourceRef.refs),
    // not the filename: a repo file whose refs include this entity. A repo may cover
    // several entities, so we check its UPDATE against THIS entity's table below.
    const repoItems = items
      .filter((i) => /Repository\.(t|j)s$/i.test(i.path)
        && entitiesFromSource(i).includes(e));
    const repoContent = repoItems.map((i) => i.content || '').join('\n');
    // source ref for a table/audit/locking finding: the entity's repository file
    // (where audit/locking live), else its migration, else the entity spec.
    const migItem = items.find((i) => /db\/migrations\/.*\.sql$/i.test(i.path) && entitiesFromSource(i).includes(e));
    const tableSourceRef = (repoItems[0] && repoItems[0].path)
      || (migItem && migItem.path) || `specs/business/entities/${slug(e)}.md`;
    // Locking realized: the repo carries the optimistic-locking MARKER and a
    // version-guarded, version-incrementing UPDATE of this entity's table.
    const lockMarker = /\/\/\s*MDE:\s*optimistic-locking/i.test(repoContent);
    const lockUpdate = new RegExp(`update\\s+"?${table}"?\\b[\\s\\S]*?version\\s*=\\s*version\\s*\\+\\s*1[\\s\\S]*?where[\\s\\S]*?version\\s*=`, 'i').test(repoContent);
    // Audit realized: the marker + an update that sets updated_at on this table.
    const auditMarker = /\/\/\s*MDE:\s*audit-history/i.test(repoContent);
    const auditWrite = new RegExp(`update\\s+"?${table}"?\\b[\\s\\S]*?updated_at\\s*=`, 'i').test(repoContent);
    expectedTables.push({
      entity: e, table: spec.table,
      sourceRef: tableSourceRef,
      tableExists: String(tableExists),
      missingColumns: missingCols.join(', '),
      allColumnsPresent: String(tableExists && missingCols.length === 0),
      audited: String(audited),
      locked: String(locked),
      lockingRealized: String(lockMarker && lockUpdate),
      lockMarker: String(lockMarker),
      auditRealized: String(auditMarker && auditWrite),
      auditMarker: String(auditMarker),
    });
  }
  return {
    projectRoot,
    planDir,
    manifest: items,
    // manifest parse health — the runner fails loudly on a corrupt/non-JSONL manifest
    // before running content checks that would otherwise blind-pass over 0 entries.
    manifestMalformed,
    manifestLines: mh.lines,
    manifestParsed: mh.parsed,
    plan: {
      loaded,                                   // targets in impact.md ## Method Targets
      loadedDeclared,                           // false only when the section is ABSENT (legacy shape)
      invalidLoaded,                            // loaded tokens that aren't real target ids (#1)
      invalidTechStackTargets,                  // tech-stack.md type: tokens that aren't real target ids (#1)
      required,                                 // transitive closure(loaded.requires)
      excluded,
      missing,                                  // the inclusion gap (#1)
      features: [...new Set(items.map((i) => i.feature).filter(Boolean))],
      // the entities THIS plan works with — derived from its own manifest refs
      // (not a global scan). The plan knows what it touched.
      entities: touchedEntities,
      // every declared operation (crud + lifecycle) of the touched entities, for the
      // operation-coverage check. See expectedOperations above.
      expectedOperations,
      // every business-rule file in the app (project-wide, not plan-touched-entity-
      // scoped — see expectedBusinessRules above), for the rule-violation-coverage
      // check: each rule needs its own .feature scenario exercising its violation.
      expectedBusinessRules,
      // design-system realization: declared tokens/components implemented in this
      // plan's generated web source, and no stack contradiction. See designSystem above.
      designSystem,
      // did the plan produce ANY Gherkin `.feature` files? "true"/"false" (string, so
      // an IS check reads cleanly). A plan with API/UI behaviour and no .feature at
      // all fails gherkin-traceability coarsely before the per-op detail.
      featuresExist: String(featureItems.length > 0),
      // persistenceInScope / hasSchemaDump (persistence-integration-test.md): gates the
      // live-schema-dump-vs-model ASK check. hasMigration (this plan produced db/
      // migrations/*.sql) is the practical signal — a design-only plan with no
      // migration has nothing to dump yet.
      persistenceInScope: String(hasMigration),
      hasSchemaDump: String((() => {
        try { return fs.readdirSync(path.join(projectRoot, planDir, 'evidence', 'logs')).some((f) => /^schema-dump\./i.test(f)); }
        catch { return false; }
      })()),
      // server capability slices — one entry per src/server/<slice>/ (excluding
      // shared/), each with per-layer booleans + the files, for slice-completeness
      // and layering checks. Manifest-derived (never a filesystem scan).
      serverSlices,
      // server files importing another slice's internals — a boundary violation.
      crossSliceImports,
      // versioned migrations, one entry per stem (NNN_name), with hasUp/hasDown for
      // the reversible-migration check. Manifest-derived.
      migrations,
      // coverage: reportPresent / linePct / minCoverage / meetsFloor / hasCosplay — the
      // threshold check (does the produced report meet the policy floor, and is it real
      // instrumentation not a synthetic placeholder), distinct from the mandated-output
      // gate (does the report exist).
      coverage,
      // testEvidence: did a machine-readable test report actually get produced on disk
      // (evidence/logs/test.log, reports/**/cucumber.json|results.json|junit*.xml|
      // index.html), and does evidence.md actually reference it — vs. a plan asserting
      // "tests passed" in prose with nothing to back it (captured-command-output.md).
      testEvidence,
      // runApp: for a plan loading run-app, did build (build.log) and the full
      // regression suite (test.log) actually run and pass — proven by a real captured
      // log showing a clean exit, not a declared manifest entry alone (build-and-regression.md).
      runApp,
      // installDev: does db-connect.log prove a REAL database round-trip (a connection +
      // trivial query), or is it missing / empty / just printing instructions — the
      // "readiness script prints a to-do list instead of connecting" cheat (install-dev.md).
      installDev,
      // correlationId: does the request boundary read an INBOUND X-Correlation-Id header,
      // so a test's id (X-Correlation-Id: TestID+RunId) can appear in the server log —
      // making "the test actually reached the server" provable (test-correlation-id.md).
      correlationId,
      // concatenated server-source text for plan-level presence scans — a searchable
      // blob, unlike $plan.trace (objects).
      serverSourceBlob,
      // USE-site blobs: serviceBlob = Service-layer source (where a transaction must be
      // USED, not just defined); logCallBlob = only the lines that are logger calls /
      // .child() context (where the required labels must APPEAR, not just be typed).
      serviceBlob,
      logCallBlob,
      // WB start contract: the produced package.json content + whether the plan
      // produces a runnable app at all (gates the mde:start check).
      packageJson,
      producesRunnableApp,
      // design-stage: one entry per entity spec the plan produced, with the
      // design-completeness flags the implementation checks depend on (Storage View,
      // operations, permitted roles). See designEntities above. Used by the BA-stage
      // checks (operations declared, roles defined) — which correctly run at BA.
      designEntities,
      // Storage-View completeness is a DESIGN-stage concern (the physical model is
      // filled during design, NOT business analysis). So it is populated ONLY when the
      // persistence-design target is loaded — empty on a BA plan, so the check does not
      // wrongly blame BA for a missing Storage View. Attribution lands on the design plan.
      storageDesignEntities: loaded.includes('persistence-design') ? designEntities : [],
      // per touched entity: does the migration realize its Storage-View table and all
      // declared columns? (schema-from-entities). tableExists / allColumnsPresent /
      // missingColumns are decided model-side against the migration SQL.
      expectedTables,
      // all manifest items, for scope=plan checks that scan across artifacts
      // (e.g. a cross-cutting trace-header check: EVERY $t IN $plan.trace ...).
      trace: items,
      // expected outputs: for each LOADED target, the artifacts its ## Outputs
      // mandates (perEach expanded from specs). The verifier checks the manifest
      // produced each. Authoritative source = the target + specs, never the plan.
      expectedOutputs,
      // all artifact paths — lets a scope=plan check assert the plan PRODUCED
      // something under a mandated location: `$plan.paths CONTAINS "docs/"`
      // (CONTAINS on a list = any element contains the substring). Used to catch
      // a loaded target that mandates artifacts but produced none.
      paths: items.map((i) => i.path),
    },
    // operations: the standard-root-operations contract (required tech-stack.md
    // Operations Map entries + every mapped npm-script operation), each with an
    // `ok` flag folding in required-but-unmapped / missing-script / no-op-placeholder.
    // Empty when there's no src/ yet (nothing generated to hold the contract).
    techStack: { targets: universe, operations: techStackOperations(projectRoot) },
    app: buildAppModel(projectRoot),
    spec: {
      // lazy, keyed — reads one spec file on access, cached
      entity: lazyKeyed((name) => parseEntitySpec(projectRoot, name)),
      page: lazyKeyed((name) => parsePageSpec(projectRoot, name)),
    },
  };
}
