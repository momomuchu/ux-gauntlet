// RED acceptance test — ux-gauntlet MVP (spec: docs/specs/0001-ux-gauntlet-mvp.spec.md)
// ATDD lock: references every [CRITICAL] requirement ID. MUST fail until the skill is built.
// CLI contract exercised here is fixed by docs/adr/0001-runner-cli-contract.md (D9) — tests may
// only invoke that interface. Hardened per disjoint review 2026-07-08 (findings 9-17).
// Run: node --test test/acceptance.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (p) => readFileSync(p, 'utf8');
const json = (p) => JSON.parse(read(p));

// Runs a script, returns {code, stderr, stdout}. Never throws.
function run(args) {
  try {
    const stdout = execFileSync('node', args, { stdio: 'pipe' }).toString();
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? '' };
  }
}
const gate = (fixture) => run(['scripts/report-gate.mjs', '--check-fixture', `test/fixtures/${fixture}`]);

const NIELSEN_10 = [
  'visibility-of-system-status', 'match-system-real-world', 'user-control-freedom',
  'consistency-standards', 'error-prevention', 'recognition-rather-than-recall',
  'flexibility-efficiency-of-use', 'aesthetic-minimalist-design',
  'help-users-recognize-recover-errors', 'help-and-documentation',
];

test('F1 F5: persona schema exists and requires the 5 persona fields', () => {
  // Requirement ID: F1, F5
  assert.ok(existsSync('schemas/persona.schema.json'), 'schemas/persona.schema.json missing');
  const s = json('schemas/persona.schema.json');
  for (const f of ['goal', 'success_criteria', 'budget_authority', 'patience_threshold_steps', 'forbidden_claims']) {
    assert.ok(s.required.includes(f), `persona schema must require "${f}"`);
  }
});

test('F6 F7 F8 F36: runner refuses to crawl without a happy-path task list, with a named reason', () => {
  // Requirement ID: F6, F7, F8, F36 (CLI per ADR-0001)
  assert.ok(existsSync('scripts/run-gauntlet.mjs'), 'scripts/run-gauntlet.mjs missing');
  const r = run(['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--headless']);
  assert.equal(r.code, 1, 'refusal is exit 1 per ADR-0001 (not a crash, not usage error)');
  assert.match(r.stderr, /task list/i, 'stderr must name the violated rule: missing task list (review finding #15)');
});

test('F9 F33: a walkthrough "No" with no matching friction instance fails the gate', () => {
  // Requirement ID: F9, F33 — behavior, not SKILL.md prose (review finding #12)
  const r = gate('walkthrough-no-without-friction.json');
  assert.notEqual(r.code, 0, 'a logged "No" answer with no friction instance is a gate violation (F33)');
  assert.match(r.stderr + r.stdout, /walkthrough/i, 'gate output must name the walkthrough consistency rule');
  // The 4-question protocol itself must also be spelled out for the persona subagents:
  assert.ok(existsSync('SKILL.md'), 'SKILL.md missing');
  const s = read('SKILL.md').toLowerCase();
  for (const q of ['right result', 'notice', 'associate', 'progress']) {
    assert.ok(s.includes(q), `SKILL.md must carry walkthrough question keyword "${q}" (F9)`);
  }
});

test('F10 F11 F12 F28 F34: findings schema enforces friction shape; heuristic set is pluggable data (default: Nielsen 10)', () => {
  // Requirement ID: F10, F11, F12, F28, F34
  assert.ok(existsSync('schemas/findings.schema.json'), 'schemas/findings.schema.json missing');
  assert.ok(existsSync('config/heuristics.default.json'), 'config/heuristics.default.json missing (F28: taxonomy-as-data)');
  const hs = json('config/heuristics.default.json');
  const ids = (hs.criteria ?? []).map((c) => c.id ?? c);
  for (const h of NIELSEN_10) assert.ok(ids.includes(h), `default set must contain Nielsen heuristic "${h}" (review finding #16)`);
  assert.equal(ids.length, 10, 'default heuristic set is exactly the Nielsen 10');
  const s = json('schemas/findings.schema.json');
  const finding = s.$defs?.finding ?? s.definitions?.finding;
  assert.ok(finding, 'findings schema must define a finding object');
  assert.ok(finding.required.includes('heuristic_tag'), 'every finding carries exactly one criterion tag (F11)');
  assert.ok(finding.required.includes('friction_name'), 'each friction instance is NAMED (F10)');
  assert.ok(finding.properties.friction_type?.enum?.includes('ambiguity_resolution'), 'ambiguity resolutions are first-class frictions (F34)');
  assert.deepEqual([finding.properties.severity.minimum, finding.properties.severity.maximum], [0, 4], 'severity must be 0-4 (F12)');
  for (const f of ['frequency', 'impact', 'persistence']) {
    assert.ok(JSON.stringify(finding.properties.severity_factors).includes(f), `severity_factors must carry "${f}" (F12)`);
  }
});

