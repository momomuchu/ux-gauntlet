// assemble-run.mjs — the orchestrator MERGE step (F32/F45/F46/F17). Takes the per-persona ledgers,
// GROUNDS each finding against that persona's own trace.json, clusters cross-persona findings by their
// STRUCTURAL identity (F45), sets convergence_tier = number of distinct personas that flagged the
// clustered issue, assigns the deterministic finding_id via the pure core, derives the run-level
// run_status, and writes a gate-ready findings bundle. When run with --write it persists findings.json
// and enforces the run through report-gate.mjs (the WTP/forbidden-claim gate is a REAL pipeline step —
// not a silent pre-scrub).
//
// Usage:
//   node scripts/assemble-run.mjs <runDir> <persona1> <persona2> ...            > findings.json
//   node scripts/assemble-run.mjs --write <runDir> <persona1> <persona2> ...    (writes + gates)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findingId } from './core/identity.mjs';
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
// STRUCTURAL clustering (B1/B2 fix). The prior build clustered on a table of free-text narrative
// regexes (KEY_RULES) — it BOTH under-merged real convergence ("isn't visible" != "not visible") and
// FALSE-merged unrelated frictions that happened to share one word ("probably"). It is replaced by the
// spec's own finding-identity rule (F45): two findings merge iff they share the structural key
//   (heuristic_tag, step, normalized target_element_identifier).
// The target_element_identifier is the DOMINANT axis when present (personas that tag the SAME element
// with two different Nielsen heuristics still converge — that divergence is F104 cause (b), a judgment
// difference about ONE element, not two issues). When no element identifier was emitted the key falls
// back to (heuristic_tag, step). NO narrative text is read for clustering.
const normTei = (t) => (t == null ? '' : String(t)).trim().toLowerCase();
function clusterKey(f) {
  const tei = normTei(f.target_element_identifier);
  if (tei) return `tei|${f.step}|${tei}`;           // element-anchored structural identity (F45)
  return `tag|${f.heuristic_tag}|step${f.step}`;    // fallback when no element identifier is present
}

// ------------------------------------------------------------------------------------------------
// TRACE GROUNDING (B4/B5 fix). Before a finding is allowed into a cluster it must be grounded against
// the SAME persona's captured trace.json: (1) its step must actually exist in the trace, and (2) the
// page/route it is about (derived from the target_element_identifier's "<page>:" prefix) must have been
// visited during that persona's crawl. A finding that quotes a page nobody crawled (the fabricated
// /pricing findings) is DROPPED and never counts toward convergence_tier or ships in the report.
const PAGE_PATH = { landing: '/', nav: '/', signup: '/signup', verify: '/verify', dashboard: '/dashboard', pricing: '/pricing' };
const pageOf = (tei) => { const m = /^([a-z-]+):/.exec(String(tei || '')); return m ? m[1] : null; };
const pathOf = (u) => { try { return new URL(u).pathname; } catch { return u; } };

const traces = {};
for (const p of personas) {
  const tp = join(runDir, p, 'trace.json');
  traces[p] = existsSync(tp) ? JSON.parse(readFileSync(tp, 'utf8')) : null;
}
const groundLog = [];
function grounded(f, persona) {
  const tr = traces[persona];
  if (!tr || !Array.isArray(tr.steps)) return true; // no trace to check against — cannot disprove (kept)
  const steps = new Set(tr.steps.map((s) => s.step));
  if (typeof f.step === 'number' && !steps.has(f.step)) {
    groundLog.push(`DROPPED-UNGROUNDED ${persona} "${f.friction_name}" — cited step ${f.step} is not present in trace.json (ungrounded-step, B4)`);
    return false;
  }
  // A page-prefixed target_element_identifier ("<page>:<element>") must refer to a page the persona
  // ACTUALLY visited. Strict: an UNKNOWN page prefix (one that maps to no known route, e.g. an
  // invented "admin:panel") is ungrounded and dropped — the earlier logic kept unknown pages, which
  // let a hallucinated page slip through (caught by the live e2e test). Only a prefix that both maps
  // to a known route AND was visited in this persona's trace survives.
  const page = pageOf(f.target_element_identifier);
  if (page) {
    const knownPath = PAGE_PATH[page];
    const visited = new Set(tr.steps.map((s) => pathOf(s.url)));
    if (!knownPath || !visited.has(knownPath)) {
      const why = knownPath ? `route ${knownPath} was never visited` : `page "${page}" maps to no known route (likely fabricated)`;
      groundLog.push(`DROPPED-UNGROUNDED ${persona} "${f.friction_name}" — cites page "${page}" but ${why} in this persona's trace (ungrounded-route, B4/B5)`);
      return false;
    }
  }
  return true;
}

const norm = (v) => (typeof v === 'number' ? String(v) : (v || ''));

const clusters = new Map();
const personaStatus = [];
for (const p of personas) {
  const led = JSON.parse(readFileSync(join(runDir, p, 'ledger.json'), 'utf8'));
  personaStatus.push({ name: p, run_status: led.run_status || 'completed' });
  for (const f of led.findings) {
    if (!grounded(f, p)) continue;
    const key = clusterKey(f);
    if (!clusters.has(key)) clusters.set(key, { key, findings: [], personas: new Set() });
    const c = clusters.get(key);
    c.findings.push({ ...f, persona: p });
    c.personas.add(p);
  }
}

const findings = [...clusters.values()].map((c) => {
  // representative = highest-severity flag of this issue
  const rep = c.findings.slice().sort((a, b) => b.severity - a.severity)[0];
  const step = rep.step;
  // The stable target-element identifier for the merged issue: the shared element the personas flagged.
  const tei = rep.target_element_identifier || c.key;
  const fid = findingId(rep.heuristic_tag, step, tei);
  const evidence = [...new Map(c.findings.flatMap((f) => (f.evidence || []).map((e) => [e.path, e]))).values()];
  return {
    finding_id: fid,
    friction_name: rep.friction_name,
    friction_type: rep.friction_type,
    step,
    target_element_identifier: tei,
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

// --- surface (never silently rewrite) the grounding drops + any forbidden claim -------------------
for (const line of groundLog) process.stderr.write(line + '\n');
const wtpLog = [];
for (const f of findings) {
  for (const reason of forbiddenClaims(f.narrative)) wtpLog.push(`WTP/FORBIDDEN ${f.finding_id} "${f.friction_name}" — ${reason} (surfaced, will fail report-gate)`);
}
for (const line of wtpLog) process.stderr.write(line + '\n');

if (!writeMode) {
  process.stdout.write(JSON.stringify(bundle, null, 2));
  process.exit(0);
}

// --- --write: persist findings.json and ENFORCE it through report-gate.mjs (B3 wiring) ------------
const outPath = join(runDir, 'findings.json');
writeFileSync(outPath, JSON.stringify(bundle, null, 2) + '\n');
process.stderr.write(`assemble-run: wrote ${outPath} (${findings.length} findings, ${groundLog.length} ungrounded dropped)\n`);
const gatePath = fileURLToPath(new URL('./report-gate.mjs', import.meta.url));
try {
  const out = execFileSync('node', [gatePath, outPath], { encoding: 'utf8' });
  process.stdout.write(out);
  process.stderr.write('assemble-run: report-gate PASS — findings.json is gate-clean\n');
  process.exit(0);
} catch (e) {
  process.stdout.write(e.stdout || '');
  process.stderr.write(e.stderr || '');
  process.stderr.write('assemble-run: report-gate FAILED — pipeline blocks rather than shipping a violating bundle (B3)\n');
  process.exit(1);
}
