# Phase 3 Specification: Bookmarklet Generation and Secret-Gist Deployment

## Goal

Generate public-source and private-secret-gist bookmarklets from one shared implementation and provide an explicit idempotent command for updating the configured bundle file.

## Configuration

Read `package.json.config.deployments.bundle` with required non-empty `gist` and `filename`; infer owner from `package.json.repository` as `dddominikk` unless an optional owner is needed. The production example gist ID from the authoritative brief is planning-only while the repository is public and must not be committed or emitted into public artifacts before the privacy gate is accepted.

## Bookmarklet Behavior

- Both files are single-line `.js` files beginning with `javascript:`.
- Shared code synchronously opens/adopts the report window, handles popup blocking, creates initial status markup, validates module exports, invokes `captureCurrentTab({ reportWindow })`, and renders import failures in the opened tab.
- Public loading remains the esm.sh GitHub TypeScript URL derived from repository metadata.
- Private loading fetches the configured raw gist with `cache: "no-store"`, checks `response.ok`, reads text, creates a `text/javascript` Blob, imports its object URL, validates `captureCurrentTab`, revokes the URL after settlement, and reports errors without relying on gist MIME handling.

## Deployment Behavior

Build first, validate config/auth/gist access, read the bundle as UTF-8, PATCH only the configured gist filename through an injected/encapsulated `gh api` runner, preserve unrelated files, reject missing gists without creating replacements, verify remote content/checksum, and keep logs concise and secret-safe.

## Acceptance Evidence

Focused generator, loader, and deployment tests cover all failure paths. One manual authenticated smoke test updates the configured secret gist only after the privacy gate permits it.
