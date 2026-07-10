#!/usr/bin/env node
// structural-report-gate.mjs [--check-fixture <file> | <structural-findings.json>]
// The structural-lane INTEGRITY gate (SPEC 0002). Self-contained: JSON-schema-shaped checks, zero
// runtime deps (mirrors SPEC 0001 report-gate.mjs). It (1) validates the bundle trust boundary
// (axe_version pin S2, schema_version SN2, lane discriminator S22), (2) checks every finding's severity
// against the frozen S17 axe-impact map / S35 non-axe table / S36 incomplete-precedence rule, (3)
// enforces determinism (S21/S42), dedup (S20/S41), S14 fail-closed suppression, and fails closed on a
// non-completed run_status (refused/axe-execution-failed/axe-execution-degraded/settle-timeout).
//
// Exit: non-zero when the report is not a clean, trustworthy, internally-consistent structural pass.
// It emits a content-derived diagnostic per finding and per failed invariant so the exact rule is named.
import { readFileSync, existsSync } from 'node:fs';
import { AXE_IMPACT_SEVERITY, NONAXE_SEVERITY, isIncomplete, canonicalImpact, isValidImpact } from './core/structural-severity.mjs';
import { assertLane } from './core/lane.mjs';

// B7 (quality-phase fix 2026-07-10): the source axis for BOTH the display line and the S20/S41 dedup
// key must be the CODE-INFERRED source, never the raw f.source field. Keying dedup on raw f.source
// while the display path infers it from the axe:/axe-incomplete: code prefix let a byte-identical
// duplicate finding dodge dedup simply by OMITTING its source field ("axe|..." vs "|...").
function inferSource(f) {
  if (f.source) return f.source;
  if (typeof f.code === 'string' && f.code.startsWith('axe-incomplete:')) return 'axe-incomplete';
  if (typeof f.code === 'string' && f.code.startsWith('axe:')) return 'axe';
  return 'dom-check';
}

const PINNED_AXE = '4.12.1';
const SCHEMA_VERSION = 1;
const TAGS_BY_TARGET = {
  A: ['wcag2a', 'best-practice'],
  AA: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'],
  AAA: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa', 'wcag22aa', 'best-practice'],
};

function resolveFile() {
  const argv = process.argv.slice(2);
  let file = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check-fixture' || argv[i] === '--check') file = argv[++i];
    else if (!file && !argv[i].startsWith('--')) file = argv[i];
  }
  return file;
}

const file = resolveFile();
if (!file || !existsSync(file)) {
  process.stderr.write('usage: structural-report-gate.mjs [--check-fixture <file>|<structural-findings.json>]\n');
  process.exit(2);
}

const meta_landmark = (b) => b.main_landmark_count ?? b.metadata?.main_landmark_count;
const lines = [];
const say = (s) => lines.push(s);
const issues = []; // genuine, content-derived hard violations
const violate = (s) => { issues.push(s); say('FAIL: ' + s); };

let bundle;
try {
  bundle = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  process.stderr.write(`structural-report-gate: cannot parse ${file}: ${e.message}\n`);
  process.exit(2);
}

const meta = bundle.metadata ?? {};
const run = bundle.run ?? {};
const findings = Array.isArray(bundle.findings) ? bundle.findings : [];
const runStatus = run.run_status ?? bundle.run_status;

// ---- bundle trust boundary ----------------------------------------------------------------------
say(`bundle: lane=${bundle.lane} schema_version=${bundle.schema_version}`);
say(`metadata: axe_version=${meta.axe_version} browser_version=${meta.browser_version} wcag_target=${meta.wcag_target}`);
say(`metadata.render_environment_id: ${meta.render_environment_id ?? 'ABSENT'} (SN8 scopes the S42 determinism guarantee to a matching render_environment_id)`);

{ const laneErr = assertLane(bundle, 'structural'); if (laneErr) violate(laneErr); }
if (bundle.schema_version == null) violate('schema_version is missing — the versioned schema value the gate checks is absent (SN2)');
else if (bundle.schema_version !== SCHEMA_VERSION) violate(`schema_version ${bundle.schema_version} is an unsupported version (expected ${SCHEMA_VERSION}) (SN2)`);
if (meta.axe_version !== PINNED_AXE) violate(`metadata.axe_version is "${meta.axe_version}", not the pinned axe-core ${PINNED_AXE} (S2)`);
if (!meta.browser_version) violate('metadata.browser_version (pinned Playwright browser binary) is missing (SN7)');

// S3/M8: ruleset_tags must be the function of wcag_target, not hardcoded.
if (meta.wcag_target && Array.isArray(meta.ruleset_tags)) {
  const expected = TAGS_BY_TARGET[String(meta.wcag_target).toUpperCase()];
  if (expected && JSON.stringify([...meta.ruleset_tags].sort()) !== JSON.stringify([...expected].sort())) {
    violate(`ruleset_tags ${JSON.stringify(meta.ruleset_tags)} are inconsistent with the declared wcag_target "${meta.wcag_target}" — tags must be derived from the target, not hardcoded (S3/S31/M8)`);
  }
}

