# Browser Parser

## What This Is

Browser Parser is a dependency-free TypeScript package that captures structured context from the currently open ordinary browser page and presents it in a separate report tab. Generic page capture always runs, while an explicitly registered first matching site parser may add optional enrichment such as the existing Asana preview. Users can run it through a public source bookmarklet during migration or a private secret-gist bundle bookmarklet for production use.

## Core Value

A user can run one small bookmarklet and receive a reliable, typed, serializable report of the current page without installing an extension or configuring a backend.

## Requirements

### Validated

- [x] The package exposes a native-TypeScript source entry point and has no runtime dependencies.
- [x] A synchronous report tab is created by the existing bookmarklet before module loading.
- [x] Report values are rendered through inert DOM APIs rather than interpolated HTML.
- [x] The built-in registry intentionally registers the Asana parser and uses first-match selection.

### Active

- [x] Generic page metadata and script-visible cookies are captured on every ordinary-page invocation — validated in Phase 1.
- [x] Generic capture is combined with optional specialized-parser output without losing generic data — validated in Phase 1.
- [x] Capture is asynchronous and supports asynchronous specialized parsers — validated in Phase 1.
- [x] A deterministic, self-contained browser ESM bundle is generated in `dist/` — validated in Phase 2.
- [x] Public-source and private-secret-gist bookmarklets are generated from one shared implementation — validated in Phase 3.
- [x] An explicit authenticated command updates only the configured secret-gist bundle file — automated behavior validated in Phase 3; authenticated smoke remains privacy-gated.
- [x] CI validates and publishes only the public bundle artifact on every push to `main` without exposing private deployment data — implemented in Phase 4.
- [ ] Documentation and validation cover the transition from public source delivery to private repository delivery — documentation and automated privacy checks are complete; authenticated production and browser smoke gates remain human-needed.

### Out of Scope

- Browser extension packaging — the milestone retains the bookmarklet delivery model.
- Runtime discovery of parser files or multi-parser execution — the browser receives an explicit registry and first matching parser wins.
- Uploading captured page data or cookies anywhere — capture remains local to the source page and report tab.
- Automatic gist deployment, gist creation, or repository-visibility changes — deployment is explicit and privacy transitions are gated.
- CSP bypasses, HttpOnly-cookie access, and unsupported browser families — these are platform boundaries, not implementation problems for this milestone.
- New UI frameworks, new runtime dependencies, or npm publication redesign — the existing DOM renderer and dependency-free runtime remain the foundation.

## Context

The repository is a brownfield Phase 1 walking skeleton. `src/capture.ts` currently selects one parser and returns a parser-centric envelope; `src/registry.ts` intentionally combines built-ins and extensions; `src/report.ts` owns report-tab construction and inert rendering; `src/parsers/asana.ts` is the maintained specialized parser; and `bookmarklet.txt` contains a hand-maintained public esm.sh loader. `tsdown` is already a development dependency, while tests and generated-output directories are not yet present in the committed tree.

The authoritative milestone brief expands the older always-run generic-parser slice into four dependent phases. The older slice remains valid where it specifies asynchronous capture, a separate always-run parser, URL/document/viewport/screen/navigation data, local cookie failure handling, generic-plus-specialized result preservation, inert reporting, and focused tests. Where the documents differ, the newer brief controls: it adds metadata/link fields, a `document.cookie` fallback, full bundle and deployment work, explicit privacy gates, and complete Edge validation.

## Constraints

- **Runtime**: Maintained source remains TypeScript using erasable syntax, native Node type stripping, and explicit `.ts` relative imports.
- **Dependencies**: Do not add runtime dependencies. Use the existing `tsdown`, Node test runner, and injected command runners for deployment tests.
- **Browser delivery**: The public loader uses esm.sh and the private loader fetches the raw gist into a `text/javascript` Blob before importing an object URL.
- **Compatibility**: Target current desktop Edge only for now; document ordinary page, CSP, popup, and script-visible-cookie limitations.
- **Data boundary**: Parsers read rendered DOM and return plain serializable data. Never retain DOM nodes or log cookie values.
- **Generated output**: All generated products live under `dist/`, which is ignored and is never committed by CI. The bundle filename is exactly `dist/esnext.bundle.mjs`.
- **Privacy**: The configured secret gist URL, real gist ID, private bookmarklet, and private workflow artifacts must not be exposed while the repository is public unless explicitly accepted. Production configuration is gated on repository privacy.
- **Deployment**: Gist deployment is explicit, authenticated, idempotent, and limited to the configured filename; it must not create replacement gists.
- **Hygiene**: Resolve the existing `.gitignore` conflict markers as narrowly scoped preflight work before adding the `dist/` rule.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Generic capture is separate from the specialized registry | Every ordinary page must produce useful output, including pages with no site parser | — Pending |
| Specialized selection stays explicit and first-match | Browser runtime cannot discover source files and the brief forbids a precedence redesign | — Pending |
| `dist/` is the only generated-output directory | Bundle and both bookmarklets need a shared ignored location | — Pending |
| The bundle is a single self-contained ESM file | Blob imports from raw gist content cannot resolve relative chunks | — Pending |
| Public esm.sh and private gist bookmarklets coexist during migration | Public delivery remains useful for diagnostics while private delivery becomes production-oriented | — Pending |
| Secret-gist deployment is an explicit `gh api` operation | It limits mutation, preserves unrelated gist files, and avoids exposing bundle contents in shell arguments or logs | Implemented; production execution remains privacy-gated |

## Current Validation Gate

Automated Phase 4 work is complete and public-safe. The milestone remains open until the repository privacy transition is explicitly accepted, an authenticated production gist smoke is recorded, and current Edge bookmarklet smoke evidence is added. See `.planning/phases/04-ci-documentation-and-privacy-transition-validation/04-VERIFICATION.md`.

---
*Last updated: 2026-07-31 after Phase 4 automated validation.*
