import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadBundleConfig, rawGistUrl } from './deployment-config.ts';
import { generatePrivateBookmarklet, validateBookmarklet } from './bookmarklet-generator.ts';

const root = resolve(import.meta.dirname, '..');
const config = await loadBundleConfig(root);
const bookmarklet = generatePrivateBookmarklet(rawGistUrl(config));
validateBookmarklet(bookmarklet);
await mkdir(resolve(root, 'dist'), { recursive: true });
await writeFile(resolve(root, 'dist/private-gist-mjs-bundle-bookmarklet.js'), bookmarklet, 'utf8');
console.log('Built dist/private-gist-mjs-bundle-bookmarklet.js.');
