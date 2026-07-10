#!/usr/bin/env node
// run-gauntlet.mjs — UX Gauntlet runner CLI (contract: docs/adr/0001-runner-cli-contract.md).
// Exit codes: 0 = crawl started & gates passed; 1 = gate/validation refusal; 2 = usage error;
// 3 = target unreachable at crawl start. This layer implements argument validation + refusal, then
// drives the REAL live Playwright crawl per persona via scripts/crawl.mjs (MI4: the crawl is NOT stubbed
// — it captures real steps/screenshots/trace.json). Persona JUDGMENT (ledger.json) remains the separate
// LLM-subagent step per ADR-0002; this runner does effects/capture + gating, not scoring.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { denylistViolation } from './core/denylist.mjs';

const USAGE = `ux-gauntlet run-gauntlet.mjs — multi-persona UX friction audit runner

Required:
  --url <target>              target application base URL
  --tasks <file>              happy-path task list (JSON); default: examples/tasks.json
  --i-own-this-target         explicit operator-authority confirmation
  --env <local|staging|production>
  --denylist <file>           destructive-label denylist; default: denylist/default-destructive-labels.json

Optional:
  --confirm-third-party-data  required for any non-localhost target
  --test-mode                 declare payment flows sandboxed
  --full-submission           disable the default dry-run boundary
  --override-robots           override a robots.txt disallow-abort (local/staging blanket Disallow: /)
  --personas <paths...>       persona files; default: personas/*.yaml
  --max-parallel <n>          concurrent persona cap, minimum 2 (default 5)
  --max-tool-calls <n>        per-persona tool-call cap (default 250)
  --timeout <minutes>         run-level wallclock timeout (default 50)
  --headless | --no-headless
  --standardized-flow-allowlist <file>
  --help                      print this usage text and exit 0
`;

function parseArgs(argv) {
  const flags = { personas: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--help': flags.help = true; break;
      case '--i-own-this-target': flags.iOwn = true; break;
      case '--confirm-third-party-data': flags.thirdParty = true; break;
      case '--headless': flags.headless = true; break;
      case '--no-headless': flags.headless = false; break;
      case '--full-submission': flags.fullSubmission = true; break;
      case '--override-robots': flags.overrideRobots = true; break;
      case '--test-mode': flags.testMode = true; break;
      case '--url': flags.url = argv[++i]; break;
      case '--tasks': flags.tasks = argv[++i]; break;
      case '--env': flags.env = argv[++i]; break;
      case '--denylist': flags.denylist = argv[++i]; break;
      case '--max-parallel': flags.maxParallel = argv[++i]; break;
      case '--max-tool-calls': flags.maxToolCalls = argv[++i]; break;
      case '--timeout': flags.timeout = argv[++i]; break;
      case '--standardized-flow-allowlist': flags.allowlist = argv[++i]; break;
      case '--personas':
        while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) flags.personas.push(argv[++i]);
        break;
      default: break;
    }
  }
  return flags;
}

function isLocalhost(url) {
  try {
    const h = new URL(url).hostname;
    if (h === 'localhost' || h === '::1' || h === '[::1]') return true;
    if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
    return false;
  } catch { return false; }
}

// M3: the --denylist file must actually parse to a non-empty JSON array of strings. A presence-only
// check is a bypassable safety guard — an operator pointing --denylist at a missing/corrupt/empty
// file would otherwise start a crawl with no destructive-action guard live. Returns a 'denylist:'-
// prefixed refusal string (so it stays in the F108 fixed-order slot) or null when the file is valid.
function denylistFileViolation(pathStr) {
  if (!existsSync(pathStr)) return `denylist: --denylist file not found: ${pathStr} (remedy: denylist/default-destructive-labels.json)`;
  let parsed;
  try { parsed = JSON.parse(readFileSync(pathStr, 'utf8')); }
  catch (e) { return `denylist: --denylist file is not valid JSON: ${e.message}`; }
  const v = denylistViolation(parsed);
  return v ? `denylist: ${v}` : null;
}

function personaCount(flags) {
  if (flags.personas.length > 0) return flags.personas.length;
  try {
    return readdirSync('personas').filter((f) => f.endsWith('.yaml')).length;
  } catch { return 0; }
}

function personaNames(flags) {
  if (flags.personas.length > 0) return flags.personas.map((p) => p.split('/').pop().replace(/\.ya?ml$/, ''));
  try { return readdirSync('personas').filter((f) => f.endsWith('.yaml')).map((f) => f.replace(/\.yaml$/, '')); }
  catch { return []; }
}

