# Phase 1 Context

## Locked Decisions

- Generic capture is mandatory and is not a member of the specialized parser registry.
- The existing explicit registry and first matching parser behavior remain unchanged in principle; do not redesign precedence.
- Generic capture runs before specialized selection and specialized failures are non-fatal when generic data exists.
- `captureCurrentTab()` becomes asynchronous. Existing synchronous parsers remain valid through a value-or-promise parse contract.
- The public combined envelope uses `capturedAt`, `status`, `page`, `specialized`, and `diagnostics`.
- `unsupported` is not a top-level result for ordinary pages with no specialized parser.
- Cookie values are sensitive and must never be logged; the report may show them only as requested, with an explicit warning and inert text.

## Field Contract

The generic page contract includes all URL components, document title/referrer/language/charset/content type/ready state/last-modified, every current meta element in order, canonical/alternate/manifest/icon links, viewport and screen metrics, a mapped first navigation timing entry, and script-visible cookies.

Cookie handling prefers Cookie Store, maps only exposed stable fields, falls back to `document.cookie`, preserves page metadata when either path fails, and records stable diagnostics. HttpOnly and out-of-scope cookies remain explicitly unavailable.

## Existing Assets to Adapt

- `src/capture.ts`: orchestration, current status derivation, report handoff.
- `src/contracts.ts`: public types and parser context.
- `src/registry.ts`: explicit specialized ordering.
- `src/report.ts`: report surface and inert renderer.
- `src/parsers/asana.ts`: compatibility target for specialized behavior.

## Verification Boundaries

Tests should inject page/document/performance/screen/cookie surfaces rather than requiring a DOM dependency. Browser-specific manual checks are reserved for the final validation phase. Do not add packages.
