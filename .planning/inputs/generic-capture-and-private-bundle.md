# Revise Browser Parser Plan: Generic Capture, Bundling, Gist Deployment, and Dual Bookmarklets

## Authority

Inspect the current `main` branch of `dddominikk/browser-parser` before modifying any planning artifacts.

Revise the existing project plan to encompass the complete scope below. The current `.planning/TODO.md` already describes part of the always-run default capture. Preserve its useful requirements, correct or extend them where this brief is more specific, and consolidate everything into one coherent implementation plan.

Do not implement the changes yet. This task is planning-only.

Do not create a parallel architecture or a second capture pipeline. Adapt the existing contracts, `captureCurrentTab()`, parser registry, report renderer, package scripts, tests, and documentation.

## Objective

Evolve Browser Parser from an Asana-first parser that reports unsupported pages into a general browser-page capture tool with optional site-specific enrichment.

Every invocation on an ordinary browser page must:

1. Open or adopt the report page synchronously.
2. Run a generic page parser that collects page metadata and script-visible cookies.
3. Select and run the existing matching specialized parser, if any.
4. Present both generic and specialized results in the report page.
5. Preserve generic results even if no specialized parser matches or the specialized parser fails.

The project must also gain:

- A single-file browser-compatible ESM bundle.
- A deployment command that updates a configured secret GitHub gist.
- A legacy bookmarklet that imports the public TypeScript repository through `esm.sh`.
- A private-repository bookmarklet that loads the generated bundle from the configured secret gist.
- GitHub Actions validation and bundle generation on every push to `main`.

## Resolved Decisions and Assumptions

### Canonical output directory

Use `dist/` as the canonical generated-output directory.

The original request mentions `.dist/esnext.bundle.mjs` once but subsequently uses:

- `dist/esnext.bundle.mjs`
- `dist/public-bookmarklet.js`

Normalize all generated outputs under `dist/` unless the project owner explicitly overrides this before execution.

Generated files should not be treated as maintained source files. Add `dist/` to `.gitignore` and publish CI outputs as workflow artifacts rather than committing generated files back to `main`.

### Gist privacy model

The configured gist is a GitHub secret gist: unlisted but accessible without authentication to anyone who possesses its URL.

The repository is public at planning time. Because committing the real gist ID or a generated private bookmarklet to a public repository would reveal the secret URL, include a security gate:

- Do not merge the real gist ID or private bookmarklet URL into public `main` unless that exposure is explicitly accepted.
- Prefer making the repository private before merging the production deployment configuration.
- The implementation may support an environment-variable override for local testing while the repository remains public.
- Do not print the full private raw URL in CI logs for a public repository.
- Do not upload the private bookmarklet as a public workflow artifact while the repository is public.

Use this default production configuration once the repository is private:

    "config": {
      "deployments": {
        "bundle": {
          "gist": "375cae0aeda17298b01e59cf054b566b",
          "filename": "esnext.bundle.mjs"
        }
      }
    }

The gist owner should default to the GitHub owner parsed from `package.json.repository`, currently `dddominikk`. Permit an optional `owner` field only if needed to support a gist owned by a different account.

### Bookmarklet file extension

There is no required cross-browser bookmarklet file extension. Use `.js` files containing one single-line `javascript:` URL:

- `dist/public-bookmarklet.js`
- `dist/private-gist-mjs-bundle-bookmarklet.js`

### Gist loading mechanism

Do not depend solely on `import(rawGistUrl)`.

Generate the private bookmarklet so that it:

1. Opens the report tab synchronously.
2. Fetches the configured raw gist URL.
3. Verifies that the response succeeded.
4. Reads the bundle as text.
5. Creates a `Blob` with `type: "text/javascript"`.
6. Creates an object URL for that blob.
7. Dynamically imports the object URL.
8. Calls the bundle’s exported `captureCurrentTab({ reportWindow })`.
9. Revokes the object URL after the import settles.
10. Renders a clear import/load failure in the already-open report page.

This avoids relying on the raw gist server’s response MIME type. Because the output is a self-contained bundle, it must contain no unresolved relative imports that would break when loaded from a blob URL.

Document that page CSP can still block the raw fetch, blob import, bookmarklet execution, or popup creation. Do not attempt to bypass CSP.

## Required Architecture Changes

### 1. Separate generic capture from specialized parser selection

