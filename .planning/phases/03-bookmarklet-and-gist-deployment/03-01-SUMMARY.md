---
phase: 03
plan: 01
subsystem: bookmarklets
tags: [bookmarklet, esm-sh, gist, blob-import]
key-files:
  created: [scripts/bookmarklet-generator.ts, scripts/deployment-config.ts, scripts/build-public-bookmarklet.ts, scripts/build-private-gist-mjs-bundle-bookmarklet.ts, tests/bookmarklet.test.ts]
  modified: [package.json]
  deleted: [bookmarklet.txt]
metrics:
  tests_added: 1
  requirements: [BOOK-01, BOOK-02, BOOK-03, BOOK-04]
---

# Plan 03-01 Summary

Replaced the hand-maintained root bookmarklet with one shared deterministic generator and added public esm.sh and private fetch-plus-Blob bookmarklet builds. The private build validates configuration, uses `cache: no-store`, validates the capture export, and revokes object URLs after import settlement.

## Verification

- Public and private generator tests passed.
- Public artifact build passed.
- Private artifact build passed with a local environment override and remains blocked without a gist ID.

## Deviations

The root `bookmarklet.txt` was removed in favor of generated artifacts; no duplicate compatibility source remains.

## Self-Check: PASSED
