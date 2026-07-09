// structural-scan.mjs — the DETERMINISTIC structural-UI lane (complements the persona-friction lane).
// For each page in the flow it runs, with NO LLM judgment:
//   1. Accessibility (WCAG) via axe-core injected into the real page.
//   2. Semantic structure: landmark roles, exactly-one-<main>, heading-order sanity, skip link.
//   3. Main-content correctness: a declared expected main content (--main-content <css|text>) must
//      exist, sit inside <main>, and be the largest visible text block (i.e. the UI structurally
//      treats it AS the main content — the audiobook-text-is-the-main-content check).
//   4. Interactive-affordance correctness: the step's "continue" control is a real focusable
//      button/link with an accessible name and is keyboard-reachable.
// Emits a structural report JSON. Pure structural facts; severity mapping is mechanical.
//
// Usage: node scripts/structural-scan.mjs --url <base> --path </signup> --main-content "<sel-or-text>" --continue-name "Continue"
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

function arg(n, d) { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; }
const base = arg('url'); const path = arg('path', '/'); const mainWanted = arg('main-content', '');
const continueName = arg('continue-name', '');
const axeSrc = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(base + path, { waitUntil: 'domcontentloaded' });
await page.addScriptTag({ content: axeSrc });

const axe = await page.evaluate(async () => {
  const r = await window.axe.run(document, { resultTypes: ['violations'] });
  return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
    sample: v.nodes[0]?.html?.slice(0, 120) }));
});

const structure = await page.evaluate((mainWanted) => {
  const q = (s) => [...document.querySelectorAll(s)];
  const landmarks = {
    main: q('main, [role=main]').length,
    nav: q('nav, [role=navigation]').length,
    header: q('header, [role=banner]').length,
    footer: q('footer, [role=contentinfo]').length,
  };
  const headings = q('h1,h2,h3,h4,h5,h6').map(h => ({ level: +h.tagName[1], text: h.innerText.trim().slice(0, 50) }));
  const h1count = headings.filter(h => h.level === 1).length;
  // heading-order sanity: no level jumps by >1 going down
  let orderOk = true; let prev = 0;
  for (const h of headings) { if (prev && h.level > prev + 1) orderOk = false; prev = h.level; }
  const skipLink = q('a[href^="#"]').some(a => /skip|main|content/i.test(a.innerText));

  // main-content correctness: find the declared main content
  let mainEl = null;
  if (mainWanted) {
    try { mainEl = document.querySelector(mainWanted); } catch { mainEl = null; }
    if (!mainEl) { // fall back: match by visible text substring
      mainEl = q('h1,h2,p,article,section,main,div').find(e => e.innerText && e.innerText.toLowerCase().includes(mainWanted.toLowerCase())) || null;
    }
  }
  // largest visible text block on the page
  const blocks = q('main,article,section,div,p,h1').map(e => ({ e, len: (e.innerText || '').trim().length }))
    .filter(b => b.len > 0).sort((a, b) => b.len - a.len);
  const largest = blocks[0]?.e || null;
  const insideMain = (el) => !!el && !!el.closest('main,[role=main]');
  return {
    landmarks, h1count, headingOrderOk: orderOk, headingCount: headings.length, skipLink,
    mainContent: mainWanted ? {
      declared: mainWanted,
      found: !!mainEl,
      insideMainLandmark: insideMain(mainEl),
      isLargestBlock: !!mainEl && !!largest && (mainEl === largest || largest.contains(mainEl) || mainEl.contains(largest)),
    } : null,
  };
}, mainWanted);