The generic parser is mandatory and must not be registered in or selected through the specialized parser registry.

The runtime sequence should become conceptually:

    create browser page context
      -> run generic page capture
      -> select matching specialized parser
      -> run specialized parser when present
      -> combine data and diagnostics
      -> render report
      -> return combined capture result

Keep specialized parsers under `src/parsers/`.

The browser runtime cannot discover source files dynamically, so continue using an explicit built-in parser registry. Every maintained built-in parser under `src/parsers/` must be imported and registered intentionally.

Preserve the existing “first matching parser wins” behavior unless the current project plan already contains an approved parser-precedence redesign. Do not introduce multi-parser execution in this scope.

### 2. Make capture asynchronous

Change `captureCurrentTab()` to return `Promise<CaptureResult>`.

Allow specialized parser `parse()` methods to return either a value or a promise so future parsers can be asynchronous without another contract migration:

    ParserOutput<T> | Promise<ParserOutput<T>>

Existing synchronous parsers should remain valid.

The bookmarklets must await or chain the promise and route rejected captures into the existing report failure surface.

### 3. Define the generic page data contract

Introduce a clear typed generic page result. Avoid an excessively fragmented type hierarchy, but do not store unrelated values in a single untyped object.

The generic page data should include at least:

#### URL

- `href`
- `origin`
- `protocol`
- `host`
- `hostname`
- `port`
- `pathname`
- `search`
- `hash`

#### Document

- `title`
- `referrer`
- document language
- character set
- content type when exposed
- ready state
- last-modified value when exposed

#### Metadata elements

Capture every current `<meta>` element as a JSON-safe record containing the attributes that are actually present, including as applicable:

- `name`
- `property`
- `httpEquiv`
- `charset`
- `content`

Preserve source order.

Also capture metadata-bearing `<link>` elements where useful, including at least:

- canonical links
- alternate links
- manifest links
- icon links

Store only plain strings and arrays. Never retain DOM nodes.

#### Browser viewport and screen

- viewport width and height
- device pixel ratio
- screen width and height
- available screen width and height
- color depth and pixel depth when available

#### Navigation information

Capture the first navigation timing entry when available and map it into a plain JSON-safe object.

Do not serialize browser-native performance objects directly.

#### Cookies

Collect all cookies that page JavaScript is permitted to observe.

Preferred path:

- Use `globalThis.cookieStore.getAll()` when available.
- Map each cookie into a stable plain record containing exposed fields such as:
  - name
  - value
  - domain
  - path
  - expires
  - secure
  - sameSite
  - partitioned

Fallback path:

- If Cookie Store is unavailable or rejects, attempt to parse `document.cookie`.
- Fallback records may contain only `name` and `value`; unavailable structured attributes should be `null` or omitted consistently.
- Add a diagnostic explaining that the less-complete `document.cookie` fallback was used.
- If both mechanisms fail, retain all other generic metadata and return an empty cookie list with a stable diagnostic.

Document that HttpOnly cookies and cookies outside the current document’s script-visible scope cannot be captured.

Cookie capture failures must never discard page metadata.

Never log captured cookie values to the source-page console, deployment logs, build logs, or CI logs.

### 4. Redesign the combined result without breaking unnecessarily

Replace the current parser-centric envelope with a combined result conceptually equivalent to:

    interface CaptureResult {
      capturedAt: string;
      status: "complete" | "partial" | "failed";
      page: GenericPageData;
      specialized: SpecializedCapture | null;
      diagnostics: Diagnostic[];
    }

A specialized capture should contain:

- parser ID
- parser-specific status if useful
- parser data
- parser summary rows
- parser diagnostics

Status rules:

- `complete`: generic page data was captured and there are no meaningful warnings or errors.
- `partial`: useful generic data exists, but cookie capture, optional metadata, report serialization, or specialized parsing produced diagnostics.
- `failed`: no usable generic result could be produced, or a fatal orchestration/report error prevented delivery.
- No specialized parser match is normal and must not produce `NO_PARSER_MATCHED`.
- An arbitrary page with no specialized parser is still a successful generic capture.
- A specialized parser exception must produce a stable diagnostic such as `SPECIALIZED_PARSER_FAILED` while retaining the generic data.
- A specialized parser’s “target content not currently visible” result, such as Asana with no open task pane, should not erase generic data.

Retain `unsupported` only inside legacy or specialized contracts if required for compatibility. It should no longer be the top-level result merely because no specialized parser matched.

