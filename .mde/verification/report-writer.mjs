// report-writer.mjs — write the full Markdown verification report: summary + every
// capability's check (text, scope, subjects covered, PASS/FAIL + findings) + the
// built-in plan gates. The auditable "what did verification check and find"
// artifact — passes included, not just failures.

import fs from 'fs';
import path from 'path';
import { capStatus, anchorSlug, refLink, groupKey } from './format-helpers.mjs';

export function writeReport(dest, { projectRoot, planDir, model, report, unchecked, complaints, ran, showUnchecked }) {
  const out = [];
  const now = new Date().toISOString();
  const fails = complaints.filter((c) => c.kind !== 'ask');
  const asks = complaints.filter((c) => c.kind === 'ask');
  out.push(`# Verification report`);
  out.push(``);
  out.push(`- **plan:** ${planDir}`);
  out.push(`- **project:** ${projectRoot}`);
  out.push(`- **generated:** ${now}`);
  out.push(`- **result:** ${fails.length ? `❌ ${groupKey(fails).size} issue(s) across ${fails.length} instance(s)` : '✅ clean'}`
    + `${asks.length ? ` · ${groupKey(asks).size} to confirm (ASK)` : ''}`);
  out.push(`- **checks evaluated:** ${ran}`);
  out.push(`- **loaded targets:** ${model.plan.loaded.join(', ') || '(none)'}`);
  out.push(`- **manifest:** ${model.manifestParsed}/${model.manifestLines} JSONL entries`);
  if (showUnchecked) {
    out.push(`- **unchecked capabilities:** ${(unchecked || []).length} relevant capability(ies) have no automated check (prose-only — rest on the AI/review pass)`);
  }
  out.push(``);

  // Table of contents. Capability sections repeat (a capability may have several check
  // blocks), so each gets a unique numbered anchor id (`cap-N-<slug>`) that its heading
  // carries too, keeping the links stable.
  out.push(`## Contents`);
  out.push(``);
  out.push(`- [Gates](#gates)`);
  out.push(`- [Capability checks](#capability-checks)`);
  report.forEach((r, i) => {
    // Same sentence in the TOC as the section heading (common report syntax).
    out.push(`  - [${i + 1}. ${capStatus(r)}](#cap-${i}-${anchorSlug(r.capability)})`);
  });
  if (showUnchecked) out.push(`- [Unchecked capabilities](#unchecked-capabilities-prose-only--no-automated-gate)`);
  out.push(``);

  // Built-in plan gates
  out.push(`## Gates`);
  out.push(``);
  const gateRow = (name, ok, detail) => `| ${name} | ${ok ? '✅' : '❌'} | ${detail} |`;
  out.push(`| Gate | Result | Detail |`);
  out.push(`|---|---|---|`);
  const gate1Ok = model.plan.missing.length === 0 && model.plan.invalidLoaded.length === 0;
  const gate1Detail = [
    model.plan.invalidLoaded.length ? `invalid: ${model.plan.invalidLoaded.join(', ')}` : '',
    model.plan.missing.length ? `missing: ${model.plan.missing.join(', ')}` : '',
  ].filter(Boolean).join(' · ') || 'all required targets loaded/excused';
  out.push(gateRow('1 — target inclusion', gate1Ok, gate1Detail));
  const moFails = fails.filter((c) => /mandated output/.test(c.message || ''));
  out.push(gateRow('2 — coverage / mandated output', moFails.length === 0,
    moFails.length ? `${moFails.length} required output(s) missing` : `${model.plan.expectedOutputs.length} mandated outputs present`));
  const artFails = fails.filter((c) => c.capability === 'artifact');
  out.push(gateRow('3 — artifact exists', artFails.length === 0,
    artFails.length ? `${artFails.length} missing on disk` : 'all manifest entries resolve to files'));
  out.push(``);

  // Gate 1 detail — LIST each required target that is neither loaded nor excused
  // (the actionable "what"). model.plan.missing holds the target ids.
  if (model.plan.missing.length) {
    out.push(`**Required targets missing (Gate 1):**`);
    out.push(``);
    for (const t of model.plan.missing) {
      out.push(`- ❌ **${t}** — required (a loaded target depends on it) but not loaded and not excused in \`scope.md ## Excluded targets\``);
    }
    out.push(``);
  }

  // Gate 2 detail — LIST the missing required outputs (the actionable "what", not just
  // a count). Each names its owning target and the path, as a clickable ref.
  if (moFails.length) {
    out.push(`**Required outputs missing (Gate 2):**`);
    out.push(``);
    for (const f of moFails) {
      const what = (f.message.match(/mandated output '([^']+)'/) || [])[1] || f.message;
      out.push(`- ❌ **${f.capability}** — \`${what}\` not produced${refLink(f.ref)}`);
    }
    out.push(``);
  }
  if (artFails.length) {
    out.push(`**Manifest entries with no file on disk (Gate 3):**`);
    out.push(``);
    for (const f of artFails) out.push(`- ❌ ${f.message}${refLink(f.ref)}`);
    out.push(``);
  }

  // Per-capability checks (the quality gate, #4) — every check, passes included.
  out.push(`## Capability checks`);
  out.push(``);
  report.forEach((r, i) => {
    const n = i + 1;
    out.push(`<a id="cap-${i}-${anchorSlug(r.capability)}"></a>`);
    // Heading = the common-syntax sentence (says what is lacking).
    out.push(`### ${n}. ${capStatus(r)}`);
    // Sub-line: the capability it came from (clickable) + scope.
    const capHref = r.capabilityFile ? `../.mde/${r.capabilityFile}` : null;
    const cap = capHref ? `[${r.capability}](${capHref})` : r.capability;
    out.push(`*from: ${cap} · scope: ${r.scope}*`);
    out.push('');
    // WHAT this checks — plain language (the capability's own check question), so the
    // reader sees intent, not DSL. The raw check definition is collapsed below.
    if (r.what) out.push(`**Checks:** ${r.what}`);
    out.push('');
    out.push('<details><summary>check definition</summary>');
    out.push('');
    out.push('```');
    out.push(r.text);
    out.push('```');
    out.push('</details>');
    if (r.findings.length) {
      for (const f of r.findings) out.push(`- ❌ ${f.message}${refLink(f.ref)}`);
    }
    out.push(`\n[↑ Contents](#contents)\n`);
  });

  // Unchecked capabilities — relevant to a loaded target but prose-only. Off by
  // default (noise in the main report); shown only with --unchecked. These rest on the
  // AI semantic pass (7.4) / review, not a deterministic gate.
  if (showUnchecked) {
    out.push(`## Unchecked capabilities (prose-only — no automated gate)`);
    out.push(``);
    if (!(unchecked || []).length) {
      out.push(`_None — every relevant capability has at least one automated check._`);
    } else {
      out.push(`These capabilities are relevant to the loaded targets but carry no \`check\` block.`);
      out.push(`They are verified only by the AI semantic review / \`mde review app\`, not a gate:`);
      out.push(``);
      out.push(`| Capability | Impacts |`);
      out.push(`|---|---|`);
      for (const u of unchecked.sort((a, b) => a.capability.localeCompare(b.capability))) {
        out.push(`| ${u.capability} | ${u.impacts.join(', ')} |`);
      }
    }
    out.push('');
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out.join('\n'));
}

