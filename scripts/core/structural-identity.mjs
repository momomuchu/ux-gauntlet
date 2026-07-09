// core/structural-identity.mjs — PURE deterministic finding-id derivation for the structural lane.
// Pure module: no file/network/browser access, no timestamp, no random, no DOM-node reference —
// deterministic (sha256 is pure). Mirrors core/identity.mjs (SPEC 0001) and locks S50/S51/SN1:
// finding_id is a byte-identical function of (route, rule-or-code, selector) alone, so the
// byte-identical-set determinism promise (S21/S42) can never be satisfied by crypto.randomUUID luck.
import { createHash } from 'node:crypto';

// A shape-valid structural finding_id: the sfid- prefix plus exactly 16 lowercase hex chars.
export const HEX_STRUCTURAL_FINDING_ID = /^sfid-[0-9a-f]{16}$/;

// The rule/code axis: axe findings carry rule_id, non-axe DOM checks carry code. Either is accepted;
// rule_id wins when both are present so the same defect keys stably regardless of which was supplied.
function ruleOf(f) {
  return f.rule_id ?? f.ruleOrCode ?? f.code ?? '';
}

// The selector axis: target_element_identifier is the canonical S20/S41 dedup key; target_selector is
// the F103-style fallback (mirrors core/identity.mjs teiOf). `selector` is the S51 synthetic-input name.
function selectorOf(f) {
  return f.selector ?? f.target_element_identifier ?? f.target_selector ?? '';
}

// S50 normative derivation: 'sfid-' + sha256(route | rule-or-code | selector).hex[:16].
// Excludes any timestamp / random / DOM-node-reference component by construction (S50/B16).
export function computeFindingId(f) {
  const route = f.route ?? '';
  const key = `${route}|${ruleOf(f)}|${selectorOf(f)}`;
  return 'sfid-' + createHash('sha256').update(key).digest('hex').slice(0, 16);
}

// The S20/S41 dedup identity tuple key for a finding record. Keys on target_element_identifier (never
// target_selector, CR4-M7), scoped by source so an axe and a non-axe finding never collide.
export function dedupKey(f) {
  const id = f.target_element_identifier ?? f.target_selector ?? '';
  const rule = f.rule_id ?? f.code ?? '';
  return `${f.source ?? ''}|${rule}|${id}`;
}
