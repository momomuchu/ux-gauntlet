#!/usr/bin/env node
// ci-diff.mjs --baseline <file> --current <file>
// Exits nonzero on a NEW severity-4 finding, an escalation to severity 4, or a BLOCKED run.
// BLOCKED is RECOMPUTED from the per-persona terminal states via the shared pure core (ADR-0002,
// D-DET) — never short-circuited on a stored run_status field, so gate and ci-diff cannot disagree
// about whether the same run is BLOCKED (B1, quality-phase fix 2026-07-09).
import { readFileSync, existsSync } from 'node:fs';
import { deriveBlocked } from './core/run-status.mjs';
import { assertLane } from './core/lane.mjs';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const basePath = arg('--baseline');
const curPath = arg('--current');
if (!basePath || !curPath || !existsSync(basePath) || !existsSync(curPath)) {
  process.stderr.write('usage: ci-diff.mjs --baseline <file> --current <file>\n');
  process.exit(2);
}

const base = JSON.parse(readFileSync(basePath, 'utf8'));
const cur = JSON.parse(readFileSync(curPath, 'utf8'));

// Lane trust boundary (R2 item 18): ci-diff is the PERSONA-lane merge gate and previously had NO lane
// discriminator at all — a structural bundle fed in produced a misleading "may be LLM/persona
// stochasticity — re-run" caveat on a deterministic axe finding. Fail closed via the shared helper, on
// both the baseline and the current bundle, exactly like the three sibling gates (S22).
for (const [label, b] of [['baseline', base], ['current', cur]]) {
  const laneErr = assertLane(b, 'persona');
  if (laneErr) {
    process.stderr.write(`REFUSE: ${label} bundle is not persona-lane — ${laneErr}\n`);
    process.exit(1);
  }
}

const key = (f) => f.finding_id || f.id;
const baseByKey = new Map();
for (const f of base.findings || []) baseByKey.set(key(f), f);

const blocking = [];
for (const f of cur.findings || []) {
  const b = baseByKey.get(key(f));
  if (f.severity === 4) {
    if (!b) blocking.push({ f, reason: 'new severity-4 finding (catastrophe)' });
    else if (typeof b.severity === 'number' && b.severity < 4) blocking.push({ f, reason: 'severity escalated to 4 (catastrophe) for an already-known finding_id' });
  }
}

// Recompute BLOCKED from the persona terminal states — do NOT trust a stored run_status field.
const blockedRun = deriveBlocked(Array.isArray(cur.personas) ? cur.personas : null);

if (blocking.length === 0 && !blockedRun) {
  process.stdout.write('ci-diff: clean — no new/escalated severity-4 finding, run not BLOCKED\n');
  process.exit(0);
}

if (blocking.length > 0) {
  for (const { f, reason } of blocking) {
    const tier = typeof f.convergence_tier === 'number' ? f.convergence_tier : (f.personas_flagging || []).length;
    process.stderr.write(`BLOCK: ${reason}: ${key(f)} — convergence_tier ${tier}\n`);
  }
  process.stderr.write('caveat: results carry rerun-instability; a single red CI run may be LLM/persona stochasticity — manually re-run the gauntlet before treating it as a confirmed regression.\n');
}
if (blockedRun) {
  process.stderr.write('BLOCK: current run recomputes to run_status BLOCKED (near-total persona failure), independent of severity-4 diff content (F101/D-DET)\n');
}
process.exit(1);
