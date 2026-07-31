import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { deployBundle } from '../scripts/deploy-mjs-bundle-gist.ts';

test('gist deployment updates one configured file and verifies the remote content', async () => {
    const bundle = 'export const captureCurrentTab = () => {};';
    const calls: Array<{ args: readonly string[]; input: string | undefined }> = [];
    const run = async (args: readonly string[], input?: string) => {
        calls.push({ args, input });
        if (args[0] === 'api' && args[1] === '/gists/example') return { stdout: JSON.stringify({ files: { 'esnext.bundle.mjs': { content: bundle }, unrelated: { content: 'keep' } } }), stderr: '' };
        return { stdout: '', stderr: '' };
    };
    let built = false;
    const result = await deployBundle({ root: '.', config: { gist: 'example', filename: 'esnext.bundle.mjs' }, run, bundle, build: async () => { built = true; } });

    assert.equal(built, true);
    assert.equal(result.checksum, createHash('sha256').update(bundle).digest('hex'));
    assert.equal(calls[0]?.args[0], 'auth');
    assert.equal(calls[1]?.args[1], '/gists/example');
    assert.equal(calls[2]?.args[3], '/gists/example');
    assert.match(calls[2]?.input ?? '', /esnext\.bundle\.mjs/u);
    assert.doesNotMatch(calls[2]?.input ?? '', /unrelated.*delete/u);
});
