# Requirements: Browser Parser Generic Capture and Private Bundle

**Defined:** 2026-07-31  
**Core Value:** A user can run one small bookmarklet and receive a reliable, typed, serializable report of the current page without installing an extension or configuring a backend.

## v1 Requirements

### Generic Capture and Orchestration

- [x] **CAP-01**: `captureCurrentTab()` returns `Promise<CaptureResult>` and bookmarklet callers handle fulfilled and rejected captures through the existing report failure surface.
- [x] **CAP-02**: Every invocation captures generic page data before selecting the explicit built-in/extension specialized registry; the generic parser is never registered as a specialized parser and the existing first matching parser wins.
- [x] **CAP-03**: Generic data includes `href`, all requested URL components, title, referrer, language, charset, exposed content type, ready state, and exposed last-modified value.
- [x] **CAP-04**: Generic data preserves every current `<meta>` record in source order and captures canonical, alternate, manifest, and icon metadata-bearing links as plain strings.
- [x] **CAP-05**: Generic data maps viewport, device-pixel-ratio, screen, available-screen, color-depth, pixel-depth, and first navigation timing values into JSON-safe records.
- [x] **CAP-06**: Cookie Store cookies are mapped into stable plain records with exposed fields such as name, value, domain, path, expires, secure, sameSite, and partitioned.
- [x] **CAP-07**: Cookie Store absence or failure locally records stable diagnostics, attempts the `document.cookie` fallback where possible, preserves all other metadata, returns an empty list if both paths fail, and never logs cookie values.
- [x] **CAP-08**: The combined result has `capturedAt`, `status`, `page`, `specialized`, and `diagnostics`; no specialized match is normal, specialized warnings produce partial data, and specialized exceptions produce `SPECIALIZED_PARSER_FAILED` without erasing generic data.
- [x] **CAP-09**: Specialized parser `parse()` methods may return either a value or a promise, while existing synchronous parsers remain valid and specialized target-not-visible results remain non-fatal to generic capture.

### Report and Safety

- [x] **REP-01**: The existing renderer presents outcome, identity/URL, document metadata, meta records, links, viewport/screen, navigation timing, cookies, conditional specialized output, diagnostics, and complete formatted JSON.
- [x] **REP-02**: Captured strings, including hostile metadata, cookie values, and specialized strings, are inserted through inert DOM APIs; no captured value can create executable markup or attributes.
- [x] **REP-03**: The cookie section carries an explicit sensitivity warning, and the report distinguishes no match, specialized success, specialized partial data, and specialized failure.

### Deterministic Bundle

- [ ] **BND-01**: `npm run build:mjs-bundle` uses the existing `tsdown` dependency and produces exactly `dist/esnext.bundle.mjs` from `src/index.ts`.
- [ ] **BND-02**: The bundle is browser-targeted ESM with `esnext` syntax, one entry, code splitting disabled, no runtime externals, no declarations, no accidental timestamps, and no removal of public exports or registered built-ins.
- [ ] **BND-03**: Bundle validation proves one emitted file, deterministic repeated output, no `.ts` specifiers, no unresolved relative imports, successful module import, and expected exports including `captureCurrentTab`, `registerParser`, and built-in parsers.
- [ ] **BND-04**: Bundle creation does not erase bookmarklet outputs, does not include tests/planning/scripts/examples/fixtures, does not redirect package source exports, and keeps generated `dist/` output ignored.

### Bookmarklets and Gist Deployment

- [ ] **BOOK-01**: One shared generator produces deterministic, single-line, `javascript:` bookmarklets with synchronous report-window creation, popup handling, loading/error rendering, export validation, and capture invocation.
- [ ] **BOOK-02**: `npm run build:public-ts-bookmarklet` produces `dist/public-bookmarklet.js` using the repository-derived public esm.sh source URL and documents this path as legacy/migration-only after privatization.
- [ ] **BOOK-03**: `npm run build:private-gist-mjs-bundle-bookmarklet` reads configured gist data, fails early on malformed configuration, fetches with `cache: "no-store"`, imports a `text/javascript` Blob object URL, validates `captureCurrentTab`, revokes the URL, and renders all load failures in the report tab.
- [ ] **BOOK-04**: Both variants contain no captured values or independently maintained inline source; the root bookmarklet is either a generated compatibility copy or explicitly replaced during implementation.
- [ ] **DEP-01**: `npm run deploy:mjs-bundle-gist` builds first, validates configuration and authentication, updates or creates only the configured file in the existing gist, preserves unrelated gist files, rejects inaccessible gists without creating replacements, and verifies remote content/checksum.
- [ ] **DEP-02**: Deployment command execution is injectable for tests, and deployment/build logs never expose cookie values, bundle secrets, or the full private raw URL.

