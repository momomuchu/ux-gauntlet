# Categorized requirements — Perfect Technology Filter (SWEBOK KA1 §1.8)

Test applied per line: "would this still need to be stated on a computer with infinite speed,
unlimited memory, zero cost, no failures?" yes → functional; no → nonfunctional.

| ID | Category | Filter note |
|----|----------|-------------|
| F1 | functional | persona-as-data is product policy, not a tech constraint |
| F2 | functional | shipped content (default persona) |
| F3 | functional | shipped content (default persona) |
| F4 | functional | shipped content (default persona) |
| F5 | functional | schema content is domain policy |
| F6 | functional | "real browser" trips the tech lexicon, but here the browser IS the domain object being exercised (live crawl is the product behavior, not an implementation choice) — functional by the filter question |
| F7 | functional | input contract |
| F8 | functional | guard behavior (policy) |
| F9 | functional | walkthrough protocol is the core method |
| F10 | functional | friction accounting rule |
| F11 | functional | tagging policy |
| F12 | functional | scoring policy |
| F13 | functional | scoring policy |
| F14 | functional | evidence policy |
| F15 | functional | cite-or-drop policy |
| F16 | functional | reliability-control policy |
| F17 | functional | reporting policy |
| F18 | functional | output contract |
| F19 | functional | output contract |
| F20 | functional | disclosure policy |
| F21 | functional | forbidden-claim policy |
| F22 | functional | forbidden-claim policy |
| F23 | functional | gate behavior |
| F24 | functional | gate behavior |
| F25 | functional | gate behavior |
| F26 | functional | gate behavior (CI policy) |
| F27 | functional | confidence-labeling policy |
| F28 | functional | taxonomy-as-data policy (default set = shipped content) |
| F29 | functional | extensibility policy (persona = one data file) |
| F30 | functional | execution model: per-persona delegated subagent is the product behavior the founder specified (isolation of persona context), not a QoS constraint |
| F31 | functional | execution model: parallel background delegation, same rationale as F30 |
| F32 | functional | output contract (merge into one findings file) |
| N1 | nonfunctional | packaging/format constraint (agent-skills format) — vanishes on a perfect computer |
| N2 | nonfunctional | size/progressive-disclosure constraint (token budget = imperfect tech) |
| N3 | nonfunctional | licensing constraint |
| N4 | nonfunctional | execution-environment constraint (headless CI) |
| N5 | nonfunctional | quality-of-service: time bound (45 minutes) |
| N6 | nonfunctional | dependency/environment constraint |
| N7 | nonfunctional | language constraint |

Summary: 32 functional, 7 nonfunctional. Borderline calls recorded: F6, F30/F31 (see notes).
