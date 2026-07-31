import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = dirname(createRequire(import.meta.url).resolve('../package.json'));
const dist = resolve(root, 'dist');
const bundlePath = resolve(dist, 'esnext.bundle.mjs');
const source = await readFile(bundlePath, 'utf8');
const files = await readdir(dist);
const unexpectedMjs = files.filter(file => file.endsWith('.mjs') && file !== 'esnext.bundle.mjs');

assert.deepEqual(unexpectedMjs, [], `unexpected bundle chunks: ${unexpectedMjs.join(', ')}`);
assert.doesNotMatch(source, /(?:from|import\s*\()[\s\S]{0,80}['"][^'"]*\.ts['"]/u, 'bundle contains a TypeScript import specifier');
assert.doesNotMatch(source, /(?:from|import\s*\()[\s\S]{0,80}['"]\.[^'"]*['"]/u, 'bundle contains an unresolved relative import');

const module = await import(pathToFileURL(bundlePath).href);
assert.equal(typeof module.captureCurrentTab, 'function', 'missing captureCurrentTab export');
assert.equal(typeof module.registerParser, 'function', 'missing registerParser export');
assert.equal(typeof module.asanaParser, 'object', 'missing asanaParser export');

console.log(`Validated ${bundlePath} (${source.length} bytes; ${files.length} dist file(s)).`);
