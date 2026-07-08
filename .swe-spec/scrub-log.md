# Scrub log — what was cut and why (2026-07-08)

| Cut item | Reason |
|---|---|
| WTP / pricing / conversion estimation | out-of-scope + literature shows LLM WTP estimates unreliable (brief §3, HBS 23-062) — moved to forbidden claims (F21) |
| "% of users would hit this" extrapolation | not-important AND invalid — LLM/human agreement ~45% (brief §3, arXiv 2601.17087) — forbidden (F22) |
| Autonomous task-list discovery from sitemap/nav crawl | over-complex for v1; breaks reproducibility; operator-defined happy path instead (D2) — v2 candidate behind approval gate |
| Accessibility audit lane | out-of-scope — dilutes friction-economics focus; dedicated tools/skills exist |
| Cross-browser / device matrix | over-complex for v1; desktop viewport only |
| Multi-run trend/regression statistics | low-ROI until baselines exist; report schema must stabilize first — v2 |
| ISO 9241-11 "compliance score" | invalid framing — the standard scopes out measurement methods; would be overclaiming (brief §3) |
| Novice/expert differentiated detection, error-prevention-over-recovery rule, financial-over-cosmetic weighting, hesitation-as-signal | claims KILLED in adversarial verification — cannot be encoded as sourced methodology (brief §2.3) |
| 1-persona "quick audit" mode | cut from MVP (D1): single-evaluator severity is unreliable; founder may re-add with a loud low-confidence disclaimer |
| Auto-detection of standardized flows | unproven; replaced by operator allowlist (D4) |
| Pure cognitive-load friction (no extra action, no resolved ambiguity) | cut from MVP: cannot be evidence-anchored without reintroducing the KILLED hesitation-as-signal claim; actions (F10) + ambiguity resolutions (F34) stay in |
| Brief §5 `heuristic_tag[2]` bracket notation | interpreted as an (id,label) pair, NOT multi-tag — single tag per finding is deliberate per brief §2.1 "exactly one" framing (disjoint-review finding #1) |
| "Maximum critique" as a CRITICAL requirement | demoted deliberately from draft 0000 to decision D6: tone is not mechanically gateable; enforced instead via report-template language + F14/F15 evidence discipline (disjoint-review finding #7) |
| Skip-scoring for allowlisted standardized flows (brief §2.2 alternative) | rejected: allowlisted flows keep FULL walkthrough scoring with a downgraded confidence label (F27) — uniform data shape, scoring is cheap, and label-only downgrade preserves comparability across runs (disjoint-review finding #2) |
