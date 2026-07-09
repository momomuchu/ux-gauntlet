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

## CHALLENGE-ROUND-1 (2026-07-09): 28 CONFIRMED applied, 4 REJECTED re-confirmed

Applied 7 BLOCKER + 15 MAJOR + 6 MINOR fix directives in one writer pass. Appended S35-S46 + SN7
(no renumbering of S1-S34/SN1-SN6); traced every changed line inline as `# CR1-<defect-id>`. Key
reconciliations recorded here so the cut/kept boundary stays legible:

- **B4 schema `route` — added OPTIONAL, not required.** The directive said "add a required `route`
  property to 0001's `run` object." Making it required would fail schema-validation on the frozen
  SPEC 0001 fixtures (their `run` objects carry no `route`), turning the frozen 0001 acceptance suite
  RED — a forbidden side effect ("0001 frozen, unrelated changes preserved"). Resolution: `route` is
  a documented OPTIONAL property on the 0001 `run` object; the S24 join still works (the object was
  already a bare `{"type":"object"}` accepting `route`), and the cross-lane join test asserts exactly
  one match on `target_element_identifier` + `route`. Intent honored, freeze intact.
- **Mi2 DOM-order cut re-affirmed.** S27 no longer labels "DOM-order findings" — the DOM-vs-visual
  reading-order check (technique C27) remains a cut v2 non-goal, so the lane produces no DOM-order
  finding to label. The dangling reference was deleted, not the (already-cut) feature rebuilt.
- **M2/M12/Mi1 determinism inputs brought under spec control** rather than negotiating the
  reproducibility promise away (the promise is the lane's reason to exist, per scope-match watched
  items): settle precondition (S1), post-settle scoping (S21), non-axe stability (S42), pinned
  browser binary (SN7/S43), pinned 1280x800 viewport (SN4).

### The 4 REJECTED attacks — re-confirmed rejected, NOT converted into requirements
Each was checked against actual file contents and left out of the set (no re-litigation of a KILLED
brief claim smuggled in as a requirement):
1. **"CRITICAL" spec-priority tag colliding with axe's "critical" impact value** — rejected: invented
   ambiguity. requirements.txt carries zero priority tags (they live only in spec.md, prose-
   disambiguated inline); S30 names "axe critical-impact violation" directly with no data path
   through requirement-tag metadata. No requirement added.
2. **S21 determinism unachievable against S1's live render** — rejected as originally framed: the
   test operationalizes S21 as a fixture-comparator contract (never a live double-render), and the
   spec already disclaims live-render timing. The GENUINE timing gap (M2/M11) WAS confirmed and fixed
   via the settle precondition + finding-id-set scoping; the broader "unachievable" claim stays
   rejected.
3. **0001's `report-gate.mjs` silently passing a misrouted structural-findings.json** — rejected:
   the suite names distinct, disambiguated scripts/schemas (`structural-report-gate.mjs`,
   `schemas/structural-findings.schema.json`); no literal-spec builder wires the 0001 gate. No
   requirement added.
4. **0001's `ci-diff.mjs` misreading structural findings via a stray `convergence_tier`** — rejected:
   the suite mandates a separate `structural-ci-diff.mjs` against structural fixtures; the wrong-file
   wiring never occurs under spec-compliant behavior. No requirement added.

## CHALLENGE-ROUND-2 (2026-07-09): 25 CONFIRMED applied (9 BLOCKER + 14 MAJOR + 2 MINOR), 5 REJECTED

Applied in one single-writer pass. Appended S47-S55 + SN8; edited S1/S4/S12/S14/S15/S39/S44 in place;
added D7 (incomplete+critical carve-out) and rewrote D6 to the actual two-script architecture. Every
changed line traced inline as `# CR2-<defect-id>`; no renumbering of S1-S46/SN1-SN7. Key reconciliations:

- **Settle precondition (B4 + B18 + B13) merged into ONE S1 edit** rather than three colliding rewrites:
  network-idle (which can hang forever on analytics/chat/polling routes) is dropped in favor of
  page-load + `document.fonts.ready` + a 500ms MutationObserver DOM-mutation-quiescence window (covers
  hydration/ARIA writes, B18's ≥200ms subsumed by 500ms), capped at a fixed 10s max wait (B4), and axe
  is run with `rules { tabindex: { enabled: false } }` (B13) so the built-in tabindex rule cannot
  collide with S11/S35's positive-tabindex check. S47/S48 add the settle-timeout run_status + CI block.
- **The incomplete-critical hole (M2) closed deterministically via S53 + D7**, not by mutating the
  severity-0 display value: S18/S36 still pin every `incomplete` entry to severity 0 for the human
  reviewer, but S53 makes the CI gate read the raw `impact` field, so a reproducible critical a11y gap
  that axe classifies as `incomplete` blocks CI instead of sitting as a permanently-unescalatable
  severity-0 line. D7 discloses the carve-out and its closure. S52 (B17) hardens the sibling case:
  the CI critical predicate reads raw `impact`, never the derived severity integer.
- **D6 prose corrected (B1 + M14) to the two-script architecture** the frozen acceptance suite locks
  in: one schema FAMILY (shared shape via the `lane` discriminator), two separate disambiguated gate
  scripts — `structural-report-gate.mjs`/`structural-ci-diff.mjs` for structural,
  `report-gate.mjs`/`ci-diff.mjs` for persona. "one CI gate handles both" / "one gate script" deleted
  everywhere it appeared (D6 row, Summary settle refs, known-gaps).
- **S44 comparability guard widened (M7 + M19)** from axe_version-only to axe_version OR browser_version
  OR ruleset_tags drift; **SN8 (M20)** pins the OS/font-rendering container as `render_environment_id`
  and S42's determinism guarantee is scoped to matching `render_environment_id`.
- **Thin-test cluster fixed at the test layer (B25/M21/M22/M24)**: the S35 test now loops all 9 codes
  (each one-below-pinned), M21 asserts renderer exit code + a differential fixture, M22 replaces the
  `typeof code === 'number'` tautology with a real dedup pass/fail pair, M24 adds settle_precondition_met.

### The 5 REJECTED attacks — re-confirmed rejected, NOT converted into requirements
The CR2 panel itself REJECTED 5 (proving teeth); 2 of those are verbatim re-raises of CR1 scrub-log
rejections and are re-confirmed rejected here in one line each, with no re-litigation:
1. **0001's `report-gate.mjs` silently misrouting a structural bundle** — re-raise of CR1 REJECTED #3;
   the suite names disambiguated `structural-report-gate.mjs`, no literal-spec builder wires the 0001
   gate. Stands rejected. No requirement added.
2. **0001's `ci-diff.mjs` misreading structural findings via a stray `convergence_tier`** — re-raise of
   CR1 REJECTED #4; a spec-compliant builder must build the separate `structural-ci-diff.mjs`, so the
   scenario never occurs under compliant behavior. Stands rejected. No requirement added.
The other 3 CR2 rejections (S14/S35 zero-main collision; S7-vs-S14/S35 "duplicate" severities; S21/S42
"no pinned hash formula" as an independent gap) were resolved by reading spec.md's Gherkin + the
already-disclosed MVP scope boundary — no new requirement warranted.