test('F14 F15: report gate drops zero-evidence findings', () => {
  // Requirement ID: F14, F15
  const r = gate('finding-no-evidence.json');
  assert.match(r.stdout + r.stderr, /DROPPED/, 'a finding with zero evidence artifacts must be reported as DROPPED');
});

test('F23 F24: gate exits nonzero on schema violation and on an untagged finding', () => {
  // Requirement ID: F23, F24 (review finding #9)
  const untagged = gate('finding-untagged.json');
  assert.notEqual(untagged.code, 0, 'untagged finding must fail the gate (F24)');
  const unknown = gate('finding-unknown-tag.json');
  assert.notEqual(unknown.code, 0, 'tag outside the configured heuristic set must fail the gate (F11/F23)');
  const valid = gate('findings-valid.json');
  assert.equal(valid.code, 0, 'the valid fixture must PASS the gate (negative control)');
});

test('F16 F17 F30 F31 F32: >=3 personas enforced; convergence tier is the verified integer count', () => {
  // Requirement ID: F16, F17 (F30, F31, F32 exercised empirically at build: parallel subagent lanes)
  const s = json('schemas/findings.schema.json');
  const finding = s.$defs?.finding ?? s.definitions?.finding;
  assert.ok(finding.required.includes('convergence_tier'), 'convergence_tier is required per finding (F17)');
  const r = run(['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--tasks', 'test/fixtures/tasks.json', '--personas', 'personas/free-tier-user.yaml', '--headless']);
  assert.equal(r.code, 1, 'a run with fewer than 3 personas must be refused with exit 1 (F16)');
  assert.match(r.stderr, /3 personas|persona/i, 'refusal names the persona-minimum rule');
  // Arithmetic check (review finding #14): tier must equal |personas_flagging|, gate-verified.
  const bad = gate('findings-bad-tier.json');
  assert.notEqual(bad.code, 0, 'convergence_tier != count(personas_flagging) must fail the gate (F17)');
});

