import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');

test('public tracked files do not contain the production secret-gist identifier or private bookmarklet URL', () => {
    const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/u).filter(Boolean);
    const publicText = files
        .filter(file => /\.(md|json|yml|yaml|ts|txt)$/u.test(file) && existsSync(resolve(root, file)))
        .map(file => readFileSync(resolve(root, file), 'utf8'))
        .join('\n');

    assert.doesNotMatch(publicText, /375cae0aeda17298b01e59cf054b566b/u);
    assert.doesNotMatch(publicText, /gist\.githubusercontent\.com\/dddominikk\/375cae0aeda17298b01e59cf054b566b/u);
    assert.match(readFileSync(resolve(root, 'package.json'), 'utf8'), /"gist": ""/u);
});
