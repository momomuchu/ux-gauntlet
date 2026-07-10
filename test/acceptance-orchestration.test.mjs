// FROZEN ORCHESTRATION acceptance suite — the durable regression lock for the merge/gate orchestration
// layer (assemble-run, report-gate, ci-diff, structural-*-gate, render-report + the core/* pure modules).
//
// WHY THIS EXISTS (round-3): the fixture suites 0001/0002 lock the persona and structural LANES, but the
// orchestration code that stitches them (grounding, clustering identity, dedup, run_status derivation,
// lane trust boundary, forbidden-claim enforcement, the founder-facing renderer) had NO frozen suite. So
// each invariant fix left an adjacent corner exposed and the MAJOR tail round-tripped the same invariants
// (whitespace/identity normalization, gate-coverage completeness across every invocation mode, cross-gate
// consistency) through unaudited corners every pass — and one round-1 fix (tei-less unique clustering)
// directly CAUSED a round-3 BLOCKER by contradicting report-gate's own dedup. This suite locks those
// orchestration invariants at the helper AND the subprocess boundary so they cannot silently regress.
//
// It is PURE FIXTURE/SUBPROCESS — no browser, fast, deterministic — and runs in the default `npm test`
// alongside 0001/0002 (the browser-driven anti-theater layer stays in the separate `npm run test:live`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { normalizeTei, tupleKey, teiOf, findingId } from '../scripts/core/identity.mjs';
import { floorCount, deriveBlocked, FLOOR_STATES } from '../scripts/core/run-status.mjs';
import { forbiddenClaims, WTP_RE } from '../scripts/core/claims.mjs';
import { isValidImpact, canonicalImpact, findingBlocksCi } from '../scripts/core/structural-severity.mjs';
import { assertLane } from '../scripts/core/lane.mjs';
import { validatePersonaBundle } from '../scripts/core/schema-validate.mjs';

