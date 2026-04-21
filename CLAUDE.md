# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm test` — run Jest (jsdom, `maxWorkers: 1`, 20s timeout)
- `npm test -- -t "pattern"` — run a single test by name
- `npm test -- src/index.test.ts` — run a single test file
- `npm run test-coverage` — Jest with coverage (threshold is 5% globally — effectively a smoke gate, not real coverage enforcement)
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`)
- `npm run compile` — `tsc --noEmit` type-check against `src/index.js` + `src/index.d.ts`
- `npm run prettier` / `npm run prettier-fix`
- `npm run enable-pre-commit` — installs the `.pre-commit-config.yaml` hooks (pre-commit runs prettier-fix + lint + compile; commit-msg enforces Conventional Commits)

Demo app lives in `demo/react-typescript/` with its own `package.json`. From that directory: `npm run start-dev-server`. To exercise local SDK changes, `npm link` from repo root, then `npm link @adadapted/js-sdk` from the demo dir (see `demo/react-typescript/README.md`).

## Architecture

This package ships the SDK as **hand-authored JS + hand-authored type declarations** — there is no build step for the published artifact. `package.json` points `main`/`module`/`types` directly at `src/index.js` and `src/index.d.ts`, and `files` only includes those two. TypeScript is used for type-checking (`tsc --noEmit`) and for the Jest test file; it does not emit the shipped code. Consequence: any change to the public API must be reflected in both `src/index.js` (implementation) and `src/index.d.ts` (declaration) — they are not generated from each other.

The entire SDK is a single class `AdadaptedJsSdk` in `src/index.js` (~2550 lines). Public methods are what's declared in `src/index.d.ts`; everything else is a `#`-private method or `#`-private enum-style object (`#ApiEnv`, `#ListManagerApiEnv`, `#PayloadApiEnv`, `#DeviceOS`, `#AdActionType`, `#ReportedEventType`, `#ListManagerEventSource`, `#ListManagerEventName`, `#ListManagerType`). Don't expose those — downstream consumers rely on the declared surface only.

Key runtime flow:

- `initialize(props)` validates required fields (`apiKey`, `advertiserId`, `allowRetargeting`) and delegates to `#initializeSession()`, which caches the session in `localStorage` keyed by `aa-session-${apiEnv}-${sha256(apiKey)}`. Reusing a cached session also checks `storeId` / `recipeContextId` / `recipeContextZoneIds` match.
- Three backends are hit in parallel — ads API, list-manager API, payload API — each with separate prod/dev URLs chosen by `apiEnv: "prod" | "dev"`. There is no staging tier at the SDK level.
- `#refreshAdZones` / `#renderAdZones` manage timers (`refreshAdZonesTimer`, `refreshSessionTimer`) and a scroll listener (on `scrollContainerId` if provided, else `document`) gated by an `AbortController`. `unmount()` must be called to tear these down — the SDK leaks timers and listeners otherwise.
- Client callbacks (`onAdZonesRefreshed`, `onAddItemsTriggered`, `onExternalContentAdClicked`, `onPayloadsAvailable`, `onAdsRetrieved`) are set once during `initialize`. They default to no-op methods; don't assume they've been provided.

Network calls go through `#fetchApiRequest`. Note: the response handler treats any JSON with a `detail` field as an error (this is the API's error shape) — don't add a `detail` field to success payloads.

## CI / release

`.github/workflows/merge-branch.yml` runs validation (prettier, lint, compile) on every push and PR to `main`. A **push to `main`** (i.e. a merged PR) additionally runs `create_release_version` which auto-bumps the version via Conventional Commits tags and then `deploy-environment.yml` publishes to npm. There is no separate release step — merging to `main` publishes. Version in `package.json` is pinned at `0.0.0-development` and overwritten at publish time by `npm version ${new_tag}`.

The Conventional Commits pre-commit hook is what drives the semver bump on release — non-conforming commit messages both fail locally and would break the auto-tag.

## Testing notes

- `jest.setup.ts` polyfills `global.crypto` with Node's `crypto` because jsdom doesn't provide `crypto.subtle.digest`, which the SDK uses to hash the API key for session cache keys.
- `__mocks__/` holds file and style mocks referenced from `jest.config.ts` `moduleNameMapper`.
- `src/index.test.ts` uses fetch mocks and fake timers heavily — be careful adding new timer-based flows without corresponding `jest.useFakeTimers()` wiring in the test setup.
