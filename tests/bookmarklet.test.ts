import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePrivateBookmarklet, generatePublicBookmarklet, validateBookmarklet } from '../scripts/bookmarklet-generator.ts';

test('public and private bookmarklets share synchronous report setup', () => {
    const publicValue = generatePublicBookmarklet('https://esm.sh/gh/example/repo?target=es2022');
    const privateValue = generatePrivateBookmarklet('https://gist.githubusercontent.com/example/id/raw/esnext.bundle.mjs');
    for (const value of [publicValue, privateValue]) {
        validateBookmarklet(value);
        assert.match(value, /^javascript:\(\(\)=>\{/u);
        assert.equal(value.includes('\n'), false);
        assert.ok(value.indexOf("window.open('about:blank'") < value.indexOf('import('));
        assert.match(value, /captureCurrentTab/u);
    }
    assert.match(publicValue, /esm\.sh\/gh\/example\/repo/u);
    assert.match(privateValue, /new Blob\(\[source\],\{type:'text\/javascript'\}\)/u);
    assert.match(privateValue, /cache:'no-store'/u);
    assert.match(privateValue, /URL\.revokeObjectURL/u);
});
