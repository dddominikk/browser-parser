import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readPackageConfig } from './deployment-config.ts';
import { generatePublicBookmarklet, validateBookmarklet } from './bookmarklet-generator.ts';

const root = resolve(import.meta.dirname, '..');
const { packageJson } = await readPackageConfig(root);
const repositoryUrl = packageJson.repository?.url;
if (!repositoryUrl) throw new Error('package.json.repository.url is required to build the public bookmarklet.');
const repository = new URL(repositoryUrl);
const path = repository.pathname.replace(/^\//u, '').replace(/\.git$/u, '');
const moduleUrl = `https://esm.sh/gh/${path}?target=es2022`;
const bookmarklet = generatePublicBookmarklet(moduleUrl);
validateBookmarklet(bookmarklet);
await mkdir(resolve(root, 'dist'), { recursive: true });
await writeFile(resolve(root, 'dist/public-bookmarklet.js'), bookmarklet, 'utf8');
console.log('Built dist/public-bookmarklet.js.');
