import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {execFileSync, spawn} from 'node:child_process';

const {Given, Then} = createRequire(import.meta.url)('@cucumber/cucumber');

const P = 'elixir-menu-sponsors-page-20261121: ';
const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const ORIGIN = 'https://elixir.menu';
const BASELINE = path.join(ROOT, '.kogen/intents/elixir-menu-sponsors-page-20261121/export-baseline.json');
const PASS_CODE = 0;
const FAIL_CODE = 1;
const NOT_STARTED = Math.max(PASS_CODE, FAIL_CODE) + 1; // differs from both pass and fail: a missing tool is not a verdict
let built = false;

const read = (p) => fs.readFileSync(path.join(DIST, p), 'utf8');
const htmlFiles = (dir = DIST) => fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) =>
  e.isDirectory() ? htmlFiles(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
const withoutFooter = (html) => html.replace(/<footer[\s\S]*?<\/footer>/g, '');
const mainOf = (html) => (html.match(/<main[\s\S]*<\/main>/) || [html])[0];
const textOf = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#39;|&#x27;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const sponsorsHtml = () => { assert.ok(fs.existsSync(path.join(DIST, 'sponsors/index.html')), 'dist/sponsors/index.html is missing'); return read('sponsors/index.html'); };
const pageText = () => textOf(withoutFooter(mainOf(sponsorsHtml())));
const agentEntry = () => {
  const lines = read('llms.txt').split('\n').filter((l) => l.includes('/sponsors/'));
  assert.ok(lines.length >= 1, 'dist/llms.txt has no entry linking /sponsors/');
  return lines.join('\n');
};
const markdownCopies = () => ['sponsors.md', 'agent-content/sponsors.md'].filter((f) => fs.existsSync(path.join(DIST, f))).map((f) => [f, read(f)]);

const FORBIDDEN = [
  ['a currency amount', /[$€£]\s?\d|\b\d[\d.,]*\s?(usd|eur|dollars?|euros?|bam|km)\b/i],
  ['a percentage', /\d\s?%|\bpercent\b/i],
  ['a discount', /discount/i],
  ['a traffic figure', /\d[\d.,]*\s?[kKmM]?\+?\s*(visitors?|visits?|(page ?)?views?|impressions?|clicks?|sessions?|readers?|users?|downloads?)\b/i],
  ['a traffic or campaign number', /\b(traffic|campaigns?)\b[^.]{0,40}\d|\d[^.]{0,40}\b(traffic|campaigns?)\b/i],
  ['a Plausible or Cloudflare name', /plausible|cloudflare/i],
];
function assertNoForbidden(label, text) {
  for (const [name, re] of FORBIDDEN) {
    const m = text.match(re);
    assert.ok(!m, `${label} contains ${name}: "${m && m[0]}"`);
  }
}
const sentences = (t) => t.split(/(?<=[.!?])\s+/);
function assertSponsorStatements(label, text) {
  assert.ok(sentences(text).some((s) => /sponsor/i.test(s) && /\boptional\b/i.test(s) && /\bdisclosed\b/i.test(s)),
    `${label} has no sentence saying a sponsor is optional and disclosed`);
  assert.match(text, /the user keeps the choice/i, `${label} does not say the user keeps the choice`);
}

Given(P + 'the site has been built once', function () {
  if (built) return;
  execFileSync('npm', ['run', 'build'], {cwd: ROOT, stdio: 'pipe', timeout: 100000});
  built = true;
});

Then(P + 'the built sponsors page explains how a coding agent uses Elixir Menu to choose tools', function () {
  const t = pageText();
  assert.match(t, /coding agent/i, 'page does not mention a coding agent');
  assert.match(t, /elixir\.menu|elixir menu/i, 'page does not name Elixir Menu');
  assert.match(t, /\bchoos(e|es|ing)\b[^.]{0,40}\btools?\b|\btools?\b[^.]{0,60}\bchoos/i, 'page does not explain choosing tools');
});
Then(P + 'the built sponsors page and the agent index entry say a sponsor is optional and disclosed and the user keeps the choice', function () {
  assertSponsorStatements('sponsors page', pageText());
  assertSponsorStatements('agent index entry', textOf(agentEntry()));
});
Then(P + 'the built sponsors page states that no sponsor is active and the formats are not yet available', function () {
  const t = pageText();
  assert.match(t, /no active sponsors?|no sponsors? (is|are) (currently )?active/i, 'page does not say no sponsor is active');
  assert.match(t, /not (yet )?(approved|available|live)/i, 'page does not say the formats or behavior are not yet available');
  const rest = t.replace(/no active sponsors?/gi, '');
  assert.ok(!/\b(active|current|featured) sponsors?\b|\bsponsored by\b|\bpresented by\b/i.test(rest), 'page presents an active sponsor as existing');
});
Then(P + 'the built sponsors page puts the visitor protections next to the offer', function () {
  const main = withoutFooter(mainOf(sponsorsHtml()));
  const sections = main.split(/<h2[\s>]/).slice(1).map((s) => '<h2 ' + s);
  const prot = sections.findIndex((s) => /visitor protections/i.test(textOf(s.split('</h2>')[0])));
  const offer = sections.findIndex((s) => /href="mailto:/.test(s));
  assert.ok(prot >= 0, 'page has no h2 heading "Visitor protections"');
  assert.ok(offer >= 0, 'page has no section with the inquiry link');
  assert.ok(Math.abs(prot - offer) <= 1, `visitor protections (section ${prot}) are not next to the offer with the inquiry link (section ${offer})`);
  const text = textOf(sections[prot]);
  assert.match(text, /disclos/i, 'protections do not mention disclosure');
  assert.match(text, /choice/i, 'protections do not mention the user choice');
});
Then(P + 'the built sponsors page labels any workflow as an example', function () {
  const main = withoutFooter(mainOf(sponsorsHtml()));
  if (!/workflow/i.test(textOf(main))) return;
  const headings = [...main.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)].map((m) => textOf(m[1]));
  assert.ok(headings.some((h) => /\bexample\b/i.test(h)), 'page describes a workflow but no heading labels it as an example');
});
Then(P + 'the built sponsors page, its Markdown copies and the agent index entry contain no price, discount, traffic or campaign figure and no Plausible or Cloudflare name or link', function () {
  assertNoForbidden('sponsors page text', pageText());
  assertNoForbidden('sponsors page HTML', withoutFooter(sponsorsHtml()));
  for (const [f, body] of markdownCopies()) assertNoForbidden(f, body.replace(/\n---\n\nCanonical page:[\s\S]*$/, ''));
  assertNoForbidden('agent index entry', textOf(agentEntry()));
});

Then(P + 'every existing tool export is still published with exactly its committed content', function () {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  for (const [file, sha] of Object.entries(baseline)) {
    assert.ok(fs.existsSync(path.join(DIST, file)), `export dist/${file} is no longer published`);
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIST, file))).digest('hex');
    assert.equal(actual, sha, `export dist/${file} differs from its committed content (entries added, removed, reordered or changed)`);
  }
});
Then(P + 'no existing tool export mentions a sponsor or the sponsors path', function () {
  for (const file of Object.keys(JSON.parse(fs.readFileSync(BASELINE, 'utf8')))) {
    const body = read(file);
    assert.ok(!/sponsor/i.test(body), `export dist/${file} contains the word sponsor`);
    assert.ok(!body.includes('/sponsors/'), `export dist/${file} contains the /sponsors/ path`);
  }
});

