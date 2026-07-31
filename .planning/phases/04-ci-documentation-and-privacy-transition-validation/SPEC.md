# Phase 4 Specification: CI, Documentation, and Privacy-Transition Validation

## Goal

Close the milestone with public-safe CI, accurate user documentation, narrow repository hygiene, and evidence-aware validation of both public and private delivery paths.

## CI Contract

Create a workflow triggered on every push to `main` and manual dispatch. It checks out the repository, installs the supported Node version, runs `npm ci`, `npm run validate`, `npm run build:mjs-bundle`, asserts one bundle chunk, runs the bundle smoke test, and uploads only `dist/esnext.bundle.mjs`. It never commits, pushes, deploys the gist, exposes the gist URL, or produces a private bookmarklet artifact while the repository is public. Add concurrency cancellation when consistent with existing conventions.

## Documentation Contract

README and relevant docs explain always-run generic capture, optional specialized enrichment, exact result shape, script-visible-cookie limits and sensitivity, public/private bookmarklets, commands/configuration, secret-gist unlisted-access limits, repository-visibility prerequisite, CSP/popup limits, generated locations, and manual installation. Documentation points to generated artifacts rather than copying source.

## Privacy and Validation Contract

- Remove only the existing `.gitignore` conflict markers and add the `dist/` ignore rule.
- Scan public tracked/configured outputs for real gist IDs, raw URLs, private bookmarklet source, and secret values before any public merge.
- After repository privacy is explicitly accepted, perform the authenticated gist smoke test and private-loader check without publishing private output.
- Run complete tests/typecheck/bundle checks and current Edge smoke checks. Record CSP/popup restrictions as limitations, never passes.

## Non-Goals

No unrelated cleanup, automatic privacy change, automatic deployment, or new browser automation dependency.

## Acceptance Evidence

CI definition, docs diff, hygiene diff, privacy scan, authenticated deployment evidence, full validation output, and browser smoke matrix are available for milestone closeout.
