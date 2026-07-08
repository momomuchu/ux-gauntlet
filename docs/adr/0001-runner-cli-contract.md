# ADR-0001: Runner CLI contract

Status: PROPOSED (accepted together with spec 0001 at founder approval) — 2026-07-08
Criticality: [HIGH][BLOCKS:high]

## Context

The acceptance test exercises the runner's command-line interface; without a recorded contract,
the test would silently define spec-level interface decisions (disjoint-review finding #18).
A CLI is a public interface — a material decision per decision-record discipline.

## Decision

`scripts/run-gauntlet.mjs` accepts:

| Flag | Required | Meaning |
|---|---|---|
| `--url <target>` | yes | target application base URL |
| `--tasks <file>` | yes | happy-path task list (JSON) |
| `--personas <paths...>` | no | persona data files; default = every file in `personas/` |
| `--headless` | no | headless browser mode (CI) |
| `--ci --baseline <file>` | no | CI mode: diff findings against committed baseline |
| `--out <dir>` | no | output directory; default `runs/<timestamp>/` |

Exit codes: `0` = run completed and gates passed; `1` = gate/validation failure (incl. refusal to
start: missing task list, <3 personas, malformed persona); `2` = usage error (unknown flag,
missing required flag). Refusals print a one-line reason to stderr naming the violated rule.

Companion scripts share the convention: `report-gate.mjs [--check-fixture <file>|<findings.json>]`,
`render-report.mjs <findings.json>`, `validate-persona.mjs <persona-file>` — each exits nonzero on
violation with a stderr reason.

## Alternatives considered

Config-file-only invocation (no flags): rejected — flags are the convention every CI example in
the decision brief uses, and per-run overrides (URL, baseline) are the common case.

## Consequences

The acceptance test may only invoke the interface recorded here; changing the CLI requires
updating this ADR first.
