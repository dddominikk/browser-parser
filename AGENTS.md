<!-- GSD:project-start source:PROJECT.md -->

## Project

**Browser Parser**

Browser Parser is a TypeScript package for extracting structured context from the currently open browser tab and presenting the result in a separate report tab. It is loaded by a minimal bookmarklet directly from the public GitHub repository through esm.sh, with Asana supplied as the first built-in parser and an exported registry available for third-party parsers.

The initial release targets current Chrome and Edge. It treats page DOM content as untrusted input, reports partial extraction explicitly, and keeps the runtime dependency-free.

**Core Value:** A user can run a tiny bookmarklet on a supported page and reliably receive a typed, serializable context report without installing an extension or configuring a backend.

### Constraints

- **Language**: All maintained source is TypeScript using erasable syntax compatible with Node's native type stripping.
- **Runtime dependencies**: None for v1; do not add any dependency without consulting the project owner.
- **Browser delivery**: The bookmarklet dynamically imports the latest default-branch module through esm.sh and calls `captureCurrentTab()`.
- **Bookmarklet size**: Keep the inline bookmarklet limited to loading and invoking the package; all substantive behavior belongs in the package.
- **Browser compatibility**: Support current Chrome and Edge first.
- **Data boundary**: Parsers operate on the rendered DOM and return serializable data without retaining DOM nodes.
- **Error model**: Unsupported pages, partial extraction, popup blocking, and other expected failures use a typed result with structured diagnostics.
- **Security**: Treat extracted text and metadata as untrusted; report rendering must avoid executable HTML injection.
- **Testing**: Use Node's built-in test runner for portable core logic, dependency-free browser fixture pages for DOM behavior, and manual Chrome/Edge smoke checks.
- **Repository hygiene**: Preserve unrelated user changes and replace inherited package metadata only when implementation begins.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Stack Decision

### Core Runtime

| Technology | Exact baseline | Purpose | Why |
|------------|----------------|---------|-----|
| Browser Web APIs | Chrome 150 and Edge 150 stable at research time; policy is current stable Chrome/Edge | Production execution, DOM extraction, report tab | Both targets are Chromium and natively support dynamic `import()`, ESM, modern DOM APIs, `URL`, and async functions. No browser polyfill is needed. |
| esm.sh GitHub registry | `https://esm.sh/gh/dddominikk/browser-parser?target=es2022` | Transform the GitHub TypeScript entry into browser-loadable ESM | Officially supports `/gh/{owner}/{repo}`, package exports, commit/tag refs, and on-the-fly `.ts` transformation. `target=es2022` makes emitted syntax deterministic across the two current Chromium targets. |
| Node.js | 25.2.0 or newer for local development/CI and package runtime | Native `.ts` execution and built-in tests | The project requires Node 25 or newer; use an available verified executable and keep type stripping syntax erasable. |
| TypeScript | 6.0.3 for v1 | Static type checking and optional fixture-only JS emit | Already present, satisfies Node's `>=5.8` guidance, and understands every required type-stripping option. TypeScript 7.0.2 is current but was released only days before this research and introduces a new native toolchain with no compiler API; it adds migration risk without v1 product value. Revisit after v1. |

### Native and Platform APIs

| API | Purpose | Constraint |
|-----|---------|------------|
| `globalThis.document`, `Document`, `Element`, `querySelector(All)`, `closest`, `textContent`, `getAttribute` | Read the currently rendered page | Keep DOM access behind browser-facing orchestration/parser boundaries. Return plain serializable values, never DOM nodes. |
| `URL` and `URLSearchParams` | Match sites and parse stable IDs from the current URL | Prefer URL-derived IDs over scraping when available. No Node URL import; use the global Web API. |
| `window.open('about:blank', '<stable-name>')` | Reserve and reuse the report tab | Must run synchronously in the bookmarklet's user activation, before any `await import(...)`. Check for `null`. |
| `Document.createElement`, `Node.append`, `Node.textContent` | Build the report | Put every extracted string into `textContent`. Static CSS may use `style.textContent`; never interpolate page data into HTML/CSS. |
| `JSON.stringify` | Produce the machine-readable report | Treat serialization failure as a structured diagnostic. Data contracts should exclude DOM nodes, functions, symbols, and cycles. |
| `console` | Development diagnostics only | Do not make console output the product result; return typed diagnostics and show them in the report tab. |

### Development and Test Tooling

