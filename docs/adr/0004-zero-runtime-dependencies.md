# ADR-0004: Zero runtime dependencies

Status: ACCEPTED — 2026-07-09
Criticality: [MEDIUM][BLOCKS:low]
Governs: docs/architecture/0001-ux-gauntlet-architecture.md §8

## Context

The deliverable is an OSS agent-skill others install (D-PORT). Every runtime dependency is
install friction + supply-chain surface for adopters, and the gate logic is small.

## Decision

No runtime dependencies. JSON-Schema validation is done with self-contained checks; the simple
persona YAML is read with a minimal hand parser (or the personas ship as JSON if that proves
cleaner). `node:test` (built-in) is the only test runner.

## Alternatives considered

- **ajv + js-yaml.** Rejected for now: heavier install + supply-chain surface than the small,
  fixed schema set warrants. Revisit only if hand-rolled validation demonstrably misses a case the
  frozen tests require.

## Consequences

- `npm install` is a no-op; the skill runs on a clean Node.
- The core stays auditable in one read (no vendored validator internals).
- If a future schema needs full JSON-Schema draft features the hand checks don't cover, this ADR is
  superseded, not silently violated.
