---
name: ux-gauntlet
description: Run a multi-persona simulated cognitive-walkthrough UX audit against a web app you own. Spawns >=3 isolated persona subagents that crawl a happy-path task list, log named friction instances tagged to a pluggable heuristic set (default: the Nielsen 10), converge findings across personas, and emit a gate-checked findings report with an honest validity envelope. Use when asked to audit UX friction, find usability problems, or CI-gate a UX regression on a local/staging target.
---

# UX Gauntlet

A safety-first, evidence-first UX friction auditor. It **refuses** rather than guesses: no crawl
starts without an owned target, a happy-path task list, an environment declaration, and a
destructive-action denylist. Persona subagents run in parallel, isolated browser profiles; findings
are deduplicated to a deterministic identity and corroborated across personas before they are trusted.

## When to use it

- "Audit the UX friction on my signup flow" / "what's confusing about this dashboard?"
- "CI-gate a UX regression" (block on a new catastrophic finding).
- Any request to evaluate usability of a **target you own** (localhost / staging by default).

## The core loop

1. **Load personas** — at least 3, each a data file validated against `schemas/persona.schema.json`
   (`personas/free-tier-user.yaml`, `personas/willing-to-pay-user.yaml`, `personas/vp-team-buyer.yaml`).
2. **Load the happy-path task list** — `examples/tasks.json` is the shipped copyable default
   (validated against `schemas/tasks.schema.json`); its terminal submission step is flagged
   `audited_terminal_step` so it can submit under the default dry-run boundary.
3. **Load the denylist** — `denylist/default-destructive-labels.json` is the shipped default
   (validated against `schemas/denylist.schema.json`); destructive labels are aborted, never clicked.
4. **Crawl in parallel** — each persona subagent drives the task list, runs the 4-question cognitive
   walkthrough per step, captures redacted evidence, and records named frictions.
5. **Converge & gate** — merge per-persona records by deterministic identity, compute severity and
   convergence tier, then run `scripts/report-gate.mjs` which fails on any integrity violation.
6. **Report** — `scripts/render-report.mjs` emits markdown with the mandatory validity envelope.

## The 4-question cognitive walkthrough (recorded per step, per persona)

For every task step each persona answers all four:

1. **right result** — will the user try to achieve the right result here?
2. **notice** — will the user notice the correct action/control is available?
3. **associate** — will the user associate the control with the result they want?
4. **progress** — after acting, will the user see progress toward their goal?

A "No" to any question must be backed by a matching named friction instance.

## Runner CLI (safety refusals)

`scripts/run-gauntlet.mjs` — see `docs/adr/0001-runner-cli-contract.md` for the full contract:

```
node scripts/run-gauntlet.mjs \
  --url http://localhost:3000 \
  --tasks examples/tasks.json \
  --i-own-this-target \
  --env local \
  --denylist denylist/default-destructive-labels.json \
  --headless
```

Missing safety flags produce an aggregate exit-1 refusal (one line per violated rule, fixed order).
`--override-robots` is the documented resolution when a local/staging target ships a blanket
`Disallow: /` robots.txt that would otherwise abort every persona's navigation. `--help` prints usage
and exits 0.

## Bundled resources (progressive disclosure — read only what a step needs)

| Resource | Purpose |
|---|---|
| `personas/*.yaml` | the shipped persona data files (spawn a subagent per persona) |
| `schemas/persona.schema.json` | persona validation contract |
| `schemas/tasks.schema.json` | task-list step shape incl. the 5 per-step override flags |
| `schemas/denylist.schema.json` | destructive-label denylist shape |
| `schemas/findings.schema.json` | finding + run-status shape the gate consumes |
| `schemas/run-bundle.schema.json` | the whole run bundle shape |
| `config/heuristics.default.json` | the pluggable heuristic taxonomy (default: Nielsen 10) |
| `examples/tasks.json` | the shipped copyable happy-path task list |
| `denylist/default-destructive-labels.json` | the shipped destructive-label denylist |
| `scripts/report-gate.mjs` | the integrity gate (schema, dedup, severity, redaction, safety) |
| `scripts/validate-persona.mjs` | validates one persona file |
| `scripts/render-report.mjs` | renders findings to markdown + validity envelope |
| `scripts/ci-diff.mjs` | CI regression gate (new/escalated severity-4, BLOCKED run) |

## What this tool does NOT claim

It is **not a replacement for real user research**. Persona narratives make no **willingness-to-pay**
estimate and no **population** percentage extrapolation, and this is **enforced by `report-gate.mjs`** as
a real pipeline step (a hit fails the run, it is never silently rewritten). That enforcement is
**shape-anchored** (`scripts/core/claims.mjs`): it detects a price magnitude next to a currency token or
billing period, spelled/word-form currency ("twenty dollars", "20 bucks", "USD 20"), and explicit
"willing/would pay" phrasing — a WTP or population assertion phrased with **no** number, currency, or
period (e.g. "worth every penny") is a known residual it does not catch. It makes no **ISO 9241-11**
compliance claim. Severity is not
guaranteed reproducible across runs; convergence tiers can undercount on apps with unstable selectors.
Per-persona verdicts are simulated judgments — treat corroboration, not any single "No", as the signal.
