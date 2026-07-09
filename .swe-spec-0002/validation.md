# Validation — SWEBOK KA1 §5 set criteria (SPEC 0002 structural lane, 2026-07-09)

## Complete
The set is complete against DECISION-BRIEF-0002-STRUCTURAL.md: every MUST in brief §2 (a11y/WCAG
checks, semantic structure, main-content correctness, interactive-component correctness), §4
(severity mapping + determinism), and §5 (MVP scope) maps to at least one requirement (S1-S34,
SN1-SN6); every brief §5 explicit non-goal maps to the spec's Non-goals section rather than a silent
omission. All six founder decisions D1-D6 are encoded in the decisions table and marked reversible.

Boundary coverage: S14 fixes the pathological main-landmark-count boundary (a count other than
exactly 1 -> fail closed, never a false pass); S5 fixes the contrast boundary at 4.499:1 with no
rounding; S11 fixes the tabindex boundary (any value greater than 0); S17/S18 fix the severity
ordinal boundary (critical=4 down to minor=1, incomplete pinned at 0); SN4 bounds the render
environment to a single 1280px viewport.

Exception coverage: S18 defines the axe `incomplete` exception path (surface at severity 0, never
drop, never report as a pass — the false-negative failure mode this lane exists to avoid); S13
defines the missing-selector refusal path; S14 defines the ambiguous-main exception (cannot-evaluate,
not a guess); S30 defines the CI block condition precisely (any axe critical-impact violation).

Security coverage: the lane audits only the operator-supplied route list (S33) with no autonomous
route discovery; SN3 keeps audit data on the operator's machine for a localhost route (no third-party
egress); the lane runs with zero LLM judgment (S19) so no model round-trip carries page content off
box for the scoring decision. Structural findings are never fused with persona findings (S23), so no
blended artifact can leak one lane's data shape into the other.

## Concise
Each line states one testable obligation; req-lint passed 53/53 (S1-S46, SN1-SN7) with zero
compound/vague/unbound findings — see .swe-spec-0002/lint-result.txt. The scrub log (stage 6) records
the brief §5 v2 non-goals as cuts rather than carrying them as padding, so the 53-line set has no
speculative filler. Every CHALLENGE-ROUND-1 append kept the atomic rule (comma lists only, no
' and '/' or ' joining two obligations), e.g. S35's severity table is a single comma-separated
code→severity mapping, not a compound line.

## Consistent
No requirement contradicts another. The strict CI bar (D1/S30 — any critical-impact blocks) does not
contradict the 0-4 severity mapping (S17) because gating and scoring are separate concerns, exactly
as SPEC 0001 keeps F26 gating separate from F12 scoring. The pluggable WCAG target (D4/S31) is
consistent with the pinned ruleset tags (S3) because the target level selects which tag set is active,
it does not unpin the axe-core version (S2). Lane independence (D3/S34) is consistent with the
cross-reference rule (S24): the lanes share a `target_element_identifier`/route identifier for
reporting without either gating the other.

## CHALLENGE-ROUND-1 reconciliation (2026-07-09)
- **Severity fault-line (B1/B3/M10) resolved once, comprehensively.** S17 is now scoped to axe
  VIOLATION results only (impact→severity). Non-axe DOM checks (S9/S11/S12/S14/S15) take their
  severity from S35's fixed spec-pinned table (matching the spike's hardcoded constants), and axe
  incomplete-derived findings take severity 0 with S36 precedence over any impact value. The three
  severity sources are disjoint by finding source, so no entry can receive two contradictory
  severities — B1/B3/M10 collapse into this one split.
- **CI/refusal composition (B2/B3/B5) resolved.** The mermaid diagram now routes the findings file
  through a report gate BEFORE the CI-gate diamond. The CI gate blocks on: any axe critical-impact
  violation (S30), a run-level refused status (S37), any non-axe severity-4 finding (S38), any
  route's axe-execution-failed run_status (S46). S30's axe-critical-only predicate can no longer
  silently advisory-pass a refused run, a non-axe headline failure, or a crashed scan.
- **Cross-lane join (B4) buildable.** S24 now joins on `target_element_identifier` + run `route` —
  the field name that actually exists in `schemas/findings.schema.json`. `route` was added as an
  OPTIONAL property on the 0001 `run` object (not required) so the frozen SPEC 0001 fixtures/suite
  stay green; making it required would break freeze, so intent is honored without touching the frozen
  contract (see scrub-log).
- **Determinism vs live-render (M2/M11/M12/Mi1) tightened.** S1 adds a network-idle +
  `document.fonts.ready` settle precondition; S21 is scoped to post-settle and now spans both
  violation and incomplete finding-ids; S42 adds the non-axe finding-id stability bar; SN7 pins the
  browser binary version; SN4 pins 1280x800. The reproducibility promise now rests on inputs the
  spec controls.

Boundary/exception coverage additions: S45 defines the axe-crash exception (record
axe-execution-failed, never a silent clean pass); S40 defines the per-route missing-map-entry refusal
boundary; S36 pins the incomplete/critical-impact collision boundary at severity 0; S44 defines the
axe_version-mismatch comparability boundary for the CI comparison.

## Feasible
Every capability is demonstrated prior art: axe-core Playwright injection is shown working in
scripts/structural-scan.mjs (the spike), the SPEC 0001 schema/gate/render toolchain already exists to
extend for the `lane:"structural"` family (D6), and deterministic DOM/CSS checks are ordinary
tooling. The one feasibility unknown flagged for build-time empirical check is the S21 byte-identical
violation-id invariant across two live browser runs — asserted here as a gate-checked contract,
proven live in the named v2 Playwright suite.

## Manual checklist from req-lint (stakeholder judgment)
- True stakeholder need: each line traces to a brief §2/§4/§5 MUST or a resolved founder decision
  D1-D6 — no orphan requirements.
- Stakeholder vocabulary: lines use the domain's words (landmark, main content, contrast, severity,
  lane, validity envelope); axe rule IDs appear only where the rule ID IS the binding contract.
- Acceptable to all stakeholders: single-founder project; founder approval of this spec is the
  acceptance event and is explicitly pending (status PLANNED, freeze withheld — SPEC 0001 frozen state
  in .swe-spec/ is untouched).