### 5. Update report rendering

Extend the existing report renderer rather than replacing it with a framework.

Render distinct sections for:

1. Capture outcome.
2. Page identity and URL components.
3. Document metadata.
4. `<meta>` records.
5. Metadata-bearing links.
6. Viewport and screen data.
7. Navigation timing.
8. Cookies.
9. Specialized parser result, when present.
10. Diagnostics.
11. Complete formatted JSON.

All captured strings must be inserted through `textContent` or equivalent inert DOM APIs.

Cookie values are sensitive. Add an explicit warning near the cookie section. A `<details>` disclosure may be used so values are not visually exposed until expanded, but the values must still be present on the report page as requested.

The report should distinguish:

- no specialized parser matched
- a specialized parser matched and succeeded
- a specialized parser matched but returned partial data
- a specialized parser failed

Update the generic success message so it no longer says only “supported page,” since generic capture now applies to arbitrary ordinary pages.

## Bundle Build Pipeline

### 6. Add an exact single-file `tsdown` build

Add:

    npm run build:mjs-bundle

The command must use the existing `tsdown` dependency and produce exactly:

    dist/esnext.bundle.mjs

Use `src/index.ts` as the production entry point so the output includes the complete reachable production source graph and all exported built-in parsers.

Do not bundle:

- tests
- planning files
- scripts
- `src/workingParserExample.ts`
- unrelated examples or fixtures

Configure the build for:

- ESM output
- browser platform
- `esnext` target
- one entry
- code splitting disabled
- no external runtime dependencies
- no declaration output
- no source map unless the existing project convention requires one
- deterministic output without timestamps
- exact filename `esnext.bundle.mjs`

Set tree-shaking deliberately. The requested artifact is a reusable complete runtime bundle, so do not accidentally remove exported public APIs or registered built-in parsers.

Because all generated products share `dist/`, do not let `tsdown`’s default cleaning behavior erase bookmarklet files. Either:

- set `clean: false` and remove only the target bundle before building, or
- build into a temporary directory and atomically move the finished bundle into `dist/`.

After building, validate:

- the expected file exists
- no secondary chunks were emitted
- no `.ts` import specifiers remain
- no unresolved relative imports remain
- the module can be imported successfully in a smoke test
- `captureCurrentTab`, `registerParser`, and built-in parser exports are present

Prefer a maintained `tsdown.config.ts` plus a small build script when needed for exact output validation.

### 7. Keep generated files out of package source exports

Do not redirect the package’s development-time `exports` away from `src/index.ts` unless a separate package-distribution requirement exists.

The ESM bundle is a deployment artifact, not a reason to break native TypeScript development or tests.

Do not add new runtime dependencies.

## Gist Deployment

### 8. Add `deploy:mjs-bundle-gist`

Add:

    npm run deploy:mjs-bundle-gist

Recommended behavior:

1. Run `build:mjs-bundle` first so stale output cannot be deployed.
2. Load and validate `package.json.config.deployments.bundle`.
3. Require:
   - non-empty gist ID
   - non-empty target filename
   - existing `dist/esnext.bundle.mjs`
4. Verify GitHub CLI authentication and gist access.
5. Read the local bundle as UTF-8.
6. Update only the configured gist file.
7. If the configured filename does not exist, create that file in the existing gist.
8. Preserve all unrelated gist files.
9. Verify the remote content or checksum after deployment.
10. Print a concise success result without exposing unnecessary secrets.

Prefer the GitHub Gist REST endpoint through `gh api` rather than cloning a temporary Git repository. A PATCH keyed by the configured filename can create or overwrite exactly that file without shell-quoting the bundle or disturbing other gist files.

Do not create a new gist automatically when the configured gist cannot be found. Fail with a clear message so the package configuration remains authoritative.

Do not deploy from the normal build workflow. Gist deployment is an explicit authenticated command unless a separate deployment workflow is later approved.

Encapsulate command execution behind an injectable helper so deployment behavior can be unit-tested without mutating a real gist.

## Bookmarklet Generation

### 9. Extract one shared bookmarklet generator

The current root `bookmarklet.txt` and README contain duplicated inline bookmarklet source. Replace handwritten duplication with a single generator or template.

The shared generator should receive a module-loading strategy while reusing:

