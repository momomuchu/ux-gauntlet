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
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// R3 M16/M10: NO hardcoded shared port. Each run spawns its own staging server on an OS-allocated
// ephemeral port (server.mjs prints "port=<N>" on its ready line), captured below. This structurally
// removes the port-4337 TOCTOU/EADDRINUSE race and the cross-run contention that made this suite flaky
// AND made the earlier "non-flaky" commit claim false — there is no shared port to contend on.
const SERVER_SRC = 'examples/staging-demo/server.mjs';
let server = null;
let BASE = null;

// Real HTTP status of a route (not mere TCP reachability): curl prints the code, 000/non-zero on failure.
function httpStatus(url) {
  const r = spawnSync('curl', ['-s', '-o', '/dev/null', '-m', '2', '-w', '%{http_code}', url], { encoding: 'utf8' });
  return r.status === 0 ? parseInt((r.stdout || '').trim(), 10) || 0 : 0;
}
function httpBody(url) {
  const r = spawnSync('curl', ['-s', '-m', '2', url], { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout || '').trim() : '';
}

// R3 MI2: reap OUR owned child on ANY exit path — normal after(), a thrown test, OR a signal (SIGINT/
// SIGTERM). The prior suite trapped neither signal, so SIGKILL-ing the parent mid-run orphaned the child
// server (confirmed LISTENing via lsof). Register once at module load.
function reap() {
  if (server) { try { server.kill('SIGKILL'); } catch { /* already gone */ } server = null; }
}
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { reap(); process.exit(130); });
}
process.on('exit', reap);

before(async () => {
  // Always spawn OUR OWN server on an ephemeral port (M16). Capture the bound port from stdout, then
  // (R2 item 12) assert a REAL 200 on an actual route within a hard, throwing deadline, AND (M4) verify
  // the running process reflects the CURRENT on-disk server source via /__source-hash before trusting it —
  // never run the suite against a stale build silently serving old HTML.
  const diskHash = createHash('sha256').update(readFileSync(SERVER_SRC)).digest('hex');
  server = spawn('node', [SERVER_SRC, '0'], { stdio: ['ignore', 'pipe', 'ignore'] });
  let spawnError = null;
  server.once('error', (e) => { spawnError = e; });
  // Parse the bound port from the ready line "... port=<N> ...".
  let boundPort = null;
  const readyDeadline = Date.now() + 15000;
  server.stdout.setEncoding('utf8');
  server.stdout.on('data', (chunk) => { const m = /port=(\d+)/.exec(chunk); if (m) boundPort = Number(m[1]); });
  while (boundPort == null && Date.now() < readyDeadline) {
    if (spawnError) throw new Error(`failed to spawn staging server: ${spawnError.message}`);
    if (server.exitCode !== null) throw new Error(`staging server exited early (code ${server.exitCode}) before printing its bound port`);
    await new Promise((r) => setTimeout(r, 100));
  }
  if (boundPort == null) { reap(); throw new Error('staging server never printed its bound port within 15s (readiness assertion failed) — refusing a flaky green'); }
  BASE = `http://localhost:${boundPort}`;
  // Readiness: poll a real 200 on /signup with a throwing deadline.
  let ready = false;
  while (Date.now() < readyDeadline) {
    if (server.exitCode !== null) throw new Error(`staging server exited early (code ${server.exitCode}) before becoming ready`);
    if (httpStatus(`${BASE}/signup`) === 200) { ready = true; break; }
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!ready) { reap(); throw new Error(`staging server never returned HTTP 200 on ${BASE}/signup within 15s — readiness assertion failed (R2 item 12)`); }
  // Freshness (M4): the running process must serve the hash of the CURRENT disk source.
  const servedHash = httpBody(`${BASE}/__source-hash`);
  if (servedHash !== diskHash) { reap(); throw new Error(`staging server /__source-hash (${servedHash.slice(0, 12)}) does not match the on-disk ${SERVER_SRC} hash (${diskHash.slice(0, 12)}) — the running process does not reflect current disk code, refusing to run against a stale build (M4)`); }
});

