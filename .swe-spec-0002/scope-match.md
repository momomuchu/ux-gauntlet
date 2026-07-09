# Scope match — scope vs budget (SPEC 0002 structural lane, 2026-07-09)

Budget: one solo founder as product owner + coding agents as build labor; no external deadline; token
budget effectively unconstrained per founder policy; calendar target = ship the structural lane as a
second, composable audit lane atop the already-built SPEC 0001 toolchain, iterate in public (MIT).

Scope: 40 requirements (34 functional S1-S34, 6 nonfunctional SN1-SN6). Build surface reuses the
existing SPEC 0001 machinery rather than standing up a new subsystem:
- 1 new schema `schemas/structural-findings.schema.json` in the SAME family as `findings.schema.json`,
  discriminated by the mandatory `lane:"structural"` field (D6) — one CI diff handles both lanes.
- ~4 scripts: extend the spike `scripts/structural-scan.mjs` into the runner; add
  `structural-report-gate.mjs`, `structural-render-report.mjs`, `structural-ci-diff.mjs` (mirroring
  the 0001 gate/render/ci trio).
- 1 config file `config/wcag-target.default.json` (pluggable target, default AA — D4/S31).
- 1 ADR `docs/adr/0005-axe-core-version-pin.md` (D5/S32 governance).
- fixtures + the RED test `test/acceptance-0002.test.mjs`.

This FITS the budget: no research risk (every capability is demonstrated prior art — axe-core
injection is proven in the spike, the schema/gate/render toolchain already exists to extend). The
largest single build item is the deterministic checks harness (landmark/heading/main-content/
affordance + axe injection) that the spike already sketches, so it is extension work, not greenfield.

Watched items (the levers if scope ever exceeds budget):
- **Determinism proof (S21)**: the byte-identical violation-id invariant is asserted here as a
  gate-checked contract; a live two-run browser proof is the deferred v2 Playwright suite. If build
  reveals axe-core nondeterminism across runs, the lever is to REDUCE the invariant's scope (pin more
  of the environment) rather than add capacity or NEGOTIATE the reproducibility promise away — the
  promise is the lane's reason to exist.
- **axe-core version bump (S2/S32)**: pinned to 4.12.1; a bump is decision-record-gated, so version
  drift cannot silently expand scope. No schedule pressure to bump.
- **CI strictness (D1/S30)**: if the strict any-critical-impact bar proves too noisy in practice, the
  reversible lever is to relax toward the SPEC 0001 severity-4 parity bar — a config decision, not a
  rebuild.

Verdict: scope FITS budget (unconstrained token budget, no external deadline, heavy reuse of the
0001 toolchain). No capacity add or scope negotiation needed for MVP.