- synchronous report-window creation
- initial report markup
- popup-blocked handling
- loading status
- module export validation
- `captureCurrentTab()` invocation
- import/load failure rendering
- console diagnostic prefixes

Generated bookmarklets must be:

- a single line
- prefixed with `javascript:`
- free of TypeScript syntax
- deterministic for identical configuration
- safe to paste directly into a browser bookmark URL field

Do not embed captured page values into generated source.

### 10. Add `build:public-ts-bookmarklet`

Add:

    npm run build:public-ts-bookmarklet

Output:

    dist/public-bookmarklet.js

This is the legacy/public-source variant. It should preserve the current loading model:

    https://esm.sh/gh/dddominikk/browser-parser?target=es2022

Derive the GitHub owner and repository from `package.json.repository` rather than duplicating them where practical.

Label this output clearly in documentation:

- It requires the source repository to be public and reachable by `esm.sh`.
- It is retained for public-repository use, diagnostics, and migration.
- It will cease to be the recommended production bookmarklet after the repository becomes private.

Decide during implementation whether root `bookmarklet.txt` should:

- remain as a generated compatibility copy of this public variant, or
- be removed in favor of `dist/public-bookmarklet.js`.

Do not leave it as an independently maintained duplicate.

### 11. Add `build:private-gist-mjs-bundle-bookmarklet`

Add:

    npm run build:private-gist-mjs-bundle-bookmarklet

Output:

    dist/private-gist-mjs-bundle-bookmarklet.js

Read the gist ID and filename from:

    package.json.config.deployments.bundle

Construct the stable raw URL from:

- inferred or configured gist owner
- gist ID
- filename

The generated bookmarklet must use the fetch-plus-Blob module-loading path described above.

Use `cache: "no-store"` for the raw bundle request unless live testing demonstrates that a different policy is required. The objective is for a newly deployed gist revision to be picked up without users regenerating the bookmarklet.

Validate the loaded module before invocation:

- it must expose `captureCurrentTab`
- otherwise report a stable module-contract error

The private bookmarklet build must fail early when deployment configuration is missing or malformed.

### 12. Optional aggregate build

An aggregate script may be added if useful:

    npm run build
      -> validate source
      -> build:mjs-bundle
      -> build:public-ts-bookmarklet
      -> build:private-gist-mjs-bundle-bookmarklet

Do not make private bookmarklet generation mandatory in public CI while the real secret-gist configuration is intentionally withheld.

## GitHub Actions

### 13. Add bundle CI workflow

Add a workflow such as:

    .github/workflows/build-mjs-bundle.yml

Trigger it on:

- every push to `main`
- manual `workflow_dispatch`

A pull-request trigger may also be added if it improves validation, but the required behavior is every push to `main`.

The workflow should:

1. Check out the repository.
2. Install the repository-supported Node version.
3. Run `npm ci`.
4. Run `npm run validate`.
5. Run `npm run build:mjs-bundle`.
6. Assert that `dist/esnext.bundle.mjs` is the only bundle chunk.
7. Run the bundle smoke test.
8. Upload `dist/esnext.bundle.mjs` as a workflow artifact.

Do not:

- commit generated output back to `main`
- push from the workflow
- deploy the gist
- expose the gist URL
- generate or upload the private bookmarklet while the repository is public

Use a concurrency group to cancel superseded runs for the same branch if consistent with existing repository conventions.

## Testing Requirements

### 14. Generic capture tests

Add focused tests for:

- arbitrary page with no specialized parser returns generic data
- all requested URL components
- title, referrer, language, charset, and document fields
- preservation and ordering of `<meta>` elements
- metadata-bearing links
- viewport and screen mapping
- navigation-entry mapping
- Cookie Store success
- `document.cookie` fallback
- total cookie failure preserving metadata
- no specialized match without `NO_PARSER_MATCHED`
- specialized parser success alongside generic data
- specialized parser warning alongside generic data
- specialized parser exception preserving generic data
- async specialized parser support
- combined status derivation

### 15. Report tests

Verify:

- generic metadata is rendered
- cookies appear only through inert text APIs
- cookie warning is present
- specialized sections are conditional
- diagnostics from both layers are rendered
- JSON contains both generic and specialized results
- malicious metadata, cookie names, cookie values, and parser strings cannot create executable elements or attributes

### 16. Build tests

Verify:

- exact output path
- one emitted bundle
- deterministic repeated builds
- no unresolved imports
- no TypeScript source imports
- expected exports
- bundle import smoke test
- building the bundle does not delete bookmarklet outputs