test('F18 F19: markdown report is generated FROM the findings data, not a static template', () => {
  // Requirement ID: F18, F19 (review finding #13)
  assert.ok(existsSync('scripts/render-report.mjs'), 'scripts/render-report.mjs missing');
  const md = run(['scripts/render-report.mjs', 'test/fixtures/findings-valid.json']).stdout;
  assert.match(md, /## Findings/, 'renderer emits a findings section');
  assert.match(md, /signup CTA hidden below the fold/, 'fixture friction_name must appear in the rendered report');
  assert.match(md, /vp-team-buyer/, 'fixture persona must appear in the rendered report');
  assert.match(md, /flagged by 2/i, 'convergence bucket derived from integer tier at render time (D10)');
});

test('F20 F21 F22 F35: validity envelope carries the 4 enumerated disclosures; forbidden claims blocked separately', () => {
  // Requirement ID: F20, F21, F22, F35 (review findings #5, #17)
  const md = run(['scripts/render-report.mjs', 'test/fixtures/findings-valid.json']).stdout;
  assert.match(md, /validity envelope/i, 'validity-envelope disclosure section is mandatory (F20)');
  assert.match(md, /not a replacement for real user research/i, 'disclosure (a) enumerated (F35)');
  assert.match(md, /willingness.to.pay/i, 'disclosure (b) enumerated (F35)');
  assert.match(md, /population|% of users/i, 'disclosure (c) enumerated (F35)');
  assert.match(md, /ISO 9241-11/, 'disclosure (d) enumerated (F35)');
  const wtp = gate('finding-wtp-claim.json');
  assert.notEqual(wtp.code, 0, 'gate rejects WTP estimates (F21)');
  const pop = gate('finding-population-claim.json');
  assert.notEqual(pop.code, 0, 'gate rejects population-percentage claims with no WTP vocabulary (F22, independent fixture)');
});

test('F25 F29: persona validator rejects a malformed persona and names the missing field', () => {
  // Requirement ID: F25, F29 (review finding #10)
  assert.ok(existsSync('scripts/validate-persona.mjs'), 'scripts/validate-persona.mjs missing');
  const r = run(['scripts/validate-persona.mjs', 'test/fixtures/persona-missing-patience.yaml']);
  assert.notEqual(r.code, 0, 'persona missing patience_threshold_steps must be rejected (F25)');
  assert.match(r.stderr, /patience_threshold_steps/, 'validator names the missing field');
  for (const p of ['free-tier-user', 'willing-to-pay-user', 'vp-team-buyer']) {
    const ok = run(['scripts/validate-persona.mjs', `personas/${p}.yaml`]);
    assert.equal(ok.code, 0, `shipped default persona ${p} must validate (F2-F4, negative control)`);
  }
});

test('F26: CI mode blocks only on a NEW severity-4 finding vs baseline', () => {
  // Requirement ID: F26 (review finding #11)
  assert.ok(existsSync('scripts/ci-diff.mjs'), 'scripts/ci-diff.mjs missing');
  const same = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-valid.json']);
  assert.equal(same.code, 0, 'identical findings vs baseline must pass (no new catastrophe)');
  const worse = run(['scripts/ci-diff.mjs', '--baseline', 'test/fixtures/findings-valid.json', '--current', 'test/fixtures/findings-new-sev4.json']);
  assert.notEqual(worse.code, 0, 'a NEW severity-4 finding must exit nonzero');
  assert.match(worse.stderr + worse.stdout, /severity.?4|catastrophe/i, 'CI output names the blocking finding class');
});

// --- Unknowns pass 2026-07-08 (docs/research/UNKNOWNS-DELTA.md §2, DR-01..DR-39) ---
// The refusal/safety layer (D11): the tool must refuse, not only discover. Fixtures below encode
// each violation as a run bundle the gate is expected to reject once built; a matching negative
// control proves the gate isn't just failing shut on any input (F45/D12 group additionally proves
// the dedup rule is content-aware, not a blanket rejection).

test('F37 F38: a run configuration with no denylist is rejected; a persona that clicks a denylisted action fails the gate', () => {
  // Requirement ID: F37, F38
  const noDenylist = gate('run-config-no-denylist.json');
  assert.notEqual(noDenylist.code, 0, 'a run config lacking an operator-supplied denylist must be rejected (F37)');
  assert.match(noDenylist.stderr + noDenylist.stdout, /denylist/i, 'gate output names the missing denylist');
  const clicked = gate('denylist-click-violation.json');
  assert.notEqual(clicked.code, 0, 'a denylisted element that was clicked (not aborted) must fail the gate (F38)');
  const aborted = gate('denylist-abort-ok.json');
  assert.equal(aborted.code, 0, 'the same denylisted step correctly aborted must pass the gate (negative control)');
});

test('F39 F40: payment and non-idempotent submit steps executed outside their explicit modes fail the gate', () => {
  // Requirement ID: F39, F40
  const payment = gate('payment-no-testmode.json');
  assert.notEqual(payment.code, 0, 'a payment-submission step executed without run.test_mode=true must fail the gate (F39)');
  assert.match(payment.stderr + payment.stdout, /payment|test.?mode/i, 'gate output names the payment/test-mode rule');
  const submit = gate('nonidempotent-no-fullmode.json');
  assert.notEqual(submit.code, 0, 'a non-idempotent (POST) submit executed without run.full_submission_mode=true must fail the gate (F40)');
});

test('F41 F42: navigation to a robots.txt-disallowed path without an override flag fails the gate', () => {
  // Requirement ID: F41, F42
  const nav = gate('robots-disallowed-nav.json');
  assert.notEqual(nav.code, 0, 'an executed navigation to a robots-disallowed path with no override must fail the gate');
  assert.match(nav.stderr + nav.stdout, /robots/i, 'gate output names the robots.txt rule');
});

test('F43 F44: an unredacted credential-shaped string in captured evidence fails the gate', () => {
  // Requirement ID: F43, F44
  const leak = gate('evidence-secret-leak.json');
  assert.notEqual(leak.code, 0, 'a bearer-token-shaped string surviving in evidence captured_text must fail the gate');
  assert.match(leak.stderr + leak.stdout, /redact|secret|credential/i, 'gate output names the redaction rule');
});

test('F45 F46: two findings sharing the (heuristic tag, step, target) identity but left unmerged fail the gate', () => {
  // Requirement ID: F45, F46
  const dup = gate('findings-duplicate-not-merged.json');
  assert.notEqual(dup.code, 0, 'two findings with an identical (heuristic_tag, step, target_selector) tuple that were not merged into one entry must fail the gate');
  const valid = gate('findings-valid.json');
  assert.equal(valid.code, 0, 'a findings file with no duplicate identity tuples still passes the gate (negative control)');
});

test('F47 F48: a target-app 5xx/network event recorded as a heuristic-tagged friction fails the gate', () => {
  // Requirement ID: F47, F48
  const misfiled = gate('app-error-as-friction.json');
  assert.notEqual(misfiled.code, 0, 'an HTTP-503-caused event tagged as a Nielsen-heuristic friction, and absent from app_errors, must fail the gate');
  assert.match(misfiled.stderr + misfiled.stdout, /app.?error/i, 'gate output names the app-error separation rule');
});

test('F49 F53 F54: a run with a crashed persona must expose run_status BLOCKED and disclose the non-completed count', () => {
  // Requirement ID: F49, F53, F54
  assert.ok(existsSync('schemas/findings.schema.json'), 'schemas/findings.schema.json missing');
  const s = json('schemas/findings.schema.json');
  const findingOrRun = s.$defs ?? s.definitions ?? {};
  assert.ok(JSON.stringify(findingOrRun).includes('run_status'), 'schema must define a run_status concept (F49/F53)');
  const blocked = gate('run-status-blocked-missing-disclosure.json');
  assert.notEqual(blocked.code, 0, 'a BLOCKED run whose validity envelope omits the non-completed-persona count must fail the gate (F54)');
});

test('F50 F51 F52: crossing patience_threshold_steps must abandon the task, log a terminal friction, and set failed-by-patience', () => {
  // Requirement ID: F50, F51, F52
  assert.ok(existsSync('scripts/report-gate.mjs'), 'scripts/report-gate.mjs missing');
  const incomplete = gate('patience-abandon-incomplete.json');
  assert.notEqual(incomplete.code, 0, 'a persona past its patience threshold left in_progress (no abandon, no terminal friction, no failed-by-patience outcome) must fail the gate');
  assert.match(incomplete.stderr + incomplete.stdout, /patience/i, 'gate output names the patience-abandonment rule');
});

test('F55 F56: the ledger must record task_completed and a reason code independent of the friction list', () => {
  // Requirement ID: F55, F56
  assert.ok(existsSync('scripts/report-gate.mjs'), 'scripts/report-gate.mjs missing');
  const missing = gate('ledger-missing-task-completed.json');
  assert.notEqual(missing.code, 0, 'a task-ledger entry with no task_completed boolean must fail the gate');
  assert.match(missing.stderr + missing.stdout, /task_completed/i, 'gate output names the missing field');
});

test('F57 F58: a persona past the runner-level 50-action cap must be force-aborted with its partial ledger emitted', () => {
  // Requirement ID: F57, F58
  const overCap = gate('persona-exceeds-action-cap.json');
  assert.notEqual(overCap.code, 0, 'a persona with action_count > 50 still marked run_status completed (not force-aborted) must fail the gate');
  assert.match(overCap.stderr + overCap.stdout, /action|cap/i, 'gate output names the action-cap rule');
});
