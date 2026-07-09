#!/usr/bin/env node
// run-gauntlet.mjs — UX Gauntlet runner CLI (contract: docs/adr/0001-runner-cli-contract.md).
// Exit codes: 0 = crawl started & gates passed; 1 = gate/validation refusal; 2 = usage error;
// 3 = target unreachable at crawl start. This layer implements argument validation + refusal;
// the live Playwright crawl is stubbed behind the validated entry (TODO: wire persona subagents).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

function main() {
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

  // Validation cleared. The live crawl requires an agent session that supplies persona subagents
  // (F30/F31, ADR-0001). No live browser/target here, so we do not fabricate a crawl result.
  // TODO: wire Playwright persona subagents + emit runs/<timestamp>/{findings.json,summary.json}.
  process.stdout.write(`run-gauntlet: preconditions satisfied for ${flags.url} (env=${flags.env}).\n`);
  process.stdout.write('run-gauntlet: crawl entry reached (Playwright persona-subagent integration is stubbed in this build).\n');
  process.exit(0);
}

main();