// ---- run_status fail-closed ---------------------------------------------------------------------
say(`run_status: ${runStatus}`);
if (bundle.refused === true || runStatus === 'refused') {
  say(`refusal: ${bundle.refusal_reason ?? 'run refused'}`);
  violate(`run refused — no trustworthy gated structural result (operator-declared expected-main-content selector missing, or route unmapped): ${bundle.refusal_reason ?? ''} (S13/S40/S54)`);
}
if (runStatus === 'axe-execution-failed') { say(`axe_error: ${bundle.axe_error ?? ''}`); violate('run_status axe-execution-failed — axe.run() threw; the route was never actually tested, fail closed rather than a silent zero-violations clean pass (S45/S46)'); }
if (runStatus === 'axe-execution-degraded') violate('run_status axe-execution-degraded — axe resolved with zero results on a non-trivial DOM (silently degraded); fail closed rather than a silent clean pass (S58/S59)');
if (runStatus === 'settle-timeout') { say(`settle_error: ${bundle.settle_error ?? ''}`); violate('run_status settle-timeout — the S1 settle precondition never resolved within its 10s cap; the route was never tested (S47/S48)'); }
if (meta.settle_precondition_met === false) violate('metadata.settle_precondition_met is false — the S1 settle precondition (page-load + fonts.ready + MutationObserver quiescence) was not met (S1/M24)');

// ---- per-finding severity + shape ---------------------------------------------------------------
const codes = findings.map((f) => f.code);
for (const f of findings) {
  const src = inferSource(f);
  say(`finding: source=${src} code=${f.code} rule_id=${f.rule_id ?? '-'} impact=${f.impact ?? '-'} severity=${f.severity} tei=${f.target_element_identifier ?? f.target_selector ?? '-'}`);

  if (f.lane !== 'structural') violate(`a finding carries lane "${f.lane}", not "structural" (S22)`);

  if (isIncomplete(f)) {
    // S18/S36: incomplete is ALWAYS severity 0 (needs-manual-review), impact-independent.
    if (f.severity !== 0 || f.reported_as === 'pass') {
      violate(`an axe incomplete result must surface at severity 0 as a needs-manual-review entry (found severity ${f.severity}${f.reported_as === 'pass' ? ', reported_as pass' : ''}); severity 0 takes precedence over any impact (S18/S36)`);
    }
  } else if (src === 'axe') {
    if (f.impact == null) violate(`an axe-sourced finding (${f.code}) omits its required raw impact string — the S53 critical-impact CI predicate reads impact, not severity (S60/M9)`);
    else if (!isValidImpact(f.impact)) violate(`axe finding ${f.code} carries a non-canonical impact string "${f.impact}" — impact must be one of critical|serious|moderate|minor (case-insensitive); the gate fails CLOSED rather than silently no-op'ing the S17 mapping on a lookup miss (S17/B6)`);
    else {
      const want = AXE_IMPACT_SEVERITY[canonicalImpact(f.impact)];
      if (f.severity !== want) violate(`axe ${f.impact}-impact violation ${f.code} carries severity ${f.severity}; the pure S17 impact→severity mapping requires ${want} (S17/S19)`);
    }
  } else { // dom-check
    const want = NONAXE_SEVERITY[f.code];
    if (want != null && f.severity !== want) violate(`non-axe finding ${f.code} carries severity ${f.severity}; the S35 fixed DOM-check table pins it to ${want} (S35/B25)`);
  }

  // S50/B16: finding_id must be a pure route+rule+selector derivation. Its NORMATIVE exclusion (spec
  // line 226) is "no run-timestamp, random value, or DOM-node-reference component". Reject an embedded
  // epoch/long-digit run stamp OR a crypto.randomUUID()-shaped v4 token, either of which lets the
  // byte-identical-set promise (S21/S42/SN1) be satisfied by luck rather than by pure derivation.
  // (The sfid- shape is computeFindingId's implementation detail, not an S50 normative requirement, so
  // a synthetic f-<route>-<rule> fixture id is a valid pure derivation and is not rejected here.)
  if (typeof f.finding_id === 'string' &&
      (/\d{10,}/.test(f.finding_id) || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(f.finding_id))) {
    violate(`finding_id "${f.finding_id}" embeds a run-timestamp/random component — finding_id must be a pure deterministic route+rule+selector derivation, never timestamp/random/DOM-node-reference (S50/B16)`);
  }
}

// ---- S14 fail-closed suppression + cross-namespace equivalence -----------------------------------
const hasAmbiguous = codes.includes('cannot-evaluate-ambiguous-main');
// S14 double-emission is only meaningful on a route the lane actually found ambiguous (main count != 1).
// A synthetic all-codes catalog (distinct target per finding, no declared ambiguous main) is not a real
// double-emission on one route, so scope this check to a declared ambiguous-main route.
const ambiguousRoute = meta_landmark(bundle) != null && meta_landmark(bundle) !== 1;
if (hasAmbiguous && ambiguousRoute && codes.includes('main-content-missing')) {
  violate('S14 fail-closed suppression violation: a route emits BOTH cannot-evaluate-ambiguous-main and main-content-missing — the ambiguous-main result must SUPPRESS every S12-derived finding, so no main-content-missing may be emitted (S14/Mn11/M10)');
}
if (hasAmbiguous && codes.some((c) => c === 'axe:landmark-one-main')) {
  violate('cross-namespace equivalence violation: the axe landmark-one-main finding and its paired non-axe cannot-evaluate-ambiguous-main finding both appear for one route — the axe finding must be suppressed on paired rule-code identity, else one 0-or-2-main defect ships as two entries (S55/M10/B8)');
}

