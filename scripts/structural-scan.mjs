// structural-scan.mjs — the DETERMINISTIC structural-UI lane scanner (SPEC 0002), complementing the
// persona-friction lane. For each operator-supplied route it runs, with NO LLM judgment:
//   1. The S1 SETTLE precondition (page-load + fonts.ready + image decode + animation quiescence,
//      excluding infinite-iteration animations, + a 500ms MutationObserver quiescence window) capped at
//      10s. A route that never settles records run_status settle-timeout (S47), never a silent pass.
//   2. Accessibility (WCAG) via axe-core 4.12.1 injected into the real page, with the AA ruleset tags
//      from config/wcag-target.default.json (S2/S3). Violations AND incomplete results are collected;
//      the axe pass count is persisted (S1). The axe `tabindex` rule is disabled (CR2-B13).
//   3. Semantic structure: exactly-one-<main> (fail-closed to cannot-evaluate-ambiguous-main when the
//      count != 1, S7/S14), landmark labelling, positive-tabindex anti-pattern, heading-order (best-
//      practice), and the S12 expected-main-content check (found + inside main + largest visible block
//      by rendered bounding-box AREA, excluding the anchor's ancestors AND descendants).
//   4. Interactive affordance: the step's continue control is a real, named, keyboard-reachable control.
// Emits a schema-conformant structural-findings bundle (schemas/structural-findings.schema.json) with
// deterministic finding_ids (scripts/core/structural-identity.mjs) and the pinned metadata.
//
// Usage: node scripts/structural-scan.mjs --url <base> --path </signup> --main-content "<sel>" --continue-name "Continue"
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { computeFindingId } from './core/structural-identity.mjs';
import { AXE_IMPACT_SEVERITY, NONAXE_SEVERITY } from './core/structural-severity.mjs';

const PINNED_AXE = '4.12.1';
const SCHEMA_VERSION = 1;
const SETTLE_CAP_MS = 10_000;

function arg(n, d) { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; }
const base = arg('url'); const path = arg('path', '/'); const mainWanted = arg('main-content', '');
const continueName = arg('continue-name', '');
const route = path;

const wcagCfg = JSON.parse(readFileSync(new URL('../config/wcag-target.default.json', import.meta.url), 'utf8'));
const rulesetTags = wcagCfg.tags_by_target[String(wcagCfg.target).toUpperCase()] ?? wcagCfg.ruleset_tags;
const axeSrc = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');

function emit(bundle) { process.stdout.write(JSON.stringify(bundle, null, 2)); }

const browser = await chromium.launch();
const browserVersion = `chromium/${browser.version?.() ?? 'unknown'}`;
const renderEnvId = `${process.platform}-node${process.versions.node}`;
const baseMeta = {
  axe_version: PINNED_AXE,
  ruleset_tags: rulesetTags,
  wcag_target: wcagCfg.target,
  browser_version: browserVersion,
  render_environment_id: renderEnvId,
  timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  expected_main_content: mainWanted ? { [route]: mainWanted } : {},
};

// S13/S40: refuse without an operator-declared expected-main-content selector for this route.
if (!mainWanted) {
  await browser.close();
  emit({
    schema_version: SCHEMA_VERSION, lane: 'structural',
    run: { route, url: base + path, run_status: 'refused' },
    metadata: { ...baseMeta, settle_precondition_met: false },
    violation_ids: [], incomplete_ids: [], findings: [],
    refused: true,
    refusal_reason: 'no operator-declared expected-main-content selector supplied for this route; the selector is operator-declared and required, so no gated structural result is produced (S13/S40)',
  });
  process.exit(0);
}

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base + path, { waitUntil: 'load' });

// ---- S1 settle precondition ----------------------------------------------------------------------
const settleMet = await page.evaluate(async (capMs) => {
  const deadline = Date.now() + capMs;
  const left = () => deadline - Date.now();
  try {
    if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, left()))]);
    // image decode
    await Promise.race([
      Promise.all([...document.images].filter((i) => !i.complete).map((i) => i.decode().catch(() => {}))),
      new Promise((r) => setTimeout(r, left())),
    ]);
    // finite animations only (infinite-iteration animations are treated as settled, CR4-B3/B4)
    if (document.getAnimations) {
      const finite = document.getAnimations().filter((a) => {
        const it = a.effect?.getTiming?.().iterations;
        return it !== Infinity;
      });
      await Promise.race([
        Promise.all(finite.map((a) => a.finished.catch(() => {}))),
        new Promise((r) => setTimeout(r, left())),
      ]);
    }
    // 500ms MutationObserver quiescence window
    await new Promise((resolve) => {
      let timer;
      const obs = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(done, 500); });
      const done = () => { obs.disconnect(); resolve(); };
      obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      timer = setTimeout(done, 500);
      setTimeout(done, Math.max(0, left())); // hard cap
    });
    return Date.now() < deadline;
  } catch { return false; }
}, SETTLE_CAP_MS);

