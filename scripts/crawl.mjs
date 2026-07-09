// crawl.mjs — the REAL live-browser capture layer (replaces the run-gauntlet stub for MVP demo).
// Drives Chromium via Playwright for ONE persona against the target, walking the happy-path task
// list, capturing per step: url, title, visible text, the actionable elements, a screenshot, and
// the concrete action taken + how many actions the step actually cost vs the ideal 1. Emits an
// objective crawl trace (JSON) to runs/<runId>/<persona>/trace.json. The persona's *judgment*
// (4-question walkthrough → friction ledger) is a separate step (a persona subagent), per ADR-0002:
// this module does effects + capture only; no scoring judgment lives here.
//
// Usage: node scripts/crawl.mjs --url <base> --tasks <file> --persona <name> --viewport <wxh> --out <dir>
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

function arg(name, def) { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : def; }

const base = arg('url');
const tasksFile = arg('tasks');
const persona = arg('persona', 'anon');
const [vw, vh] = (arg('viewport', '1280x800')).split('x').map(Number);
const outDir = arg('out', `runs/adhoc/${persona}`);
if (!base || !tasksFile) { console.error('usage: crawl.mjs --url <base> --tasks <file> --persona <name>'); process.exit(2); }

const tasks = JSON.parse(readFileSync(tasksFile, 'utf8'));
mkdirSync(outDir, { recursive: true });

const visibleText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1200));
const actionables = (page) => page.evaluate(() =>
  [...document.querySelectorAll('a,button,input,[role=button]')].slice(0, 40).map(el => ({
    tag: el.tagName.toLowerCase(),
    text: (el.innerText || el.value || el.placeholder || el.getAttribute('name') || '').trim().slice(0, 60),
    href: el.getAttribute('href') || null,
    aboveFold: el.getBoundingClientRect().top < (window.innerHeight || 800),
  })).filter(a => a.text));

const browser = await chromium.launch();
// F88 isolation: a fresh context per persona — no shared cookies/localStorage/session.
const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
const page = await ctx.newPage();
const trace = { persona, base, goal: tasks.goal, viewport: `${vw}x${vh}`, steps: [] };

async function snap(stepIdx, label, action, actionCost) {
  const shot = join(outDir, `step${stepIdx}.png`);
  await page.screenshot({ path: shot });
  trace.steps.push({
    step: stepIdx, label, url: page.url(), title: await page.title(),
    action, action_cost: actionCost, // 1 = ideal single action; >1 = extra actions this step needed
    visible_text: await visibleText(page),
    actionables: await actionables(page),
    screenshot: shot,
  });
}

try {
  // Step 1 — open landing
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await snap(1, tasks.steps[0]?.label || 'open landing', 'goto ' + base, 1);

  // Step 2 — find & click the signup CTA. Cost = 1 + scrolls needed to bring it into view (real friction
  // signal). M4: viewport-intersection via getBoundingClientRect() — isVisible() returns true even when
  // the element is far below the fold, silently undercounting the scroll cost to the ideal 1.
  let scrolls = 0;
  let cta = page.locator('a.btn:has-text("Get started"), a:has-text("Get started")').first();
  const ctaInView = () => page.evaluate(() => {
    const el = [...document.querySelectorAll('a,button,[role=button]')].find((n) => /get started/i.test(n.textContent || ''));
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || 800);
  }).catch(() => false);
  while (!(await ctaInView()) && scrolls < 12) { await page.mouse.wheel(0, 700); scrolls++; }
  const ctaBox = await cta.boundingBox().catch(() => null);
  await cta.click({ timeout: 5000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await snap(2, tasks.steps[1]?.label || 'click signup CTA', `scroll x${scrolls} then click CTA`, 1 + scrolls);

  // Step 3 — fill the signup form (count required fields as the action cost)
  const fields = await page.locator('form input').count().catch(() => 0);
  for (let i = 0; i < fields; i++) {
    const inp = page.locator('form input').nth(i);
    const name = await inp.getAttribute('name').catch(() => '');
    const val = name === 'email' ? 'persona@company.com' : name === 'password' ? 'Sup3rSecret!' : name === 'size' ? '25' : 'x';
    await inp.fill(val).catch(() => {});
  }
  await snap(3, tasks.steps[2]?.label || 'fill signup form', `filled ${fields} fields`, Math.max(1, fields));

  // Step 4 — "confirm details": submit the form; the app forces an email-verification wall (extra step)
  await page.locator('form button[type=submit], form .btn').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  const hitVerifyWall = /verify|check your email|verification code/i.test(await visibleText(page));
  await snap(4, tasks.steps[3]?.label || 'confirm details', 'submit form', hitVerifyWall ? 2 : 1);

  // Step 5 — audited terminal step: complete verification to reach the dashboard
  if (hitVerifyWall) {
    await page.locator('input[name=code]').fill('123456').catch(() => {});
    await page.locator('form button[type=submit], form .btn').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }
  const reachedDash = /dashboard|welcome to cloudly|workspace is ready/i.test(await visibleText(page));
  await snap(5, tasks.steps[4]?.label || 'submit / reach dashboard', 'enter code + verify', hitVerifyWall ? 2 : 1);
  trace.task_completed = reachedDash;
  trace.run_status = reachedDash ? 'completed' : 'timed-out';

  // Step 6 — review the /pricing page the personas reason about, so pricing-referencing findings can be
  // GROUNDED against a page that was actually visited (B4/B5). Personas quoting pricing copy against a
  // trace that never contains /pricing are dropped as ungrounded by assemble-run.mjs; capturing it here
  // means a legitimate pricing observation now has real evidence to be grounded against.
  try {
    await page.goto(base + '/pricing', { waitUntil: 'domcontentloaded' });
    await snap(6, 'review pricing', 'goto ' + base + '/pricing', 1);
  } catch { /* pricing route optional; the run is still complete without it */ }
} catch (e) {
  trace.error = String(e).slice(0, 300);
  trace.run_status = 'crashed';
} finally {
  writeFileSync(join(outDir, 'trace.json'), JSON.stringify(trace, null, 2));
  await browser.close();
  console.log(`${persona}: ${trace.steps.length} steps captured, run_status=${trace.run_status}, task_completed=${trace.task_completed} -> ${outDir}/trace.json`);
}
