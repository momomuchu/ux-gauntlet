#!/usr/bin/env node
// structural-render-report.mjs <structural-findings.json>
// Emits a markdown report derived FROM the structural-findings data (never a static banner). The
// MANDATORY validity envelope (S25-S29) frames the automated-a11y ceiling: axe catches only ~32-57%
// of WCAG (vendor-reported by Deque, not independently audited), a structural pass is not usable and
// not good UI, and byte-identical determinism holds only within a matching render_environment_id.
import { readFileSync, existsSync } from 'node:fs';

const file = process.argv[2];
if (!file || !existsSync(file)) { process.stderr.write('usage: structural-render-report.mjs <structural-findings.json>\n'); process.exit(2); }

let bundle;
try { bundle = JSON.parse(readFileSync(file, 'utf8')); }
catch (e) { process.stderr.write(`structural-render-report: cannot parse ${file}: ${e.message}\n`); process.exit(2); }

const meta = bundle.metadata ?? {};
const env = bundle.validity_envelope ?? {};

// The renderer reads its input: it refuses a report that has no validity envelope, that is unpinned,
// or that was refused — it does not emit a constant banner (S25/M21).
if (bundle.refused === true || !bundle.validity_envelope || meta.axe_version !== '4.12.1') {
  process.stderr.write(`structural-render-report: REFUSED — ${bundle.refusal_reason ?? 'the report has no validity envelope, or its axe_version is not the pinned 4.12.1'}; the mandatory validity envelope cannot be rendered from a stripped/unpinned bundle (S25/M21)\n`);
  process.exit(1);
}

const findings = Array.isArray(bundle.findings) ? bundle.findings : [];
const out = [];
const w = (s) => out.push(s);

const critPct = env.criteria_count_pct ?? 32;
const critCount = env.criteria_count ?? '16 of 50';
const issuePct = env.issue_volume_pct ?? 57;
const nonAuto = Array.isArray(env.non_automatable_classes) && env.non_automatable_classes.length
  ? env.non_automatable_classes : ['focus order', 'focus visible', 'keyboard operability'];

w('# UX Gauntlet — Structural Lane Report');
w('');
w(`Route: ${bundle.run?.route ?? '(unknown)'}`);
w(`Run status: ${bundle.run?.run_status ?? bundle.run_status ?? 'completed'}`);
w(`axe-core: ${meta.axe_version} · browser: ${meta.browser_version} · render_environment_id: ${meta.render_environment_id ?? '(unset)'}`);
w('');
w('## Findings');
w('');
if (findings.length === 0) w('_No structural findings recorded for this route._');
for (const f of findings) {
  w(`### ${f.code ?? f.rule_id ?? 'finding'}`);
  w(`- Source: ${f.source ?? '-'}`);
  if (f.impact) w(`- Raw axe impact: ${f.impact}`);
  w(`- Severity: ${f.severity}${f.severity === 0 ? ' (needs-manual-review — incomplete)' : ''}`);
  w(`- Target: ${f.target_element_identifier ?? f.target_selector ?? '-'}`);
  w('');
}

w('## Validity Envelope');
w('');
w(`Automated accessibility testing catches only a **minority** of WCAG problems. axe-core covers about`);
w(`**~${critPct} percent** of WCAG success criteria (**${critCount}** criteria) and finds roughly`);
w(`**~${issuePct}%** of real issue volume (the issue-volume figure). **Both figures are vendor-reported**`);
w('by Deque and are **not independently audited** by this tool.');
w('');
w('A structural pass is **not usable** and is **not good UI**: passing every automated check does not mean');
w('the interface is understandable, efficient, or pleasant. This report is **not a WCAG conformance certification**.');
w('');
w('### Not automatable — require manual testing');
w('These classes are essentially not machine-decidable and are never a pass/fail gate here:');
for (const c of nonAuto) w(`- ${c}`);
if (!nonAuto.some((c) => /focus order/i.test(c))) w('- focus order');
if (!nonAuto.some((c) => /focus visible/i.test(c))) w('- focus visible');
if (!nonAuto.some((c) => /keyboard operability/i.test(c))) w('- keyboard operability');
w('');
w('### Contrast exemptions (WCAG 1.4.3) — reported for transparency');
w('The color-contrast checks do **not** apply to these exempt categories, so an exempt element is not a failure:');
w('- **logotype** — text that is part of a logo or brand name has no contrast requirement.');
w('- **incidental** — incidental text (decorative, inactive, not conveying information) is exempt.');
w('- **inactive** — text in an inactive UI component (e.g. a disabled control) is exempt.');
w('');
w('### Determinism scope');
w('The byte-identical finding-id determinism guarantee holds **only within a matching');
w('`render_environment_id`** (OS + font-rendering stack). **Cross-render-environment reproduction is a');
w('disclosed residual and is not guaranteed** — which is why CI refuses cross-environment comparison.');
w('');
w('### Heading order');
w('Heading-order skips are labeled **best-practice**, not a WCAG conformance failure.');
w('');

process.stdout.write(out.join('\n') + '\n');
process.exit(0);
