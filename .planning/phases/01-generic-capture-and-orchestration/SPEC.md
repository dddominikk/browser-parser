# Phase 1 Specification: Generic Capture and Specialized Orchestration

## Goal

Every ordinary-page invocation produces a typed generic page capture first, then optionally adds the existing first-match specialized parser result without discarding generic data.

## Inputs and Baseline

- Current capture path is synchronous and returns a parser-centric envelope.
- `src/registry.ts` explicitly orders built-ins before extensions and currently registers Asana.
- `src/report.ts` already creates/adopts a report surface and renders with DOM construction plus `textContent`.
- `src/parsers/asana.ts` is synchronous and returns summary rows plus diagnostics.

## Required Behavior

1. Open/adopt the report synchronously in the caller; the capture function may then await cookie and specialized work.
2. Build a browser page context from the current global page or injected test context.
3. Capture URL components, document fields, source-ordered meta records, useful metadata links, viewport/screen values, first navigation timing, and script-visible cookies as plain data.
4. Prefer `globalThis.cookieStore.getAll()`. Preserve `COOKIE_STORE_UNAVAILABLE` and `COOKIE_CAPTURE_FAILED` semantics from the earlier slice, add the authoritative fallback behavior for `document.cookie`, and never expose cookie values to logs.
5. Select the existing specialized parser only after generic capture. Preserve first-match behavior and do not register the generic parser.
6. Accept synchronous or promise-returning specialized `parse()` methods.
7. Return `complete`, `partial`, or `failed` according to useful-data and diagnostic rules. A no-match page is not unsupported and does not receive `NO_PARSER_MATCHED`.
8. Render generic data, sensitive-cookie warning, conditional specialized state, diagnostics, and complete JSON through inert DOM APIs.

## Non-Goals

Multi-parser execution, runtime parser discovery, broader Asana extraction, upload/synchronization, a new UI framework, or access to HttpOnly cookies.

## Acceptance Evidence

- Focused unit tests cover all generic fields, cookie success/fallback/failure, no-match, specialized success/warning/failure, async parsers, and status derivation.
- Report tests prove generic/specialized content and hostile strings remain text, including cookie warning and JSON.
- Typecheck passes with existing erasable TypeScript constraints.