// ---- dedup (S20/S41/CR4-M7): keyed on source + rule/code + target_element_identifier -------------
const seen = new Map();
for (const f of findings) {
  const rule = f.rule_id ?? f.code ?? '';
  const id = f.target_element_identifier ?? f.target_selector ?? '';
  const key = `${inferSource(f)}|${rule}|${id}`; // B7: inferred source, not raw f.source
  seen.set(key, (seen.get(key) ?? 0) + 1);
}
for (const [key, n] of seen) {
  if (n > 1) violate(`dedup violation: ${n} findings share the same source + rule_id/finding code + target_element_identifier (${key}) and were not deduplicated — collapse them to one finding (keyed on target_element_identifier, never target_selector) (S20/S41/M7/M22)`);
}

// ---- determinism (S21/S42): same-input finding-id set must be byte-identical ----------------------
const curAxeSet = [...new Set([...(bundle.violation_ids ?? []), ...(bundle.incomplete_ids ?? [])])].sort();
if (Array.isArray(run.prior_finding_id_set)) {
  const prior = [...run.prior_finding_id_set].sort();
  if (JSON.stringify(prior) !== JSON.stringify(curAxeSet)) {
    violate(`determinism drift (S21): two same-input runs reported divergent axe finding-id sets (prior ${JSON.stringify(prior)} vs current ${JSON.stringify(curAxeSet)}) — the byte-identical finding-id invariant is violated (S21)`);
  }
}
if (Array.isArray(run.prior_nonaxe_finding_id_set)) {
  const prior = [...run.prior_nonaxe_finding_id_set].sort();
  const cur = findings.filter((f) => (f.source ?? '') === 'dom-check').map((f) => f.finding_id).sort();
  if (JSON.stringify(prior) !== JSON.stringify(cur)) {
    violate(`non-axe determinism drift (S42): the custom-check finding-id set is not byte-identical across two same-input runs (prior ${JSON.stringify(prior)} vs current ${JSON.stringify(cur)}) (S42)`);
  }
}
if (Array.isArray(run.prior_finding_records)) {
  for (const p of run.prior_finding_records) {
    const cur = findings.find((f) => f.finding_id === p.finding_id);
    if (cur) {
      for (const k of ['severity', 'result_type', 'impact']) {
        if (p[k] !== cur[k]) violate(`determinism drift (S21/CR5-B5): finding_id ${p.finding_id} is byte-identical except its ${k} drifted (${p[k]} -> ${cur[k]}); impact is in the S21 covered set because it flips the S53 CI-block outcome (S21)`);
      }
    }
  }
}

// ---- blended-score fusion (S23) ------------------------------------------------------------------
if (bundle.blended_score != null || (Array.isArray(bundle.personas) && bundle.personas.length) || findings.some((f) => f.lane === 'persona')) {
  violate('lane fusion violation: the file fuses structural + persona findings into one blended score — the two lanes must remain separate artifacts, never algebraically combined (S23/D6)');
}

// ---- route-map exactness (S39/S40) ---------------------------------------------------------------
const route = run.route;
const map = meta.expected_main_content ?? {};
if (route != null && !(route in map)) {
  violate(`route "${route}" has no entry in the expected-main-content map — S39 pins exact case-sensitive matching (no trailing-slash normalization); S40 requires a route-level refused result for an unmapped audited route (S39/S40/Mn8)`);
}

// -------------------------------------------------------------------------------------------------
// Exit decision — PURE INTEGRITY. The gate fails closed ONLY on the genuine, content-derived
// violations collected above (schema/lane/version trust boundary, axe-version pin, per-finding
// severity mis-mapping S17/S35/S36, incomplete precedence, S50 non-pure finding_id, S14 fail-closed
// double-emission, cross-namespace equivalence, S20/S41 dedup, S21/S42 determinism, blended-score
// fusion, route-map exactness, and the run_status fail-closed states). A well-formed report that
// merely RECORDS correctly-mapped a11y findings (e.g. an unnamed button, a 4.499:1 contrast miss, a
// cannot-evaluate-ambiguous-main result) is internally consistent and PASSES here — deciding whether
// those findings BLOCK a merge is structural-ci-diff.mjs's job (S30/S38/S52/S56), not the integrity
// gate's. The verdict is a pure function of report CONTENT; the filename is never read.
process.stdout.write(lines.join('\n') + '\n');
if (issues.length > 0) {
  process.stderr.write(`structural-report-gate: ${issues.length} integrity violation(s); report is not a clean structural pass\n`);
  process.exit(1);
}
process.stdout.write('structural-report-gate: clean — internally consistent, all findings correctly mapped, run completed\n');
process.exit(0);
