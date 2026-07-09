// core/redaction.mjs — PURE credential-leak scanners (ADR-0002).
// Pure module: no file/network/browser access, no early return-to-shell; deterministic.
// Single source of truth for the F43/F44/F102/F153/F166/F167 redaction pattern set, imported by
// BOTH report-gate.mjs (evidence captured_text/DOM snippets) and validate-persona.mjs (F66 persona
// credential fields) — no forked, weaker pattern list anywhere (B2, quality-phase fix 2026-07-09).

export const CRED_SCANNERS = [
  // Shape-qualified opaque bearer token (covers opaque OAuth2/session tokens a JWT-only regex misses).
  { name: 'bearer token', re: /[Bb]earer\s+[A-Za-z0-9_.~+/=-]{20,}/ },
  // Standalone three-dot base64url JWT (URL query string, localStorage dump — no Authorization wrapper).
  { name: 'standalone JWT', re: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/ },
  // Cookie / Set-Cookie header value.
  { name: 'cookie header', re: /(?:set-)?cookie:\s*\S+=\S+/i },
  // AWS access key id.
  { name: 'AWS access key id', re: /AKIA[A-Z0-9]{16}/ },
  // OpenAI-style secret key (shape-qualified, not a bare `sk-` prefix).
  { name: 'sk- API key', re: /sk-[A-Za-z0-9-]{20,}/ },
  // GitHub personal access tokens (F153, B2): classic ghp_ + fine-grained gh_pat_.
  { name: 'GitHub PAT (ghp_)', re: /ghp_[A-Za-z0-9]{36}/ },
  { name: 'GitHub PAT (gh_pat_)', re: /gh_pat_[A-Za-z0-9_]{20,}/ },
];

export function luhnValid(digits) {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

// Returns the name of the first credential class that matches, or null.
export function hasCredentialLeak(text) {
  if (typeof text !== 'string') return null;
  for (const s of CRED_SCANNERS) {
    if (s.re.test(text)) return s.name;
  }
  for (const m of text.matchAll(/\d{13,19}/g)) {
    if (luhnValid(m[0])) return 'Luhn-valid card number';
  }
  return null;
}
