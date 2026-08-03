import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));

function tempProject() {
  return mkdtempSync(join(tmpdir(), 'mde-method-'));
}

test('verify-method-followed accepts markdown Operations Map table', () => {
  const root = tempProject();
  mkdirSync(join(root, 'specs', 'design'), { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    scripts: {
      'mde:install': 'npm install',
      'mde:start': 'node src/server/index.js',
      'mde:build': 'tsc -p tsconfig.json'
    }
  }));
  writeFileSync(join(root, 'specs', 'design', 'tech-stack.md'), [
    '# Technology Stack',
    '',
    '## Operations Map',
    '',
    '| Operation | Command |',
    '|---|---|',
    '| install | npm run mde:install |',
    '| start | npm run mde:start |',
    '| build | npm run mde:build |'
  ].join('\n'));

  const result = spawnSync(process.execPath, [join(here, 'verify-method-followed.mjs'), root], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Method-followed check passed/);
});

test('build-app-manifest fails on manifest entries missing required trace fields', () => {
  const root = tempProject();
  mkdirSync(join(root, 'plans', '001-bad'), { recursive: true });
  writeFileSync(join(root, 'plans', '001-bad', 'output.manifest'), JSON.stringify({
    artifact: 'src/example.ts',
    outputType: 'source',
    action: 'created',
    implementor: { planId: '001-bad' },
    rules: { ids: ['TARGET-SERVER'] },
    mergePolicy: 'user-owned',
    status: 'created'
  }) + '\n');

  const result = spawnSync(process.execPath, [join(here, 'build-app-manifest.mjs')], {
    cwd: root,
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing \[sourceRef\]/);
  assert.equal(existsSync(join(root, 'manifest', 'index.json')), false);
});
