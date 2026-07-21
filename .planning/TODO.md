# Next Implementation Slice

## Authority

This document defines the complete approved implementation scope for the current work session.

Implement only the behavior described here. Do not expand the roadmap, redesign specialized-parser selection, broaden Asana extraction, or add unrelated hardening work.

## Objective

Add an always-run asynchronous default page capture that collects basic browser metadata and script-visible cookies, then expose that data through the existing capture and report flow with the smallest coherent code changes.

## Required Changes

### 1. Make the capture path asynchronous

`captureCurrentTab()` must return a promise so that browser APIs such as `cookieStore.getAll()` can be awaited.

Only update surrounding contracts as required to support this change.

### 2. Add a default page parser

The default parser always runs and is not selected from the specialized-parser registry.

It should collect:

- `location.href`
- URL components such as origin, protocol, host, hostname, port, pathname, search, and hash
- `document.title`
- `document.referrer`
- document language
- document character set
- the first navigation timing entry when available
- viewport dimensions and device pixel ratio
- screen and available-screen dimensions
- cookies returned by `await cookieStore.getAll()`

### 3. Handle Cookie Store API failure locally

When `globalThis.cookieStore?.getAll` is available:

```ts
const cookies = await globalThis.cookieStore.getAll();
```

Map returned cookies into plain JSON-safe records.

When the API is unavailable, add a stable `COOKIE_STORE_UNAVAILABLE` diagnostic.

When `getAll()` throws or rejects, add a stable `COOKIE_CAPTURE_FAILED` diagnostic.

Neither condition should discard the remaining page metadata.

### 4. Preserve existing specialized behavior

Do not redesign specialized-parser ordering in this slice.

After default capture, call the existing specialized behavior in the least invasive way available. If the current implementation can only run synchronously, adapt it minimally so the combined result can contain:

- always-present default page data
- the existing specialized result when one is produced
- combined diagnostics

Full built-in-versus-registered precedence belongs to Phase 2.

### 5. Update the result and report

The effective result should follow this shape:

```ts
interface CaptureResult {
  capturedAt: string;
  status: "complete" | "partial" | "failed";
  page: DefaultPageData;
  specialized: SpecializedCapture | null;
  diagnostics: Diagnostic[];
}
```

Use the existing types where practical rather than introducing an elaborate new type hierarchy.

The report must render page metadata and cookies using fixed DOM elements and `textContent` or equivalent inert text APIs.

## Implementation Sketch

This is guidance, not a required internal structure:

```ts
export async function captureCurrentTab(options = {}): Promise<CaptureResult> {
  const context = createPageContext();
  const pageResult = await captureDefaultPage(context);

  let specialized = null;
  const diagnostics = [...pageResult.diagnostics];

  try {
    specialized = await captureExistingSpecializedResult(context, options);
    if (specialized) diagnostics.push(...specialized.diagnostics);
  } catch (error) {
    diagnostics.push({
      code: "SPECIALIZED_PARSER_FAILED",
      message: toErrorMessage(error),
    });
  }

  return {
    capturedAt: new Date().toISOString(),
    status: deriveStatus(pageResult.data, specialized, diagnostics),
    page: pageResult.data,
    specialized,
    diagnostics,
  };
}
```

A minimal cookie mapping might retain only fields actually exposed by the browser and needed in the report:

```ts
cookies = (await globalThis.cookieStore.getAll()).map(cookie => ({
  name: cookie.name,
  value: cookie.value,
  domain: cookie.domain ?? null,
  path: cookie.path ?? null,
  expires: cookie.expires ?? null,
  secure: cookie.secure ?? null,
  sameSite: cookie.sameSite ?? null,
  partitioned: cookie.partitioned ?? null,
}));
```

Do not add fields merely because they might exist in some future browser version.

## Minimal Tests

Add focused tests for:

1. Default capture returning page metadata when no specialized parser matches.
2. Cookie Store success mapping returned cookie records.
3. Cookie Store absence producing `COOKIE_STORE_UNAVAILABLE`.
4. Cookie Store rejection producing `COOKIE_CAPTURE_FAILED` while preserving page data.
5. Existing specialized capture still appearing alongside default page data.
6. Specialized failure preserving default page data and producing a partial result.
7. Report rendering cookie names and values as inert text.

Do not create a large fixture matrix for this slice.

## Done When

- The exact bookmarklet still opens its report tab and completes capture.
- Generic page metadata appears on arbitrary supported HTTPS pages.
- Script-visible cookies appear when Cookie Store API access succeeds.
- Cookie Store API absence or failure appears as a diagnostic rather than a failed capture.
- Existing Asana behavior remains available.
- Tests pass.
- No new planning documents or architecture layers were introduced.
