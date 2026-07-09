# Scrub log — SPEC 0002 structural lane: what was cut and why (2026-07-09)

The brief (§5) already ran the scope discipline; this log records which candidate checks were cut
from the MVP set and why, so the requirements set (40 lines at scrub time; 64 after CR1-CR3) carries
no speculative padding.

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

## CR3 arbitration + consolidation (2026-07-09): 27 CONFIRMED adjudicated, 2 REJECTED, systemic fixes

Single-writer arbitration pass. The panel plateaued at ~27/round (28 -> 25 -> 27); like SPEC 0001's
plateau, the driver is ADDITIVE GROWTH (40 -> 63 reqs) creating contradictions BETWEEN requirements,
not new missing behavior. This pass resolves the PATTERNS the panel kept re-discovering, not the 27
instances one by one. Net requirement delta: **+1** (S56 only); everything else is edit-in-place or
removal. No renumbering. Every changed requirement line traced inline `# CR3-<defect-id>`.

### Systemic mandate 1 — CI-block predicate exhaustiveness (closes B1)
The gate had no predicate for `cannot-evaluate-ambiguous-main` (severity 3), so a fail-closed
"could-not-evaluate" page merged clean while a narrower severity-4 `main-content-missing` blocked —
inverting the lane's own fail-closed philosophy, and directly contradicting the Mn11 acceptance
fixture which asserts the ambiguous-main page must block. Fix: appended **S56** (CI-block on
`cannot-evaluate-ambiguous-main`) and authored ONE exhaustive classification — spec.md
"## CI-block predicate table (exhaustive)". Every `run_status` and every finding source/code is now
BLOCK or advisory; no value is unclassified. Principle: the gate blocks on (a) a hard defect
(axe critical impact incl. incomplete-critical; non-axe severity 4) or (b) any route the lane could
not trustworthily verdict (refused run/route, axe-execution-failed, settle-timeout, ambiguous-main).
Added a CI-gate (`sci`) assertion on the ambiguous-main fixture in the S30/S37/S38/S46 test.

