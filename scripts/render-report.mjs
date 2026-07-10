#!/usr/bin/env node
// render-report.mjs <findings.json>
// Emits a markdown report derived FROM the findings data (never a static template).
// R3 M11: this is the FOUNDER-FACING artifact, so it applies a gate BEFORE rendering — the prior build
// formatted hand-typed garbage JSON (a 2-field object with a fabricated finding) into an official-looking
// "UX Gauntlet Report" with exit 0 and no warning. It now (1) exact-matches the persona lane discriminator
// (a structural-lane bundle must be rendered by structural-render-report.mjs, not here) and (2) validates
// the bundle against the persona-bundle shape contract (schemas/findings.schema.json required sets), and
// REFUSES to render on any failure. This is a shape/lane gate, not the full report-gate.mjs run.
import { readFileSync, existsSync } from 'node:fs';
import { assertLane } from './core/lane.mjs';
import { validatePersonaBundle } from './core/schema-validate.mjs';

const file = process.argv[2];
if (!file || !existsSync(file)) { process.stderr.write(`usage: render-report.mjs <findings.json>\n`); process.exit(2); }
let bundle;
try { bundle = JSON.parse(readFileSync(file, 'utf8')); }
catch (e) { process.stderr.write(`render-report: REFUSING to render — not parseable JSON: ${e.message}\n`); process.exit(1); }

// --- gate BEFORE rendering (R3 M11): lane discriminator + persona-bundle shape contract ---
const laneErr = assertLane(bundle, 'persona');
if (laneErr) { process.stderr.write(`render-report: REFUSING to render — ${laneErr}\n`); process.exit(1); }
const shapeErrors = validatePersonaBundle(bundle);
if (shapeErrors.length > 0) {
  process.stderr.write('render-report: REFUSING to render — bundle fails the persona-bundle shape contract (schemas/findings.schema.json); a founder-facing report is not emitted for an unvalidated/hand-typed bundle:\n');
  for (const e of shapeErrors) process.stderr.write('  - ' + e + '\n');
  process.exit(1);
}

const findings = Array.isArray(bundle.findings) ? bundle.findings : [];

const out = [];
const w = (s) => out.push(s);

w('# UX Gauntlet Report');
w('');
w(`Target: ${bundle.run && bundle.run.target_url ? bundle.run.target_url : '(unknown)'}`);
w(`Run status: ${bundle.run_status || 'completed'}`);
w('');
w('## Findings');
w('');

const anyNumeric = findings.some((f) => f.severity_factors && ['frequency', 'impact', 'persistence'].every((k) => typeof f.severity_factors[k] === 'number'));
const anyTerminal = findings.some((f) => f.friction_type === 'terminal_friction');

for (const f of findings) {
  const tier = typeof f.convergence_tier === 'number' ? f.convergence_tier : (f.personas_flagging || []).length;
  const personas = (f.personas_flagging || []).join(', ');
  w(`### ${f.friction_name}`);
  w(`- Heuristic: ${f.heuristic_tag}`);
  w(`- Friction type: ${f.friction_type}`);
  w(`- Personas: ${personas}`);
  w(`- Flagged by ${tier} persona${tier === 1 ? '' : 's'}`);
  w(`- Severity: ${f.severity}`);
  if (Array.isArray(f.component_severities) && new Set(f.component_severities).size > 1) {
    w(`- Component severities: [${f.component_severities.join(', ')}]`);
  }
  if (f.confidence_label) w(`- Confidence label: ${f.confidence_label}`);
  if (f.confidence) w(`- Confidence: ${f.confidence}`);
  w('');
}

w('## Validity Envelope');
w('');
w('This report is a simulated cognitive-walkthrough audit and is **not a replacement for real user research**.');
w('- (a) It is not a replacement for real user research.');
w('- (b) It contains no willingness-to-pay estimates; no willingness-to-pay claim is made.');
w('- (c) It makes no population / "% of users" extrapolation; findings do not generalize to a population percentage.');
w('- (d) It makes no ISO 9241-11 usability-compliance claim.');
w('- (e) Severity is not guaranteed comparable or reproducible across runs; it can vary run to run.');
w('- (f) Cognitive walkthroughs are weaker on standardized, well-learned patterns (login, checkout); a lower-confidence label marks such findings.');
w('- (7) Per-persona task-outcome and walkthrough verdicts are simulated judgments with a demonstrated real-user agreement ceiling as low as ~45% ("Lost in Simulation"); treat each atomic "No"/task_completed:false as a simulated judgment, not ground truth.');
w('');
w('Rerun variance: a rerun can produce a **differing**, **non-superset**/**non-subset** finding set; this single run is **not** claimed to be complete.');
w('Convergence tiers can **undercount** real cross-persona agreement for three distinct reasons (F104): (a) apps that lack stable selectors, so the same control resolves to different target-element identifiers across personas; (b) heuristic_tag judgment divergence — two personas legitimately tag the same friction with different Nielsen heuristics; and (c) target-element-identifier identity leakage, where the same element is anchored to different identifiers. In all three, one real convergent issue can split into separate lower-tier findings, so corroboration may be understated.');
w('A new severity-4 finding carries the same **rerun**-instability caveat as any other finding; before treating a single red CI run as a confirmed regression, **manually re-run** the gauntlet to confirm it reproduces.');
w('');
w('Severity attribution: the severity scale and the frequency/impact/persistence bucket **thresholds** are the skill/operator\'s **own rubric** (the spec author\'s own operationalization of NN/g\'s qualitative concept), **not independently NN/g-verified** numbers.');
if (anyNumeric) {
  w('When severity_factors is numeric, F162 persistence is a **deterministic duplicate of frequency** (the persistence bucket equals the frequency bucket for every within-run re-encounter count), not an independently verified NN/g input.');
}
w('Every default-rubric **terminal_friction** finding has frequency=0/persistence=0 by construction, so its **severity is fixed at 1** and it can **never trigger** the F26 severity-4 CI gate even after MAX-based corroboration.');
w('The 3-persona reliability floor derives from NN/g **human usability evaluator** research, extrapolated cross-domain; it is **not independently verified for LLM**-simulated persona-agent evidence.');
w('A convergence_tier==1 finding\'s severity was **assigned by exactly one persona** — a **single rater** rating the NN/g citation itself says not to treat as trustworthy.');
if (anyTerminal) {
  w('For a terminal_friction finding, heuristic_tag identifies the **designated patience-abandonment tag** (a fixed corroboration sentinel), not a diagnostic classification of the underlying interaction failure.');
}
w('');

process.stdout.write(out.join('\n') + '\n');
process.exit(0);