### 17. Bookmarklet tests

Verify both variants:

- begin with `javascript:`
- are single-line output
- synchronously call `window.open()` before asynchronous loading
- use the correct loader
- preserve popup-blocked behavior
- validate `captureCurrentTab`
- report loading errors in the opened report tab
- contain no stale hard-coded URL when package configuration changes

For the private variant, test:

- configured raw URL construction
- successful fetch and Blob import flow
- non-2xx raw response
- network rejection
- missing exported function
- object URL revocation

### 18. Deployment tests

Using an injected fake command runner, test:

- missing bundle
- missing config
- inaccessible gist
- replacing an existing configured file
- adding the configured file when absent
- preserving unrelated files
- failed remote verification
- no secret bundle content written to logs

Require one manual authenticated smoke test against the configured secret gist before declaring the phase complete.

## Documentation

### 19. Update project documentation

Update README and relevant planning files to explain:

- generic capture always runs
- specialized parsers provide optional enrichment
- exact capture-result structure
- cookie visibility limitations
- security implications of displaying cookies
- public versus private bookmarklet variants
- bundle build command
- gist deployment command
- package deployment configuration
- secret-gist limitations
- repository-visibility prerequisite
- CSP and popup limitations
- generated artifact locations
- manual installation of the bookmarklet

Do not paste independently maintained bookmarklet source into multiple files. Either generate documentation snippets or point readers to the generated artifact.

### 20. Repair necessary repository hygiene

The current `.gitignore` contains unresolved merge-conflict markers. Include removal of those markers as a preflight repository-hygiene task before adding `dist/`.

Do not broaden this into unrelated cleanup.

## Recommended Execution Phases

### Phase 1: Capture contract and generic parser

- Reconcile and supersede the current `.planning/TODO.md`.
- Introduce generic page and cookie contracts.
- Make capture asynchronous.
- Run generic capture first.
- Preserve optional specialized parsing.
- Update status derivation.
- Update report rendering.
- Add capture and report tests.

### Phase 2: Deterministic ESM bundle

- Add `tsdown.config.ts` and supporting build script.
- Produce exact single-file browser ESM output.
- Add output validation and bundle tests.
- Add `dist/` policy.

### Phase 3: Bookmarklet generation and gist deployment

- Extract shared bookmarklet generator.
- Add public bookmarklet build.
- Add private gist bundle bookmarklet build.
- Add package deployment configuration.
- Add authenticated gist deployment script.
- Add unit tests and perform manual secret-gist smoke test.

### Phase 4: CI, documentation, and privacy transition verification

- Add the main-branch build workflow.
- Upload bundle artifact.
- Update README and planning documents.
- Confirm no secret gist URL is exposed while the repository is public.
- Verify the production path after the repository is private.
- Run complete validation and browser smoke checks.

## Non-Goals

Do not include the following unless separately approved:

- browser extension packaging
- automatic discovery of parser files at browser runtime
- executing multiple specialized parsers on one page
- uploading captured metadata or cookies to GitHub
- automatic gist deployment on every push
- automatic creation of replacement gists
- CSP bypasses
- access to HttpOnly cookies
- Firefox, Safari, or mobile compatibility work
- new UI frameworks
- new runtime dependencies
- npm publication redesign
- changing repository visibility through code

## Completion Criteria

The revised plan is complete only when it schedules and verifies all of the following:

- Generic capture succeeds on an arbitrary ordinary page.
- Script-visible cookies and page metadata appear in the report.
- No specialized parser match is treated as a normal generic capture.
- Matching specialized parser output appears after generic output.
- Specialized parser failure cannot erase generic output.
- `captureCurrentTab()` is asynchronous.
- `dist/esnext.bundle.mjs` is a single self-contained browser ESM file.
- The configured secret gist can be updated idempotently.
- The public bookmarklet is generated from shared source.
- The private bookmarklet loads the current gist bundle without relying on raw-module MIME handling.
- The GitHub Actions workflow rebuilds and validates the bundle on every push to `main`.
- Generated output is not committed by CI.
- Sensitive cookie data and the secret gist URL are not exposed in inappropriate logs or public artifacts.
- Tests, type checking, bundle validation, and Chrome/Edge smoke checks pass.
- Documentation accurately reflects both the public legacy path and the private production path.