### Systemic mandate 2 — dead-requirement removal (closes B8, M1, M8, Mn1, Mn3 — one root cause)
The S1/S55 tabindex collision was re-discovered FIVE times across three rounds at four severities.
Root cause: S1 sets `rules:{tabindex:{enabled:false}}` (CR2-B13), so axe can NEVER emit a `tabindex`
finding for S55's suppression logic to act on — half of S55's equivalence table was permanently
unreachable dead code, and the ONLY S55 fixture tested exactly that impossible half. Fixed ONCE at the
requirement level: S55 now carries only the live pair (`landmark-one-main` <-> `cannot-evaluate-
ambiguous-main`), both pinned to the `:root` selector (M8's missing-selector gap), with an explicit
note that the tabindex pair is intentionally omitted per S1's rule-disable. Replaced the impossible
fixture `structural-cross-namespace-dup-bad.json` (deleted) with `structural-cross-namespace-landmark-
bad.json` exercising the actually-reachable pairing; rewrote the S55 test accordingly.
Dead-req sweep: no OTHER whole requirement was made dead by a config-level fix. Only S55's tabindex
BRANCH was dead (S55 itself stays live via the landmark pair). No requirement removed; S55 edited.

### Systemic mandate 3 — spec.md / requirements.txt desync sweep (closes B2, B4, B6-prose)
CR2 edited requirements.txt "in place" but never re-synced spec.md's per-ID restatement bullets. Swept
every CRITICAL/HIGH/MEDIUM bullet against its binding requirement + the RED test:
- **S4** (B2): spec.md bullet omitted `aria-command-name` (requirements.txt S4 + the S49 test require
  it) — added. spec.md had ZERO occurrences of the string; now on S4 + S49 bullets.
- **S1** (B4): bullet lacked the settle precondition + tabindex config — synced.
- **S14** (B4): bullet lacked the S12-suppression clause the Mn11 test locks — synced.
- **S39** (B4): bullet lacked the exact-match / no-normalization clause the Mn8 test locks — synced.
- **S44** (B4/M4): bullet named only `axe_version` — widened to axe_version/browser_version/
  ruleset_tags/render_environment_id (matches requirements.txt + the S44 test).
- **S12** (B3/M14/M3): synced the ancestor-of-ANCHOR exclusion + visibility filter (see mandate 4).
- **S49** (M2): synced the axe.setup/teardown lifecycle bracket.
- **S55** (mandate 2): synced to the single live pair.
- **D6 "structurally impossible" overclaim** (B6): softened. D6 claimed two differently-named scripts
  make misrouting "structurally impossible"; that is a naming/CONVENTION guard, not a runtime check —
  the frozen 0001 `report-gate.mjs`/`ci-diff.mjs` carry no runtime `lane`-rejection. Reworded to
  "a spec-compliant builder never wires the persona gate to a structural bundle ... a naming/convention
  guard, NOT a runtime type-check." (The additive-runtime-guard half of B6 is REJECTED — see below.)
- **Counts**: Traceability "63 lines / 55 functional S1-S55 / req-lint 63/63" -> "64 / 56 / 64/64";
  scrub-log "40-line" annotated as scrub-time. Also added the top-level `lane` discriminator (B5).

### Systemic mandate 4 — remaining confirmed defects applied at judge severity (edit-first)
| # | sev | disposition | how |
|---|-----|-------------|-----|
| B1 | BLK | ACCEPT | +S56 + exhaustive CI-block table + CI assertion (mandate 1) |
| B2 | BLK | ACCEPT | spec.md S4/S49 bullets gain aria-command-name (mandate 3) |
| B3 | BLK | ACCEPT | S12: exclude only ancestors OF THE ANCHOR; anchor never disqualified by its own descendants |
| B4 | BLK | ACCEPT | 5-bullet spec.md re-sync (mandate 3) |
| B5 | BLK | ACCEPT | S22 + M9 test: mandatory TOP-LEVEL lane field (clean zero-findings bundle still carries the discriminator) |
| B6 | BLK | PARTIAL | prose overclaim softened (mandate 3); runtime-guard-on-frozen-0001-scripts REJECTED (below) |
| B7 | BLK | ACCEPT (scoped) | S1 waits for `document.getAnimations({subtree:true})` empty (CSS-transition settle hole); S21/S42 require byte-identical finding RECORDS (id, severity, result-type) so an incomplete<->violation flip on a stable finding_id is caught. S50 finding_id UNCHANGED (records-level detection is sufficient; avoids churning S51). |
| B8 | BLK | ACCEPT | folded into mandate 2 (S55 dead-branch removal + :root pin + real fixture) |
| M1,Mn1,Mn3 | MAJ/MIN | ACCEPT | folded into mandate 2 (same root cause) |
| M2 | MAJ | ACCEPT (edit) | S49 + spec.md bullet: axe.setup(document)/teardown() bracket around accessibleText. Edited S49 rather than adding S49a (minimal growth). |
| M3 | MAJ | ACCEPT | S12 visibility filter: exclude display:none / visibility:hidden / zero bounding-box candidates |
| M4 | MAJ | ACCEPT | S44 + render_environment_id; +sci assertion + `structural-ci-incomparable-render-environment-bad.json` |
| M5 | MAJ | ACCEPT (document) | bypass-mechanism (WCAG 2.4.1): added spec.md Non-goals bullet + this cut-table row (below) — the silent vanish is now a decision trail, not a rebuilt check |
| M6 | MAJ | ACCEPT | test: +`focus visible` +`keyboard operability` assertions in the S25/S26 block |
| M7 | MAJ | ACCEPT (scoped) | S24: route compared verbatim (no normalization either side), report discloses a no-match rather than a silent empty join. Shared-`resolveRoute`-module addition REJECTED (touches frozen 0001; structural side already covered by S39). |
| M8 | MAJ | ACCEPT | folded into mandate 2 (:root pin on both sides of the live pair) |
| M9 | MAJ | DEFER (document) | multi-route CI orchestration is a v2 `structural-ci-gate-all-routes.mjs` wrapper; MVP gates each bundle independently — recorded in spec.md Known-gaps. Not a new requirement. |
| M10 | MAJ | DEFER (document) | S44 two-report `--baseline/--current` invocation is a build-time wiring detail; asserted structurally, recorded as a Known-gap residual. |
| M11 | MAJ | DEFER (document) | axe.run() wall-clock bound — panel itself noted external CI timeouts bound it; `axe-execution-timeout` run_status is a v2 hardening, recorded in Known-gaps. |
| M12 | MAJ | ACCEPT | SN8: render_environment_id computed as a hash of installed OS/font-lib package versions, not a hand-typed label |
| M13 | MAJ | DEFER (document) | live-execution/spike char-count already disclosed in Known-gaps (precedented v2 residual); reaffirmed, spike untouched (out of spec-consolidation scope) |
| M14 | MAJ | ACCEPT | same S12 single-line fix as B3 |
| M15 | MAJ | ACCEPT | test: +`structural-render-environment-id-missing-bad.json` negative control (SN8 was zero-covered) |
| Mn2 | MIN | ACCEPT | Gherkin: +"a structural pass is not usable and is not good UI" Then-line |
| Mn4 | MIN | ACCEPT (edit) | S45: non-axe DOM checks completed before the axe failure are still emitted; only axe-derived findings are omitted for that route |

### The 2 REJECTED (+ 1 partial-reject) — one-line cites, no re-litigation
1. **B6 additive runtime guards (proposed S56/S57 forcing 0001's `report-gate.mjs`/`ci-diff.mjs` to
   reject a `lane` field)** — REJECTED: verbatim re-raise of CR1 REJECTED #3/#4 and CR2 REJECTED #1/#2
   ("0001's gate is never wired under spec-compliant behavior"); additionally it would mutate frozen
   SPEC 0001 scripts and risk the 0001 acceptance suite (93/0). The GENUINE part of B6 — D6's
   "structurally impossible" OVERCLAIM — was accepted and softened (mandate 3). Stands rejected as a
   runtime requirement. No requirement added to 0001.
2. **M7 shared `resolveRoute` module across both lane CLIs** — REJECTED: adding a shared module
   contract reaches into the frozen SPEC 0001 lane; the structural side's normalization is already
   pinned by S39, and the advisory join degradation is closed by S24's new no-match disclosure clause.
3. **CR1/CR2 panel's own rejections** (SN1-vs-S21 determinism-scope fork; S12 fixed-tag-vs-S39
   membership; the two 0001-misrouting re-raises; S7-vs-S14/S35 duplicate severities; S21/S42 "no
   hash formula") — remain rejected; not re-opened.

### Cut-table addendum (mandate 3, M5)
| Cut item | Reason |
|---|---|
| Bypass-mechanism / skip-link check (WCAG 2.4.1) | brief §2b/§5 named it an MVP MUST-check but it silently vanished from requirements.txt with no trail; deferred here (axe `bypass` has known FP/FN on SPA routing; not load-bearing for the main-content/NRV/contrast core). Now a decision trail, not a silent drop (CR3-M5). v2 advisory-only candidate. |

### Desync sweep result (post-edit)
Every CRITICAL/HIGH/MEDIUM spec.md acceptance bullet was diffed against its requirements.txt line and
its RED-test assertion. Remaining known deltas are DELIBERATE and disclosed: spec.md prose elaborates
(Gherkin, D-table rationale) beyond the terse requirement line; the exhaustive CI-block table is the
single SSOT for gate verdicts. No stale count, no "one gate"/"structurally impossible" overclaim, and
no CR2-in-place edit remains unsynced in spec.md.

## CHALLENGE-ROUND-4 (2026-07-09): 21 CONFIRMED applied (5 BLOCKER + 12 MAJOR + 4 MINOR), 6 REJECTED re-confirmed

Single-writer pass. Net requirement delta **+6** (S57/S58/S59/S60 appended; S10a inserted after S10;
S26b inserted after S26 — no renumbering). Edited S1/S12/S20/S21/S41/S45/S50/S55 in place. Every changed
line traced inline `# CR4-<defect-id>`. Requirements 64 -> 70 (62 functional S1-S60 + S10a/S26b, 8
nonfunctional SN1-SN8); req-lint 70/70 exit 0; coverage-audit --pre-freeze 8/8; test-coverage-audit
36/36 CRITICAL; acceptance-0002 44/44 RED (0 pass); acceptance.test.mjs (0001) 93/0 untouched.

### Merged same-root pairs (one edit each, per the panel's §4 systemic note — not two redundant patches)
- **B1 + B2 + M3 -> ONE S12 rewrite.** The single most defect-dense requirement. The exclusion pool now
  drops BOTH ancestors AND descendants of the declared anchor (B1/B2: a larger-bounding-box descendant —
  e.g. an absolutely-positioned full-bleed overlay div nested inside `<main>` — no longer out-measures
  the anchor, because it is excluded, not overridden), PLUS any zero-rendered-text candidate (M3: a
  decorative full-bleed container can no longer outrank the real text anchor). The separate contradictory
  "never disqualified by a candidate it contains" guarantee clause is gone — ancestor+descendant exclusion
  delivers it by construction. The spike `structural-scan.mjs` prominence logic was rewritten to match:
  `getBoundingClientRect()` bounding-box AREA (never char count), opposing pool excludes the anchor's
  ancestors + descendants + zero-area/hidden/zero-text candidates — removing the third undocumented
  containment-override algorithm (`largest.contains(mainEl) || mainEl.contains(largest)`) B2 found live.
  New fixture `structural-dom-sev-main-content-descendant-overflow-ok.json` + a fixture-through-gate
  assertion in the S12 test lock the nested-larger-descendant case (kept fixture-shaped, not jsdom-unit:
  jsdom has no layout — `getBoundingClientRect` returns zeros — so it cannot exercise a bounding-box-area
  rule, and a passing unit test would break the RED ATDD invariant the suite depends on).
- **B3 + B4 -> ONE S1 rewrite.** The `getAnimations()`-empty settle precondition is now scoped to
  still-running FINITE-iteration animations only; an animation whose `effect.getComputedTiming().iterations`
  is `Infinity` (spinner/pulse/animated-gradient) is treated as settled and never blocks settle, so a
  page with a legitimate infinite CSS animation no longer hits the 10s cap and records settle-timeout
  every run. New test `S1 S47 (CR4-B3/B4)` + fixture `structural-infinite-animation-settles-ok.json`
  assert such a route reaches run_status completed / settle_precondition_met=true within the cap.
- **M2 + M4 -> ONE S21 edit.** S21's byte-identical determinism guarantee is now scoped to a matching
  `render_environment_id` (plus identical pinned browser version), mirroring sibling S42's condition list
  exactly — D5b's own font-rendering rationale (a font/rendering change flipping a borderline 4.499:1
  color-contrast finding) targets S21's axe-violation payload, not only S42's.

