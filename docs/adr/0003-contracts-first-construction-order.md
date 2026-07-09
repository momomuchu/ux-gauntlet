# ADR-0003: Contracts-first construction order (start block = schemas + gate; browser last)

Status: ACCEPTED — 2026-07-09
Criticality: [HIGH][BLOCKS:critical]
Governs: docs/architecture/0001-ux-gauntlet-architecture.md §3

## Context

The founder asked explicitly (SWEBOK/ISO framing): from which block do we start developing? The
frozen acceptance suite is gate-driven — most of the 87 tests exercise `report-gate.mjs
--check-fixture` against schemas; the live browser crawl is exercised only at the CLI-refusal level,
not by driving a real page.

## Decision

Construction proceeds in strict dependency order: ① data contracts (schemas, config, denylist,
personas, examples) → ② pure core (redaction, identity, scoring, BLOCKED derivation) → ③ gate +
validators → ④ report + ci-diff → ⑤ shell/CLI (refusal layer; the actual crawl is stubbed behind
the validated entry for the MVP) → ⑥ SKILL.md. Each block is GREEN before the next begins.

## Alternatives considered

- **Browser-first vertical slice** (get one persona crawling a real page, then generalize).
  Rejected: inverts the dependency graph — the crawl output has no contract to validate against
  until the schemas + gate exist, producing untestable code and no RED→GREEN signal. Also highest-
  risk/most-substitutable block (D-PORT) built first is wasteful if the contract shape changes.
- **All-at-once big-bang build.** Rejected: no incremental GREEN signal; a failure is unlocalizable.

## Consequences

- The MVP ships with a fully-real, fully-tested contracts+gate+report+CI core and a **stubbed crawl**
  (validated CLI entry, TODO marker for live Playwright integration) — honest per the spec's
  "Known verification gaps" (live-browser E2E is the disclosed v2 tier).
- A running construction pass that builds ⑤ before ①–③ is reworked to this order.