### CI, Documentation, and Privacy Transition

- [ ] **CI-01**: A workflow runs on every push to `main` and manual dispatch, installs the supported Node version, runs `npm ci`, validation, bundle build and smoke checks, asserts one bundle chunk, and uploads only the public bundle artifact without deploying.
- [ ] **CI-02**: CI never commits generated files, pushes, exposes the gist URL, or builds/uploads the private bookmarklet while the repository is public; concurrency cancellation follows repository conventions.
- [ ] **DOC-01**: README and related docs describe generic-versus-specialized capture, result shape, cookie limitations and sensitivity, public/private bookmarklets, commands/configuration, secret-gist limitations, repository-visibility gate, CSP/popup limits, generated paths, and manual installation without duplicating bookmarklet source.
- [ ] **PRIV-01**: Planning and validation explicitly confirm that the real gist ID/private URL are withheld from public `main` until privacy is accepted, with a production-path check after the repository is private.
- [ ] **HY-01**: The existing `.gitignore` conflict markers are removed as narrowly scoped hygiene, then `dist/` is ignored without unrelated cleanup.
- [ ] **VAL-01**: Focused unit/report/build/bookmarklet/deployment tests and manual authenticated gist plus Chrome/Edge smoke checks cover the completion criteria and record CSP/popup/browser limitations honestly.

## v2 Requirements

Deferred and acknowledged, but not part of this milestone:

- Browser extension packaging or background services.
- Multi-parser execution or runtime parser-file discovery.
- Server-side capture, upload, synchronization, or access to HttpOnly cookies.
- Automatic gist deployment, replacement-gist creation, or code-driven repository visibility changes.
- Firefox, Safari, mobile, or browser-internal-page compatibility.
- npm publication of emitted JavaScript and declaration artifacts.

## Out of Scope

| Feature | Reason |
|---------|--------|
| CSP bypasses | Site policy remains authoritative. |
| New UI framework | The existing DOM renderer is sufficient and preserves a small runtime. |
| New runtime dependency | The milestone requires a dependency-free browser runtime. |
| Broad repository cleanup | Only `.gitignore` conflict-marker repair is required preflight hygiene. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAP-01–CAP-09 | Phase 1 | Complete |
| REP-01–REP-03 | Phase 1 | Complete |
| BND-01–BND-04 | Phase 2 | Pending |
| BOOK-01–BOOK-04 | Phase 3 | Pending |
| DEP-01–DEP-02 | Phase 3 | Pending |
| CI-01–CI-02 | Phase 4 | Pending |
| DOC-01 | Phase 4 | Pending |
| PRIV-01 | Phase 4 | Pending |
| HY-01 | Phase 4 | Pending |
| VAL-01 | Phase 4 | Pending |

### Legacy TODO Reconciliation

The obsolete `.planning/TODO.md` was narrower than the authoritative brief. Every still-valid requirement is carried forward here:

- TODO async capture (lines 15–19) → CAP-01.
- TODO always-run parser outside the registry and its URL/document/navigation/viewport/screen fields (lines 21–37) → CAP-02 through CAP-05.
- TODO Cookie Store mapping, unavailable/rejected diagnostics, local failure handling, and metadata preservation (lines 38–52) → CAP-06 and CAP-07, extended with the authoritative `document.cookie` fallback and visibility limits.
- TODO preservation of specialized behavior, combined diagnostics, and specialized failure retention (lines 54–64) → CAP-02, CAP-08, and CAP-09. The newer brief controls the conflict by retaining first-match behavior throughout this milestone rather than deferring precedence work.
- TODO combined result and inert report rendering (lines 66–82) → CAP-08 and REP-01 through REP-03.
- TODO focused tests (lines 133–145) → VAL-01 and the phase-1 test plan.
- TODO completion checks for bookmarklet/report behavior, arbitrary HTTPS pages, cookie diagnostics, Asana availability, passing tests, and no parallel architecture (lines 147–155) → BOOK-01 through BOOK-04, CAP-02, VAL-01, and the non-goals/constraints in the project and phase specifications.

**Coverage:**
- v1 requirements: 28 atomic IDs plus grouped traceability rows
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-07-31*  
*Last updated: 2026-07-31 after authoritative brief reconciliation and legacy TODO coverage audit.*
