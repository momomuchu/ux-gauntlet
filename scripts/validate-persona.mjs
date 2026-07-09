#!/usr/bin/env node
// validate-persona.mjs <persona-file>
// Exits nonzero and names the missing/offending field on a schema violation (F25, F29),
// and rejects a persona carrying a live-credential-shaped field value (F66).
import { readFileSync, existsSync } from 'node:fs';

const REQUIRED = ['goal', 'success_criteria', 'budget_authority', 'patience_threshold_steps', 'forbidden_claims'];

function unquote(v) {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

// Minimal YAML subset parser: `key: value` scalars and `key:` followed by `  - item` lists.
function parseYaml(text) {
  const obj = {};
  let lastKey = null;
  for (const raw of text.split('\n')) {
    if (/^\s*#/.test(raw) || /^\s*$/.test(raw)) continue;
    const listItem = raw.match(/^\s*-\s+(.*)$/);
    if (listItem && lastKey) {
      if (!Array.isArray(obj[lastKey])) obj[lastKey] = [];
      obj[lastKey].push(unquote(listItem[1]));
      continue;
    }
    const kv = raw.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kv) {
      const key = kv[1];
      const val = kv[2];
      if (val.trim() === '') {
        obj[key] = [];
        lastKey = key;
      } else {
        obj[key] = unquote(val);
        lastKey = key;
      }
    }
  }
  return obj;
}

const CRED_PATTERNS = [
  /[Bb]earer\s+[A-Za-z0-9_.~+/=-]{20,}/,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  /sk-[A-Za-z0-9-]{20,}/,
  /AKIA[A-Z0-9]{16}/,
];

function fail(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

const file = process.argv[2];
if (!file) fail('usage: validate-persona.mjs <persona-file>');
if (!existsSync(file)) fail(`persona file not found: ${file}`);

const persona = parseYaml(readFileSync(file, 'utf8'));

for (const field of REQUIRED) {
  const present = Object.prototype.hasOwnProperty.call(persona, field);
  const emptyList = field === 'forbidden_claims' && Array.isArray(persona[field]) && persona[field].length === 0;
  if (!present || emptyList) {
    fail(`persona schema violation: missing required field "${field}" in ${file}`);
  }
}

// F66: live-credential-shaped values must be rejected. Operator placeholders must start with TEST.
for (const credField of ['login_password', 'login_email']) {
  if (Object.prototype.hasOwnProperty.call(persona, credField)) {
    const value = String(persona[credField]);
    const looksLikePlaceholder = /^TEST[-_]/i.test(value);
    const looksLikeCredential = CRED_PATTERNS.some((re) => re.test(value)) || /@/.test(value);
    if (!looksLikePlaceholder && looksLikeCredential) {
      fail(`persona carries a live-credential-shaped value in field "${credField}" (F66): use a TEST- placeholder, never a real credential`);
    }
  }
}

process.stdout.write(`persona OK: ${file}\n`);
process.exit(0);
