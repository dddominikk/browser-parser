---
phase: 02
plan: 01
subsystem: bundle
tags: [tsdown, esm, deterministic-build, dist]
key-files:
  created: [tsdown.config.ts, scripts/validate-mjs-bundle.ts]
  modified: [package.json]
metrics:
  requirements: [BND-01, BND-02, BND-04]
---

# Plan 02-01 Summary

Added the exact `tsdown` browser ESM build configuration and `npm run build:mjs-bundle`. The build uses `src/index.ts`, emits one fixed `esnext.bundle.mjs` file, disables splitting/hash/source maps/declarations, and avoids cleaning shared output directories.

## Verification

- Build completed successfully with tsdown 0.22.9.
- Output path and expected public exports validated.
- Package source exports remain unchanged.

## Deviations

Generated `dist/` files remain local build artifacts and are not committed; the repository `.gitignore` update is intentionally deferred to Phase 4's scoped hygiene task.

## Self-Check: PASSED
