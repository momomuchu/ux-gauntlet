# ADR-0005: axe-core and Playwright browser-binary version pin (structural lane)

Status: accepted
Date: 2026-07-09
Requirement IDs: S2, S32, S43, SN7

## Context

The structural UI-quality lane (SPEC 0002) promises a byte-identical finding-id set for identical
DOM + identical config (S21/S42/SN1). That determinism guarantee is only meaningful if the two
inputs that actually decide axe output — the axe-core rule engine and the browser binary that renders
the page (font shaping, sub-pixel layout, contrast sampling) — are held constant across runs. A silent
minor bump of either can add, drop, or re-impact a finding and quietly break reproducibility.

## Decision

- **axe-core is pinned to exactly `4.12.1`.** The scan injects this version, the report metadata records
  `axe_version: "4.12.1"`, and both `structural-report-gate.mjs` and `structural-ci-diff.mjs` refuse any
  bundle whose `metadata.axe_version` is not `4.12.1` (S2/S57).
- **The Playwright browser binary version is pinned and recorded** in `metadata.browser_version`
  (e.g. `chromium/1179`). A missing `browser_version` is rejected by the gate (SN7). Cross-report CI
  comparison refuses when `browser_version` differs even if `axe_version` matches (S44).
- **Bumping either version is a governed change**, not a silent dependency update: it requires a new
  decision record superseding this one, because it invalidates every committed determinism baseline.
  The render environment (OS + fontconfig stack) is likewise recorded as `render_environment_id` and is
  the third comparability axis (SN8/S44).

## Alternatives considered

- **Float axe-core on `^4.12` / `latest`.** Rejected: a patch/minor bump silently changes rule impacts
  and violation membership, defeating S21/S42 and making CI regressions indistinguishable from
  dependency drift.
- **Pin axe but not the browser binary.** Rejected: chromium glyph-shaping and contrast sampling change
  `color-contrast` outcomes and S12 bounding-box tie-breaks independent of axe (S44 M7/M19).

## Consequences

- Determinism and CI comparability are well-defined and mechanically enforced.
- Security/behaviour fixes in newer axe-core require a deliberate, recorded version bump (this ADR is the
  governance gate) rather than arriving unannounced.