// interactive-affordance: is the continue control a real, named, focusable button/link?
let affordance = null;
if (continueName) {
  affordance = await page.evaluate((name) => {
    const els = [...document.querySelectorAll('a,button,[role=button],input[type=submit]')];
    const match = els.find(e => (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().toLowerCase().includes(name.toLowerCase()));
    if (!match) return { name, found: false };
    const tag = match.tagName.toLowerCase();
    return {
      name, found: true, tag,
      isSemanticControl: ['a', 'button', 'input'].includes(tag) || match.getAttribute('role') === 'button',
      hasAccessibleName: !!(match.innerText || match.value || match.getAttribute('aria-label')),
      keyboardFocusable: match.tabIndex >= 0 || ['a', 'button', 'input'].includes(tag),
    };
  }, continueName);
}

// mechanical severity mapping
const findings = [];
const sev = (s) => findings.push(s);
if (structure.landmarks.main === 0) sev({ code: 'no-main-landmark', severity: 3, heuristic: 'consistency-standards', detail: 'Page has no <main> landmark — screen-reader/keyboard users have no "main content" to jump to.' });
if (structure.landmarks.main > 1) sev({ code: 'multiple-main', severity: 3, heuristic: 'consistency-standards', detail: `Page has ${structure.landmarks.main} <main> landmarks; there must be exactly one.` });
if (structure.h1count === 0) sev({ code: 'no-h1', severity: 2, heuristic: 'visibility-of-system-status', detail: 'No <h1> — the page has no top-level heading to anchor its content.' });
if (structure.h1count > 1) sev({ code: 'multiple-h1', severity: 1, heuristic: 'consistency-standards', detail: `${structure.h1count} <h1> elements; expected one.` });
if (!structure.headingOrderOk) sev({ code: 'heading-order', severity: 2, heuristic: 'consistency-standards', detail: 'Heading levels skip (e.g. h1 → h3) — breaks document outline for assistive tech.' });
if (!structure.skipLink) sev({ code: 'no-skip-link', severity: 1, heuristic: 'flexibility-efficiency-of-use', detail: 'No "skip to main content" link — keyboard users must tab through the whole nav.' });
if (structure.mainContent) {
  const m = structure.mainContent;
  if (!m.found) sev({ code: 'main-content-missing', severity: 4, heuristic: 'match-system-real-world', detail: `Declared main content ("${m.declared}") not found on the page at all.` });
  else {
    if (!m.insideMainLandmark) sev({ code: 'main-content-not-in-main', severity: 3, heuristic: 'consistency-standards', detail: `The main content exists but is NOT inside a <main> landmark — structurally the UI does not mark it as the main content.` });
    if (!m.isLargestBlock) sev({ code: 'main-content-not-prominent', severity: 2, heuristic: 'aesthetic-minimalist-design', detail: `The declared main content is not the most prominent (largest) text block — something else visually dominates the page.` });
  }
}
if (affordance) {
  if (!affordance.found) sev({ code: 'continue-control-missing', severity: 4, heuristic: 'visibility-of-system-status', detail: `No control matching "${affordance.name}" to advance the flow.` });
  else {
    if (!affordance.isSemanticControl) sev({ code: 'continue-not-semantic', severity: 3, heuristic: 'consistency-standards', detail: `The "${affordance.name}" control is a <${affordance.tag}>, not a real button/link — assistive tech may not expose it as actionable.` });
    if (!affordance.keyboardFocusable) sev({ code: 'continue-not-focusable', severity: 3, heuristic: 'flexibility-efficiency-of-use', detail: `The "${affordance.name}" control is not keyboard-focusable.` });
    if (!affordance.hasAccessibleName) sev({ code: 'continue-no-name', severity: 3, heuristic: 'help-and-documentation', detail: `The "${affordance.name}" control has no accessible name.` });
  }
}
for (const v of axe) sev({ code: `axe:${v.id}`, severity: v.impact === 'critical' ? 4 : v.impact === 'serious' ? 3 : v.impact === 'moderate' ? 2 : 1, heuristic: 'help-users-recognize-recover-errors', detail: `${v.help} (${v.nodes} node(s)) — e.g. ${v.sample || ''}` });

await browser.close();
process.stdout.write(JSON.stringify({ url: base + path, structure, affordance, axe_violations: axe.length, findings }, null, 2));
