# ux-gauntlet

> Your app runs the gauntlet. Synthetic users crawl it, get annoyed, and tell you exactly why it's bad.

**ux-gauntlet** is an open-source (MIT) agent skill for [Claude Code](https://claude.com/claude-code) / Codex-style coding agents. Point it at a running web app and it:

1. **Impersonates consumer personas** — the free-tier user who refuses to pay, the willing-to-pay user evaluating value, the VP buying for a team, and more — each modeled as data, not prompt vibes.
2. **Live-crawls the app in a real browser**, attempting each persona's actual job-to-be-done.
3. **Accounts for friction ruthlessly** — every task the user must do beyond the expected happy path is a *named* friction, backed by evidence (screenshot, trace, step count).
4. **Outputs a severity-ranked report** on why your app loses users — grounded in established UX evaluation methodology (heuristic evaluation, cognitive walkthrough, interaction-cost accounting), not opinions.

## Status

**SPEC PHASE.** This project is being built spec-first, with SWEBOK v4 / ISO-IEC-12207-informed engineering discipline: deep research → problem analysis → frozen specification with acceptance criteria → gated implementation → empirical convergence testing (a fresh agent must not be able to half-apply the skill).

| Artifact | State |
|---|---|
| Deep research decision brief (`docs/research/`) | in progress |
| Problem analysis (`docs/specs/`) | draft |
| Specification (frozen) | pending |
| Skill implementation (`SKILL.md` + personas + gates) | pending |

## Why another one?

Adjacent tools exist — persona-based test plugins, autonomous web-eval agents, academic simulated-user frameworks. None combine: **buyer/willingness-to-pay personas** + **ruthless per-step friction accounting** + **a severity-ranked, evidence-linked report** + **packaging as a portable agent skill with deterministic quality gates**. The gap analysis lives in `docs/research/`.

## License

[MIT](LICENSE)
