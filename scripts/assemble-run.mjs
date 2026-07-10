// assemble-run.mjs — the orchestrator MERGE step (F32/F45/F46/F17). Takes the per-persona ledgers,
// GROUNDS each finding against that persona's own trace.json, clusters cross-persona findings by their
// STRUCTURAL identity (F45), sets convergence_tier = number of distinct personas that flagged the
// clustered issue, assigns the deterministic finding_id via the pure core, derives the run-level
// run_status, and writes a gate-ready findings bundle. When run with --write it persists findings.json
// and enforces the run through report-gate.mjs (the WTP/forbidden-claim gate is a REAL pipeline step —
// not a silent pre-scrub), persisting the file ONLY after the gate passes (R2 item 21).
//
// Usage:
//   node scripts/assemble-run.mjs <runDir> <persona1> <persona2> ...            > findings.json
//   node scripts/assemble-run.mjs --write <runDir> <persona1> <persona2> ...    (writes + gates)
import { readFileSync, writeFileSync, existsSync, unlinkSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { findingId, normalizeTei } from './core/identity.mjs';
import { deriveBlocked } from './core/run-status.mjs';
import { forbiddenClaims } from './core/claims.mjs';

const argv = process.argv.slice(2);
const writeMode = argv.includes('--write');
const positional = argv.filter((a) => !a.startsWith('--'));
const [runDir, ...personas] = positional;
if (!runDir || personas.length === 0) {
  process.stderr.write('usage: assemble-run.mjs [--write] <runDir> <persona1> <persona2> ...\n');
  process.exit(2);
}

// ------------------------------------------------------------------------------------------------
// STRUCTURAL clustering (R2 items 2/7/11/14). Two findings merge iff they share the FULL F45 3-tuple
//   (heuristic_tag, step, normalized target_element_identifier).
// The prior build dropped heuristic_tag from the tei-present branch (R2 item 7 OVER-merge: a sev-1
// contrast finding and an unrelated sev-4 finding on the same element collapsed into one) and did not
// collapse internal whitespace (R2 item 11 UNDER-merge: "signup  button" != "signup button"). Both are
// fixed by keying on the ONE canonical normalizeTei() (core/identity.mjs) plus heuristic_tag. A finding
// with NO element identifier is UNGROUNDED: it is given a UNIQUE key so it can never false-merge across
// personas (R2 item 2 — it stays convergence_tier 1) and is flagged low-confidence. NO narrative text is
// read for clustering, and the internal cluster key is NEVER written into the public
// target_element_identifier field (R2 item 16).

// ------------------------------------------------------------------------------------------------
// TRACE GROUNDING (R2 items 3/4/5/8). Before a finding enters a cluster it must be grounded against the
// SAME persona's captured trace.json:
//   (1) FAIL-CLOSED on a MISSING/empty trace — a persona with no trace can ground NOTHING; its findings
//       are dropped and it is counted as a non-floor (crashed) persona so deriveBlocked catches the
//       aggregate (item 3/5). The prior code returned true here (fail-OPEN), letting fabricated findings
//       ship at convergence_tier 3.
//   (2) the cited step must actually exist in the trace (item 4);
//   (3) a page-prefixed identifier ("<page>:<element>") must refer to a route the persona ACTUALLY
//       visited — the grounded route set is DERIVED FROM THE TRACE (visited URL path segments + the
//       cited step's own label/route), NOT a hardcoded name->path allowlist (item 8: the old 6-route
//       PAGE_PATH table dropped genuinely-visited pages like /settings and misparsed tier-1 selector
//       identifiers such as data-testid:cta-signup). Known SELECTOR-STRATEGY prefixes (data-testid,
//       aria-label, css, ...) are not page names and are never route-grounded.
const pathOf = (u) => { try { return new URL(u).pathname; } catch { return String(u ?? ''); } };
const pageOf = (tei) => { const m = /^([a-z0-9][a-z0-9-]*):/i.exec(String(tei || '')); return m ? m[1].toLowerCase() : null; };
// Selector-strategy prefixes are element-addressing schemes, NOT page names — never treated as a route
// to ground (prevents the item-8 false drop of a canonical data-testid:... tier-1 identifier).
const SELECTOR_STRATEGIES = new Set([
  'data-testid', 'data-test', 'testid', 'aria-label', 'aria', 'aria-labelledby', 'role', 'id', 'css',
  'xpath', 'text', 'name', 'class', 'placeholder', 'label', 'selector', 'title', 'alt', 'href',
]);
const labelWords = (s) => new Set(String((s && s.label) || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));

function traceIndex(tr) {
  const stepByNum = new Map();
  const visitedSegments = new Set();
  for (const s of (tr.steps || [])) {
    stepByNum.set(s.step, s);
    for (const seg of pathOf(s.url).split('/').filter(Boolean)) visitedSegments.add(seg.toLowerCase());
  }
  return { stepByNum, visitedSegments };
}

const traces = {};
for (const p of personas) {
  const tp = join(runDir, p, 'trace.json');
  traces[p] = existsSync(tp) ? JSON.parse(readFileSync(tp, 'utf8')) : null;
}
const traceIdx = {};
const traceMissing = new Set();
for (const p of personas) {
  const tr = traces[p];
  if (!tr || !Array.isArray(tr.steps) || tr.steps.length === 0) traceMissing.add(p);
  else traceIdx[p] = traceIndex(tr);
}

const groundLog = [];
function grounded(f, persona) {
  if (traceMissing.has(persona)) {
    return { ok: false, reason: `no usable trace.json for persona "${persona}" — the finding is ungroundable; FAIL-CLOSED drop (ungrounded-no-trace, R2 item 3)` };
  }
  const idx = traceIdx[persona];
  if (typeof f.step === 'number' && !idx.stepByNum.has(f.step)) {
    return { ok: false, reason: `cited step ${f.step} is not present in trace.json (ungrounded-step, B4)` };
  }
  const page = pageOf(f.target_element_identifier);
  if (page && !SELECTOR_STRATEGIES.has(page)) {
    const step = typeof f.step === 'number' ? idx.stepByNum.get(f.step) : null;
    const inLabel = step ? labelWords(step).has(page) : false;
    const stepSegs = step ? new Set(pathOf(step.url).split('/').filter(Boolean).map((x) => x.toLowerCase())) : new Set();
    const isVisited = idx.visitedSegments.has(page) || inLabel || stepSegs.has(page);
    if (!isVisited) {
      return { ok: false, reason: `cites page "${page}" but no route the persona actually visited corresponds to it (ungrounded-route, B4/B5; grounded set derived from the trace, not a hardcoded allowlist)` };
    }
  }
  return { ok: true };
}

const norm = (v) => (typeof v === 'number' ? String(v) : (v || ''));

const clusters = new Map();
const personaStatus = [];
let ungroundedCounter = 0;
let ungroundedTeiCount = 0;
for (const p of personas) {
  const led = JSON.parse(readFileSync(join(runDir, p, 'ledger.json'), 'utf8'));
  // R2 item 5: a trace-less persona is reflected as non-floor (crashed) so the pure deriveBlocked() can
  // catch the aggregate "too few grounded personas" case, regardless of what the ledger self-reports.
  const status = traceMissing.has(p) ? 'crashed' : (led.run_status || 'completed');
  personaStatus.push({ name: p, run_status: status });
  for (const f of led.findings) {
    const g = grounded(f, p);
    if (!g.ok) { groundLog.push(`DROPPED-UNGROUNDED ${p} "${f.friction_name}" — ${g.reason}`); continue; }
    const normed = normalizeTei(f.target_element_identifier);
    let key, hasTei;
    if (normed) {
      key = `tei|${f.heuristic_tag}|${f.step}|${normed}`; // full F45 3-tuple (heuristic_tag kept, item 7)
      hasTei = true;
    } else {
      // UNGROUNDED (no element identifier): UNIQUE key => never false-merges (item 2), stays tier-1.
      ungroundedCounter++; ungroundedTeiCount++;
      key = `ungrounded|${p}|${f.step}|${f.heuristic_tag}|${f.friction_name}|${ungroundedCounter}`;
      hasTei = false;
    }
    if (!clusters.has(key)) clusters.set(key, { key, findings: [], personas: new Set(), hasTei });
    const c = clusters.get(key);
    c.findings.push({ ...f, persona: p });
    c.personas.add(p);
  }
}

const findings = [...clusters.values()].map((c) => {
  // representative = highest-severity flag of this issue
  const rep = c.findings.slice().sort((a, b) => b.severity - a.severity)[0];
  const step = rep.step;
  const rawTei = (rep.target_element_identifier != null && String(rep.target_element_identifier).trim() !== '')
    ? rep.target_element_identifier : null;
  const evidence = [...new Map(c.findings.flatMap((f) => (f.evidence || []).map((e) => [e.path, e]))).values()];
  const out = {
    friction_name: rep.friction_name,
    friction_type: rep.friction_type,
    step,
    heuristic_tag: rep.heuristic_tag,
    personas_flagging: [...c.personas],
    convergence_tier: c.personas.size,
    severity: Math.max(...c.findings.map((f) => f.severity)),
    severity_factors: {
      frequency: norm(rep.severity_factors?.frequency),
      impact: norm(rep.severity_factors?.impact),
      persistence: norm(rep.severity_factors?.persistence),
    },
    market_impact: c.findings.some((f) => f.market_impact),
    evidence,
    // WTP/forbidden claims are NOT silently scrubbed here (B3/M2). The narrative ships verbatim; any
    // forbidden claim is SURFACED below and enforced by report-gate.mjs as a real pipeline step.
    narrative: rep.narrative,
    persona_voices: c.findings.map((f) => ({ persona: f.persona, note: f.narrative })),
  };
  if (c.hasTei && rawTei) {
    // Element-anchored finding: the stable identifier + its deterministic F165 hash.
    out.target_element_identifier = rawTei;
    out.finding_id = findingId(rep.heuristic_tag, step, rawTei);
  } else {
    // UNGROUNDED finding: NEVER leak the internal cluster key into the public tei field (item 16) —
    // omit the field entirely. Use a NON-hex finding_id so report-gate does not try (and fail) the
    // F165 tei recompute, and flag the finding low-confidence so consumers see it is ungrounded.
    out.finding_id = 'ungrounded-' + createHash('sha256').update(c.key).digest('hex').slice(0, 16);
    out.confidence = 'ungrounded-no-target-element';
  }
  return out;
}).sort((a, b) => b.convergence_tier - a.convergence_tier || b.severity - a.severity);

const runStatus = deriveBlocked(personaStatus) ? 'BLOCKED' : 'completed';
const bundle = {
  run: {
    target_url: 'http://localhost:4319',
    target_name: 'Cloudly (staging-demo)',
    task_list: 'examples/tasks.json',
    env: 'local',
    personas: personas,
    started: runDir.split('/').pop(),
  },
  run_status: runStatus,
  personas: personaStatus,
  findings,
};

// --- surface (never silently rewrite) grounding drops, the ungrounded-residual, + any forbidden claim -
for (const line of groundLog) process.stderr.write(line + '\n');
if (traceMissing.size) {
  process.stderr.write(`UNGROUNDED-RUN: ${traceMissing.size} persona(s) had NO usable trace.json (${[...traceMissing].join(', ')}) — ALL their findings were DROPPED as ungroundable and each is counted as non-floor (crashed); convergence is unreliable, run may derive BLOCKED (R2 items 3/5)\n`);
}
if (ungroundedTeiCount) {
  // The persona-LLM residual made LOUD (not silent): a real un-annotated LLM run degrades visibly.
  process.stderr.write(`UNGROUNDED-FINDINGS: ${ungroundedTeiCount} finding(s) lack a target_element_identifier — kept tier-1, flagged confidence "ungrounded-no-target-element", and NEVER merged into cross-persona convergence; any convergence signal that would have required these to merge is UNRELIABLE (R2 items 2/14, persona-LLM residual)\n`);
}
const wtpLog = [];
for (const f of findings) {
  for (const reason of forbiddenClaims(f.narrative)) wtpLog.push(`WTP/FORBIDDEN ${f.finding_id} "${f.friction_name}" — ${reason} (surfaced, will fail report-gate)`);
}
for (const line of wtpLog) process.stderr.write(line + '\n');

if (!writeMode) {
  process.stdout.write(JSON.stringify(bundle, null, 2));
  process.exit(0);
}

// --- --write: gate BEFORE persist (R2 item 21). Write to a temp file, run it through report-gate.mjs,
// and RENAME to findings.json ONLY if the gate passes — a violating bundle is never left on disk.
const outPath = join(runDir, 'findings.json');
const tmpPath = outPath + '.tmp';
writeFileSync(tmpPath, JSON.stringify(bundle, null, 2) + '\n');
const gatePath = fileURLToPath(new URL('./report-gate.mjs', import.meta.url));
try {
  const out = execFileSync('node', [gatePath, tmpPath], { encoding: 'utf8' });
  renameSync(tmpPath, outPath);
  process.stdout.write(out);
  process.stderr.write(`assemble-run: wrote ${outPath} (${findings.length} findings, ${groundLog.length} ungrounded dropped) — report-gate PASS, findings.json is gate-clean\n`);
  process.exit(0);
} catch (e) {
  try { if (existsSync(tmpPath)) unlinkSync(tmpPath); } catch { /* best-effort cleanup */ }
  process.stdout.write(e.stdout || '');
  process.stderr.write(e.stderr || '');
  process.stderr.write('assemble-run: report-gate FAILED — NOT persisting findings.json; the pipeline blocks rather than shipping (or leaving on disk) a violating bundle (B3/R2 item 21)\n');
  process.exit(1);
}