// Reap OUR child unconditionally (even if a test threw).
after(() => { reap(); });

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
  // a ledger with one grounded finding citing a REAL VISITED URL segment (/signup, step 2) + one
  // ungrounded (a page never in the trace). R3 M7: grounding is now purely URL-path-segment derived —
  // the grounded finding cites "signup:cta" ("signup" is a visited path segment), NOT a page name that
  // only appears as a free-text label word (the removed inLabel fallback).
  const led = { persona: 'p1', run_status: 'completed', findings: [
    { friction_name: 'cta hidden', friction_type: 'walkthrough_failure', step: 2, heuristic_tag: 'aesthetic-minimalist-design', severity: 3, severity_factors: { frequency: 'x', impact: 'y', persistence: 'z' }, evidence: [{ type: 'screenshot', path: 'a.png' }], narrative: 'cta below fold', target_element_identifier: 'signup:cta' },
    { friction_name: 'invented admin page', friction_type: 'ambiguity_resolution', step: 1, heuristic_tag: 'match-system-real-world', severity: 2, severity_factors: { frequency: 'x', impact: 'y', persistence: 'z' }, evidence: [{ type: 'dom', path: 'b.html' }], narrative: 'the admin panel is confusing', target_element_identifier: 'admin:panel' },
  ] };
  writeFileSync(join(dir, 'p1', 'ledger.json'), JSON.stringify(led));
  const out = run(['scripts/assemble-run.mjs', join(dir), 'p1']);
  const bundle = JSON.parse(out.stdout);
  const names = bundle.findings.map((f) => f.friction_name);
  assert.ok(names.includes('cta hidden'), 'the grounded /signup finding (cites a visited URL path segment) ships');
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

test('LIVE persona-LLM residual through --write: the realistic no-tei shape COMPLETES + gates + persists (R3 B1/M6)', () => {
  // R3 M6: the prior live suite exercised the tei-less residual ONLY through the read-only (bare) path,
  // so the round-3 BLOCKER — report-gate's F45/F46 dedup CRASHING assemble-run --write on exactly this
  // shape — was never caught by the very test built to cover it. This test runs the SAME realistic shape
  // through the persisting --write path and asserts it exits 0, gates clean, and writes findings.json.
  const dir = mkdtempSync(join(tmpdir(), 'uxg-notei-write-'));
  const mkTrace = (persona) => ({ persona, base: BASE, steps: [
    { step: 1, label: 'open the landing page', url: `${BASE}/`, title: 'Cloudly' },
    { step: 2, label: 'click the signup CTA', url: `${BASE}/signup`, title: 'Sign up' },
  ], run_status: 'completed', task_completed: true });
  for (const p of ['p1', 'p2', 'p3']) {
    mkdirSync(join(dir, p), { recursive: true });
    writeFileSync(join(dir, p, 'trace.json'), JSON.stringify(mkTrace(p)));
    const led = { persona: p, run_status: 'completed', findings: [
      { friction_name: `${p} copy confusion`, friction_type: 'walkthrough_failure', step: 1, heuristic_tag: 'match-system-real-world', severity: 3, severity_factors: { frequency: 'x', impact: 'y', persistence: 'z' }, evidence: [{ type: 'screenshot', path: `${p}-1.png` }], narrative: 'the wording did not match what I expected' },
      { friction_name: `${p} button confusion`, friction_type: 'walkthrough_failure', step: 2, heuristic_tag: 'match-system-real-world', severity: 2, severity_factors: { frequency: 'x', impact: 'y', persistence: 'z' }, evidence: [{ type: 'screenshot', path: `${p}-2.png` }], narrative: 'the button label was unclear' },
    ] };
    writeFileSync(join(dir, p, 'ledger.json'), JSON.stringify(led));
  }
  const r = run(['scripts/assemble-run.mjs', '--write', dir, 'p1', 'p2', 'p3']);
  assert.equal(r.code, 0, `assemble-run --write must exit 0 on the tei-less residual shape, not crash (R3 B1). stderr:\n${r.stderr}`);
  assert.match(r.stdout, /gate: PASS/, 'the persisted bundle passes report-gate');
  assert.ok(existsSync(join(dir, 'findings.json')), 'findings.json is persisted (the --write deliverable actually lands on disk)');
  const bundle = JSON.parse(readFileSync(join(dir, 'findings.json'), 'utf8'));
  assert.equal(bundle.findings.length, 6, 'all 6 tei-less findings survive as SEPARATE tier-1 entries — no false-merge, no crash');
});