const node = process.execPath;
const run = (args) => {
  const r = spawnSync(node, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
};
const tmp = (p = 'uxg-orch-') => mkdtempSync(join(tmpdir(), p));
const writeJson = (f, o) => writeFileSync(f, JSON.stringify(o, null, 2) + '\n');

// A persona-run directory builder: one trace + ledger per persona.
function makeRun(personaLedgers, { base = 'http://localhost:4319' } = {}) {
  const dir = tmp();
  for (const [persona, spec] of Object.entries(personaLedgers)) {
    mkdirSync(join(dir, persona), { recursive: true });
    const steps = spec.steps ?? [
      { step: 1, label: 'open the landing page', url: `${base}/`, title: 'Home' },
      { step: 2, label: 'click the signup CTA', url: `${base}/signup`, title: 'Sign up' },
    ];
    writeJson(join(dir, persona, 'trace.json'), { persona, base, steps, run_status: 'completed', task_completed: true });
    if (spec.noTrace) {
      // overwrite with an empty/absent trace to exercise the fail-closed path
      writeJson(join(dir, persona, 'trace.json'), { persona, base, steps: [], run_status: 'crashed' });
    }
    writeJson(join(dir, persona, 'ledger.json'), { persona, run_status: spec.run_status ?? 'completed', findings: spec.findings });
  }
  return dir;
}
const f = (o) => ({
  friction_type: 'walkthrough_failure', step: 1, heuristic_tag: 'match-system-real-world', severity: 3,
  severity_factors: { frequency: 'x', impact: 'y', persistence: 'z' },
  evidence: [{ type: 'screenshot', path: 'a.png' }], narrative: 'the wording did not match', ...o,
});

const ASSEMBLE = 'scripts/assemble-run.mjs';
const REPORT_GATE = 'scripts/report-gate.mjs';
const CI_DIFF = 'scripts/ci-diff.mjs';
const SGATE = 'scripts/structural-report-gate.mjs';
const SCI = 'scripts/structural-ci-diff.mjs';
const RENDER = 'scripts/render-report.mjs';
const COMBINED = 'scripts/combined-report.mjs';

// ------------------------------------------------------------------------------------------------
// 1. normalizeTei — the ONE canonical identity normalizer (R2 3/11 + R3 M2)
// ------------------------------------------------------------------------------------------------
test('ORCH normalizeTei: separator-adjacent whitespace, case, and internal runs fold to one canonical form', () => {
  // R3 M2: the exact under-merge the round-3 panel reproduced twice independently.
  assert.equal(normalizeTei('signup:cta'), normalizeTei('signup: cta'), 'a space AFTER the ":" separator folds away');
  assert.equal(normalizeTei('signup:cta'), normalizeTei('signup :cta'), 'a space BEFORE the separator folds away');
  assert.equal(normalizeTei('signup:cta'), normalizeTei('signup : cta'), 'spaces on BOTH sides fold away');
  assert.equal(normalizeTei('SIGNUP: CTA'), normalizeTei('signup:cta'), 'case folds');
  assert.equal(normalizeTei('signup  button'), normalizeTei('signup button'), 'internal whitespace runs collapse');
});
test('ORCH normalizeTei R4 ROOT1: invisible Unicode format/zero-width chars (\\p{Cf}) are stripped so a ZWSP variant clusters identically', () => {
  // R4 ROOT 1 BLOCKER #1: a U+200B zero-width space around the colon defeated clustering AND the
  // report-gate dedup backstop, because JS `\s` / String.trim() do NOT match category-Cf chars. The
  // canonical normalizer must fold every zero-width/format char away so the variant and the plain form
  // are ONE identity.
  assert.equal(normalizeTei('signup​:cta'), 'signup:cta', 'a ZWSP (U+200B) around the colon is stripped');
  assert.equal(normalizeTei('signup​:cta'), normalizeTei('signup:cta'), 'the ZWSP variant and the plain form normalize identically');
  assert.equal(normalizeTei('﻿signup:cta'), 'signup:cta', 'a BOM/ZWNBSP (U+FEFF) prefix is stripped');
  assert.equal(normalizeTei('sign­up:cta'), 'signup:cta', 'a SOFT HYPHEN (U+00AD) inside a word is stripped');
  assert.equal(normalizeTei('signup‍:‌cta'), 'signup:cta', 'ZWJ/ZWNJ around the separator are stripped');
  // tupleKey (report-gate\'s independent dedup identity) inherits the fix — the ZWSP under-merge is
  // caught by the same one function, so both clustering and the gate backstop see one identity.
  assert.equal(
    tupleKey({ heuristic_tag: 'contrast_low', step: 3, target_element_identifier: 'signup​:cta' }),
    tupleKey({ heuristic_tag: 'contrast_low', step: 3, target_element_identifier: 'signup:cta' }),
    'the ZWSP variant produces the SAME F45 identity tuple as the plain form',
  );
});
test('ORCH normalizeTei: does NOT over-merge genuinely different identifiers or destroy internal hyphens, and does NOT strip trailing punctuation (R4 ROOT1 decouple)', () => {
  assert.notEqual(normalizeTei('signup:cta'), normalizeTei('signup:submit'), 'different elements stay distinct');
  assert.notEqual(normalizeTei('signup:cta'), normalizeTei('pricing:cta'), 'different pages stay distinct');
  assert.equal(normalizeTei('data-testid:cta-signup'), 'data-testid:cta-signup', 'hyphens with no surrounding whitespace are preserved verbatim');
  // R4 MAJOR #10/#16: the old trailing-\p{P}\p{S} strip OVER-merged distinct labels. The tei is an opaque
  // identifier: a trailing punctuation mark is a real character difference, no longer folded away.
  assert.notEqual(normalizeTei('Sign up!'), normalizeTei('Sign up'), 'a hero CTA "Sign up!" no longer over-merges with an unrelated "Sign up" link (trailing punctuation is decoupled from identity)');
  assert.notEqual(normalizeTei('data-testid:cta-signup.'), normalizeTei('data-testid:cta-signup'), 'a trailing period is a real difference on the opaque identifier, not silently stripped');
  assert.equal(normalizeTei(null), '', 'a null identifier normalizes to the empty string');
});

// ------------------------------------------------------------------------------------------------
// 2. tei-less findings: unique clustering + gate-side dedup exemption (the round-3 BLOCKER, B1)
// ------------------------------------------------------------------------------------------------
test('ORCH B1: assemble-run --write COMPLETES (exit 0) on a realistic multi-persona NO-tei shape and gates clean', () => {
  // The exact round-3 BLOCKER: 3 personas each flag 2 tei-less findings sharing (heuristic_tag, step) —
  // what crawl.mjs actually produces. The old report-gate F45/F46 dedup recomputed tupleKey from the
  // collapsed (tag|step|) partial key, saw a "collision", and crashed --write. Locked: it now completes.
  const led = { findings: [
    f({ friction_name: 'copy mismatch', step: 1, severity: 3 }),
    f({ friction_name: 'button unclear', step: 2, severity: 2 }),
  ] };
  const dir = makeRun({ p1: led, p2: led, p3: led });
  const r = run([ASSEMBLE, '--write', dir, 'p1', 'p2', 'p3']);
  assert.equal(r.code, 0, `--write must exit 0 on the tei-less shape, not crash (B1). stderr:\n${r.stderr}`);
  assert.match(r.stdout, /gate: PASS/, 'the persisted bundle passes report-gate');
  assert.ok(existsSync(join(dir, 'findings.json')), 'findings.json is persisted');
  const bundle = JSON.parse(readFileSync(join(dir, 'findings.json'), 'utf8'));
  assert.equal(bundle.lane, 'persona', 'the emitted bundle carries the explicit persona lane discriminator (R3 M15)');
  assert.equal(bundle.findings.length, 6, 'all 6 tei-less findings survive as SEPARATE entries (never false-merged)');
  for (const x of bundle.findings) {
    assert.equal(x.convergence_tier, 1, 'each tei-less finding stays convergence_tier 1 — no fabricated cross-persona convergence');
    assert.equal(x.confidence, 'ungrounded-no-target-element', 'each tei-less finding is flagged low-confidence/ungrounded');
    assert.ok(x.target_element_identifier == null, 'the internal cluster key is never leaked into the public tei field');
  }
  assert.match(r.stderr, /UNGROUNDED-FINDINGS/, 'the pipeline degrades LOUDLY on stderr, never silently');
});
test('ORCH B1: report-gate exempts tei-less findings from the F45/F46 dedup, but STILL catches a real tei-bearing under-merge', () => {
  const dir = tmp();
  // two tei-BEARING findings with an identical (tag, step, tei) tuple left unmerged → must still FAIL.
  const bad = {
    lane: 'persona', run: {}, run_status: 'completed',
    findings: [
      { friction_name: 'a', friction_type: 'walkthrough_failure', step: 1, heuristic_tag: 'match-system-real-world', personas_flagging: ['p1'], convergence_tier: 1, severity: 2, severity_factors: { frequency: 'x', impact: 'y', persistence: 'z' }, finding_id: findingId('match-system-real-world', 1, 'signup:cta'), target_element_identifier: 'signup:cta', evidence: [{ type: 'x', path: 'a.png' }], narrative: 'n' },
      { friction_name: 'b', friction_type: 'walkthrough_failure', step: 1, heuristic_tag: 'match-system-real-world', personas_flagging: ['p2'], convergence_tier: 1, severity: 2, severity_factors: { frequency: 'x', impact: 'y', persistence: 'z' }, finding_id: findingId('match-system-real-world', 1, 'signup: cta'), target_element_identifier: 'signup: cta', evidence: [{ type: 'x', path: 'b.html' }], narrative: 'n' },
    ],
  };
  const badPath = join(dir, 'bad.json'); writeJson(badPath, bad);
  const r = run([REPORT_GATE, badPath]);
  assert.notEqual(r.code, 0, 'two tei-bearing findings normalizing to the SAME tuple but left unmerged must FAIL the dedup (F45/F46 teeth preserved)');
  assert.match(r.stderr, /identity tuple/, 'the failure names the F45/F46 dedup violation');
});

// ------------------------------------------------------------------------------------------------
// 3. trace grounding: fail-closed on missing trace; hallucinated cross-page citation dropped (M7)
// ------------------------------------------------------------------------------------------------
test('ORCH grounding: a persona with NO usable trace fails CLOSED — its findings are dropped, run may derive BLOCKED', () => {
  const led = { findings: [f({ friction_name: 'x', target_element_identifier: 'signup:cta' })] };
  const dir = makeRun({ p1: { ...led, noTrace: true }, p2: { ...led, noTrace: true }, p3: { ...led, noTrace: true } });
  const r = run([ASSEMBLE, dir, 'p1', 'p2', 'p3']);
  const bundle = JSON.parse(r.stdout);
  assert.equal(bundle.findings.length, 0, 'every finding from a trace-less persona is dropped (fail-closed, never fabricated)');
  assert.equal(bundle.run_status, 'BLOCKED', 'a run with <3 floor-state (grounded) personas derives BLOCKED');
  assert.match(r.stderr, /UNGROUNDED-RUN/, 'the trace-less run is surfaced LOUDLY on stderr');
});
test('ORCH grounding M7: a finding citing a page the persona never VISITED is dropped even when the label mentions the word', () => {
  // R3 M7: the step label incidentally contains "pricing" while only /signup was visited. The removed
  // inLabel free-text fallback used to ground this hallucinated cross-page citation. It must now drop.
  const dir = makeRun({ p1: { steps: [{ step: 1, label: 'open signup (pricing looked fine)', url: 'http://localhost:4319/signup', title: 'Sign up' }], findings: [
    f({ friction_name: 'pricing cta hidden', target_element_identifier: 'pricing:cta-button' }),
    f({ friction_name: 'signup cta hidden', target_element_identifier: 'signup:cta', step: 1 }),
  ] } });
  const r = run([ASSEMBLE, dir, 'p1']);
  const names = JSON.parse(r.stdout).findings.map((x) => x.friction_name);
  assert.ok(!names.includes('pricing cta hidden'), 'the hallucinated /pricing citation (never visited, only a label word) is DROPPED');
  assert.ok(names.includes('signup cta hidden'), 'the genuinely-visited /signup citation is grounded and ships');
  assert.match(r.stderr, /ungrounded-route/, 'the drop names the ungrounded-route reason');
});
test('ORCH grounding R4 ROOT2: a tei matching a REAL captured actionable grounds; a FABRICATED element that exists in NO captured actionable is DROPPED', () => {
  // R4 ROOT 2 (anti-hallucination): the per-step `actionables` array is real captured DOM. A finding whose
  // element token corresponds to a captured actionable text/href grounds; an invented selector that
  // matches nothing captured is a hallucinated element and is dropped — closing the fabricated-selector
  // and bare free-text-fabrication BLOCKERs. Necessary-not-sufficient: a real page name also grounds.
  const steps = [
    { step: 1, label: 'landing', url: 'http://localhost:4319/', title: 'Home', actionables: [
      { tag: 'a', text: 'Pricing', href: '/pricing' }, { tag: 'a', text: 'Get started', href: '/signup' },
    ] },
    { step: 2, label: 'signup', url: 'http://localhost:4319/signup', title: 'Sign up', actionables: [
      { tag: 'button', text: 'Continue', href: null }, { tag: 'input', text: 'you@company.com', href: null },
    ] },
  ];
  const dir = makeRun({ p1: { steps, findings: [
    f({ friction_name: 'real-continue', step: 2, target_element_identifier: 'signup:continue' }),   // "continue" IS a captured actionable text on step 2
    f({ friction_name: 'real-pricing-link', step: 1, target_element_identifier: 'nav:pricing' }),    // "pricing" IS a captured actionable text/href on step 1
    f({ friction_name: 'fabricated-cancel', step: 2, target_element_identifier: 'data-testid:nonexistent-cancel-button' }), // matches nothing captured
    f({ friction_name: 'fabricated-bare', step: 2, target_element_identifier: 'totally-invented-widget-xyz' }),           // bare, matches nothing
  ] } });
  const r = run([ASSEMBLE, dir, 'p1']);
  const names = JSON.parse(r.stdout).findings.map((x) => x.friction_name);
  assert.ok(names.includes('real-continue'), 'a tei whose element token matches a captured actionable ("Continue") grounds');
  assert.ok(names.includes('real-pricing-link'), 'a tei matching a captured actionable text/href ("Pricing"/"/pricing") grounds');
  assert.ok(!names.includes('fabricated-cancel'), 'an invented data-testid element that exists in NO captured actionable is DROPPED (hallucinated)');
  assert.ok(!names.includes('fabricated-bare'), 'a bare fabricated identifier matching nothing captured is DROPPED (hallucinated)');
  assert.match(r.stderr, /HALLUCINATED element/, 'the drop is loud and names the hallucination');
});
test('ORCH grounding R4 ROOT1: a legit finding whose free-text tei contains a NARRATIVE COLON is KEPT (not mis-read as a page prefix)', () => {
  // R4 ROOT 1 narrative-colon BLOCKER: the old grounding split the tei on ':' to derive a "page", so an
  // ordinary prose identifier like "Modal: submit button" was mis-read as page "modal" (never visited)
  // and a real, corroborated finding was silently zeroed. The tei is now opaque: grounding keys on the
  // finding\'s own `step` + element existence, never a colon split. "submit" IS a captured actionable, so
  // the finding grounds and ships.
  const steps = [
    { step: 1, label: 'landing', url: 'http://localhost:4319/', title: 'Home', actionables: [{ tag: 'a', text: 'Get started', href: '/signup' }] },
    { step: 2, label: 'signup', url: 'http://localhost:4319/signup', title: 'Sign up', actionables: [{ tag: 'button', text: 'Submit' }] },
  ];
  const dir = makeRun({ p1: { steps, findings: [
    f({ friction_name: 'modal-submit', step: 2, severity: 4, target_element_identifier: 'Modal: submit button' }),
  ] } });
  const r = run([ASSEMBLE, dir, 'p1']);
  const bundle = JSON.parse(r.stdout);
  const names = bundle.findings.map((x) => x.friction_name);
  assert.ok(names.includes('modal-submit'), 'the legit finding with a NARRATIVE colon is KEPT — the colon is not mis-parsed as a page prefix and false-dropped (R4 ROOT1)');
  assert.equal(bundle.findings.length, 1, 'the finding is not silently zeroed out of the bundle by a narrative-colon false-drop');
  assert.doesNotMatch(r.stderr, /DROPPED-UNGROUNDED .*modal-submit/, 'the narrative-colon finding is not logged as an ungrounded drop');
});

// ------------------------------------------------------------------------------------------------
// 4. run_status floor derivation — case/space canonicalization (M3)
// ------------------------------------------------------------------------------------------------
test('ORCH run_status M3: FLOOR_STATES membership is case- and whitespace-insensitive', () => {
  assert.equal(floorCount([{ run_status: 'completed' }, { run_status: 'Completed' }, { run_status: 'COMPLETED' }]), 3, 'case variants all count as floor states');
  assert.equal(floorCount([{ run_status: ' completed ' }, { run_status: 'patience-exhausted' }, { run_status: 'runner-capped' }]), 3, 'padded + all three floor tokens count');
  assert.equal(deriveBlocked([{ run_status: 'Completed' }, { run_status: 'completed' }, { run_status: 'completed' }]), false, 'a healthy 3-floor run does not derive BLOCKED on a case variant');
  assert.equal(deriveBlocked([{ run_status: 'crashed' }, { run_status: 'timed-out' }, { run_status: 'completed' }]), true, 'crashed/timed-out are NOT floor states — <3 floor derives BLOCKED (teeth preserved)');
});

// ------------------------------------------------------------------------------------------------
// 5. impact canonicalization — blocks in BOTH structural gates (null / newline / case) (M1 + B6)
// ------------------------------------------------------------------------------------------------
test('ORCH impact: canonicalImpact/isValidImpact fold case + whitespace, reject garbage', () => {
  assert.equal(canonicalImpact('Critical'), 'critical');
  assert.equal(canonicalImpact('critical\n'), 'critical');
  assert.equal(canonicalImpact(' Serious '), 'serious');
  assert.equal(isValidImpact('crtical'), false, 'a typo is not a valid impact');
  assert.equal(isValidImpact(null), false, 'null is not a valid impact');
  assert.equal(findingBlocksCi({ source: 'axe', impact: 'Critical\n' }), true, 'a padded/cased critical still blocks CI');
});
function structuralAxeBundle(findingOverride) {
  return {
    schema_version: 1, lane: 'structural',
    run: { route: '/signup', run_status: 'completed' },
    metadata: { axe_version: '4.12.1', browser_version: 'chromium/1179', wcag_target: 'AA', ruleset_tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'], render_environment_id: 'env@sha256:abc', expected_main_content: { '/signup': 'main' } },
    findings: [{ source: 'axe', code: 'axe:color-contrast', rule_id: 'color-contrast', lane: 'structural', target_element_identifier: 'signup:nav', severity: 4, ...findingOverride }],
  };
}
test('ORCH impact M1: a null/missing impact on an axe finding BLOCKS in BOTH structural gates (no gate divergence)', () => {
  const dir = tmp();
  const p = join(dir, 'null-impact.json');
  writeJson(p, structuralAxeBundle({ impact: null }));
  const gate = run([SGATE, '--check-fixture', p]);
  const ci = run([SCI, '--check', p]);
  assert.notEqual(gate.code, 0, 'structural-report-gate fails on a null-impact axe finding (S60)');
  assert.notEqual(ci.code, 0, 'structural-ci-diff ALSO fails on the same null-impact axe finding (R3 M1 — no sci-vs-sgate divergence)');
  assert.match(ci.stderr, /missing\/non-canonical impact/, 'sci names the absent-impact fail-closed reason');
});
test('ORCH impact: a garbage impact string blocks in both gates; a valid non-critical impact does not over-block sci', () => {
  const dir = tmp();
  const garbage = join(dir, 'garbage.json'); writeJson(garbage, structuralAxeBundle({ impact: 'crtical', severity: 4 }));
  assert.notEqual(run([SGATE, '--check-fixture', garbage]).code, 0, 'garbage impact fails the integrity gate');
  assert.notEqual(run([SCI, '--check', garbage]).code, 0, 'garbage impact fails CI closed');
  const serious = join(dir, 'serious.json'); writeJson(serious, structuralAxeBundle({ impact: 'serious', severity: 3 }));
  assert.equal(run([SCI, '--check', serious]).code, 0, 'a valid serious (non-critical) impact is advisory, not a CI block — sci does not over-block');
});

// ------------------------------------------------------------------------------------------------
// 6. lane trust boundary — EXACT-MATCH discriminator across ALL FOUR gates (M15/MI3)
// ------------------------------------------------------------------------------------------------
test('ORCH lane R4 ROOT3: assertLane requires an EXPLICIT discriminator on BOTH sides — absent lane is REJECTED, not defaulted', () => {
  assert.equal(assertLane({ lane: 'persona' }, 'persona'), null, 'explicit persona accepted');
  // R4 ROOT 3: an OMITTED lane is REJECTED by the persona gate (the prior "0001-safe default" was the
  // BLOCKER — a de-labelled structural bundle defaulted through). Every persona emitter now writes lane.
  assert.ok(assertLane({ run: {}, findings: [] }, 'persona'), 'an ABSENT lane is REJECTED by the persona gate (no silent default-to-persona)');
  // M15: a persona finding carrying a top-level `impact` string is NOT sniffed as structural anymore.
  assert.equal(assertLane({ lane: 'persona', findings: [{ impact: 'moderate business impact' }] }, 'persona'), null, 'a persona finding with an `impact` field is accepted (no shape sniff)');
  assert.ok(assertLane({ lane: 'structural' }, 'persona'), 'an explicit structural lane is rejected by the persona gate');
  assert.ok(assertLane({ lane: 'weird' }, 'persona'), 'an unknown lane is rejected by the persona gate');
  assert.ok(assertLane({ run: {}, findings: [] }, 'structural'), 'an absent lane is rejected by the structural gate (must be exactly "structural")');
  assert.equal(assertLane({ lane: 'structural' }, 'structural'), null, 'explicit structural accepted by the structural gate');
});
test('ORCH lane R4 ROOT3: a de-labelled structural bundle (lane field dropped) is REJECTED by the persona gate at the subprocess boundary', () => {
  const dir = tmp();
  // take a real structural bundle and DROP its lane field — the exact R4 BLOCKER shape.
  const delabelled = structuralAxeBundle({ impact: 'critical', severity: 4 });
  delete delabelled.lane;
  const p = join(dir, 'delabelled-structural.json'); writeJson(p, delabelled);
  const rg = run([REPORT_GATE, p]);
  assert.notEqual(rg.code, 0, 'report-gate REFUSES a lane-omitted (de-labelled structural) bundle instead of processing its axe findings as persona (R4 ROOT3)');
  assert.match(rg.stderr, /persona|lane/i, 'the refusal names the lane discriminator rule');
  const ci = run([CI_DIFF, '--baseline', p, '--current', p]);
  assert.notEqual(ci.code, 0, 'ci-diff ALSO refuses the lane-omitted bundle (no gate defaults it through)');
  // a de-labelled persona bundle (findings present, no lane) is likewise refused — lane is now required.
  const nolanePersona = join(dir, 'nolane-persona.json'); writeJson(nolanePersona, { run: {}, run_status: 'completed', findings: [] });
  assert.notEqual(run([REPORT_GATE, nolanePersona]).code, 0, 'even a well-formed persona-shaped bundle is refused when it omits the now-required lane discriminator (R4 ROOT3, symmetric fail-closed)');
});
test('ORCH lane: all four gates reject a CROSS-lane bundle at the subprocess boundary', () => {
  const dir = tmp();
  const structural = join(dir, 's.json'); writeJson(structural, structuralAxeBundle({ impact: 'serious', severity: 3 }));
  const persona = join(dir, 'p.json'); writeJson(persona, { lane: 'persona', run: {}, run_status: 'completed', findings: [] });
  // persona-lane gates refuse the structural bundle
  assert.notEqual(run([REPORT_GATE, structural]).code, 0, 'report-gate refuses a structural-lane bundle');
  assert.notEqual(run([CI_DIFF, '--baseline', structural, '--current', structural]).code, 0, 'ci-diff refuses a structural-lane bundle');
  // structural-lane gates refuse the persona bundle
  assert.notEqual(run([SGATE, '--check-fixture', persona]).code, 0, 'structural-report-gate refuses a persona/absent-lane bundle');
  assert.notEqual(run([SCI, '--check', persona]).code, 0, 'structural-ci-diff refuses a persona/absent-lane bundle');
});

// ------------------------------------------------------------------------------------------------
// 7. forbidden-claim (WTP/population) idiom set + negative control (F21/F22, R2 item 10)
// ------------------------------------------------------------------------------------------------
test('ORCH claims: the WTP/population detector catches numeric + idiomatic phrasings', () => {
  for (const s of ['would happily pay $29', 'worth every penny', 'take my money', 'twenty dollars a month', '2x the price', '$29/month']) {
    assert.ok(forbiddenClaims(s).some((r) => /willingness-to-pay/.test(r)), `WTP idiom caught: "${s}"`);
  }
  assert.ok(forbiddenClaims('roughly 40% of users abandoned the flow').some((r) => /population/.test(r)), 'population-rate extrapolation caught');
});
test('ORCH claims R4 MAJOR#7: the "\'d pay" contraction family of would-pay is caught (not only literal "would")', () => {
  for (const s of ["I'd pay for this in a heartbeat", "I'd happily pay for it", "they'd gladly pay extra", "we'd pay good money for this"]) {
    assert.ok(forbiddenClaims(s).some((r) => /willingness-to-pay/.test(r)), `contraction WTP caught: "${s}"`);
  }
  // NEGATIVE CONTROL: the contraction pattern must not false-fire on ordinary prose or persona role names.
  for (const s of ['the willing-to-pay-user could not find the button', 'a free-tier-user hit the paywall', 'the layout felt cramped and the copy was unclear']) {
    assert.deepEqual(forbiddenClaims(s), [], `no false WTP match on: "${s}"`);
  }
});
test('ORCH claims NEGATIVE CONTROL: ordinary prose and hyphenated persona names never false-match', () => {
  for (const s of ['the willing-to-pay-user persona could not find the button', 'a free-tier-user hit the paywall', 'the copy was confusing and the layout felt cramped', 'the CTA was 20 pixels below the fold']) {
    assert.deepEqual(forbiddenClaims(s), [], `no false WTP/population match on: "${s}"`);
  }
  assert.equal(WTP_RE.test('willing-to-pay-user'), false, 'the hyphenated persona role is not a WTP claim');
});
test('ORCH claims M12: assemble-run enforces the forbidden-claim gate in BOTH bare and --write mode', () => {
  const wtp = { findings: [f({ friction_name: 'pricey', target_element_identifier: 'signup:cta', narrative: 'users would happily pay $29 per month for this' })] };
  const dir = makeRun({ p1: wtp });
  const bare = run([ASSEMBLE, dir, 'p1']);
  assert.notEqual(bare.code, 0, 'BARE mode fails closed on a forbidden claim (R3 M12) — not a silent exit-0 preview');
  assert.match(bare.stderr, /FAILS CLOSED|forbidden/i, 'bare mode names the forbidden-claim enforcement');
  const written = run([ASSEMBLE, '--write', dir, 'p1']);
  assert.notEqual(written.code, 0, '--write mode also fails closed and does not persist findings.json');
  assert.ok(!existsSync(join(dir, 'findings.json')), 'no findings.json is left on disk for a WTP-violating run');
  // negative control: a clean grounded narrative passes bare mode
  const clean = makeRun({ p1: { findings: [f({ friction_name: 'clean', target_element_identifier: 'signup:cta', narrative: 'the button was hard to find' })] } });
  assert.equal(run([ASSEMBLE, clean, 'p1']).code, 0, 'a clean grounded narrative exits 0 in bare mode (no false positive)');
});

// ------------------------------------------------------------------------------------------------
// 8. render-report — the founder-facing artifact applies a lane + shape gate before rendering (M11)
// ------------------------------------------------------------------------------------------------
test('ORCH render M11: the renderer REFUSES hand-typed garbage and a cross-lane bundle, but renders a valid one', () => {
  const dir = tmp();
  const garbage = join(dir, 'garbage.json'); writeJson(garbage, { run_status: 'completed', findings: [{ friction_name: 'fabricated' }] });
  const g = run([RENDER, garbage]);
  assert.notEqual(g.code, 0, 'a garbage 2-field bundle is refused, not formatted into an official-looking report');
  assert.equal(g.stdout, '', 'no report bytes are emitted for a refused bundle');
  assert.match(g.stderr, /REFUSING to render/, 'the refusal is loud');
  const structural = join(dir, 's.json'); writeJson(structural, structuralAxeBundle({ impact: 'serious', severity: 3 }));
  assert.notEqual(run([RENDER, structural]).code, 0, 'a structural-lane bundle is refused by the persona renderer');
  const ok = run([RENDER, 'test/fixtures/findings-valid.json']);
  assert.equal(ok.code, 0, 'a valid persona bundle still renders');
  assert.match(ok.stdout, /UX Gauntlet Report/, 'the valid bundle produces the report');
});
test('ORCH render: the pure validatePersonaBundle mirrors the schema required sets (id OR finding_id)', () => {
  assert.deepEqual(validatePersonaBundle({ run: {}, findings: [] }), [], 'a minimal well-formed bundle is valid');
  assert.ok(validatePersonaBundle({ findings: [] }).some((e) => /run/.test(e)), 'a missing top-level run is an error');
  const missingId = validatePersonaBundle({ run: {}, findings: [{ friction_name: 'x', friction_type: 'walkthrough_failure', step: 1, heuristic_tag: 't', personas_flagging: [], convergence_tier: 1, severity: 2, severity_factors: {} }] });
  assert.ok(missingId.some((e) => /finding identifier/.test(e)), 'a finding with neither id nor finding_id is an error');
  assert.deepEqual(validatePersonaBundle({ run: {}, findings: [{ friction_name: 'x', friction_type: 'walkthrough_failure', step: 1, heuristic_tag: 't', personas_flagging: [], convergence_tier: 1, severity: 2, severity_factors: {}, id: 'abc' }] }), [], 'the `id` spelling satisfies the identifier requirement (frozen 0001 fixtures use it)');
});

// ------------------------------------------------------------------------------------------------
// 9. over-merge policy is F45-normative (documented decision, R3): identity == (tag, step, tei)
// ------------------------------------------------------------------------------------------------
test('ORCH F45: two personas flagging the same (heuristic_tag, step, tei) with DIFFERENT friction_name merge to ONE tier-2 finding', () => {
  // Correct-by-spec (F45): identity is (heuristic_tag, step, target_element_identifier). Two personas
  // describing the same element+step+heuristic differently is CONVERGENCE, not over-merge; friction_name
  // is NOT part of identity. Their distinct narratives are preserved in persona_voices.
  const dir = makeRun({
    p1: { findings: [f({ friction_name: 'icon unclear', target_element_identifier: 'signup:cta', severity: 3, narrative: 'icon ambiguous' })] },
    p2: { findings: [f({ friction_name: 'copy untranslated', target_element_identifier: 'signup:cta', severity: 2, narrative: 'copy in wrong language' })] },
  });
  const bundle = JSON.parse(run([ASSEMBLE, dir, 'p1', 'p2']).stdout);
  assert.equal(bundle.findings.length, 1, 'the shared (tag, step, tei) tuple merges to ONE finding per F45');
  assert.equal(bundle.findings[0].convergence_tier, 2, 'both personas count toward convergence_tier 2');
  assert.equal(bundle.findings[0].severity, 3, 'merged severity is the max of the component severities (F119)');
  const notes = bundle.findings[0].persona_voices.map((v) => v.note);
  assert.ok(notes.some((n) => /ambiguous/.test(n)) && notes.some((n) => /wrong language/.test(n)), 'both distinct persona narratives are preserved in persona_voices (the lower-severity voice is not lost)');
});

// ------------------------------------------------------------------------------------------------
// 10. combined-report — the 5th gate (the actual founder-facing composed artifact) enforces the lane
//     trust boundary on BOTH inputs (R4 MAJOR #9 / S22 M9-class hole)
// ------------------------------------------------------------------------------------------------
test('ORCH combined-report R4#9: the two-lane report generator REFUSES swapped/mislabelled lane inputs, renders correctly-routed ones', () => {
  const dir = tmp();
  const persona = 'test/fixtures/findings-valid.json';       // lane:"persona"
  const structural = join(dir, 's.json'); writeJson(structural, structuralAxeBundle({ impact: 'serious', severity: 3 })); // lane:"structural"
  // correctly routed: renders HTML, exit 0
  const ok = run([COMBINED, '--persona', persona, '--structural', structural]);
  assert.equal(ok.code, 0, 'correctly-routed persona+structural inputs render the composed report');
  assert.match(ok.stdout, /two lanes/i, 'the composed artifact is produced');
  // SWAPPED args: structural fed as --persona, persona fed as --structural — the M9 hole. Must REFUSE.
  const swapped = run([COMBINED, '--persona', structural, '--structural', persona]);
  assert.notEqual(swapped.code, 0, 'swapping the --persona/--structural args is REFUSED — a structural bundle is never rendered under "Persona friction" (R4#9)');
  assert.equal(swapped.stdout, '', 'no report bytes are emitted for a mislabelled/swapped composition');
  assert.match(swapped.stderr, /REFUSE/, 'the refusal is loud');
  // a de-labelled persona bundle (lane dropped) is also refused now that lane is required (R4 ROOT3).
  const nolane = join(dir, 'nolane.json'); const pv = JSON.parse(readFileSync(persona, 'utf8')); delete pv.lane; writeJson(nolane, pv);
  assert.notEqual(run([COMBINED, '--persona', nolane, '--structural', structural]).code, 0, 'a lane-omitted persona input is refused by the composer (no silent default)');
});