| Technology | Version | Purpose | Recommendation |
|------------|---------|---------|----------------|
| `node:test` | Built into Node 25+ | Unit and integration tests for pure logic | Use `tests/**/*.test.ts`; `node --test` discovers `.ts` tests when stripping is enabled. |
| `node:assert/strict` | Built into Node 25+ | Assertions | Use directly; do not add Vitest, Jest, Chai, or assertion helpers. |
| `tsc` | TypeScript 6.0.3 | Typecheck all source and tests | Keep as the only general development compiler. Use a separate emit config only for local browser fixture smoke tests. |
| `@types/node` | 26.1.0 | Types for test files and Node-only fixture tooling | Scope these types to the test/tooling config so production source cannot accidentally depend on Node globals. |
| Static HTML fixtures | Repository files | Real-DOM parser and report checks | Maintain representative sanitized Asana fixture pages and a dependency-free test harness. Load in Chrome/Edge through a tiny Node static server. |
| Manual browser smoke matrix | Chrome 150 + Edge 150 at research time | Popup, CSP, module load, selector, and report behavior | Required for v1 because Node has no DOM and no browser automation dependency is approved. Record pass/fail and browser versions in the phase verification artifact. |

## Package and Export Shape

### Recommended `package.json` Contract

- Export only the root module in v1. This makes the public API explicit and allows internals to move without creating accidental supported subpaths.
- Put `types` first because condition ordering matters and Node's package guidance defines `types` as the typing-system condition.
- Keep `import` and `default` on the same universal source file. Do not create browser-versus-Node forks when production source uses no Node APIs.
- Remove `main`; modern Node and esm.sh both use `exports`, and a duplicate legacy entry adds no value for the supported consumers.
- Do not add `browser`, `module`, CommonJS, or generated `dist` entries for v1.
- Do not claim npm-installed Node runtime support while exports lead to `.ts`; Node will not strip TypeScript under `node_modules`. If npm installation later becomes a requirement, add emitted `.js` plus `.d.ts` artifacts as a separate milestone.
- Pin existing development tooling and commit a lockfile when dependency metadata is normalized. Do not add or install packages during this research/foundation decision.

## TypeScript Configuration

### Production Source Config

### Source Rules Required by Native Type Stripping

- Every relative runtime import must name the `.ts` extension: `import { x } from './x.ts'`.
- Every type-only binding must use `import type` or an inline `type` modifier.
- Use standard JavaScript runtime constructs plus erasable interfaces, type aliases, generics, annotations, and `as`/`satisfies` checks.
- Do not use enums, parameter properties, import aliases (`import x = ...`), namespaces containing runtime values, TypeScript `export =`, `.tsx`, decorators requiring transformation, or `tsconfig.paths` aliases.
- Do not rely on TypeScript to downlevel syntax or apply `tsconfig.json` at runtime; Node ignores that file when executing `.ts`.
- Do not import `node:*` modules or access `process`, `Buffer`, or other Node globals from `src/**`.

## Browser Module-Loading Contract

### Production Bookmarklet Shape

### esm.sh Semantics and Caveats

- Unpinned latest source: `https://esm.sh/gh/dddominikk/browser-parser?target=es2022`.
- Reproducible diagnostic/build: `https://esm.sh/gh/dddominikk/browser-parser@<commit>?target=es2022`.
- Release pin, if tags are introduced: `https://esm.sh/gh/dddominikk/browser-parser@v0.1.0?target=es2022`.
- Do not use `?raw`; browsers cannot execute raw TypeScript. The standard URL must transform the source to JavaScript.
- Live verification showed an unpinned GitHub request resolving to a commit-specific module with `Cache-Control: public, max-age=600`; a tag was returned with a one-year immutable cache. Treat the ten-minute observation as current service behavior, not a contractual freshness SLA.
- esm.sh currently responds with `Access-Control-Allow-Origin: *`, satisfying cross-origin module CORS. The embedding page's CSP remains authoritative: `script-src` or its `default-src` fallback can block `https://esm.sh` or the bookmarklet itself. Do not attempt a CSP bypass.
- First access may require a server-side build and can be slower or fail temporarily. Report module-load failure clearly in the already-open report tab.
- The unpinned URL intentionally trusts the current default branch plus esm.sh/GitHub availability. Keep a documented commit-pinned troubleshooting URL even though latest-default-branch loading is the v1 product choice.

### Current Repository Readiness

## Testing Strategy

### Node Layer

