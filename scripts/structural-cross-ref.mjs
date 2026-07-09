#!/usr/bin/env node
// structural-cross-ref.mjs <structural-findings.json> <persona-findings.json>
// The cross-lane JOIN (S24/D6): correlates a structural finding with a persona finding by the pair
// (route, target_element_identifier) — the field that ACTUALLY exists in the SPEC 0001 schema (CR1-B4).
// Never algebraically merges the two lanes (that is forbidden, S23). Honestly discloses "no cross-lane
// match found" when the identifiers/routes are disjoint, rather than emitting a silent empty join.
//
// NOTE (spec Known gaps / CR5-M11): no current 0001 script populates run.route, so this join is
// v2-inert against real 0001 output; the verbatim route key is locked here for the day 0001 writes it.
import { readFileSync, existsSync } from 'node:fs';

const [, , structPath, personaPath] = process.argv;
if (!structPath || !personaPath || !existsSync(structPath) || !existsSync(personaPath)) {
  process.stderr.write('usage: structural-cross-ref.mjs <structural-findings.json> <persona-findings.json>\n');
  process.exit(2);
}

const structural = JSON.parse(readFileSync(structPath, 'utf8'));
const persona = JSON.parse(readFileSync(personaPath, 'utf8'));

const sRoute = structural.run?.route;
const pRoute = persona.run?.route;
const tei = (f) => f.target_element_identifier ?? f.target_selector ?? null;

// Join key = verbatim route + target_element_identifier. A structural finding may carry its own route;
// a persona finding inherits its bundle's run.route (0001 findings have no per-finding route).
const structKeys = new Map();
for (const f of structural.findings ?? []) {
  const id = tei(f);
  if (id == null) continue;
  structKeys.set(`${f.route ?? sRoute}|${id}`, id);
}

const matches = [];
for (const f of persona.findings ?? []) {
  const id = tei(f);
  if (id == null) continue;
  const key = `${f.route ?? pRoute}|${id}`;
  if (structKeys.has(key)) matches.push(id);
}

if (matches.length === 0) {
  process.stdout.write('no cross-lane match found — structural and persona findings share no (route, target_element_identifier) pair; the two lanes are reported separately, never merged (S24/S23)\n');
  process.exit(0);
}

process.stdout.write('cross-lane matches (route + target_element_identifier) — the two lanes corroborate on the same element, reported side by side (never merged into one score):\n');
for (const id of [...new Set(matches)]) process.stdout.write(`  match: ${id} (route ${sRoute})\n`);
process.exit(0);
