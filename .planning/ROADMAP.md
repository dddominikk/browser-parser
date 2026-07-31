# Roadmap: Browser Parser Generic Capture and Private Bundle

## Overview

This milestone evolves the Asana-first walking skeleton into a general browser-page capture tool while retaining optional first-match specialized enrichment. Work proceeds from the capture contract and report behavior, through a deterministic single-file deployment artifact, into generated public/private bookmarklets and explicit gist deployment, and closes with CI, documentation, privacy-transition checks, and browser validation.

## Phases

- [x] **Phase 1: Generic Capture and Specialized Orchestration** — Always capture generic page context, then optionally enrich it with the existing specialized parser and render one combined result.
- [x] **Phase 2: Deterministic Single-File ESM Bundle** — Build and validate one self-contained browser ESM artifact without disturbing other generated outputs or source exports.
- [ ] **Phase 3: Bookmarklet Generation and Secret-Gist Deployment** — Generate both loader variants from shared source and deploy the bundle idempotently to a configured secret gist.
- [ ] **Phase 4: CI, Documentation, and Privacy-Transition Validation** — Automate public bundle validation, document both delivery paths, repair scoped hygiene, and prove the privacy boundary.

## Phase Details

### Phase 1: Generic Capture and Specialized Orchestration

**Goal**: Replace the parser-only capture envelope with mandatory generic capture followed by optional first-match specialized enrichment, preserving useful generic output in all non-fatal specialized cases.
**Depends on**: Nothing
**Requirements**: CAP-01–CAP-09, REP-01–REP-03
**Scope fence**: No multi-parser execution, runtime parser discovery, Asana extraction expansion, new UI framework, or new runtime dependency.
**Success Criteria** (what must be TRUE):
  1. An arbitrary ordinary page with no specialized match produces a successful or partial generic result without `NO_PARSER_MATCHED`.
  2. The result contains URL/document/meta/link/viewport/screen/navigation data and script-visible cookies, with local cookie diagnostics that never discard page metadata.
  3. A matching Asana parser runs after generic capture; synchronous and asynchronous specialized parsers are supported, and specialized failure cannot erase generic data.
  4. The report shows distinct generic, cookie, specialized, diagnostic, and JSON sections using inert DOM APIs.
**Plans**: 2 plans

Plans:
- [x] 01-01: Define generic contracts, cookie capture, orchestration, async parser support, and status derivation.
- [x] 01-02: Extend the existing report renderer and add generic/orchestration/report security tests.

### Phase 2: Deterministic Single-File ESM Bundle

**Goal**: Produce exactly one deterministic browser-compatible ESM file from the complete reachable production graph and validate that it can be imported from a Blob URL.
**Depends on**: Phase 1
**Requirements**: BND-01–BND-04
**Scope fence**: No package export redesign, no generated source commit, no bundle of tests/planning/scripts/examples/fixtures, and no new runtime dependency.
**Success Criteria** (what must be TRUE):
  1. `npm run build:mjs-bundle` creates only `dist/esnext.bundle.mjs` with no chunks, source maps, TypeScript imports, or unresolved relative imports.
  2. Repeated builds are byte-for-byte deterministic and the bundle imports successfully with expected capture, registry, and built-in parser exports.
  3. Bundle construction does not remove bookmarklet outputs and `dist/` remains ignored while development exports still point to `src/index.ts`.
**Plans**: 2 plans

Plans:
- [x] 02-01: Add the exact tsdown configuration/build command and generated-output policy.
- [x] 02-02: Add bundle validation/smoke tests for determinism, contents, imports, exports, and output preservation.

### Phase 3: Bookmarklet Generation and Secret-Gist Deployment

**Goal**: Replace hand-maintained bookmarklet duplication with a shared deterministic generator and provide explicit, testable secret-gist deployment of the self-contained bundle.
**Depends on**: Phase 2
**Requirements**: BOOK-01–BOOK-04, DEP-01–DEP-02
**Scope fence**: No automatic deployment, replacement-gist creation, raw-module MIME dependence, secret URL logging, or public private-bookmarklet artifact.
**Success Criteria** (what must be TRUE):
  1. Public and private bookmarklet artifacts are one-line `javascript:` URLs generated from shared logic and open/adopt the report window before asynchronous work.
  2. The public variant loads the repository through esm.sh; the private variant fetches the configured raw gist with `no-store`, imports a `text/javascript` Blob URL, validates exports, revokes the object URL, and reports failures in the opened tab.
  3. The authenticated deployment command builds first, updates exactly one configured gist file, preserves unrelated files, verifies remote content, and is unit-tested with an injected command runner.
  4. Missing/malformed configuration, inaccessible gist, non-2xx response, network failure, and missing exports fail clearly without exposing secrets.
**Plans**: 2 plans

Plans:
- [ ] 03-01: Extract shared bookmarklet generation and implement public/private build commands with configuration validation.
- [ ] 03-02: Implement explicit gist deployment and test/configure the authenticated deployment path.

### Phase 4: CI, Documentation, and Privacy-Transition Validation

**Goal**: Make the public build reproducible in CI, explain both delivery modes and platform limits, and verify that the private production path cannot leak its secret while the repository is public.
**Depends on**: Phase 3
**Requirements**: CI-01–CI-02, DOC-01, PRIV-01, HY-01, VAL-01
**Scope fence**: CI does not deploy, push, expose the gist URL, or publish private bookmarklet output while the repository is public; no unrelated cleanup.
**Success Criteria** (what must be TRUE):
  1. Every push to `main` and manual dispatch run install, validation, single-file bundle build, bundle smoke checks, chunk assertions, and public bundle artifact upload without committing generated output.
  2. README and related docs accurately describe generic/specialized results, cookie limitations, both bookmarklets, commands/configuration, secret-gist and visibility gates, CSP/popup limits, generated paths, and manual installation without duplicate source.
  3. Scoped `.gitignore` conflict markers are removed, public-tree scans find no production secret gist URL/private bookmarklet, and the private production path is explicitly checked after repository privacy is accepted.
  4. Full validation plus authenticated gist and current Chrome/Edge smoke checks pass or record unavailable browsers and policy limitations as limitations rather than false passes.
**Plans**: 2 plans

Plans:
- [ ] 04-01: Add main-branch CI, scoped hygiene, and documentation for both delivery paths.
- [ ] 04-02: Execute privacy-transition, authenticated gist, full validation, and Chrome/Edge smoke verification.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Generic Capture and Specialized Orchestration | 2/2 | Complete | 2026-07-31 |
| 2. Deterministic Single-File ESM Bundle | 2/2 | Complete | 2026-07-31 |
| 3. Bookmarklet Generation and Secret-Gist Deployment | 0/2 | Not started | - |
| 4. CI, Documentation, and Privacy-Transition Validation | 0/2 | Not started | - |
