import { defineConfig } from 'tsdown/config';

export default defineConfig({
    entry: { 'esnext.bundle': 'src/index.ts' },
    outDir: 'dist',
    format: 'esm',
    platform: 'browser',
    target: 'esnext',
    unbundle: false,
    clean: false,
    hash: false,
    sourcemap: false,
    dts: false,
    treeshake: true,
    fixedExtension: false,
    outExtensions: () => ({ js: '.mjs' }),
});
