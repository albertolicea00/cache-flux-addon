# CacheFlux — Agent Instructions

Browser extension (Chrome MV3 + Firefox MV2) for one-click site data cleanup.

## First principles

- **Pure vanilla JS** — no frameworks, bundlers, transpilation. Code must run as-is in the browser.
- **No npm/node** — no package.json, no dependencies.
- **Dual-manifest** — `manifest.v3.json` (Chrome/Edge/Opera) and `manifest.v2.json` (Firefox). `manifest.json` is gitignored; run `make chrome` or `make firefox` to symlink the active one.
- **Version source of truth** is `manifest.v3.json` — but bump BOTH `manifest.v2.json` and `manifest.v3.json` when releasing.

## Commands

| Command | What it does |
|---|---|
| `make chrome` (or `mv3`/`v3`) | Copies `manifest.v3.json` → `manifest.json` |
| `make firefox` (or `mv2`/`v2`) | Copies `manifest.v2.json` → `manifest.json` |
| `make build` | Reads version from `manifest.v3.json`, builds both zips into `dist/VERSION/` |
| `make publish` | Creates `git tag v$(VERSION)` and pushes it — triggers release CI |
| `make clean` | Removes `dist/` and `manifest.json` |

## Architecture

- **`background.js`** — Service Worker (MV3) / Event Page (MV2). Contains a compat shim (`isMV3 = typeof chrome.action !== 'undefined'`) that switches between V2/V3 APIs.
- **`options.html` + `options.js`** — Settings page. Persists to `chrome.storage.sync` with `chrome.storage.local` fallback.
- **Cookie cleanup is two-phase**: (1) Chrome Cookies API deletes HttpOnly/partitioned cookies via `background.js`, (2) injected script clears `document.cookie` for JS-accessible ones.
- **Toolbar icon animation** uses `OffscreenCanvas` (MV3) / fallback canvas (MV2) — 15-frame sweep over 1.5s.
- **Blocked URLs** — cannot run on `chrome://`, `about:`, extension galleries, etc. Defined in `RESTRICTED_PREFIXES`.

## Conventions

- Debug logs: prefix with `🧹 CacheFlux:`
- Branch workflow: `main` (stable) + feature branches via Pull Requests
- Version in `manifest.v3.json` is canonical for make/git-versioning

## Release pipeline (CI)

1. Push tag `v*` → `release.yml` builds both `.zip` files → creates GitHub Release with assets attached.
2. Manual `workflow_dispatch` on `publish-stores.yml` to upload to Chrome/Edge/Opera/Firefox stores.