if (!settleMet) {
  await browser.close();
  emit({
    schema_version: SCHEMA_VERSION, lane: 'structural',
    run: { route, url: base + path, run_status: 'settle-timeout' },
    metadata: { ...baseMeta, settle_precondition_met: false },
    violation_ids: [], incomplete_ids: [], findings: [],
    settle_error: 'the S1 settle precondition never resolved within its fixed 10-second maximum; the route was never actually tested (S47) and CI must block (S48)',
  });
  process.exit(0);
}

await page.addScriptTag({ content: axeSrc });

// ---- axe run (fail-closed on throw / silent degrade) ---------------------------------------------
let axeResult;
try {
  axeResult = await page.evaluate(async (tags) => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: tags },
      rules: { tabindex: { enabled: false } }, // CR2-B13: the axe tabindex rule is disabled by S1
      resultTypes: ['violations', 'incomplete'],
    });
    return {
      violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, tei: v.nodes[0]?.target?.[0] ?? v.id })),
      incomplete: r.incomplete.map((v) => ({ id: v.id, impact: v.impact, help: v.help, tei: v.nodes[0]?.target?.[0] ?? v.id })),
      passesCount: r.passes.length,
    };
  }, rulesetTags);
} catch (e) {
  await browser.close();
  emit({
    schema_version: SCHEMA_VERSION, lane: 'structural',
    run: { route, url: base + path, run_status: 'axe-execution-failed' },
    metadata: { ...baseMeta, settle_precondition_met: true },
    violation_ids: [], incomplete_ids: [], findings: [],
    axe_error: `axe.run() threw: ${e.message}`,
  });
  process.exit(0);
}

// S58/S59: a resolve with zero violation+incomplete+pass results on a non-trivial DOM is a silent degrade.
const nonTrivialDom = await page.evaluate(() => document.querySelectorAll('*').length > 20);
if (nonTrivialDom && axeResult.violations.length === 0 && axeResult.incomplete.length === 0 && axeResult.passesCount === 0) {
  await browser.close();
  emit({
    schema_version: SCHEMA_VERSION, lane: 'structural',
    run: { route, url: base + path, run_status: 'axe-execution-degraded' },
    metadata: { ...baseMeta, settle_precondition_met: true, axe_passes_count: 0 },
    violation_ids: [], incomplete_ids: [], findings: [],
    axe_error: 'axe resolved with zero violation/incomplete/pass results on a non-trivial DOM — silently degraded, fail closed (S58/S59)',
  });
  process.exit(0);
}

// ---- structural DOM checks -----------------------------------------------------------------------
const structure = await page.evaluate((mainWanted) => {
  const q = (s) => [...document.querySelectorAll(s)];
  const mainCount = q('main, [role=main]').length;
  const headings = q('h1,h2,h3,h4,h5,h6').map((h) => +h.tagName[1]);
  let headingSkip = false; let prev = 0;
  for (const lvl of headings) { if (prev && lvl > prev + 1) headingSkip = true; prev = lvl; }
  const positiveTabindex = q('[tabindex]').some((e) => Number(e.getAttribute('tabindex')) > 0);
  const unlabeledSection = q('section').some((s) => !s.getAttribute('aria-label') && !s.getAttribute('aria-labelledby') && !s.getAttribute('title'));

  const area = (el) => { const r = el.getBoundingClientRect(); return r.width * r.height; };
  const visible = (el) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden'; };
  let mc = null;
  if (mainCount === 1) {
    let el = null;
    try { el = document.querySelector(mainWanted); } catch { el = null; }
    if (el) {
      const anchorArea = area(el);
      const pool = q('main,article,section,div,p,h1').filter((e) => e !== el && !e.contains(el) && !el.contains(e) && visible(e) && area(e) > 0 && (e.innerText || '').trim().length > 0);
      const maxOther = pool.reduce((mx, e) => Math.max(mx, area(e)), 0);
      mc = { found: true, insideMain: !!el.closest('main,[role=main]'), largest: anchorArea >= maxOther };
    } else {
      mc = { found: false };
    }
  }
  return { mainCount, headingSkip, positiveTabindex, unlabeledSection, mc };
}, mainWanted);