// writeSystemReport — the scope=system report (mde review app --app-wide): whole-app
// completeness questions with no owning plan. Deliberately separate from writeReport
// (above), which is shaped around $plan.* gates/coverage that don't exist here — every
// record is one ASK/FAIL per capability, no plan, no manifest, no target-inclusion gates.
export function writeSystemReport(dest, { projectRoot, report, complaints, ran }) {
  const out = [];
  const now = new Date().toISOString();
  const fails = complaints.filter((c) => c.kind !== 'ask');
  const asks = complaints.filter((c) => c.kind === 'ask');
  out.push(`# System-wide verification report (scope=system)`);
  out.push(``);
  out.push(`- **project:** ${projectRoot}`);
  out.push(`- **generated:** ${now}`);
  out.push(`- **result:** ${fails.length ? `❌ ${groupKey(fails).size} issue(s)` : '✅ clean'}`
    + `${asks.length ? ` · ${groupKey(asks).size} to confirm (ASK)` : ''}`);
  out.push(`- **checks evaluated:** ${ran}`);
  out.push(``);
  out.push(`Whole-app completeness questions with no single owning plan (e.g. "does every `
    + `entity have a Maintenance panel somewhere") — only meaningful app-wide, so they run `
    + `here, not at \`evaluate\`/\`go\`. Each check's own \`WHEN\` guard (if present) decides `
    + `whether its question is even ready to ask yet (e.g. before a coverage report exists).`);
  out.push(``);

  if (!report.length) {
    out.push(`_No \`scope=system\` check blocks found._`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, out.join('\n'));
    return;
  }

  report.forEach((r, i) => {
    out.push(`<a id="sys-${i}-${anchorSlug(r.capability)}"></a>`);
    const hasFail = r.findings.some((f) => f.kind !== 'ask');
    const hasAsk = r.findings.some((f) => f.kind === 'ask');
    const status = !r.guardOk ? '⏸️ not yet ready'
      : hasFail ? '❌ findings' : hasAsk ? '❓ to confirm' : '✅ clean';
    out.push(`### ${i + 1}. ${r.capability} — ${status}`);
    const capHref = r.capabilityFile ? `../.mde/${r.capabilityFile}` : null;
    out.push(`*from: ${capHref ? `[${r.capability}](${capHref})` : r.capability} · scope: system*`);
    out.push('');
    if (!r.guardOk) {
      out.push(`_Guard condition not met — this check's question is not applicable yet._`);
    } else if (r.findings.length) {
      for (const f of r.findings) {
        out.push(`- ${f.kind === 'ask' ? '❓' : '❌'} ${f.message}${refLink(f.ref)}`);
      }
    } else {
      out.push(`_No findings._`);
    }
    out.push('');
    out.push('<details><summary>check definition</summary>');
    out.push('');
    out.push('```');
    out.push(r.text);
    out.push('```');
    out.push('</details>');
    out.push('');
  });

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out.join('\n'));
}
