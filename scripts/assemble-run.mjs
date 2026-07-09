// assemble-run.mjs — the orchestrator MERGE step (F32/F45/F46/F17). Takes the per-persona ledgers,
// clusters cross-persona findings into one entry per underlying issue, sets convergence_tier =
// number of distinct personas that flagged it, assigns the deterministic finding_id via the pure
// core, derives the run-level run_status, and writes a gate-ready findings bundle.
// Usage: node scripts/assemble-run.mjs <runDir> <persona1> <persona2> ...  > findings.json
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findingId } from './core/identity.mjs';
import { deriveBlocked } from './core/run-status.mjs';

const [runDir, ...personas] = process.argv.slice(2);

// Map a raw friction to a stable issue key so the same underlying problem merges across personas.
const KEY_RULES = [
  [/below the fold|not visible on load|scroll to get started|dead space/i, 'cta-below-fold'],
  [/log ?in.*(signup|same)|mislabeled|routes to.*signup/i, 'login-mislabeled'],
  [/partner email|marketing.*consent|consent.*marketing|receive product/i, 'forced-marketing-consent'],
  [/work email|personal email.*not accepted|personal.*no company/i, 'work-email-blocks-personal'],
  [/company size/i, 'company-size-ambiguous'],
  [/verification|check your email|6-digit|email.?verif/i, 'email-verification-wall'],
  [/resend|wait 15|recovery|didn.?t get/i, 'verify-recovery-weak'],
  [/plan names?.*(don.?t|nothing)|flexible.*scale|what you get|seats.*storage/i, 'plan-names-opaque'],
  [/cancel anytime after|annual commitment|flexible.*contradict|contradiction/i, 'flexible-annual-contradiction'],
  [/scale.*(sales|talk|hides)|contact sales|self-serve team/i, 'team-pricing-hidden'],
  [/free plan|never confirm|plan\/tier|didn.?t.*start.*trial/i, 'free-plan-unconfirmed'],
  [/no team|single-user|team path|invite|sso|org creation/i, 'no-team-signup-path'],
  [/admin|members, roles|security settings|admin.?surface/i, 'no-admin-surface'],
  [/three-field|3.?field|form.*cost|autofill/i, 'signup-form-cost'],
  [/probably|cute|casual copy|hedge/i, 'unprofessional-copy'],
];
const issueKey = (f) => {
  const hay = `${f.friction_name} ${f.narrative || ''}`;
  for (const [re, k] of KEY_RULES) if (re.test(hay)) return k;
  return `${f.heuristic_tag}@step${f.step}`; // fallback
};

const norm = (v) => typeof v === 'number' ? String(v) : (v || '');
// The validity envelope forbids WTP claims (F21): scrub any price/dollar amount a persona quoted
// from the page out of narrative text before it ships in the report.
const scrubWTP = (s) => (s || '').replace(/[$€£]\s?\d[\d,.]*(\s?\/\s?(seat|user|mo|month|yr|year))?/gi, '[price]');

const clusters = new Map();
const personaStatus = [];
for (const p of personas) {
  const led = JSON.parse(readFileSync(join(runDir, p, 'ledger.json'), 'utf8'));
  personaStatus.push({ name: p, run_status: led.run_status || 'completed' });
  for (const f of led.findings) {
    const key = issueKey(f);
    if (!clusters.has(key)) clusters.set(key, { key, findings: [], personas: new Set() });
    const c = clusters.get(key);
    c.findings.push({ ...f, persona: p });
    c.personas.add(p);
  }
}

const findings = [...clusters.values()].map(c => {
  // representative = highest-severity flag of this issue
  const rep = c.findings.slice().sort((a, b) => b.severity - a.severity)[0];
  const step = rep.step;
  const tei = c.key; // the issue key doubles as the stable target-element identifier for this demo
  const fid = findingId(rep.heuristic_tag, step, tei);
  const evidence = [...new Map(c.findings.flatMap(f => (f.evidence || []).map(e => [e.path, e]))).values()];
  return {
    finding_id: fid,
    friction_name: rep.friction_name,
    friction_type: rep.friction_type,
    step,
    target_element_identifier: tei,
    heuristic_tag: rep.heuristic_tag,
    personas_flagging: [...c.personas],
    convergence_tier: c.personas.size,
    severity: Math.max(...c.findings.map(f => f.severity)),
    severity_factors: {
      frequency: norm(rep.severity_factors?.frequency),
      impact: norm(rep.severity_factors?.impact),
      persistence: norm(rep.severity_factors?.persistence),
    },
    market_impact: c.findings.some(f => f.market_impact),
    evidence,
    narrative: scrubWTP(rep.narrative),
    persona_voices: c.findings.map(f => ({ persona: f.persona, note: scrubWTP(f.narrative) })),
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
process.stdout.write(JSON.stringify(bundle, null, 2));