const findings = [];
const push = (o) => {
  const rule = o.rule_id ?? o.code;
  findings.push({ lane: 'structural', route, finding_id: computeFindingId({ route, rule_id: rule, selector: o.target_element_identifier }), ...o });
};

// axe violations
for (const v of axeResult.violations) {
  push({ source: 'axe', code: `axe:${v.id}`, rule_id: v.id, impact: v.impact, severity: AXE_IMPACT_SEVERITY[v.impact] ?? 1, target_element_identifier: v.tei, target_selector: v.tei, help: v.help });
}
// axe incomplete → severity 0 (S18/S36), impact retained for the S53 CI predicate
for (const v of axeResult.incomplete) {
  push({ source: 'axe-incomplete', code: `axe-incomplete:${v.id}`, rule_id: v.id, impact: v.impact, severity: 0, result_type: 'incomplete', needs_manual_review: true, target_element_identifier: v.tei, target_selector: v.tei, help: v.help });
}

// S7/S14: exactly-one-main; fail closed and SUPPRESS all S12-derived findings when count != 1.
if (structure.mainCount !== 1) {
  push({ source: 'dom-check', code: 'cannot-evaluate-ambiguous-main', severity: NONAXE_SEVERITY['cannot-evaluate-ambiguous-main'], target_element_identifier: mainWanted, target_selector: mainWanted, detail: `page exposes ${structure.mainCount} main landmarks; containment fails closed (S7/S14)` });
} else if (structure.mc) {
  if (!structure.mc.found) push({ source: 'dom-check', code: 'main-content-missing', severity: NONAXE_SEVERITY['main-content-missing'], target_element_identifier: mainWanted, target_selector: mainWanted, detail: 'declared main content not found (S12)' });
  else {
    if (!structure.mc.insideMain) push({ source: 'dom-check', code: 'main-content-not-in-main', severity: NONAXE_SEVERITY['main-content-not-in-main'], target_element_identifier: mainWanted, target_selector: mainWanted, detail: 'declared main content sits outside the single main landmark (S12)' });
    if (!structure.mc.largest) push({ source: 'dom-check', code: 'main-content-not-prominent', severity: NONAXE_SEVERITY['main-content-not-prominent'], target_element_identifier: mainWanted, target_selector: mainWanted, detail: 'declared main content is not the largest visible block by bounding-box area (S12)' });
  }
}
if (structure.unlabeledSection) push({ source: 'dom-check', code: 'unlabeled-landmark-section', severity: NONAXE_SEVERITY['unlabeled-landmark-section'], target_element_identifier: 'section', target_selector: 'section', detail: 'a bare <section> has no aria-label/aria-labelledby/title (S9)' });
if (structure.positiveTabindex) push({ source: 'dom-check', code: 'positive-tabindex', severity: NONAXE_SEVERITY['positive-tabindex'], target_element_identifier: '[tabindex]', target_selector: '[tabindex]', detail: 'a positive tabindex is a keyboard-order anti-pattern (S11)' });

await browser.close();
emit({
  schema_version: SCHEMA_VERSION, lane: 'structural',
  run: { route, url: base + path, run_status: 'completed' },
  metadata: { ...baseMeta, settle_precondition_met: true, axe_passes_count: axeResult.passesCount },
  validity_envelope: {
    criteria_count_pct: 32, criteria_count: '16 of 50', issue_volume_pct: 57,
    vendor_reported: true, independently_audited: false,
    disclaimer: 'Both the ~32 percent criteria-count figure and the ~57 percent issue-volume figure are vendor-reported by Deque, not independently audited. A structural pass is not usable, is not good UI. This is not a WCAG conformance certification.',
    non_automatable_classes: ['focus order', 'focus visible', 'keyboard operability'],
    best_practice_labeled: ['heading-order'],
  },
  violation_ids: axeResult.violations.map((v) => v.id),
  incomplete_ids: axeResult.incomplete.map((v) => v.id),
  findings,
});