### Real Browser Layer

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Browser runtime | Native DOM/Web APIs | React, Preact, Lit | Report is small and static; a UI framework adds runtime weight and another CDN graph. |
| DOM testing | Static fixtures in Chrome/Edge | jsdom, happy-dom | New dependency, incomplete browser fidelity, and explicitly outside the dependency constraint. |
| Browser automation | Manual Chrome/Edge smoke for v1 | Playwright, Puppeteer, WebDriver packages | Valuable later, but adding one now violates the selected no-new-dependency strategy. |
| Node TS execution | Native type stripping | `tsx`, `ts-node` | Node 25+ executes erasable `.ts`; loaders would duplicate the runtime contract. |
| Test framework | `node:test` + `node:assert/strict` | Vitest/Jest | Node's built-in runner discovers TypeScript tests and is sufficient for the package's pure core. |
| Build/bundle | esm.sh in production; fixture-only `tsc` emit | `tsdown`, Rollup, esbuild | A checked-in production bundle is not needed for the specified GitHub-to-esm.sh delivery. |
| Compiler version | TypeScript 6.0.3 for v1 | TypeScript 7.0.2 immediately | TS 7 is current and promising, but its new compiler foundation/no API transition is unrelated to the v1 value and was only days old at research time. |
| Node baseline | Node 25+ | Node below 25 | The project runtime contract requires Node 25 or newer. |
| Installed Node package | Not supported in v1 | Export raw `.ts` from npm | Node refuses native stripping below `node_modules`; supporting this requires emitted JS artifacts. |
| Report rendering | DOM construction + `textContent` | HTML template + escaping/document.write | The DOM route makes untrusted text inert by construction and avoids incomplete escaping. |
| Bookmarklet popup | Open synchronously, then import | Import first, open inside capture | The latter can lose transient user activation and be blocked. |

## Installation and Dependency Policy

## Compatibility Matrix

| Surface | Supported | Unsupported / caveat |
|---------|-----------|----------------------|
| Browser | Current Chrome and Edge desktop; v150 at research time | Firefox, Safari, mobile, browser-internal pages, sandboxed frames, and enterprise policy restrictions are out of v1 scope. |
| Browser module load | HTTPS esm.sh URL with CORS, allowed by page CSP | Strict `script-src`/`default-src`, offline use, CDN outage, or an unpublished/private GitHub source prevents loading. |
| Node development | Node 25+ native type stripping | Node versions below 25 are unsupported by this project. |
| TypeScript syntax | Erasable syntax only | Enums, parameter properties, runtime namespaces, import aliases, TSX, transform-dependent decorators, paths aliases. |
| Node package consumption | Direct repository scripts/tests | Raw `.ts` installed under `node_modules` is rejected by Node. |
| Content availability | Rendered/mounted DOM | Virtualized or unloaded Asana history cannot be extracted reliably. |

## Roadmap Implications

## Sources

- [Node.js TypeScript modules](https://nodejs.org/api/typescript.html) — native stripping status, configuration, syntax limits, type imports, mandatory extensions, and `node_modules` refusal.
- [Node.js release status](https://nodejs.org/en/about/previous-releases) — Node 24 LTS, Node 26 Current, Node 25 EOL.
- [Node.js 24.12.0 release](https://nodejs.org/en/blog/release/v24.12.0) — stable type stripping milestone.
- [Node.js test runner](https://nodejs.org/api/test.html) — `.ts` test discovery and `node --test`.
- [Node.js package modules](https://nodejs.org/api/packages.html) — `exports`, condition ordering, entry-point encapsulation, and `type`.
- [TypeScript `allowImportingTsExtensions`](https://www.typescriptlang.org/tsconfig/allowImportingTsExtensions.html).
- [TypeScript `rewriteRelativeImportExtensions`](https://www.typescriptlang.org/tsconfig/rewriteRelativeImportExtensions.html).
- [TypeScript TSConfig reference](https://www.typescriptlang.org/tsconfig/) — `erasableSyntaxOnly`, `verbatimModuleSyntax`, `isolatedModules`, and strictness options.
- [TypeScript 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) — current release and compiler API transition caveat.
- [esm.sh official documentation](https://esm.sh/) — GitHub URLs, refs, TypeScript transformation, exports guidance, targets, and caching FAQ.
- [MDN dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) — dynamic imports from non-module code.
- [MDN script modules](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script) — cross-origin module CORS.
- [MDN CSP `script-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src) — remote script allowlisting and default-src fallback.
- [MDN `Window.open()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/open) — direct user-activation and popup-blocking requirements.
- [Chrome stable releases](https://chromereleases.googleblog.com/) and [Microsoft Edge stable release notes](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-relnote-stable-channel) — current browser test baseline.
- Live checks on 2026-07-20: `https://esm.sh/gh/microsoft/tslib`, its tagged form, and `https://esm.sh/gh/dddominikk/browser-parser`; plus repository `origin/main` inspection.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Runtime and TypeScript settings | MEDIUM | Verified against current official Node and TypeScript docs; seam caps verified websearch at MEDIUM. |
| Package/export shape | MEDIUM | Official Node and esm.sh guidance supports the shape; the project endpoint still needs a post-push live smoke test. |
| Browser loading constraints | MEDIUM | Official platform docs plus live esm.sh headers; actual site CSP and enterprise policies vary. |
| Test tooling | MEDIUM | Node behavior is official; manual browser fixture strategy follows from the explicit dependency constraint. |
| Current remote readiness | HIGH | Direct local Git and live CDN response observation on the research date. |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
