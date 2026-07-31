# Phase 3 Context

## Locked Decisions

- There is one shared bookmarklet generator with a pluggable module-loading strategy; no duplicated hand-maintained source remains.
- The public variant is retained for migration/diagnostics and is not the post-privacy production recommendation.
- The private variant loads bundle text through fetch plus Blob/object URL, not direct raw-URL module import.
- Raw bundle requests use `cache: "no-store"` unless live evidence requires a change.
- Deployment is explicit and authenticated; it never runs as part of ordinary build CI.
- Deployment mutates only the configured file in an existing gist and never creates a replacement gist.
- The root `bookmarklet.txt` disposition (generated compatibility copy or removal) is an implementation choice, but it cannot remain a second source of truth.

## Secret Handling

The repository is public at planning time. The real gist ID, raw URL, private bookmarklet, and private artifact remain withheld from public committed files, public logs, and public CI artifacts. An environment-variable override may support local testing without making production configuration public.

## Handoff

Phase 4 documents the two variants and verifies public/private separation. It must not assume that a secret-gist smoke test is safe until repository visibility and artifact/log checks pass.
