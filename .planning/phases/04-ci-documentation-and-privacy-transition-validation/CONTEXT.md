# Phase 4 Context

## Locked Decisions

- CI validates and publishes the public bundle artifact but does not deploy or publish private bookmarklet material.
- The real secret URL is never printed in public logs or committed to public main by default.
- Repository privatization is an external gate; code and CI do not change visibility.
- Manual browser evidence uses the current Edge installation and records limitations honestly.
- `.gitignore` conflict-marker repair is the only repository hygiene included.

## Verification Order

1. Run static public-tree/privacy scans and inspect generated-artifact policy.
2. Run CI-equivalent validation and bundle smoke checks.
3. Review documentation against generated commands and configuration.
4. Only after the privacy gate is accepted, run the authenticated gist smoke test and private bookmarklet check.
5. Run Edge smoke checks for popup, module load, generic capture, specialized enrichment, report safety, and CSP limitations.

## Handoff

The milestone is not complete merely because local tests pass. It requires recorded evidence for public/private separation, the explicit deployment command, and browser coverage with unavailable surfaces called out.
