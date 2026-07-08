// RED acceptance test — ux-gauntlet MVP (spec: docs/specs/0001-ux-gauntlet-mvp.spec.md)
// ATDD lock: references every [CRITICAL] requirement ID. MUST fail until the skill is built.
// Run: node --test test/acceptance.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (p) => readFileSync(p, 'utf8');
const json = (p) => JSON.parse(read(p));

test('F1 F5: persona schema exists and requires the 5 persona fields', () => {
  // Requirement ID: F1, F5
  assert.ok(existsSync('schemas/persona.schema.json'), 'schemas/persona.schema.json missing');
  const s = json('schemas/persona.schema.json');
  for (const f of ['goal', 'success_criteria', 'budget_authority', 'patience_threshold_steps', 'forbidden_claims']) {
    assert.ok(s.required.includes(f), `persona schema must require "${f}"`);
  }
});

test('F6 F7 F8: runner exists and refuses to crawl without a happy-path task list', () => {
  // Requirement ID: F6, F7, F8
  assert.ok(existsSync('scripts/run-gauntlet.mjs'), 'scripts/run-gauntlet.mjs missing');
  let code = 0;
  try {
    execFileSync('node', ['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--headless'], { stdio: 'pipe' });
  } catch (e) { code = e.status ?? 1; }
  assert.notEqual(code, 0, 'runner must exit nonzero when no task list is supplied (F8)');
});

test('F9: SKILL.md encodes the 4 cognitive-walkthrough questions', () => {
  // Requirement ID: F9
  assert.ok(existsSync('SKILL.md'), 'SKILL.md missing');
  const s = read('SKILL.md').toLowerCase();
  for (const q of ['right result', 'notice', 'associate', 'progress']) {
    assert.ok(s.includes(q), `SKILL.md must carry walkthrough question keyword "${q}"`);
  }
});

test('F10 F11 F12 F28: findings schema enforces friction shape; heuristic set is pluggable data (default: Nielsen 10)', () => {
  // Requirement ID: F10, F11, F12, F28
  assert.ok(existsSync('schemas/findings.schema.json'), 'schemas/findings.schema.json missing');
  assert.ok(existsSync('config/heuristics.default.json'), 'config/heuristics.default.json missing (F28: taxonomy-as-data)');
  const hs = json('config/heuristics.default.json');
  assert.equal(hs.criteria?.length, 10, 'default heuristic set must be the Nielsen 10 list (F28)');
  let badTag = 0;
  try {
    execFileSync('node', ['scripts/report-gate.mjs', '--check-fixture', 'test/fixtures/finding-unknown-tag.json'], { stdio: 'pipe' });
  } catch (e) { badTag = e.status ?? 1; }
  assert.notEqual(badTag, 0, 'gate must reject a tag outside the configured heuristic set (F11)');
  const s = json('schemas/findings.schema.json');
  const finding = s.$defs?.finding ?? s.definitions?.finding;
  assert.ok(finding, 'findings schema must define a finding object');
  assert.ok(finding.required.includes('heuristic_tag'), 'every finding must carry exactly one criterion tag (F11)');
  assert.deepEqual([finding.properties.severity.minimum, finding.properties.severity.maximum], [0, 4], 'severity must be 0-4 (F12)');
  for (const f of ['frequency', 'impact', 'persistence']) {
    assert.ok(finding.properties.severity_factors?.required?.includes(f) || finding.properties.severity_factors?.properties?.[f], `severity_factors must carry "${f}" (F12)`);
  }
  assert.ok(finding.required.includes('friction_name'), 'each friction instance is NAMED (F10)');
});

test('F14 F15: report gate drops zero-evidence findings', () => {
  // Requirement ID: F14, F15
  assert.ok(existsSync('scripts/report-gate.mjs'), 'scripts/report-gate.mjs missing');
  const out = execFileSync('node', ['scripts/report-gate.mjs', '--check-fixture', 'test/fixtures/finding-no-evidence.json'], { stdio: 'pipe' }).toString();
  assert.match(out, /DROPPED/, 'a finding with zero evidence artifacts must be reported as DROPPED');
});

test('F16 F17: runner enforces >=3 personas and findings carry convergence_tier', () => {
  // Requirement ID: F16, F17
  const s = json('schemas/findings.schema.json');
  const finding = s.$defs?.finding ?? s.definitions?.finding;
  assert.ok(finding.required.includes('convergence_tier'), 'convergence_tier is required per finding (F17)');
  let code = 0;
  try {
    execFileSync('node', ['scripts/run-gauntlet.mjs', '--url', 'http://localhost:9', '--tasks', 'test/fixtures/tasks.json', '--personas', 'personas/free-tier-user.yaml', '--headless'], { stdio: 'pipe' });
  } catch (e) { code = e.status ?? 1; }
  assert.notEqual(code, 0, 'a standard run with fewer than 3 personas must be refused (F16)');
});

test('F18 F19: markdown report is generated FROM schema-validated findings.json', () => {
  // Requirement ID: F18, F19
  assert.ok(existsSync('scripts/render-report.mjs'), 'scripts/render-report.mjs missing');
  const md = execFileSync('node', ['scripts/render-report.mjs', 'test/fixtures/findings-valid.json'], { stdio: 'pipe' }).toString();
  assert.match(md, /## Findings/, 'renderer must emit a markdown report from findings.json');
});

test('F20 F21 F22: every report carries the validity envelope and no forbidden claims', () => {
  // Requirement ID: F20, F21, F22
  const md = execFileSync('node', ['scripts/render-report.mjs', 'test/fixtures/findings-valid.json'], { stdio: 'pipe' }).toString();
  assert.match(md, /validity envelope/i, 'validity-envelope disclosure section is mandatory (F20)');
  let code = 0;
  try {
    execFileSync('node', ['scripts/report-gate.mjs', '--check-fixture', 'test/fixtures/finding-wtp-claim.json'], { stdio: 'pipe' });
  } catch (e) { code = e.status ?? 1; }
  assert.notEqual(code, 0, 'gate must reject WTP estimates / population-percentage claims (F21, F22)');
});
