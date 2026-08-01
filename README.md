# Browser Parser

Browser Parser captures a typed, serializable report from the currently open ordinary browser page. Generic page capture always runs; an explicitly registered first matching specialized parser may add optional enrichment such as the Asana preview.

## Delivery paths

### Public source bookmarklet

Build the migration and diagnostic variant with:

```text
npm run build:public-ts-bookmarklet
```

This writes `dist/public-bookmarklet.js`, a single-line `javascript:` URL that imports the public repository through:

```text
https://esm.sh/gh/dddominikk/browser-parser?target=es2022
```

It requires the repository to remain public and reachable by esm.sh. It is retained for migration and diagnostics and is not the recommended production path after repository privatization.

### Private secret-gist bundle bookmarklet

Build the production-oriented variant only in a private/local environment with a configured gist:

```powershell
$env:BROWSER_PARSER_GIST_ID = '<secret-gist-id>'
npm run build:private-gist-mjs-bundle-bookmarklet
Remove-Item Env:BROWSER_PARSER_GIST_ID
```

The package configuration supplies the filename (`esnext.bundle.mjs`) and repository-derived owner. Environment variables `BROWSER_PARSER_GIST_ID`, `BROWSER_PARSER_GIST_OWNER`, and `BROWSER_PARSER_GIST_FILENAME` can override local configuration. Do not commit a real gist ID or the generated private bookmarklet while the repository is public.

The private bookmarklet opens the report synchronously, fetches the raw gist with `cache: "no-store"`, checks the response, reads the bundle as text, imports a `text/javascript` Blob object URL, validates `captureCurrentTab`, revokes the object URL, and reports load failures in the already-open report tab. It does not rely on the gist response MIME type.

## Capture result

`captureCurrentTab()` returns a promise with this shape:

```ts
interface CaptureResult {
  capturedAt: string;
  status: 'complete' | 'partial' | 'failed';
  page: GenericPageData;
  specialized: SpecializedCapture | null;
  diagnostics: Diagnostic[];
}
```

Generic data includes URL components, document fields, source-ordered meta records, canonical/alternate/manifest/icon links, viewport and screen values, first navigation timing, and script-visible cookies. Cookie Store is preferred; `document.cookie` is a less-complete fallback. HttpOnly cookies and cookies outside the page's script-visible scope cannot be captured. Cookie values are sensitive and are shown in the report only behind an explicit warning.

No specialized parser match is normal and does not produce `NO_PARSER_MATCHED`. A matching parser runs after generic capture, and specialized warnings or exceptions cannot erase generic data. The registry remains explicit and first-match wins.

## Embedded page explorer

The report tab includes a collapsed **Embedded page explorer**. Expand it to open a small browser-like iframe window, enter an address, and select **Go**. A missing scheme is treated as `https://`; only HTTP(S) addresses are accepted.

After a same-origin iframe load, the report shows the resolved URL, document title, description meta tag, canonical link, and Open Graph records immediately below the frame. Browser same-origin policy can prevent the report tab from reading another site's document; those loads are reported as an inline error and are not bypassed. The explorer does not upload page data or alter the main capture result.

## Build and deployment commands

```text
npm run validate
npm run build:mjs-bundle
npm run build:public-ts-bookmarklet
npm run build:private-gist-mjs-bundle-bookmarklet
npm run deploy:mjs-bundle-gist
```

The bundle command writes exactly `dist/esnext.bundle.mjs`. Generated files under `dist/` are ignored and are not committed by CI. Deployment first rebuilds, requires GitHub CLI authentication and an existing configured gist, updates only the configured filename, preserves unrelated gist files, and verifies the remote checksum. It never creates a replacement gist and is not part of ordinary build CI.

## Security and browser limitations

Extracted page text, metadata, cookies, and parser output are untrusted. The report constructs DOM nodes and inserts captured values as text; it does not interpolate captured values into executable HTML or attributes. Cookie values must not be logged.

The repository must be private before production deployment configuration or private bookmarklet artifacts are published. A secret gist is unlisted, not access-controlled: anyone with its URL can retrieve it. CI does not deploy, push, expose the private URL, or upload a private bookmarklet while the repository is public.

Current desktop Edge is the first and only supported browser target for now. Page CSP can block bookmarklet execution, the esm.sh import, raw gist fetch, Blob import, or popup creation. Browser policy and popup failures are reported; Browser Parser does not bypass CSP or retry another host. The root `bookmarklet.txt` was removed so generated artifacts remain the only bookmarklet source.

## Manual installation

Run the appropriate build command, copy the complete single-line contents of the generated `.js` file, and paste it as the URL of a browser bookmark. Run it on an ordinary page with the report tab kept open. The public variant is for public-repository use; the private variant is for a locally controlled/private deployment.
