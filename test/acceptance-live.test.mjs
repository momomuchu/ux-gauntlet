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
import { spawn, execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, mkdirSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';

const PORT = 4337;
const BASE = `http://localhost:${PORT}`;
let server = null;
let ownedServer = false; // did WE spawn it? (ownership — never kill a pre-existing process, R2 items 12/20)

// Real HTTP status of a route (not mere TCP reachability): curl prints the code, 000/non-zero on failure.
function httpStatus(url) {
  const r = spawnSync('curl', ['-s', '-o', '/dev/null', '-m', '2', '-w', '%{http_code}', url], { encoding: 'utf8' });
  return r.status === 0 ? parseInt((r.stdout || '').trim(), 10) || 0 : 0;
}
// Quick TCP probe for a pre-existing listener on the port (ownership pre-flight).
function portInUse(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: '127.0.0.1' });
    sock.setTimeout(600);
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
    sock.once('error', () => resolve(false));
  });
}

before(async () => {
  // Ownership pre-flight (R2 items 12/20): if a process already holds the port, do NOT spawn our own and
  // do NOT kill it in after(). Still assert it serves a real 200 on an actual app route, else fail LOUD —
  // a decoy/stray server must not silently produce product-shaped failures.
  if (await portInUse(PORT)) {
    if (httpStatus(`${BASE}/signup`) !== 200) {
      throw new Error(`port ${PORT} is already occupied by a process that does not serve HTTP 200 on /signup — refusing to run the live suite against an unknown pre-existing server (ownership + readiness guard, R2 item 20)`);
    }
    ownedServer = false;
    return;
  }
  server = spawn('node', ['examples/staging-demo/server.mjs', String(PORT)], { stdio: 'ignore' });
  ownedServer = true;
  let spawnError = null;
  server.once('error', (e) => { spawnError = e; });
  // Readiness ASSERTION (R2 item 12): poll until a REAL 200 on an actual route, with a hard timeout that
  // THROWS — never proceed on unverified reachability. Also bail if the child exits early.
  const deadline = Date.now() + 15000;
  let ready = false;
  while (Date.now() < deadline) {
    if (spawnError) throw new Error(`failed to spawn staging server: ${spawnError.message}`);
    if (server.exitCode !== null) throw new Error(`staging server exited early (code ${server.exitCode}) before becoming ready`);
    if (httpStatus(`${BASE}/signup`) === 200) { ready = true; break; }
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) {
    try { server.kill('SIGKILL'); } catch { /* already gone */ }
    throw new Error(`staging server never returned HTTP 200 on ${BASE}/signup within 15s — readiness assertion failed (R2 item 12), refusing to run a flaky green`);
  }
});

// Reap OUR child unconditionally (even if a test threw); never kill an unowned pre-existing server.
after(() => {
  if (ownedServer && server) {
    try { server.kill('SIGKILL'); } catch { /* already gone */ }
    server = null;
  }
});

// spawnSync so BOTH stdout and stderr are captured on EVERY exit path — the prior execFileSync form
// discarded stderr on success (masking diagnostics) and on a JSON-parse crash surfaced only "Unexpected
// end of JSON input" with no reason (R2 item 13). stderr is now always available to assert on.
const run = (args) => {
  const r = spawnSync('node', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
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

test('LIVE persona-LLM residual: a realistic NO-target_element_identifier ledger degrades LOUDLY, never fabricates convergence (R2 items 2/14/17)', () => {
  // The named, previously-untested residual: crawl.mjs emits ZERO selector/tei data, so a real LLM
  // persona routinely omits target_element_identifier. The prior clusterKey fell back to
  // (heuristic_tag, step) ALONE, so two independent personas whose tei-less findings shared only
  // tag+step FALSE-MERGED into one convergence_tier-2 finding — fabricated cross-persona agreement.
  // This test feeds that exact realistic shape and asserts the pipeline (a) keeps them SEPARATE at
  // tier 1, (b) flags them low-confidence, (c) never leaks an internal key into the public tei field,
  // and (d) says so LOUDLY on stderr instead of silently reporting convergence.
  const dir = mkdtempSync(join(tmpdir(), 'uxg-notei-'));
  const mkTrace = (persona) => ({ persona, base: BASE, steps: [
    { step: 1, label: 'open the landing page', url: `${BASE}/`, title: 'Cloudly' },
    { step: 2, label: 'click the signup CTA', url: `${BASE}/signup`, title: 'Sign up' },
  ], run_status: 'completed', task_completed: true });
  for (const p of ['p1', 'p2']) {
    mkdirSync(join(dir, p), { recursive: true });
    writeFileSync(join(dir, p, 'trace.json'), JSON.stringify(mkTrace(p)));
    // exactly what a real persona subagent produces: NO target_element_identifier, identical tag+step.
    const led = { persona: p, run_status: 'completed', findings: [
      { friction_name: `${p} confusion`, friction_type: 'walkthrough_failure', step: 1, heuristic_tag: 'match-system-real-world', severity: 3, severity_factors: { frequency: 'x', impact: 'y', persistence: 'z' }, evidence: [{ type: 'screenshot', path: `${p}.png` }], narrative: 'the wording did not match what I expected' },
    ] };
    writeFileSync(join(dir, p, 'ledger.json'), JSON.stringify(led));
  }
  const out = run(['scripts/assemble-run.mjs', dir, 'p1', 'p2']);
  const bundle = JSON.parse(out.stdout);
  assert.equal(bundle.findings.length, 2, 'two tei-less findings from two personas must NOT false-merge into one convergence_tier-2 finding');
  for (const f of bundle.findings) {
    assert.equal(f.convergence_tier, 1, 'each ungrounded (no-tei) finding stays convergence_tier 1 — no fabricated cross-persona convergence');
    assert.equal(f.confidence, 'ungrounded-no-target-element', 'each tei-less finding is flagged low-confidence/ungrounded');
    assert.ok(f.target_element_identifier == null, 'the internal cluster key is NEVER leaked into the public target_element_identifier field (R2 item 16)');
    assert.ok(!/^fid-[0-9a-f]{16}$/.test(f.finding_id), 'a tei-less finding does not receive a hex F165 finding_id it cannot back with a real target_element_identifier');
  }
  assert.match(out.stderr, /UNGROUNDED-FINDINGS|ungrounded/i, 'the pipeline degrades LOUDLY — it names the ungrounded findings on stderr rather than silently fabricating convergence (persona-LLM residual made loud)');
});
