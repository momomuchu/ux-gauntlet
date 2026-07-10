#!/usr/bin/env node
// structural-ci-diff.mjs --check <structural-findings.json>  [| --baseline <a> --current <b>]
// The structural-lane CI merge gate (SPEC 0002 D1). Honors the exhaustive CI-block predicate table:
// it BLOCKS (exit non-zero) whenever (a) a hard defect exists, or (b) the lane could not produce a
// trustworthy verdict for a route (fail-closed); everything else is advisory (recorded, never blocking).
//
// It ALSO validates its own trust boundary before any route predicate (S57): axe_version pin (S2),
// schema_version (SN2), lane discriminator (S22) — so a pipeline wired to the diff gate alone cannot
// merge-evaluate an unpinned/misrouted bundle. And it refuses cross-environment comparison (S44) when
// axe_version / browser_version / ruleset_tags / render_environment_id differ from a baseline.
// All BLOCK predicates read RAW fields (impact / code / run_status), never the derived severity integer.
import { readFileSync, existsSync } from 'node:fs';
import { FAIL_CLOSED_STATUS, findingBlocksCi, isIncomplete, isValidImpact } from './core/structural-severity.mjs';
import { assertLane } from './core/lane.mjs';

const PINNED_AXE = '4.12.1';
const SCHEMA_VERSION = 1;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const single = arg('--check') || process.argv.slice(2).find((a) => !a.startsWith('--') && existsSync(a));
if (!single || !existsSync(single)) {
  process.stderr.write('usage: structural-ci-diff.mjs --check <structural-findings.json>\n');
  process.exit(2);
}

let bundle;
try {
  bundle = JSON.parse(readFileSync(single, 'utf8'));
} catch (e) {
  process.stderr.write(`structural-ci-diff: cannot parse ${single}: ${e.message}\n`);
  process.exit(2);
}

const meta = bundle.metadata ?? {};
const run = bundle.run ?? {};
const runStatus = run.run_status ?? bundle.run_status;
const findings = Array.isArray(bundle.findings) ? bundle.findings : [];
const blocks = [];
const block = (s) => blocks.push(s);

// ---- S57: own trust boundary, before any route-level predicate ----------------------------------
if (meta.axe_version !== PINNED_AXE) block(`REFUSE: metadata.axe_version is "${meta.axe_version}", not the pinned axe-core ${PINNED_AXE} — an unpinned bundle is not merge-evaluable (S57/S2)`);
if (bundle.schema_version == null || bundle.schema_version !== SCHEMA_VERSION) block(`REFUSE: schema_version ${bundle.schema_version} is missing/unsupported (expected ${SCHEMA_VERSION}) (S57/SN2)`);
{ const laneErr = assertLane(bundle, 'structural'); if (laneErr) block(`REFUSE: ${laneErr} — a misrouted bundle is not merge-evaluable (S57/S22)`); }

// ---- S44: cross-environment comparability refusal -------------------------------------------------
if (bundle.baseline || bundle.comparability_note || bundle.comparison_note) {
  const b = bundle.baseline?.metadata ?? {};
  const diffs = [];
  for (const k of ['axe_version', 'browser_version', 'ruleset_tags', 'render_environment_id']) {
    if (k in b && JSON.stringify(b[k]) !== JSON.stringify(meta[k])) diffs.push(k);
  }
  block(`REFUSE: cross-environment comparison is incomparable — refusing to diff two reports whose axe_version / browser_version / ruleset_tags / render_environment_id differ${diffs.length ? ` (${diffs.join(', ')})` : ''} (S44/M7/M19/CR3-M4)`);
}

// ---- run_status (route-level) fail-closed --------------------------------------------------------
if (bundle.refused === true || runStatus === 'refused') block(`BLOCK: run_status refused — the lane could not produce a trustworthy verdict for this route; a route must never go silently unaudited (S37/S54)`);
if (runStatus === 'axe-execution-failed') block('BLOCK: run_status axe-execution-failed — the route was never tested, fail closed (S45/S46)');
if (runStatus === 'axe-execution-degraded') block('BLOCK: run_status axe-execution-degraded — axe silently resolved with zero results on a non-trivial DOM, fail closed (S58/S59)');
if (runStatus === 'settle-timeout') block('BLOCK: run_status settle-timeout — the S1 settle precondition never resolved, the route was never tested (S47/S48)');

// ---- finding source / code BLOCK predicates (raw fields only) -------------------------------------
for (const f of findings) {
  // C (R2 item 1): fail CLOSED on a non-canonical impact for an axe/incomplete finding, mirroring
  // structural-report-gate's isValidImpact check. findingBlocksCi folds whitespace+case now, but an
  // UNKNOWN/garbage impact ("crtical", "high", "critical!!") must not silently pass as "not critical";
  // the standalone CI-merge gate must reject it rather than treat an unclassifiable impact as clean.
  const isAxe = (f.source ?? '') === 'axe' || (typeof f.code === 'string' && f.code.startsWith('axe:'));
  if ((isAxe || isIncomplete(f)) && f.impact != null && !isValidImpact(f.impact)) {
    block(`BLOCK: axe/incomplete finding ${f.code} carries a non-canonical impact "${f.impact}" — impact must fold to one of critical|serious|moderate|minor; the CI gate fails CLOSED on an unclassifiable impact rather than silently treating it as non-blocking (S60/B6/R2-1)`);
    continue;
  }
  if (!findingBlocksCi(f)) continue;
  if (isIncomplete(f)) {
    block(`BLOCK: an axe incomplete finding (${f.code}) has raw underlying impact critical — a reproducible critical a11y gap cannot pass CI clean forever despite its severity-0 display value (S53/D7)`);
  } else if ((f.source ?? '') === 'axe' || (typeof f.code === 'string' && f.code.startsWith('axe:'))) {
    block(`BLOCK: axe violation ${f.code} has raw impact critical — merge blocked (predicate reads raw impact, not the derived severity integer) (S30/S52)`);
  } else {
    block(`BLOCK: non-axe finding code ${f.code} — ${f.code === 'cannot-evaluate-ambiguous-main' ? 'a fail-closed containment result (main count != 1) blocks the merge despite its pinned severity 3' : 'a hard structural defect'} (predicate reads the persisted finding code, not the derived severity) (S38/S56)`);
  }
}

if (blocks.length === 0) {
  process.stdout.write('structural-ci-diff: clean — no critical-impact / hard-defect finding, run completed, no fail-closed route status; merge may proceed (advisory findings, if any, are recorded not blocking)\n');
  process.exit(0);
}
for (const b of blocks) process.stderr.write(b + '\n');
process.stderr.write('caveat: automated a11y catches only ~32-57% of WCAG criteria (vendor-reported); a structural block is necessary-not-sufficient — a clean structural pass is not usable and not good UI.\n');
process.exit(1);