// F80: is the target actually reachable before we claim to start a crawl? A short GET with a hard
// timeout; connection-refused / timeout => target-availability outcome (exit 3), never a fake exit 0.
async function reachable(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    await fetch(url, { signal: ctrl.signal, redirect: 'manual' });
    return true;   // any HTTP response (2xx/3xx/4xx/5xx) means the server is up
  } catch {
    return false;  // connection-refused / DNS failure / timeout => unreachable
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  // --help short-circuits BEFORE any F107/F108 static-precondition aggregation (CR10-B3).
  if (flags.help) { process.stdout.write(USAGE); process.exit(0); }

  // Aggregate static-precondition refusal, one line per violation, fixed order (F107/F108).
  const violations = [];
  if (!flags.url) violations.push('url: missing --url (target application base URL)');
  if (!flags.tasks) violations.push('tasks: missing --tasks happy-path task list; remedy: examples/tasks.json');
  if (!flags.iOwn) violations.push('i-own-this-target: missing --i-own-this-target operator-authority confirmation');
  if (!flags.env) violations.push('env: missing --env (must be local|staging|production)');
  else if (!['local', 'staging', 'production'].includes(flags.env)) violations.push(`env: invalid --env value "${flags.env}" (must be local|staging|production)`);
  if (!flags.denylist) violations.push('denylist: missing --denylist; remedy: denylist/default-destructive-labels.json');
  else { const dv = denylistFileViolation(flags.denylist); if (dv) violations.push(dv); }
  if (personaCount(flags) < 3) violations.push('persona-count: fewer than 3 personas supplied (minimum is 3)');

  if (violations.length > 0) {
    process.stderr.write('run-gauntlet: refusing to start —\n');
    for (const v of violations) process.stderr.write('  ' + v + '\n');
    process.exit(1);
  }

  // Usage error: --max-parallel below 2 (F185) — exit 2, distinct from the exit-1 refusals above.
  if (flags.maxParallel !== undefined) {
    const n = parseInt(flags.maxParallel, 10);
    if (!Number.isFinite(n) || n < 2) { process.stderr.write(`run-gauntlet: --max-parallel must be >= 2 (got "${flags.maxParallel}")\n`); process.exit(2); }
  }

  // Non-localhost targets require third-party-data confirmation (F67/F68); localhost is exempt (F155).
  if (!isLocalhost(flags.url) && !flags.thirdParty) {
    process.stderr.write('run-gauntlet: refusing to start —\n  third-party-data: non-localhost target requires --confirm-third-party-data (F67/F68)\n');
    process.exit(1);
  }

  // Validation cleared. Probe the target before claiming to start a crawl (F80).
  process.stdout.write(`run-gauntlet: preconditions satisfied for ${flags.url} (env=${flags.env}).\n`);
  return reachable(flags.url).then((up) => {
    if (!up) {
      process.stderr.write(`run-gauntlet: target unreachable at ${flags.url} — cannot start the crawl (F80, exit 3)\n`);
      process.exit(3);
    }

    // Target is up: DRIVE the real crawl. This is no longer a stub — run-gauntlet spawns the live
    // Playwright capture (scripts/crawl.mjs) for every persona and writes runs/<ts>/<persona>/trace.json.
    const runDir = `runs/${Date.now()}`;
    const names = personaNames(flags);
    const tasks = flags.tasks || 'examples/tasks.json';
    const crawlPath = fileURLToPath(new URL('./crawl.mjs', import.meta.url));
    const captured = [];
    for (const name of names) {
      const out = `${runDir}/${name}`;
      const r = spawnSync('node', [crawlPath, '--url', flags.url, '--tasks', tasks, '--persona', name, '--viewport', '390x844', '--out', out], { stdio: 'inherit' });
      if (r.status === 0) captured.push(name);
    }
    process.stdout.write(`run-gauntlet: captured ${captured.length}/${names.length} persona traces -> ${runDir}\n`);

    // Persona JUDGMENT (the 4-question walkthrough -> friction ledger) is an LLM persona-subagent step
    // per ADR-0002 — it is NOT fabricated here. If ledgers are already present for every captured
    // persona, run the deterministic tail (assemble + GATE) to emit a gate-clean findings.json; else
    // report that the persona-subagent judgment step must run next against the captured traces.
    const haveLedgers = captured.length > 0 && captured.every((n) => existsSync(`${runDir}/${n}/ledger.json`));
    if (haveLedgers) {
      const assemblePath = fileURLToPath(new URL('./assemble-run.mjs', import.meta.url));
      const a = spawnSync('node', [assemblePath, '--write', runDir, ...captured], { stdio: 'inherit' });
      process.exit(a.status === 0 ? 0 : 1);
    }
    process.stdout.write('run-gauntlet: capture complete. Next: run the persona-subagent judgment step to write each <persona>/ledger.json, then `node scripts/assemble-run.mjs --write ' + runDir + ' ' + captured.join(' ') + '` to assemble + gate (ADR-0002 persona-judgment boundary).\n');
    process.exit(0);
  });
}

main();
