#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const root = process.cwd();
const model = '.kogen/intents/quint-spec-replay-overhaul/model.qnt';
const paths = [['init', ['public', 'public', 'preview', 'preview', 'public']], ['previewFirst', ['preview']]];
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const check = (condition, message) => { if (!condition) throw new Error(message); };
function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 5000, ...options });
  if (options.log) fs.writeFileSync(options.log, (result.stdout || '') + (result.stderr || '') + (result.error ? `\n${result.error.message}\n` : ''));
  check(result.status === 0, `${cmd} failed: ${result.error?.message || result.stderr || result.stdout}`);
  return options.raw ? result.stdout : result.stdout.trim();
}
let work;
try {
  check(process.argv.length === 3, 'usage: node scripts/replay.mjs <new-evidence-directory>');
  const evidence = path.resolve(process.argv[2]);
  fs.mkdirSync(evidence);
  const quint = process.env.KOGEN_QUINT;
  check(quint && fs.existsSync(quint), 'KOGEN_QUINT must point to Quint cli.js');
  check(process.versions.node.split('.')[0] === '24', 'Node 24 required');
  const git = (...args) => run('git', args);
  const files = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean).filter(f => fs.existsSync(f) && fs.statSync(f).isFile());
  const source = { repository: 'optimumBA/elixir.menu', cutover: 'quint-mbt-cutover-20261125', head: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), status: run('git', ['status', '--porcelain'], { raw: true }), files: Object.fromEntries(files.map(f => [f, hash(f)])) };
  save(path.join(evidence, 'source.json'), source);
  const tools = { node: process.version, npm: run('npm', ['--version']), python: run('python3', ['--version']), quint: run(process.execPath, [quint, '--version']), astro: json('node_modules/astro/package.json').version, sharp: json('node_modules/sharp/package.json').version, nodeSha256: hash(process.execPath), quintSha256: hash(quint) };
  save(path.join(evidence, 'tools.json'), tools);
  check(tools.quint === '0.33.0', 'Quint 0.33.0 required');
  const report = { paths: [] };
  // Validate every trace before executing any build.
  for (const [id, plan] of paths) {
    const dir = path.join(evidence, id); fs.mkdirSync(dir);
    const traceFile = path.join(dir, 'trace.itf.json');
    const args = [quint, 'run', model, '--backend=typescript', `--init=${id}`, '--seed=1', '--max-samples=1', `--max-steps=${plan.length}`, '--invariant=consistent', `--out-itf=${traceFile}`];
    run(process.execPath, args, { timeout: 10000, log: path.join(dir, 'quint.log') });
    const trace = json(traceFile);
    const expected = ['clean', ...plan];
    check(trace['#meta']?.format === 'ITF' && trace['#meta']?.status === 'ok' && trace['#meta']?.source === model && isDeepStrictEqual(trace.states.map(s => s.mode), expected), `${id}: required state sequence or model source`);
    trace.states.forEach((s, i) => check(s['#meta']?.index === i && s.cursor?.['#bigint'] === String(i) && isDeepStrictEqual(s.plan, plan) && s.exports === (i > 0) && s.sitemap === (s.mode === 'public') && s.indexable === (s.mode === 'public'), `${id}: incorrect trace effects or cursor`));
    report.paths.push({ id, traceSha256: hash(traceFile), quintCommand: [process.execPath, ...args], builds: [], states: trace.states.slice(1) });
  }
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'elixir-replay-'));
  let stable;
  for (const entry of report.paths) {
    const workspace = path.join(work, entry.id); fs.mkdirSync(workspace);
    for (const f of files) { const dest = path.join(workspace, f); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(f, dest); }
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(workspace, 'node_modules'), 'dir');
    check(!fs.existsSync(path.join(workspace, 'dist')) && !fs.existsSync(path.join(workspace, 'public/robots.txt')) && !fs.existsSync(path.join(workspace, 'public/sitemap.xml')), 'workspace is not clean');
    for (const [i, state] of entry.states.entries()) {
      const dir = path.join(evidence, entry.id, String(i + 1)); fs.mkdirSync(dir);
      const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }; delete env.SITE_MODE;
      if (state.mode === 'preview') env.SITE_MODE = 'preview';
      run('npm', ['run', 'build'], { cwd: workspace, env, timeout: 10000, log: path.join(dir, 'build.log') });
      const dist = path.join(workspace, 'dist'); fs.cpSync(dist, path.join(dir, 'dist'), { recursive: true });
      const get = f => read(path.join(dist, f));
      const publicMode = state.indexable;
      const site = json(path.join(workspace, 'content/site.json'));
      check(get('robots.txt') === (publicMode ? `User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n'), 'robots policy');
      const html = get('index.html');
      check(isDeepStrictEqual([...html.matchAll(/<meta name="robots" content="([^"]+)"/g)].map(m => m[1]), [publicMode ? 'index,follow' : 'noindex,nofollow']), 'homepage robots');
      check(html.includes(`<link rel="canonical" href="${site.origin}/"`) === publicMode, 'homepage canonical');
      check(html.includes('src="/analytics.js"') === (publicMode && !!site.plausibleScriptUrl), 'homepage analytics');
      if (site.plausibleScriptUrl) check(html.includes(`data-script="${site.plausibleScriptUrl}"`) === publicMode, 'homepage analytics URL');
      check(fs.existsSync(path.join(dist, 'sitemap.xml')) === state.sitemap && fs.existsSync(path.join(workspace, 'public/sitemap.xml')) === state.sitemap, 'sitemap presence');
      if (state.sitemap) check(isDeepStrictEqual([...get('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]), [...new Set([...site.routes, '/about/', '/contact/', '/privacy/', '/sponsors/'])].map(p => site.origin + p)), 'sitemap URLs');
      const checked = ['robots.txt', 'index.html', ...(state.sitemap ? ['sitemap.xml'] : []), 'agents.md', 'llms.txt', 'setup.md', 'agent-content/index.md', 'agent-content/sponsors.md', 'sponsors.md', 'sponsors/index.html'];
      check(get('llms.txt').split('## Business information').length === 2, 'business information section');
      for (const route of ['about', 'contact', 'privacy', 'sponsors']) {
        check(get(`${route}.md`) === get(`agent-content/${route}.md`), `${route} Markdown twin`);
        checked.push(`${route}.md`, `agent-content/${route}.md`, `${route}/index.html`);
      }
      for (const [output, owner] of Object.entries({ 'app-guide': 'app-types', stack: 'stack', runtime: 'runtime', optional: 'optional' })) {
        const expected = json(path.join(workspace, `content/${owner}.json`));
        if (owner === 'runtime') { const tools = json(path.join(workspace, 'content/optional.json')).groups.flatMap(g => g.items); expected.pipelines = expected.pipeline_ids.map(id => tools.find(t => t.id === id)); }
        check(isDeepStrictEqual(JSON.parse(get(`${output}.json`)), expected), `${output} structured export`);
        check(get(`${output}.md`) === get(`${output}.json.md`), `${output} Markdown twin`);
        for (const ext of ['md', 'json']) check(get(`${output}.${ext}`) === read(path.join(workspace, `.generated/${output}.${ext}`)), `${output} curated export`);
        checked.push(`${output}.md`, `${output}.json`, `${output}.json.md`);
      }
      check(get('setup.md') === read(path.join(workspace, '.generated/setup.md')), 'setup curated export');
      const editorial = checked.filter(f => !['robots.txt', 'index.html', 'sitemap.xml'].includes(f));
      const current = Object.fromEntries(editorial.map(f => [f, hash(path.join(dist, f))]));
      if (stable) check(isDeepStrictEqual(current, stable), 'editorial exports changed across builds'); else stable = current;
      entry.builds.push({ mode: state.mode, exit: 0, command: ['npm', 'run', 'build'], siteMode: publicMode ? null : 'preview', hashes: Object.fromEntries(checked.map(f => [f, hash(path.join(dist, f))])) });
    }
    delete entry.states;
  }
  save(path.join(evidence, 'report.json'), report);
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (work) fs.rmSync(work, { recursive: true, force: true }); }
