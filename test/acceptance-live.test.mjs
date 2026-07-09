// LIVE-EXECUTION acceptance test — the anti-theater layer for the hand-built browser code.
// The frozen 0001/0002 suites are fixture/CLI-level: they never drive a real browser, which is
// exactly the gap that let the main-content-text bug (and the Goodhart filename-gate) ship. This
// suite spins up a REAL staging server and drives the REAL scripts (structural-scan, crawl, gates)
// against it via subprocess, asserting on genuinely-observed output. It exists to make the
// un-frozen-tested browser code FALSIFIABLE. Run: node --test test/acceptance-live.test.mjs
// (needs Playwright chromium + axe-core installed; slower than the fixture suites — hence a
//  separate `npm run test:live`, not the default `npm test`).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4337;
const BASE = `http://localhost:${PORT}`;
let server;

before(async () => {
  server = spawn('node', ['examples/staging-demo/server.mjs', String(PORT)], { stdio: 'ignore' });
  // wait for reachability
  for (let i = 0; i < 40; i++) {
    try { execFileSync('curl', ['-s', '-o', '/dev/null', '-m', '1', BASE]); break; }
    catch { await new Promise((r) => setTimeout(r, 150)); }
  }
});
after(() => { if (server) server.kill(); });

const run = (args) => {
  try { return { code: 0, stdout: execFileSync('node', args, { stdio: 'pipe' }).toString(), stderr: '' }; }
  catch (e) { return { code: e.status ?? 1, stdout: e.stdout?.toString() ?? '', stderr: e.stderr?.toString() ?? '' }; }
};
const scan = (mainContent, path = '/signup') =>
  JSON.parse(run(['scripts/structural-scan.mjs', '--url', BASE, '--path', path, '--main-content', mainContent, '--continue-name', 'Continue']).stdout);

test('LIVE structural-scan emits a schema-valid structural bundle with pinned axe + real findings', () => {
  const d = scan('Create your account');
  assert.equal(d.lane, 'structural', 'bundle carries the structural lane discriminator');
  assert.equal(d.metadata.axe_version, '4.12.1', 'axe-core version is pinned in metadata (S3)');
  const codes = d.findings.map((f) => f.code);
  assert.ok(codes.includes('axe:label'), 'real axe run flags the unlabeled password input on the staging /signup (critical)');
  assert.ok(codes.includes('axe:color-contrast'), 'real axe run flags the low-contrast nav links');
});

test('LIVE main-content as a TEXT string resolves — the exact regression that shipped (M6)', () => {
  // The bug: the grown scan dropped the spike's text-substring fallback, so --main-content "Create
  // your account" (text, not a CSS selector) produced a FALSE main-content-missing sev-4 that reached
  // the founder-facing report. Lock it: a text declaration that IS present must NOT be reported missing.
  const d = scan('Create your account');
  const mc = d.findings.filter((f) => (f.code || '').includes('main-content-missing'));
  assert.equal(mc.length, 0, 'a text-string main-content declaration that is present must not be a main-content-missing finding');
});

test('LIVE main-content as a CSS selector also resolves', () => {
  const d = scan('main');
  const mc = d.findings.filter((f) => (f.code || '').includes('main-content-missing'));
  assert.equal(mc.length, 0, 'a valid CSS selector for the main landmark resolves, not missing');
});

test('LIVE main-content that is genuinely absent IS reported missing (teeth, not just permissive)', () => {
  const d = scan('this-text-is-nowhere-on-the-page-xyzzy');
  const mc = d.findings.filter((f) => (f.code || '').includes('main-content-missing'));
  assert.equal(mc.length, 1, 'a genuinely-absent declared main content must be flagged missing (negative control)');
  assert.equal(mc[0].severity, 4, 'main-content-missing is severity 4 (S12)');
});

