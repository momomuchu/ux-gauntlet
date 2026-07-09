# ADR-0002: Functional-core / imperative-shell split; all gate judgments in the pure core

Status: ACCEPTED — 2026-07-09
Criticality: [CRITICAL][BLOCKS:critical]
Governs: docs/architecture/0001-ux-gauntlet-architecture.md §2, §5

## Context

Two independent components must reach the SAME verdict about a finding: `report-gate.mjs` (is this
run shippable?) and `ci-diff.mjs` (is this a new regression vs baseline?). Driver D-DET requires a
finding cannot be valid in the report but invalid in CI. The spec also requires BLOCKED to be
*derived* and gate-locked (F191), not hand-set.

## Decision

Every judgment — redaction-leak detection, finding-identity hash + dedup, severity/convergence
scoring, run_status/BLOCKED derivation, forbidden-claim detection — lives in a **pure core module**
(no I/O, no browser, no `process.exit`, deterministic). The shell scripts import the core, feed it
plain data, and translate its verdict into exit codes / files / stdout.

## Alternatives considered

- **Gate logic inline in each script.** Rejected: report-gate and ci-diff would re-implement the
  same judgment and drift, so the same finding could pass one and fail the other — the exact D-DET
  violation this architecture exists to prevent.
- **A shared library with side effects.** Rejected: impure shared code is not mockless-testable and
  reintroduces nondeterminism into the gate.

## Consequences

- Core is tested with plain assertions, zero mocks (matches testing-quality.md).
- The quality phase (architecture conformance) can mechanically verify purity: core modules must not
  import browser/fs/net and must not call `process.exit`.
- Adding a new gate check = a new pure core function + one shell call site, never duplicated logic.
