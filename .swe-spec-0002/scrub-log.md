# Scrub log — SPEC 0002 structural lane: what was cut and why (2026-07-09)

The brief (§5) already ran the scope discipline; this log records which candidate checks were cut
from the MVP set and why, so the 40-line requirements set carries no speculative padding.

| Cut item | Reason |
|---|---|
| Focus-order gating (WCAG 2.4.3) | out-of-scope for MVP — 0% automatable per Deque's own criteria-level data (brief §3, [4]); disclosed in the validity envelope (S26) as a manual-testing gap, never a pass/fail gate |
| Focus-visible gating (WCAG 2.4.7 / 2.4.13) | out-of-scope — 0% automatable, same rationale; a gate on it would be a false certainty |
| Keyboard-trap / full keyboard-operability testing | out-of-scope — not automatable by axe-core; manual/AT territory |
| Readability-style auto-detected main-content fallback | over-complex + inferential for MVP — the fallback is a scoring heuristic, not a containment test; MVP requires an operator-declared selector (D2/S13). Named v2 advisory-only feature |
| DOM-vs-visual reading-order check (technique C27) | not important enough for MVP + judgment-heavy — multi-column/CSS-grid/RTL produce legitimate mismatches; a hard gate would be noise. Deferred to v2 (flagged-for-review signal only) |
| Multi-route / site-wide crawl | out-of-scope — single operator-supplied route list per run, mirroring SPEC 0001's operator-supplied-scope discipline (never agent-invented scope) |
| WCAG AAA criteria in the gate | low-ROI for MVP — AAA is impractical as a site-wide conformance target per WCAG's own guidance; advisory-only later |
| Merging structural + persona into one "UX score" | cut on principle (paramount, brief §1/§3) — a blended number hides which axis moved; the two stay separate artifacts cross-referenced by route + target_element (S23/S24) |
| "Simplify to pass/fail" report mode | cut — would hide the `incomplete`/needs-manual-review distinction S18 exists to preserve; the false-negative failure mode this lane avoids |
| Structural-lane-as-cheap-pre-flight-gate for the persona lane | deferred to v2 (brief §6.3) — MVP lanes stay independent/parallel with no cross-lane gating (D3/S34); the sequencing optimization is not a scoring change and can wait |
| Pixel-level OCR redaction of screenshots | out-of-scope — inherited from the SPEC 0001 boundary; the structural lane emits DOM-derived findings, not screenshot pixels |
| bare axe-core wrapper (generic linting with no app intent) | cut as insufficient — the lane's headline differentiator is tying the audit to THIS app's declared main content (S12), not generic rule-running; a wrapper alone would not justify a second lane |

## Rationale note — why the CI bar is stricter than SPEC 0001 (kept, not cut)
D1/S30 adds a stricter gate than the persona lane's severity-4-only bar: any axe critical-impact
violation blocks. This was deliberately NOT scrubbed toward parity because deterministic checks carry
no persona-reliability discount — a critical-impact axe violation is a reproducible fact, unlike a
probabilistic persona judgment. Marked reversible so the founder can relax it to parity later.
