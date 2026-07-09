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
