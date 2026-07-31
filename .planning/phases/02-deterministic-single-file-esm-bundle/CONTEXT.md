# Phase 2 Context

## Locked Decisions

- `dist/` is the canonical ignored generated-output directory.
- The exact artifact is `dist/esnext.bundle.mjs`; secondary chunks are a failure.
- `src/index.ts` is the production entry and package development exports remain source-based.
- The bundle must be self-contained because the private bookmarklet imports it from a Blob URL.
- Existing `tsdown` is sufficient; do not install or add runtime dependencies.
- Tree shaking must preserve public exports and intentionally registered built-in parsers.

## Build Validation Contract

Validation must inspect the filesystem and artifact text, not merely trust a successful bundler exit code. It must detect `.ts` specifiers, relative imports, extra chunks, non-deterministic bytes, missing exports, and accidental deletion of sibling bookmarklet outputs.

## Handoff

Phase 3 consumes the exact bundle path and assumes it can be fetched as text and imported through a Blob object URL without resolving dependencies relative to the gist.
