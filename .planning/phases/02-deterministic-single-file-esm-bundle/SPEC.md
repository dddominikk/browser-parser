# Phase 2 Specification: Deterministic Single-File ESM Bundle

## Goal

Generate a browser-compatible, self-contained ESM deployment artifact at exactly `dist/esnext.bundle.mjs`.

## Required Behavior

- Add `npm run build:mjs-bundle` using the existing `tsdown` dependency and `src/index.ts` as the only production entry.
- Configure browser platform, ESM, `esnext` target, one entry, code splitting disabled, no runtime externals, no declaration output, and no timestamps.
- Avoid cleaning shared `dist/` outputs in a way that removes bookmarklets; remove only the target bundle or use a temporary output and atomic move.
- Keep development package exports pointed at `src/index.ts` and exclude tests, planning files, scripts, `src/workingParserExample.ts`, examples, fixtures, and other unrelated files.
- Add validation for exact path, single-file output, deterministic repeated builds, no `.ts` imports, no relative unresolved imports, successful import, and expected exports.

## Non-Goals

No npm distribution redesign, generated-file commit, source-map policy expansion, new runtime dependency, or bundling of test/fixture code.

## Acceptance Evidence

The build command and tests can prove a clean output directory has exactly the expected bundle, a second build has identical bytes, and the artifact imports with `captureCurrentTab`, `registerParser`, and built-in exports present.
