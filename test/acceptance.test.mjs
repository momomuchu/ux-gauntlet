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