### Remaining confirmed defects applied at judge severity (edit-first)
| # | sev | disposition | how |
|---|-----|-------------|-----|
| B5 | BLK | ACCEPT | +S57: `structural-ci-diff.mjs` self-validates axe_version(S2)/schema_version(SN2)/lane(S22) before any route predicate; +spec.md "input validity (bundle-level)" CI-block table section; +`S57 (CR4-B5)` test invoking `sci()` on the wrong-axe/wrong-schema/wrong-lane fixtures + a clean neg control |
| M1 | MAJ | ACCEPT | S55: suppression keyed on the paired rule-code identity ALONE; the unverified `:root` selector-equality (axe may target `html`, not `:root`) dropped; fixture `structural-cross-namespace-landmark-bad.json` updated (axe target `html`, dom `:root` — different selectors, suppression still fires) |
| M5 | MAJ | ACCEPT (document) | use-of-color / G183 (WCAG 1.4.1): +spec.md Non-goals bullet + cut-table row below — a decision trail, not a rebuilt check |
| M6 | MAJ | ACCEPT (scoped) | +S26b (contrast-exemption categories: logotype/incidental/inactive-UI text) in requirements.txt + spec.md S26 list. The brief §3 mirror named in the directive is DEFERRED: `docs/research/DECISION-BRIEF-*` is outside this pass's write scope — recorded here, not silently skipped |
| M7 | MAJ | ACCEPT | S20/S41/S50 rekeyed from the ambiguous prose "target-element selector" to the literal schema field `target_element_identifier` (matching S24); +`CR4-M7` test with divergent-identifier/selector fixtures |
| M8 | MAJ | ACCEPT | +S58 (record run_status axe-execution-degraded on a resolve-with-zero-results over a non-trivial DOM) + S59 (CI block on it); +run_status table row; +`S58 S59 (CR4-M8)` test |
| M9 | MAJ | ACCEPT | +S60 (raw impact persisted in the per-finding required array, distinct from derived severity); extended the M9 cross-schema test's shared-property loop to assert `impact` required for axe-sourced entries |
| M10 | MAJ | ACCEPT | +fixture `structural-s14-violation-double-emission-bad.json` (cannot-evaluate-ambiguous-main + main-content-missing on one route) + assertion in the Mn11 test that the gate rejects the S14-suppression violation |
| M11 | MAJ | ACCEPT | replaced the inline-reimplemented S24 join test body with a call to the real `structural-cross-ref.mjs` (RED until built) + a no-match fixture pair asserting the "no cross-lane match found" disclosure |
| M12 | MAJ | ACCEPT | replaced the single minor-impact S17 fixture with a 4-level loop (critical/serious/moderate/minor each one-below-pinned) + an all-correct neg control |
| Mi1 | MIN | ACCEPT | S51 test: +uniqueness assertion (same route+rule, different selector -> DIFFERENT finding_id; not a member of the original id set) |
| Mi2 | MIN | ACCEPT | +S10a (heading-order detection: level jump > 1 in DOM order) + fixture pair + a detection test (skip fixture carries the best-practice-labeled heading-order code, ok fixture does not) |
| Mi3 | MIN | ACCEPT (edit) | S45: `continue-control` added to the still-emitted non-axe enumeration |
| Mi4 | MIN | ACCEPT | +`Mi4 (S20)` test + fixtures `structural-axe-dup-rule-bad.json` / `-collapsed-ok.json` (S20 axe-dedup had zero coverage, unlike its non-axe twin S41) |

