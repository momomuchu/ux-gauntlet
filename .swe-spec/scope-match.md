# Scope match — scope vs budget (2026-07-08)

Budget: one solo founder acting as product owner + coding agents as build labor; no external
deadline; token budget effectively unconstrained per founder policy; calendar target = ship an
installable MVP skill quickly, iterate in public (MIT).

Scope: 34 requirements, of which 27 functional. Build surface = 1 SKILL.md, 3 persona data files,
2 JSON schemas, ~4 scripts (runner, report gate, renderer, persona validator), 1 report template,
1 CI workflow, plus fixtures/tests. This is a small-to-medium single-repo build with no research
risk (all capabilities are demonstrated prior art — see validation.md Feasible).

Verdict: scope FITS budget. The one watched item is N5 (45-minute run bound), which depends on
browser-driving latency; if empirical runs blow the bound, the lever is REDUCE (trim per-step
walkthrough verbosity, cap evidence capture size) before any scope negotiation.

Levers if over budget (in order): 1) reduce — cut F26/F27 (CI mode + standardized-flow labeling)
from MVP to fast-follow; 2) add capacity — parallelize persona runs; 3) negotiate — founder may
relax N5 to a nightly-only run where wall-clock is irrelevant.
