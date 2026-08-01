# Phase 5 Context

## Boundary

Add an optional embedded-page explorer to the existing report tab. The explorer is a closed-by-default `<details>` block containing a compact browser-like toolbar, a tiny address field, an iframe, and an inline result area below the iframe.

## Locked Decisions

- The report remains dependency-free and uses DOM construction plus `textContent` for all dynamic values.
- Missing schemes default to `https://`.
- Only `http:` and `https:` URLs are accepted; no `javascript:`, `data:`, `file:`, or other schemes.
- Metadata is read only when the iframe document is accessible to the report tab. Cross-origin access is reported as a clear limitation/error rather than bypassed.
- Basic metadata consists of the resolved URL, document title, description meta content, canonical link, and Open Graph meta records.
- The explorer is independent of the main capture result: an iframe error must not change or erase the original report.
- Current desktop Edge remains the supported browser target.

## Verification

- Pure tests cover URL normalization and metadata extraction.
- Report tests prove the `<details>`/iframe/address UI is rendered inertly and that dynamic values remain text.
- Interaction tests invoke the submit/load/error handlers through a dependency-free DOM test double.
- `npm run validate` and the bundle build remain required gates.

## Deferred

- Cross-origin metadata extraction through a proxy, injected script, or extension.
- Browser history, multi-tab management, screenshots, and arbitrary network inspection.