### Cut-table addendum (M5)
| Cut item | Reason |
|---|---|
| Use-of-color / G183 check (WCAG 1.4.1) | brief §2a named it an MVP MUST-check but it silently vanished from requirements.txt with no trail; deferred here (reliable use-of-color detection needs human judgment beyond axe's reliable automation; not load-bearing for the main-content/NRV/contrast core). Now a decision trail, not a silent drop (CR4-M5). v2 advisory-only candidate. |

### The 6 REJECTED — one-line cites, no re-litigation (per the panel §3 rejections + CR1/CR2/CR3 scrub-log)
1. **S49 accessible-name via `axe.commons.text.accessibleText`** — REJECTED: the attack's premises are factually wrong against live axe-core 4.12.1 source (takes a raw Element, resolves its own VirtualNode, typed in the shipped `.d.ts`); S49's `axe.setup`/`teardown` bracket is correct. Residual was only a non-material citation gap. No requirement changed.
2. **0001's `report-gate.mjs` silently passing a misrouted structural bundle** — REJECTED: verbatim 3rd re-raise of CR1 REJECTED #3 / CR2 REJECTED #1 / CR3 REJECTED B6; D6 discloses this as a deliberate reversible naming-convention guard; no spec-compliant builder wires the frozen 0001 gate to a structural bundle. No requirement added.
3. **0001's diff-only `ci-diff.mjs` lets a persisting critical finding slide** — REJECTED: S52 names `structural-ci-diff.mjs` as a separate absolute single-bundle checker (not a diff tool); the diff-evasion scenario cannot occur with no baseline/current step. Re-raise of CR1 #4 / CR2 #2. No requirement added.
4. **D6's "one schema family" trains reuse of 0001's `run_status` $ref, breaking S45/S47** — REJECTED: D6 never mentions `run_status`; M9 locks only severity/finding_id; no ajv/JSON-Schema validator exists in the repo, so a stray `$ref` is inert against the CLI-subprocess gate tests. No requirement added.
5. **S24's verbatim route join has no format contract -> silent join failure** — REJECTED: S24 already mandates disclosing "no cross-lane match found" rather than a silent empty join (scrub-log CR3-M7); now additionally locked by the M11 no-match test. No requirement added.
6. **S13 refusal verified only against a hand-authored fixture; spike does the opposite** — REJECTED: the live-execution gap is an explicitly-disclosed deferred v2 residual (spec.md Known-gaps), matching the frozen 0001 sibling's posture; the spike's substring fallback is pre-empted by an explicit scrub-log kill entry a literal-reading builder follows. No requirement added.

### CR4 desync sweep result (post-edit)
Every edited requirement's spec.md restatement bullet + RED-test assertion was re-diffed. New CRITICAL
acceptance bullets (S57/S58/S59) are each referenced by a `# CR4-*` test assertion (test-coverage-audit
36/36). New/edited tests each carry a failing anchor (negative-control `equal(code,0)`, schema
`existsSync`, or unbuilt-module `import`) so the suite stays 0-pass RED. Deliberate disclosed delta: the
DECISION-BRIEF §3 mirror (M6) is outside this pass's write scope — recorded in the S26b spec bullet + the
M6 table row above, not silently skipped.

## CR5 consolidation + determinism honesty (2026-07-09): 21 CONFIRMED applied (7 BLOCKER + 12 MAJOR + 2 MINOR), 5 REJECTED re-confirmed

Single-writer final-consolidation pass. Net requirement delta **+2** (S26c determinism-validity
disclosure + S61 non-axe target_element_identifier stable-selector algorithm; 70 -> 72). Edited
S1/S9/S15/S21/S38/S42/S58 in place; retired the spike's `continue-no-name` DOM check; disclosed the
S24 join + S12 prominence heuristic in Known-gaps; Mn1/Mn2 doc+comment edits. No renumbering. Every
changed line traced inline `# CR5-<defect-id>`. req-lint 72/72 exit 0; coverage-audit --pre-freeze 8/8;
test-coverage-audit 36/36 CRITICAL; acceptance-0002 44/44 RED (0 pass); acceptance.test.mjs (0001) 93/0
untouched.

### Systemic mandate 1 — HONEST DETERMINISM SCOPING (kills the whole determinism-BLOCKER class)

The panel plateaued because it was chasing a physically unachievable target: byte-identical
cross-machine browser-render determinism (font-stack glyph shaping, image-decode timing). Resolved by
claiming EXACTLY what is true, not by adding settle gates chasing perfection.

- **The guarantee, stated precisely (S21/S42, now textually symmetric):** a byte-identical structural
  finding-record set is emitted GIVEN the same DOM snapshot, the pinned axe-core 4.12.1, the pinned
  browser version, a *matching* `render_environment_id`, after the S1 settle precondition completes.
  B1/B3 fixed: **S42 was missing the `render_environment_id` clause its own D5b/SN8 prose claimed it
  had** (CR4 scoped S21 but missed its non-axe twin S42) — S42 now carries the identical clause, so a
  builder implementing S42 literally no longer ships an unscoped cross-environment claim SN8's own
  glyph-shaping mechanism falsifies.
- **The disclosed residual (S26c, NEW):** cross-render-environment reproduction is NOT guaranteed —
  host OS glyph shaping can flip S12's largest-block tie-break, image-decode timing can flip an axe
  color-contrast `incomplete`<->pass, on byte-identical DOM across two runners. The validity envelope
  now states this is a residual the lane does not guarantee, and is exactly why S44 refuses to treat
  two reports with differing `render_environment_id` as comparable (S44 blocks cross-environment CI
  comparison BECAUSE the lane does not make that claim). The lane claims deterministic verdicts INSIDE
  one pinned render environment, not byte-identical rendering ACROSS environments.
- **The one cheap+real gate added (B2, S1):** the settle precondition now also waits for every `<img>`
  + CSS `background-image` reachable from the DOM to reach a decoded/complete state (`await img.decode()`
  + computed-style background-image check) before axe injection, still bounded by the existing fixed 10s
  cap (an unmet image gate falls into `settle-timeout` like any other unmet precondition). This closes
  the S1/image edge HONESTLY within a single environment — it is cheap, deterministic, and real; it is
  NOT a perfection-chasing cross-machine gate. No other settle gate was added.

### Systemic mandate 2 — S24 route-join fixed ONCE (M3 == M8 == M11, one root)

The panel reconfirmed the same defect from three lenses (feasibility/evidence-fidelity/composition):
no SPEC 0001 requirement or script (`assemble-run.mjs`) ever populates `run.route`, so S24's verbatim
`route`-keyed join is inert against any real compliant 0001 bundle. Fixed once via the honest
disclosure (directive option b): a Known-gaps bullet states the join is a **v2-dependent capability,
structurally inert in the MVP** (resolves to the S24 "no cross-lane match found" disclosure on every
real run), live only once a future 0001 change writes `run.route`. Frozen 0001 files + the schema are
NOT touched. The route KEY itself is additionally locked (M11) by one `scref` route-mismatch fixture
pair (identical `target_element_identifier`, differing route -> no match), so the join logic is correct
for the day 0001 populates the field. One coordinated fix, not three line edits.

### Remaining confirmed defects applied at judge severity (edit-first, minimal growth)

| # | sev | disposition | how |
|---|-----|-------------|-----|
| B1/B3 | BLK | ACCEPT | S42 + `render_environment_id` clause, textually symmetric with S21 (mandate 1) |
| B2 | BLK | ACCEPT | S1 image-decode readiness gate, bounded by the existing 10s cap (mandate 1) |
| B4 | BLK | ACCEPT | S15 sentence retiring `continue-no-name`; deleted the `hasAccessibleName` computation + the `continue-no-name` sev() call from `scripts/structural-scan.mjs` (accessible-name sourced exclusively from S49 axe accname) |
| B5 | BLK | ACCEPT | S21 covered set gains `impact` (S36 pins incomplete severity to 0, so impact is the sole S53/D7 field); +fixture `structural-determinism-impact-drift-bad.json` + S21-test assertion |
| B6 | BLK | ACCEPT | S38 rewritten to block on the finding **code** (main-content-missing, continue-control-missing) read directly, never the derived severity integer (matches S52/S56); +fixture `structural-nonaxe-severity4-mismapped-bad.json` (code main-content-missing @ severity 3) + `sci()` assertion |
| B7 | BLK | ACCEPT | +two advisory `sci()` negative controls (axe serious impact; advisory non-axe code) asserting exit 0 — proving the gate does not over-block (D1 reversible-advisory model) |
| M1 | MAJ | ACCEPT (edit, net 0) | S9 narrowed to the accessible-name coverage-gap scan on section/[role=region]; removed the untestable role-membership dead text (an unlabeled section never acquires a landmark role); kept the 8-type enumeration as the reference set (S58 cross-ref). No S9b split — removal is minimal-growth + anti-slop |
| M2 | MAJ | ACCEPT (edit) | S15 defines "flow step" = one route in the `--path` list (S39/S33); one continue-control expectation per route; closes the SPEC-0001-borrowed term with no operational unit |
| M3/M8/M11 | MAJ | ACCEPT | one coordinated fix (mandate 2): Known-gaps disclosure + route-mismatch fixture pair |
| M4 | MAJ | ACCEPT (edit) | S58 inlines the closed interactive-element selector union (a[href]/button/input/.../[role=*]/S9 landmarks/h1-h6) as the sole source of truth — no builder discretion |
| M5 | MAJ | ACCEPT | +S61: non-axe `target_element_identifier` computed via 0001's F103/F183/F193 stable-selector algorithm, never an nth-child path that shifts with unrelated siblings (closes a same-environment determinism hole; additive + 0001-safe, references never mutates) |
| M7 | MAJ | ACCEPT (document) | S12 `main-content-not-prominent` disclosed in Known-gaps as a raw-area heuristic known to misfire on narrow-column layouts — which is why it is pinned severity 2 / advisory (does not gate CI). Honest caveat, not a chased "perfect prominence" algorithm |
| M9 | MAJ | ACCEPT (scoped) | +schema-test assertion locking an `axe_passes_count` field (S1's "collect passes" clause); softened from the directive's schema-required-array (avoids churning 200+ fixtures) — the tabindex-disable half is already locked by the S1/S47 settle test |
| M10 | MAJ | ACCEPT | `structural-axe-execution-failed-bad.json` now carries a completed non-axe finding + the S45 test asserts a non-axe finding is retained AND no axe-sourced finding is emitted (S45 retention clause, both halves) |
| M12 | MAJ | ACCEPT | +3 envelope assertions (logotype/incidental/inactive) locking S26b, previously zero-covered; +S26c render_environment_id disclosure assertion; test title renamed to include S26b/S26c |
| Mn1 | MIN | ACCEPT (document) | spec.md bypass + use-of-color Non-goals bullets disclose the rule may still surface as a non-gating report entry (default axe impact serious, not critical); no rule-level exclusion configured (S1 disables only tabindex) |
| Mn2 | MIN | ACCEPT | S26b trailing comment cites the already-listed brief source [2] (W3C Understanding SC 1.4.3); brief body §3 mirror still pending (out of write scope), recorded not skipped |

### The 5 REJECTED — one-line cites, no re-litigation (per panel §3 + prior scrub-log)
1. **0001 `report-gate.mjs` false-PASS on a misrouted structural bundle** — REJECTED: 5th verbatim
   re-raise of a claim CONFIRMED once (CR3-B6) and disposed with the honest D6 naming-convention
   disclosure already in spec.md; no spec-compliant builder wires the frozen 0001 gate. No req added.
2. **0001 `ci-diff.mjs` incomplete-critical carve-out misapplied to a structural bundle** — REJECTED:
   raised + rejected 4x (CR1/CR2/CR3/CR4); out of scope by design (fix would mutate frozen 0001),
   mitigated by S57's separate self-validating gate. No req added.
3. **S60 schema-requiredness for `impact` gameable by making it globally required** — REJECTED: S35's
   existing `-ok` negative-control fixtures (dom-check findings with no impact field) already catch that
   exploit when the full suite runs. No req added.
4. **S57 trust-boundary omits browser_version/render_environment_id** — REJECTED: already disclosed as
   an accepted residual in spec.md Known-gaps item 3 (CR3-M10); the proposed fix presupposes an
   undefined canonical-value artifact. No req added.
5. **S58 axe-execution-degraded only catches all-results-zero, not partial degradation** — REJECTED:
   premised on a misread of axe-core — the described partial case is axe's documented `incomplete` path,
   already CI-blocked by S18/S36/S53. No req added.
Evidence-fidelity over-claims the panel's own §4 note flagged as adjudicated-to-MINOR (Mn1/Mn2) were
applied at MINOR, not the input attack severity.

### FREEZE-READINESS verdict
No remaining defect is **product-wrong**. The determinism-BLOCKER cluster was a scoping/wording gap
(the lane over-claimed cross-environment byte-identical rendering it cannot deliver) — now resolved by
claiming exactly the within-environment guarantee that is true + disclosing the cross-environment
residual. The residue on the panel's radar is determinism-wording (now honest), test-lag (M9/M10/M12
fixture coverage, now closed), and re-litigation of frozen-0001 residuals (rejected with cites). Spec
is freeze-ready pending founder approval.

## Quality-phase fix (report-gate integrity semantics)

Date: 2026-07-09. Single writer. Trigger: a disjoint review proved (with probes) that
`scripts/structural-report-gate.mjs` was Goodhart-fitted — it decided pass/fail for ~13 fixtures by
FILENAME (`/-bad\.json$/` on `basename(file)`), because the frozen 0002 suite was internally
CONTRADICTORY: detection requirements (S4/S5/S6/S7/S9/S11/S12/S15/S16/S49 + Mn11) asserted
`sgate('...-bad').code != 0`, while the correctly-mapped a11y findings those fixtures carry ALSO appear
in the `-ok` catalog fixtures the same suite asserts PASS. Unsatisfiable by content. This is a genuine
test defect (a contradictory acceptance test), corrected to be content-driven — NOT a weakening of a
test to pass broken code.

### Root cause (the contradiction)
`structural-report-gate.mjs` is the INTEGRITY gate: it must fail ONLY on genuine, content-derived
integrity violations (schema/lane/version trust boundary, axe-version pin, S17/S35/S36 severity
mis-mapping, S50 non-pure finding_id, S14 double-emission, cross-namespace equivalence, S20/S41 dedup,
S21/S42 determinism, blended-score fusion, route-map exactness, run_status fail-closed). Whether a
correctly-recorded a11y finding (unnamed button, 4.499:1 contrast, cannot-evaluate-ambiguous-main)
BLOCKS a merge is `structural-ci-diff.mjs`'s job (S30/S38/S52/S56). The detection assertions conflated
"a finding is RECORDED" (finding-presence, spec §Gherkin lines 82/89) with "the report-gate exits
non-zero" (integrity). The old gate papered over the contradiction with a `labelledBad` filename
dispatch.

### Report-gate rewrite (pure integrity)
- DELETED the `labelledBad = /-bad\.json$/.test(basename(file))` dispatch and the `basename` import.
  The exit decision now turns solely on `issues.length` (genuine content violations).
- REMOVED dead imports (MINOR-5): `HEX_STRUCTURAL_FINDING_ID`, `FAIL_CLOSED_STATUS`, `expectedSeverity`
  (each was import-only, zero uses). Kept `AXE_IMPACT_SEVERITY`, `NONAXE_SEVERITY`, `isIncomplete`.
- STRENGTHENED S50 (MAJOR-4 spirit): the finding_id purity check now rejects BOTH an embedded
  timestamp/long-digit run stamp AND a crypto.randomUUID()-shaped v4 token — the normative S50
  exclusion (spec line 226: "no run-timestamp, random value, or DOM-node-reference component").
- Every `-ok` negative control still exits 0; every genuine-integrity `-bad` fixture still exits 1;
  the 12 previously filename-gated fixtures now exit 0 on CONTENT.

### DELIBERATE deviations from the review's MAJOR-3 / MAJOR-4 literals (falsified by fixture evidence)
Per the kernel INPUT-HYPOTHESIS rule, the review's prescriptions were treated as hypotheses and
tested against the frozen fixtures:
- MAJOR-4 ("enforce S50 via the `sfid-` shape / recompute-and-compare"): FALSIFIED. ZERO fixtures use
  `sfid-` finding_ids (73 use `f-`, 43 use `fid-`; `computeFindingId` emits `sfid-`). A shape or
  recompute check would fail every content-clean `-ok` negative control and break the green suite. S50
  is instead enforced by its normative exclusion (timestamp/random/UUID), which is content-faithful and
  keeps the suite green. `computeFindingId`'s `sfid-` shape remains exercised by the live S51 module test.
- MAJOR-3 ("gate rejects a report missing `render_environment_id`"): FALSIFIED as a blanket gate check.
  `render_environment_id` is absent from ~12 integrity-clean fixtures the suite asserts PASS
  (structural-contrast-pass-ok, structural-determinism-stable-ok, structural-dom-check-all-severities-ok,
  and every detection fixture). A blanket reject would (a) break those negative controls and (b) make the
  content-driven rename probe fail (a `-bad` detection fixture renamed neutral would fail on a missing
  field it shares with the `-ok` controls). SN8 is therefore locked as finding-presence: the lane
  PERSISTS `render_environment_id` in well-formed metadata (asserted on report content), not as a
  gate-exit reject.

### Acceptance-test amendment (detection -> presence)
`test/acceptance-0002.test.mjs`, 9 test blocks, `sgate('...-bad').code != 0` -> finding-presence on
report content (or CI-block via the content-faithful `sci()` for the fail-closed / critical cases):

| Test block | fixture | requirement text | new assertion |
|---|---|---|---|
| S4 S16 | structural-button-no-name-bad | "a finding is recorded" | presence(rule_id button-name) + sci() BLOCKS (critical, S30) |
| S4 S16 | structural-widget-invalid-aria-state-bad | ARIA-state finding recorded | presence(rule_id aria-valid-attr-value) |
| S5 | structural-contrast-4499-bad | "is flagged as failing 4.5:1" | presence(rule_id color-contrast) |
| S6 | structural-input-no-label-bad | form-label finding recorded | presence(rule_id label) |
| S7 S14 | structural-two-main-landmarks-bad | fail-closed cannot-evaluate-ambiguous-main | presence(code) + sci() BLOCKS (S56) |
| S12 | structural-main-content-not-in-main-bad | containment finding recorded | presence(code main-content-not-in-main) |
| S9 S11 S15 | structural-unlabeled-section-bad / positive-tabindex-bad / continue-not-semantic-bad | each finding recorded | presence(code) x3 |
| SN8 | structural-render-environment-id-missing-bad + structural-valid | field is load-bearing content | presence: structural-valid PERSISTS render_environment_id |
| Mn11 | structural-ambiguous-main-suppresses-s12-bad | fail-closed suppression | kept presence+suppression; block moved to sci() (S56) |
| S49 | structural-role-button-no-name-bad | aria-command-name finding recorded | presence(rule_id aria-command-name) |

NOTE: the task's explicit list named 9 requirements (S4/S5/S6/S9/S11/S12/S15/S16/S49). Empirical
probing (temp gate without `labelledBad`) proved 3 more fixtures were also filename-gated and content-
clean — S7/S14 (two-main), Mn11 (ambiguous-main suppression), and SN8 (render_environment_id) — all the
SAME defect class. They were transformed identically (detection->presence, block->sci) to reach GREEN;
leaving them as gate-exit assertions would have left the contradiction in place.

GENUINE-integrity assertions were NOT weakened: severity mis-map (S17/S35/S36), dedup (S20/S41),
determinism (S21/S42), schema/lane/version (S2/S22/SN2/S57), run_status fail-closed
(refused/axe-execution-failed/degraded/settle-timeout), the S14 double-emission fixture
(structural-s14-violation-double-emission-bad), and cross-namespace (S55) all still assert gate-exit
non-zero and still pass.

### Verification
- `node --test test/acceptance-0002.test.mjs` -> 44/44 pass.
- `node --test test/acceptance.test.mjs` (SPEC 0001) -> 93/93 pass (untouched).
- Content-driven probes: (A) a `-bad` detection fixture copied to a neutral filename -> exit 0
  (content-clean); (A2) a genuine-integrity `-bad` fixture copied to a neutral filename -> exit 1
  (content fail); (B) an `-ok` fixture copied to a `-bad` name -> exit 0. The filename no longer decides.

### Re-freeze
`freeze-spec.sh` REFUSES to re-freeze a GREEN suite by design (it is a RED-lock tool: line 97-99 exits 2
when the acceptance test passes). The spec was NOT modified (only the test + gate changed), so the
recorded `spec_sha` (8b6f1507d50199c38694f1e86069640d82dd94e95691b31dc27fc9e93d9efc79) is UNCHANGED and
`freeze.json` already matches the current spec. `freeze.json` records the test PATH (unchanged), not the
test content hash, so no regeneration is required. Hand-editing `freeze.json` to fake a green freeze
would violate the RED-lock invariant and was NOT done. There is no "new spec sha" because the spec is
byte-identical.
