// Staging demo target for ux-gauntlet — a tiny SaaS signup flow with DELIBERATELY planted
// UX friction, so a real crawl has genuine problems to find. Zero-dep Node http server.
// Run: node examples/staging-demo/server.mjs [port]   (default 4319)
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] || 4319);

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Cloudly</title>
<style>
  :root{--ink:#1b1f24;--muted:#8a939b;--bg:#fff;--brand:#2f6df6}
  *{box-sizing:border-box} body{margin:0;font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:var(--ink);background:var(--bg)}
  header{display:flex;align-items:center;justify-content:space-between;padding:18px 28px;border-bottom:1px solid #eef1f4}
  .logo{font-weight:700;letter-spacing:-.02em}
  nav a{color:var(--muted);text-decoration:none;margin-left:22px;font-size:14px}
  main{max-width:960px;margin:0 auto;padding:32px 28px}
  .hero{padding:64px 0 40px}
  h1{font-size:40px;line-height:1.1;letter-spacing:-.02em;margin:0 0 14px}
  .sub{color:var(--muted);font-size:18px;max-width:560px}
  /* FRICTION 1 (visibility): the primary signup CTA is pushed far below the fold behind filler */
  .filler{height:900px}
  .btn{display:inline-block;background:var(--brand);color:#fff;border:0;border-radius:10px;padding:13px 22px;font-size:16px;font-weight:600;text-decoration:none;cursor:pointer}
  .btn.ghost{background:#eef1f4;color:var(--ink)}
  form{max-width:380px;margin-top:12px} label{display:block;font-size:13px;color:var(--muted);margin:14px 0 4px}
  input{width:100%;padding:11px 12px;border:1px solid #d7dce1;border-radius:9px;font-size:15px}
  .card{border:1px solid #eef1f4;border-radius:14px;padding:22px;margin:14px 0}
  .price{font-size:30px;font-weight:700} .muted{color:var(--muted);font-size:14px}
  .banner{background:#fff7e6;border:1px solid #ffe2a8;border-radius:10px;padding:10px 14px;font-size:14px;margin:16px 0}
</style></head><body>
<header><span class="logo">Cloudly</span>
<nav><a href="/">Product</a><a href="/pricing">Pricing</a><a href="/signup">Log in</a></nav></header>
<main>${body}</main></body></html>`;

const routes = {
  '/': page('Home', `
    <section class="hero">
      <h1>Ship your docs to the cloud.</h1>
      <p class="sub">Cloudly syncs your team's files with zero setup. Trusted by builders everywhere.</p>
    </section>
    <p class="muted">Scroll to get started.</p>
    <div class="filler"></div>
    <!-- FRICTION 1: the only signup entry point is here, 900px down, unlabeled as "free" -->
    <a class="btn" href="/signup">Get started</a>
    <p class="muted" style="margin-top:10px">No credit card required… probably.</p>`),

  '/pricing': page('Pricing', `
    <h1>Pricing</h1>
    <!-- FRICTION 2 (match real world): plan names don't say what you get; "Flexible" is ambiguous -->
    <div class="card"><div class="price">$0</div><div>Starter</div><p class="muted">For trying things.</p>
      <a class="btn ghost" href="/signup">Choose</a></div>
    <div class="card"><div class="price">$19<span class="muted">/seat</span></div><div>Flexible</div>
      <p class="muted">Flexible billing. Cancel anytime after the annual commitment.</p>
      <a class="btn" href="/signup?plan=flex">Choose</a></div>
    <div class="card"><div class="price">Let's talk</div><div>Scale</div>
      <p class="muted">Contact sales for team pricing.</p><a class="btn ghost" href="/signup?plan=scale">Choose</a></div>`),

  '/signup': page('Sign up', `
    <h1>Create your account</h1>
    <!-- FRICTION 3 (user control): forced marketing-consent framing + no clear "free" confirmation -->
    <div class="banner">By continuing you agree to receive product and partner emails. You can opt out later in settings.</div>
    <form method="POST" action="/verify">
      <label>Work email (personal emails not accepted)</label><input name="email" placeholder="you@company.com">
      <label>Password</label><input name="password" type="password">
      <label>Company size</label><input name="size" placeholder="required">
      <button class="btn" type="submit">Continue</button>
    </form>`),

  '/verify': page('Verify', `
    <h1>Check your email</h1>
    <!-- FRICTION 4 (extra step): an email-verification wall before you ever see the product -->
    <p>We sent a 6-digit code to your inbox. Enter it to continue.</p>
    <form method="POST" action="/dashboard"><label>Verification code</label>
      <input name="code" placeholder="______"><button class="btn" type="submit">Verify & continue</button></form>
    <p class="muted">Didn't get it? Check spam, or wait 15 minutes and try again.</p>`),

  '/dashboard': page('Dashboard', `
    <h1>Welcome to Cloudly 🎉</h1>
    <p class="sub">Your workspace is ready. Upload your first file to get started.</p>
    <a class="btn" href="#">Upload a file</a>`),
};

createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'POST') { // any POST just advances (dry-run friendly; no real writes)
    const to = url === '/verify' ? '/verify' : url === '/dashboard' ? '/dashboard' : '/';
    res.writeHead(303, { Location: to }); return res.end();
  }
  const body = routes[url];
  if (!body) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(page('Not found', '<h1>404</h1>')); }
  res.writeHead(200, { 'content-type': 'text/html' }); res.end(body);
}).listen(PORT, () => console.log(`staging-demo (Cloudly) on http://localhost:${PORT}`));