test('LIVE structural-scan output passes the integrity gate and blocks CI on the critical label finding', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uxg-live-'));
  const out = join(dir, 'scan.json');
  execFileSync('node', ['scripts/structural-scan.mjs', '--url', BASE, '--path', '/signup', '--main-content', 'main', '--continue-name', 'Continue'], { stdio: ['ignore', openSync(out, 'w'), 'ignore'] });
  const gate = run(['scripts/structural-report-gate.mjs', '--check-fixture', out]);
  assert.equal(gate.code, 0, 'a well-formed real scan bundle passes the integrity gate');
  const ci = run(['scripts/structural-ci-diff.mjs', '--check', out]);
  assert.notEqual(ci.code, 0, 'the critical-impact unlabeled-input finding blocks CI (deterministic, raw impact)');
});

test('LIVE crawl drives a real browser: captures steps, non-empty screenshots, measured action cost', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uxg-crawl-'));
  const r = run(['scripts/crawl.mjs', '--url', BASE, '--tasks', 'examples/tasks.json', '--persona', 'live', '--viewport', '1280x800', '--out', dir]);
  assert.equal(r.code, 0, 'crawl completes');
  const trace = JSON.parse(readFileSync(join(dir, 'trace.json'), 'utf8'));
  assert.ok(trace.steps.length >= 5, 'the happy-path plus the /pricing grounding visit are captured');
  assert.equal(trace.run_status, 'completed', 'reaches the dashboard on the staging app');
  // real screenshots exist and are non-empty PNGs (not stubbed)
  const shot = join(dir, 'step1.png');
  assert.ok(existsSync(shot) && statSync(shot).size > 1000, 'step screenshots are real, non-empty PNGs');
  // action_cost is MEASURED, not hardcoded: the multi-field signup form step costs > 1
  const formStep = trace.steps.find((s) => /fill/i.test(s.label));
  assert.ok(formStep && formStep.action_cost > 1, 'the multi-field form step records a real >1 action cost, not a hardcoded 1 (M4)');
  // the crawl actually visited /pricing (grounding fix B4/B5)
  assert.ok(trace.steps.some((s) => /pricing/.test(s.url)), 'the crawl visits /pricing so pricing findings can be grounded');
});

test('LIVE end-to-end: crawl trace grounds a persona ledger — an off-trace finding is dropped', () => {
  const dir = mkdtempSync(join(tmpdir(), 'uxg-e2e-'));
  execFileSync('node', ['scripts/crawl.mjs', '--url', BASE, '--tasks', 'examples/tasks.json', '--persona', 'p1', '--viewport', '1280x800', '--out', join(dir, 'p1')]);
  // a ledger with one grounded finding (step 1, landing) + one ungrounded (a page never in the trace)
  const led = { persona: 'p1', run_status: 'completed', findings: [
    { friction_name: 'cta hidden', friction_type: 'walkthrough_failure', step: 1, heuristic_tag: 'aesthetic-minimalist-design', severity: 3, severity_factors: { frequency: 'x', impact: 'y', persistence: 'z' }, evidence: [{ type: 'screenshot', path: 'a.png' }], narrative: 'cta below fold', target_element_identifier: 'landing:cta' },
    { friction_name: 'invented admin page', friction_type: 'ambiguity_resolution', step: 1, heuristic_tag: 'match-system-real-world', severity: 2, severity_factors: { frequency: 'x', impact: 'y', persistence: 'z' }, evidence: [{ type: 'dom', path: 'b.html' }], narrative: 'the admin panel is confusing', target_element_identifier: 'admin:panel' },
  ] };
  writeFileSync(join(dir, 'p1', 'ledger.json'), JSON.stringify(led));
  const out = run(['scripts/assemble-run.mjs', join(dir), 'p1']);
  const bundle = JSON.parse(out.stdout);
  const names = bundle.findings.map((f) => f.friction_name);
  assert.ok(names.includes('cta hidden'), 'the grounded landing-page finding ships');
  assert.ok(!names.includes('invented admin page'), 'the ungrounded finding citing a never-crawled admin page is DROPPED (trace grounding, B4/B5)');
});
