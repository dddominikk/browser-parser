import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const bundle = resolve(dist, 'esnext.bundle.mjs');

test('bundle build is deterministic and preserves sibling generated outputs', () => {
    execFileSync(process.execPath, ['node_modules/tsdown/dist/run.mjs', '--config', 'tsdown.config.ts'], { cwd: root, stdio: 'pipe' });
    const first = readFileSync(bundle);
    mkdirSync(dist, { recursive: true });
    writeFileSync(resolve(dist, 'public-bookmarklet.js'), 'javascript:/* sentinel */');
    execFileSync(process.execPath, ['node_modules/tsdown/dist/run.mjs', '--config', 'tsdown.config.ts'], { cwd: root, stdio: 'pipe' });
    const second = readFileSync(bundle);
    assert.deepEqual(second, first);
    assert.equal(readFileSync(resolve(dist, 'public-bookmarklet.js'), 'utf8'), 'javascript:/* sentinel */');
});