// Layout: render the built page in the installed Chrome over the DevTools protocol.
function serve(overrides) {
  const types = {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2'};
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (overrides[url]) { res.writeHead(200, {'content-type': 'text/html'}); return res.end(overrides[url]); }
    let file = path.join(DIST, url);
    if (!file.startsWith(DIST)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream'});
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}
function notStarted(reason) {
  console.error('CANNOT START: ' + reason);
  process.exit(NOT_STARTED);
}
async function measure(urlPath, widths, overrides = {}) {
  const chromePath = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => fs.existsSync(p));
  if (!chromePath || typeof WebSocket === 'undefined') notStarted('no installed Chrome or no WebSocket support');
  const server = await serve(overrides);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sponsors-chrome-'));
  const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
  const cleanup = () => { chrome.kill('SIGKILL'); server.close(); fs.rmSync(profile, {recursive: true, force: true}); };
  try {
    let port;
    for (let i = 0; i < 100 && !port; i++) {
      try { port = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch { await new Promise((r) => setTimeout(r, 100)); }
    }
    if (!port) { cleanup(); notStarted('Chrome did not expose a DevTools port'); }
    const {webSocketDebuggerUrl} = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const ws = new WebSocket(webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0; const pending = new Map();
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const n = ++id; pending.set(n, (d) => d.error ? reject(new Error(method + ': ' + d.error.message)) : resolve(d.result));
      ws.send(JSON.stringify({id: n, method, params, sessionId}));
    });
    const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
    const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
    await send('Page.enable', {}, sessionId);
    const results = {};
    for (const width of widths) {
      await send('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile: false}, sessionId);
      await send('Page.navigate', {url: `http://127.0.0.1:${server.address().port}${urlPath}`}, sessionId);
      let r;
      for (let i = 0; i < 50; i++) {
        await new Promise((res) => setTimeout(res, 100));
        r = await send('Runtime.evaluate', {expression: 'document.readyState==="complete"?JSON.stringify({viewport:document.documentElement.clientWidth,scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),title:document.title,ready:true}):"{}"', returnByValue: true}, sessionId);
        if (JSON.parse(r.result.value).ready) break;
      }
      const v = JSON.parse(r.result.value);
      if (!v.ready) { cleanup(); notStarted('page did not finish loading in Chrome'); }
      results[width] = v;
    }
    ws.close();
    return results;
  } finally { cleanup(); }
}

Then(P + 'the built sponsors page uses the shared site layout', function () {
  const sponsors = sponsorsHtml(); const about = read('about/index.html');
  const footerOf = (h) => (h.match(/<footer[\s\S]*?<\/footer>/) || [''])[0];
  assert.ok(footerOf(sponsors), 'sponsors page has no footer');
  assert.equal(footerOf(sponsors), footerOf(about), 'sponsors page footer differs from the shared footer');
  for (const href of ['/reference.css', '/menu.css']) assert.ok(sponsors.includes(`href="${href}"`), `sponsors page does not load ${href}`);
  assert.ok(/class="[^"]*\binformation-page\b[^"]*"/.test(sponsors), 'sponsors page does not use the information page container');
  assert.ok(/class="header"/.test(sponsors), 'sponsors page does not use the shared header');
});
Then(P + 'the built sponsors page content fits the viewport at 360 and 1280 pixels', async function () {
  sponsorsHtml();
  const r = await measure('/sponsors/', [360, 1280]);
  for (const w of [360, 1280]) assert.ok(r[w].scroll <= r[w].viewport, `sponsors page scroll width ${r[w].scroll} exceeds viewport ${r[w].viewport} at ${w} px`);
});
Then(P + 'a copy of the sponsors page whose main content has a fixed width of 428 pixels overflows at 360 pixels', async function () {
  // The control copy is served in place of the real page route, so the route is the built one.
  const route = '/' + path.relative(DIST, path.dirname(path.join(DIST, 'sponsors/index.html'))).split(path.sep).join('/') + '/';
  const copy = sponsorsHtml().replace('</head>', '<style>main{width:428px !important}</style></head>');
  const r = await measure(route, [360], {[route]: copy});
  assert.ok(r[360].scroll > r[360].viewport, `the 428 px control did not overflow (scroll ${r[360].scroll}, viewport ${r[360].viewport}): the layout check cannot detect overflow`);
});

Then(P + 'a normal page links to the sponsors page from its footer', function () {
  const about = read('about/index.html');
  const footer = (about.match(/<footer[\s\S]*?<\/footer>/) || [''])[0];
  assert.match(footer, /<a [^>]*href="\/sponsors\/"[^>]*>[^<]*sponsor[^<]*<\/a>/i, 'footer of /about/ has no crawlable anchor to /sponsors/');
  assert.ok(fs.existsSync(path.join(DIST, 'sponsors/index.html')), 'the footer target dist/sponsors/index.html does not exist');
});
Then(P + 'the agent index lists the sponsors page under business information', function () {
  const idx = read('llms.txt');
  const sections = idx.split(/^## /m).slice(1);
  const biz = sections.find((s) => /^business information/i.test(s));
  assert.ok(biz, 'dist/llms.txt has no "Business information" section');
  assert.ok(biz.includes(`${ORIGIN}/sponsors/`), 'Business information section does not link https://elixir.menu/sponsors/');
});
Then(P + 'the inquiry link points to the existing verified product contact', function () {
  const contact = JSON.parse(fs.readFileSync(path.join(ROOT, 'agent-site.json'), 'utf8')).contact;
  const inquiry = [...withoutFooter(sponsorsHtml()).matchAll(/href="(mailto:[^"]+)"/g)].map((m) => m[1]);
  assert.ok(inquiry.length >= 1, 'sponsors page has no mailto inquiry link');
  for (const href of inquiry) assert.equal(href, 'mailto:' + contact, 'inquiry link does not point to the verified contact ' + contact);
  assert.ok(read('contact/index.html').includes(`href="mailto:${contact}"`), 'the Contact page does not use the same verified contact');
});
Then(P + 'the sponsors page head has a title, a description and the canonical URL of the sponsors route', function () {
  const html = sponsorsHtml();
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  assert.ok(title && /sponsors/i.test(title), 'title is missing or does not name Sponsors: ' + title);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  assert.ok(desc && desc.length > 20, 'meta description is missing or empty');
  const canon = [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(canon, [`${ORIGIN}/sponsors/`], 'canonical link is not exactly https://elixir.menu/sponsors/');
});
Then(P + 'the built sitemap lists the sponsors page once', function () {
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.equal(locs.filter((l) => l === `${ORIGIN}/sponsors/`).length, 1, 'sitemap does not list https://elixir.menu/sponsors/ exactly once');
});
Then(P + 'only one built page serves the sponsors route', function () {
  assert.ok(!fs.existsSync(path.join(DIST, 'sponsors.html')), 'dist/sponsors.html duplicates the route');
  const serving = htmlFiles().filter((f) => /<link rel="canonical" href="[^"]*\/sponsors?\/?"/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(serving.map((f) => path.relative(DIST, f)), ['sponsors/index.html'], 'more than one built page claims the sponsors route');
});
