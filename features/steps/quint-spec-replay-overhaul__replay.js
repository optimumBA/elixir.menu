import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const P = 'quint-spec-replay-overhaul: ';
const model = '.kogen/intents/quint-spec-replay-overhaul/model.qnt';
const cli = 'scripts/replay.mjs';
const node = process.env.KOGEN_NODE || process.execPath;
const origin = 'https://elixir.menu';
const exports = ['agents.md', 'llms.txt', 'setup.md', ...['stack', 'app-guide', 'optional', 'runtime'].flatMap(name => ['.md', '.json', '.json.md'].map(ext => name + ext))];
const sha = (base, file) => createHash('sha256').update(fs.readFileSync(path.join(base, file))).digest('hex');
const read = (base, file) => fs.readFileSync(path.join(base, file), 'utf8');
const json = (base, file) => JSON.parse(read(base, file));
const git = (...args) => {
  const result = spawnSync('git', args, { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 0, result.stderr || String(result.error));
  return result.stdout;
};

function checkTrace(dir, expected) {
  const trace = json(dir, 'trace.itf.json');
  assert.equal(trace['#meta'].format, 'ITF');
  assert.equal(trace['#meta'].status, 'ok');
  assert.equal(trace['#meta'].source, model);
  assert.deepEqual(trace.states.map(state => state.mode), expected, 'required state sequence');
  trace.states.forEach((state, i) => {
    assert.equal(state['#meta'].index, i);
    assert.equal(state.cursor['#bigint'], String(i));
    assert.deepEqual(state.plan, expected.slice(1));
    assert.equal(state.exports, i > 0);
    assert.equal(state.sitemap, expected[i] === 'public');
    assert.equal(state.indexable, expected[i] === 'public');
  });
  return trace.states.slice(1);
}

function checkBuild(dist, state) {
  assert.equal(read(dist, 'robots.txt'), state.indexable
    ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n', 'robots policy');
  const homepage = read(dist, 'index.html');
  assert.deepEqual([...homepage.matchAll(/<meta name="robots" content="([^"]+)"/g)].map(m => m[1]),
    [state.indexable ? 'index,follow' : 'noindex,nofollow'], 'homepage robots');
  assert.equal(fs.existsSync(path.join(dist, 'sitemap.xml')), state.sitemap, 'sitemap presence');
  if (state.sitemap) {
    assert.deepEqual([...read(dist, 'sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]),
      ['/', '/about/', '/contact/', '/privacy/', '/sponsors/'].map(route => origin + route), 'sitemap URLs');
  }
  const h1 = read(dist, 'sponsors/index.html').match(/<h1>([^<]+)<\/h1>/)?.[1];
  assert.equal(h1, 'Sponsors');
  const sponsor = read(dist, 'agent-content/sponsors.md');
  assert.equal(sponsor, read(dist, 'sponsors.md'));
  assert.match(sponsor, /^# Sponsors\b/);
  assert.match(sponsor, /There is no active sponsor/);
  const llms = read(dist, 'llms.txt');
  assert.equal(llms.split('## Business information').length, 2, 'one business information section');
  assert.match(llms.split('## Business information')[1], /\[Sponsors\]\(https:\/\/elixir\.menu\/sponsors\/\)/);
  for (const name of ['stack', 'app-guide', 'optional', 'runtime']) {
    assert.equal(read(dist, `${name}.json.md`), read(dist, `${name}.md`), `${name} Markdown twin`);
  }
  return Object.fromEntries([...exports, 'agent-content/index.md', 'agent-content/sponsors.md'].map(file => {
    assert.ok(read(dist, file).trim(), `${file} is empty`);
    return [file, sha(dist, file)];
  }));
}

// A focused observer entry point used by Feasibility, not by the replay implementation.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const dir = process.argv[2];
    const [state] = checkTrace(dir, ['clean', 'preview']);
    checkBuild(path.join(dir, '1/dist'), state);
    console.log('observed preview');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
} else {
  const { Given, When, Then, After } = createRequire(import.meta.url)('@cucumber/cucumber');
  const run = (cwd, evidence) => spawnSync(node, [cli, evidence], { cwd, encoding: 'utf8', timeout: 95_000 });
  const info = result => result.error?.message || result.stderr || result.stdout || '<no diagnostics>';

  Given(P + 'the elixir.menu checkout and its installed build and Quint tools', function () {
    this.temp = fs.mkdtempSync(path.join(os.tmpdir(), 'elixir-menu-accept-'));
    this.evidence = path.join(this.temp, 'evidence');
    assert.equal(json('.', 'package.json').name, 'elixir.menu');
    assert.ok(fs.existsSync('node_modules/astro/package.json'), 'run npm ci before replay');
    const version = spawnSync(node, [process.env.KOGEN_QUINT, '--version'], { encoding: 'utf8', timeout: 5000 });
    assert.equal(version.status, 0, `Quint cannot run: ${info(version)}`);
    assert.equal(version.stdout.trim(), '0.33.0');
  });
  After(function () {
    if (this.temp) fs.rmSync(this.temp, { recursive: true, force: true });
  });
  When(P + 'the maintainer runs the local replay command with a fresh evidence location', { timeout: 110_000 }, function () {
    this.result = run(process.cwd(), this.evidence);
  });
  Then(P + 'the replay retains evidence of every required path in order', function (table) {
    assert.equal(this.result.status, 0, `node ${cli}: ${info(this.result)}`);
    const report = json(this.evidence, 'report.json');
    const cases = table.hashes();
    assert.deepEqual(report.paths.map(item => item.id), cases.map(row => row.path));
    this.observations = cases.flatMap(({ path: id, states }, i) => {
      const dir = path.join(this.evidence, id);
      assert.equal(report.paths[i].traceSha256, sha(dir, 'trace.itf.json'));
      assert.ok(read(dir, 'quint.log').trim(), `${id}: missing Quint log`);
      const expected = checkTrace(dir, states.split(','));
      const builds = report.paths[i].builds;
      assert.deepEqual(builds.map(build => build.mode), expected.map(state => state.mode));
      assert.deepEqual(builds.map(build => build.exit), expected.map(() => 0));
      return expected.map((state, j) => ({ state, dir: path.join(dir, String(j + 1)) }));
    });
  });
  Then(P + 'every observed build agrees with its trace and retains the guide and agent exports', function () {
    let first;
    for (const { state, dir } of this.observations) {
      assert.ok(read(dir, 'build.log').trim(), `${dir}: missing npm build log`);
      const dist = path.join(dir, 'dist');
      const observed = checkBuild(dist, state);
      for (const [output, owner] of Object.entries({ 'app-guide': 'app-types', stack: 'stack', runtime: 'runtime', optional: 'optional' })) {
        const expected = json('.', `content/${owner}.json`);
        if (owner === 'runtime') {
          const tools = json('.', 'content/optional.json').groups.flatMap(group => group.items);
          expected.pipelines = expected.pipeline_ids.map(id => tools.find(tool => tool.id === id));
        }
        assert.deepEqual(json(dist, `${output}.json`), expected, `${output} structured export`);
      }
      if (!first) first = observed;
      else assert.deepEqual(observed, first, `${dir}: mode change or rebuild changed editorial exports`);
    }
  });
  Then(P + 'the evidence identifies the exact local inputs for quint-mbt-cutover-20261125', function () {
    const source = json(this.evidence, 'source.json');
    assert.equal(source.repository, 'optimumBA/elixir.menu');
    assert.equal(source.cutover, 'quint-mbt-cutover-20261125');
    assert.equal(source.head, git('rev-parse', 'HEAD').trim());
    assert.equal(source.tree, git('rev-parse', 'HEAD^{tree}').trim());
    for (const file of [cli, model, 'package-lock.json', 'content/stack.json', 'scripts/build.py', 'scripts/build-agent-content.py']) {
      assert.equal(source.files[file], sha('.', file), `source bytes: ${file}`);
    }
    const tools = json(this.evidence, 'tools.json');
    const actual = spawnSync(node, [process.env.KOGEN_QUINT, '--version'], { encoding: 'utf8', timeout: 5000 });
    assert.equal(tools.quint, actual.stdout.trim());
    assert.equal(tools.node, process.version);
    assert.equal(tools.quintSha256, sha('/', path.resolve(process.env.KOGEN_QUINT)));
  });

  function reject(thisWorld, file, original, replacement, reason) {
    const copy = path.join(thisWorld.temp, 'checkout');
    fs.mkdirSync(copy);
    // Copy the exact candidate as seen by the steps, not an old committed baseline.
    const files = new Set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean));
    for (const name of files) {
      if (!fs.existsSync(name)) continue;
      fs.mkdirSync(path.dirname(path.join(copy, name)), { recursive: true });
      fs.copyFileSync(name, path.join(copy, name));
    }
    fs.symlinkSync(path.resolve('node_modules'), path.join(copy, 'node_modules'), 'dir');
    fs.symlinkSync(path.resolve(git('rev-parse', '--absolute-git-dir').trim()), path.join(copy, '.git'), 'dir');
    const before = read(copy, file);
    assert.equal(before.split(original).length, 2, `fault injection anchor changed in ${file}`);
    fs.writeFileSync(path.join(copy, file), before.replace(original, replacement));
    const result = run(copy, thisWorld.evidence);
    assert.equal(result.status, 1, `expected replay rejection: ${info(result)}`);
    assert.ok(result.stderr.includes(reason), `expected ${reason}: ${info(result)}`);
    assert.ok(!fs.existsSync(path.join(thisWorld.evidence, 'report.json')), 'rejection must not yield a success report');
    fs.rmSync(copy, { recursive: true, force: true });
    fs.rmSync(thisWorld.evidence, { recursive: true, force: true });
  }
  Then(P + 'the real replay rejects a model that omits the return to public', { timeout: 110_000 }, function () {
    reject(this, model, '"preview", "preview", "public"', '"preview", "preview"', 'required state sequence');
  });
  Then(P + 'the real replay rejects a preview that leaves the homepage indexable', { timeout: 110_000 }, function () {
    reject(this, 'src/pages/index.astro', "preview ? 'noindex,nofollow' : 'index,follow'", "'index,follow'", 'homepage robots');
  });
}
