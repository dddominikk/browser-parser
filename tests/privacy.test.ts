import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');

test('public tracked files do not contain the production secret-gist identifier or private bookmarklet URL', () => {
    const productionGistId = ['375cae0a', 'eda17298', 'b01e59cf', '054b566b'].join('');
    const privateRawGistUrl = ['gist.githubusercontent.com/dddominikk/', productionGistId].join('');
    const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/u).filter(Boolean);
    const publicText = files
        .filter(file => /\.(md|json|yml|yaml|ts|txt)$/u.test(file) && existsSync(resolve(root, file)))
        .map(file => readFileSync(resolve(root, file), 'utf8'))
        .join('\n');

    assert.equal(publicText.includes(productionGistId), false);
    assert.equal(publicText.includes(privateRawGistUrl), false);
    assert.match(readFileSync(resolve(root, 'package.json'), 'utf8'), /"gist": ""/u);
});
