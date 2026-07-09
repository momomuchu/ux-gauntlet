# Categorized requirements — Perfect Technology Filter (SWEBOK KA1 §1.8)

Test applied per line: "would this still need to be stated on a computer with infinite speed,
unlimited memory, zero cost, no failures?" yes -> functional; no -> nonfunctional.

Note on `axe-core version pin` (S2/S21/S28): pinning is tagged **functional**, not a performance
constraint. On a perfect machine you would still pin, because the product's contract is a
*byte-identical violation-id set for the same input* — reproducibility is this lane's reason to
exist (brief §4), a domain promise, not an implementation optimization. The genuinely nonfunctional
sibling is SN1 (the reproducibility *quality attribute* across repeated runs).

| ID | Category | Perfect Technology Filter note |
|----|----------|--------------------------------|
| S1 | functional | axe-core injection is the product behavior (the audit itself), like brief §2a; the browser is the domain object exercised, not a tech choice |
| S2 | functional | version pin is a reproducibility contract (product policy), not a speed/memory constraint |
| S3 | functional | ruleset-tag selection is domain scope policy (which WCAG levels the audit covers) |
| S4 | functional | name-role-value check is a core WCAG method (SC 4.1.2) |
| S5 | functional | contrast check is a core WCAG method (SC 1.4.3) |
| S6 | functional | form-label check is a core WCAG method (SC 3.3.2) |
| S7 | functional | exactly-one-main is a semantic-structure rule |
| S8 | functional | region-containment is a semantic-structure rule |
| S9 | functional | landmark-validity is a semantic-structure rule (8 ARIA types) |
| S10 | functional | heading-order labeling policy (best-practice, not WCAG) is a reporting rule |
| S11 | functional | positive-tabindex anti-pattern is a deterministic DOM rule |
| S12 | functional | expected-main-content containment is the lane's headline differentiator (ties audit to app intent) |
| S13 | functional | refuse-without-selector is a guard behavior (input contract), same class as persona-lane happy-path refusal |
| S14 | functional | fail-closed on ambiguous main is a correctness rule, not a resource limit |
| S15 | functional | interactive-affordance correctness is a component-semantics rule |
| S16 | functional | custom-widget ARIA-state validity is a component-semantics rule |
| S17 | functional | severity mapping is scoring policy (pure function of axe impact) |
| S18 | functional | incomplete-surfaced-at-0 is a reporting-integrity rule (false-negative avoidance) |
| S19 | functional | zero-LLM-judgment is the lane's defining epistemic contract vs the persona lane |
| S20 | functional | dedup rule is a finding-identity policy |
| S21 | functional | determinism invariant is the lane's core product promise (brief §4) |
| S22 | functional | schema + lane discriminator is output-contract policy |
| S23 | functional | never-blended-score is a report-integrity rule (brief §1/§3) |
| S24 | functional | cross-reference-by-shared-identifier is a report-composition rule |
| S25 | functional | validity-envelope disclosure is a mandatory reporting rule |
| S26 | functional | naming non-automatable classes is a mandatory reporting rule |
| S27 | functional | best-practice labeling in the envelope is a reporting rule |
| S28 | functional | metadata disclosure of version/ruleset is a reporting rule |
| S29 | functional | not-a-certification disclaimer is a mandatory reporting rule |
| S30 | functional | CI critical-impact block is a gate policy (D1) |
| S31 | functional | pluggable WCAG target level is a configuration policy (D4) |
| S32 | functional | version-bump-needs-decision-record is a governance policy (D5) |
| S33 | functional | single-route scope is an input-contract policy (no autonomous crawl) |
| S34 | functional | lane independence (no cross-lane gating) is an orchestration policy (D3) |
| S35 | functional | CR1-B1/B3 — the fixed non-axe DOM-check severity table is scoring policy for checks that carry no axe impact value (resolves the S17 fault-line) |
| S36 | functional | CR1-M10 — incomplete-derived severity-0 precedence is a scoring-integrity rule (false-negative avoidance), sibling of S18 |
| S37 | functional | CR1-B2 — CI blocking on a run-level refused status is a gate-composition policy (report gate precedes the CI diamond) |
| S38 | functional | CR1-B3 — CI blocking on a non-axe severity-4 finding is a gate policy closing the S30 axe-only bypass |
| S39 | functional | CR1-M1 — route-to-selector map is an input-contract policy reconciling S12/S13 with the S33 multi-route audit |
| S40 | functional | CR1-M1 — per-route refusal on a missing map entry is a guard behavior (input contract), same class as S13 |
| S41 | functional | CR1-M3 — non-axe dedup by finding code plus selector is a finding-identity policy, the non-axe sibling of S20 |
| S42 | functional | CR1-M7 — non-axe custom-check finding-id stability is the lane's determinism promise on the non-axe axis (brief §4) |
| S43 | functional | CR1-M12 — browser-version-bump-needs-decision-record is a governance policy (sibling of S32) |
| S44 | functional | CR1-Mi5 — refusing to compare reports with differing axe_version is a comparison-integrity rule |
| S45 | functional | CR1-B5 — recording run_status axe-execution-failed is a fail-closed reporting rule (a crashed scan is never a clean pass) |
| S46 | functional | CR1-B5 — CI blocking on axe-execution-failed is a gate policy composed with S37/S38 |
| S47 | functional | CR2-B4 — recording run_status settle-timeout is a fail-closed reporting rule (a never-settling page is never a clean pass), sibling of S45 |
| S48 | functional | CR2-B4 — CI blocking on settle-timeout is a gate policy composed with S46 |
| S49 | functional | CR2-B5 — sourcing the accessible name via axe's accname engine is an accessible-name-provenance rule for S15 (no second name engine) |
| S50 | functional | CR2-B16 — the deterministic finding_id derivation formula is the identity policy that makes the S21/S42 byte-identical promise provable, not luck |
| S51 | functional | CR2-B16 — double-invoking the actual generator for set-equality is a verification-method rule that keeps the determinism claim honest end-to-end |
| S52 | functional | CR2-B17 — evaluating the critical-impact predicate on raw impact (never derived severity) is a gate-correctness rule protecting the S17 mapping |
| S53 | functional | CR2-M2 — CI blocking on an incomplete finding whose raw impact is critical closes the incomplete-critical carve-out (D7), a gate policy |
| S54 | functional | CR2-M3 — CI blocking on the S40 route-level refused status is a gate policy so an unmapped route can never go silently unaudited |
| S55 | functional | CR2-M10 / CR3-2 — the cross-namespace equivalence-table suppression is a finding-identity policy reconciling S20/S41 across the axe/non-axe boundary; CR3 dropped the dead tabindex pair (S1 disables the axe tabindex rule), leaving the one live landmark-one-main <-> cannot-evaluate-ambiguous-main pair pinned to :root |
| S56 | functional | CR3-1 — CI blocking on the fail-closed cannot-evaluate-ambiguous-main code is a gate policy: a severity-3 "could-not-evaluate" containment result is unmergeable like a refused run, closing the CR3-B1 inversion where it merged clean while a narrower severity-4 defect blocked |
| SN1 | nonfunctional | reproducibility quality attribute — a perfect machine removes the sampling variance this line guards, so it is a real-world tech-property requirement |
| SN2 | nonfunctional | versioned-schema robustness is a maintainability/evolution quality, not a domain behavior |
| SN3 | nonfunctional | no-third-party-egress is a data-locality quality constraint |
| SN4 | nonfunctional | pinned viewport is a rendering-environment constraint (a real-world screen-size property) |
| SN5 | nonfunctional | licensing/language are distribution qualities, not product logic |
| SN6 | nonfunctional | machine-readable metadata is an interoperability quality of the output |
| SN7 | nonfunctional | CR1-M12 — pinned browser-binary version in metadata is a rendering-environment reproducibility property (sibling of SN4/S2) |
| SN8 | nonfunctional | CR2-M20 — the pinned OS/font-rendering container render_environment_id is a rendering-environment reproducibility property closing the cross-machine glyph-shaping variance (sibling of SN7) |

Summary: 56 functional (S1-S56), 8 nonfunctional (SN1-SN8). CHALLENGE-ROUND-1 appended S35-S46 + SN7;
CHALLENGE-ROUND-2 appended S47-S55 + SN8 (the settle-timeout fail-closed + CI pair, the accname-engine
source, the deterministic finding_id derivation + double-invoke proof, the raw-impact predicate, the
incomplete-critical CI block, the route-refused CI block, the cross-namespace dedup table, the
container render_environment_id) and edited S1/S4/S12/S14/S15/S39/S44 in place; CHALLENGE-ROUND-3
appended S56 (CI-block on cannot-evaluate-ambiguous-main) and edited S1/S12/S21/S22/S24/S42/S44/S45/S49/S55/SN8
in place, with no renumbering of S1-S55/SN1-SN8. The
Perfect Technology Filter keeps
determinism/reproducibility on both sides deliberately: the *contract* (identical output for
identical input, S2/S21) is functional; the *quality attribute* (no sampling variance across runs,
SN1) is nonfunctional.
