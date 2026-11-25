import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-regression-'));
const git = (...args) => {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};
try {
  const checkout = path.join(temp, 'checkout');
  fs.mkdirSync(checkout);
  for (const file of git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0').filter(Boolean)) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    const dest = path.join(checkout, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(checkout, 'node_modules'), 'dir');
  fs.symlinkSync(git('rev-parse', '--absolute-git-dir').trim(), path.join(checkout, '.git'), 'dir');
  const page = path.join(checkout, 'src/pages/index.astro');
  const original = fs.readFileSync(page, 'utf8');
  assert.ok(original.includes('!preview && site.plausibleScriptUrl &&'));
  fs.writeFileSync(page, original.replace('!preview && site.plausibleScriptUrl &&', 'site.plausibleScriptUrl &&'));
  const evidence = path.join(temp, 'evidence');
  const result = spawnSync(process.execPath, ['scripts/replay.mjs', evidence], { cwd: checkout, encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /homepage analytics/);
  assert.ok(!fs.existsSync(path.join(evidence, 'report.json')));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
