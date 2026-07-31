---
status: human_needed
phase: 04-ci-documentation-and-privacy-transition-validation
verified: 2026-07-31
---

# Phase 4 Verification

## Automated Checks

- `npm run validate` — passed: 10 tests, typecheck, and hygiene/privacy checks.
- Public bundle workflow definition — present and public-safe; it installs, validates, builds, smoke-checks, asserts the single bundle, and uploads only `dist/esnext.bundle.mjs`.
- `.gitignore` hygiene — scoped conflict-marker repair and `dist/` ignore rule present.
- README/config review — commands, outputs, generic/specialized result model, cookie sensitivity, public/private transition, secret-gist limitations, CSP/popup limits, and manual installation documented.
- Public-tree privacy scan — passed with no production gist ID/raw URL and an empty committed gist configuration.

## Requirements

CI-01, CI-02, DOC-01, and HY-01 are satisfied by the implementation and automated checks. PRIV-01 and VAL-01 remain human-needed because production privacy acceptance, authenticated secret-gist smoke, and browser UI smoke have not been evidenced in this run.

## Human Verification Required

1. Accept the repository-privacy transition and provide the production gist configuration outside committed files.
2. Run the authenticated deployment/private-loader smoke, verifying the configured file, checksum, unrelated-file preservation, and private report load without publishing private artifacts.
3. Run bookmarklet smoke in current Chrome and Edge for popup timing, generic capture, Asana enrichment, report inertness, cookies, public/private loading, and CSP/popup limitations. Record unavailable browser surfaces as limitations.

Phase 4 is intentionally not marked passed until these gates have evidence.
