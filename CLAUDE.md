# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fam Bam Dash** is a self-hosted, touch-friendly smart home dashboard (React 19 + TypeScript + Vite) optimized for portrait wall displays. It aggregates calendar, weather, photos, and to-do lists in a single-page app.

The app directory (`app/`) is the npm project root — all commands run from there.

## Commands

```bash
cd app

npm run dev          # Dev server on port 12000 (hot reload)
npm run build        # TypeScript check + Vite build → dist/
npm run preview      # Serve production build (port 12000)
npm run lint         # ESLint + TypeScript checks
npm run test         # Vitest (single run)
npm run test:watch   # Vitest watch mode
```

Run a single test file:
```bash
npm run test -- src/__tests__/gcal.test.ts
```

## Architecture

**No separate backend.** All API routes are implemented as Vite server plugins in `app/vite.config.ts`, running in the same Node.js process as Vite (both `npm run dev` and `vite preview`). This is the central architectural fact — when adding new server-side logic, it goes in `vite.config.ts`.

```
Browser (React SPA)
    ↓ REST + SSE
Vite Node.js process
    ├── /api/settings      → reads/writes data/settings.json
    ├── /api/todos         → reads/writes data/todos.json
    ├── /api/photos/*      → upload/list/delete from public/uploads/
    ├── /api/sse           → Server-Sent Events (multi-tab sync + display mode)
    ├── /api/display-mode  → accepts POST from motion sensor; broadcasts via SSE
    ├── /api/ical          → server-side proxy for iCal feed (bypasses CORS)
    ├── /api/gcal/*        → server-side proxy for Google Calendar API
    └── /api/auth/*        → OAuth PKCE token exchange & refresh

scripts/motion_sensor.py (optional, Raspberry Pi only)
    → reads settings from /api/settings every 60s
    → POSTs to /api/display-mode on motion state change
    → controls screen power directly via xset dpms
```

## State Management

No external state library. Two custom pub/sub modules handle all shared state:

- **`lib/settings.ts`** — `Settings` type (weather, calendar, slideshow, todo, motionSensor, theme), `subscribeSettings()` / `setSettings()`. Persists to `localStorage` + `/api/settings` (server backup). Restored from server on startup via `syncSettingsFromServer()`.
- **`lib/todo.ts`** — `TodoState` type, `subscribeTodo()` / `saveState()`. Same dual-persistence pattern. Checked items auto-remove after a configurable delay via `autoRemoveExpired()`.

Multi-tab sync: All tabs connect to `/api/sse`. The SSE stream carries two event types:
- `reload:<tabId>` — broadcast when settings/todos are saved; tabs with a different `tabId` reload
- `display-mode:dashboard` / `display-mode:screensaver` — broadcast when the motion sensor script POSTs to `/api/display-mode`; all tabs switch mode immediately

## Code Structure

```
app/src/
├── App.tsx                # Root layout, theme, OAuth callback handler, idle screensaver
├── index.css              # All CSS: portrait grid, widget styles, CSS custom property themes
├── lib/
│   ├── settings.ts        # Settings pub/sub + server sync
│   ├── todo.ts            # Todo pub/sub + auto-remove logic
│   ├── gcal.ts            # Calendar fetch: OAuth → iCal → JSON API fallback chain
│   ├── gapi.ts            # Google Calendar REST API calls
│   ├── oauth.ts           # PKCE flow, token storage, auto-refresh
│   ├── ical.ts            # Custom iCal parser (no npm dependencies)
│   ├── photos.ts          # Photo loading: bundled assets + /uploads/ + Google Photos
│   ├── weather.ts         # Open-Meteo API, ZIP→coords lookup, icon mapping
│   ├── retry.ts           # withRetry() exponential backoff wrapper
│   └── utils.ts
└── widgets/               # React components (one per dashboard section)
```

## Key Patterns

- **Calendar priority chain** (`lib/gcal.ts`): OAuth accounts → iCal proxy → Google Calendar JSON API. Each step falls through to the next on failure.
- **OAuth** (`lib/oauth.ts`): PKCE flow — code verifier stays in browser, token exchange happens server-side via `/api/auth/token` (requires `GOOGLE_CLIENT_SECRET` env var, never exposed to browser).
- **External fetches** — All wrapped with `withRetry()` from `lib/retry.ts` for exponential backoff.
- **Theming** — Pure CSS custom properties toggled on `<html>`. No component re-renders.
- **Photo sources** — `import.meta.glob` for bundled assets + runtime `/api/photos/list` + optional Google Photos album.

## Environment Variables

Defined in `app/.env.local` (gitignored). Use `app/.env.example` as a template.

| Variable | Where used | Purpose |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Browser | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Server only | OAuth token exchange |
| `VITE_LAT` / `VITE_LON` | Browser | Fallback weather coordinates |
| `VITE_GCAL_API_KEY` | Browser | Calendar JSON API fallback |
| `VITE_TIMEZONE` | Browser | Calendar display timezone |
| `GCAL_ICAL_URL` | Server only | iCal feed URL (proxied to avoid CORS) |
| `VITE_GOOGLE_PHOTOS_ALBUM_ID` | Browser | Google Photos album |
| `FAM_BAM_ADMIN_PIN` | Server only | If set, gates admin mutations (settings write, photo upload/delete, OAuth token exchange) behind an `X-Admin-Pin` header. Dashboard reads and todo writes stay open. Blank = disabled. |

## Adding Features

**New API route:** Add middleware in `vite.config.ts` using both `configureServer` and `configurePreviewServer` hooks (required for dev and production preview).

**New persistent data:** Add to `Settings` type in `lib/settings.ts` or `TodoState` in `lib/todo.ts`, then handle persistence in the corresponding `vite.config.ts` plugin.

**New widget:** Create `src/widgets/MyWidget.tsx`, place it in `App.tsx` layout grid, style in `index.css`.

## Tests

Unit tests live in `app/src/__tests__/` covering `gcal`, `todo`, `settings`, `weather`, and `retry`. Tests mock external APIs and `localStorage`. The test setup is in `app/vitest.config.ts` (or inherited from `vite.config.ts`).

## Production (Raspberry Pi)

Run `npm run build` then `npm run preview` — `vite preview` serves `dist/` and runs the `vite.config.ts` API plugins, so the full API surface is available without a separate server process.

Manage with a systemd service (see conversation history for an example unit file). Persistent data lives in `app/data/` (settings + todos) and `app/public/uploads/` (photos) — back these up.

`pi-setup.sh` is the single entry point for a full Pi install — Node.js, build, app service, kiosk mode, boot splash, session wallpaper, display rotation, and optional motion sensor, all in one script.

`kiosk-setup.sh` configures Chromium kiosk mode (called by `pi-setup.sh`, can also be run standalone).

`scripts/splash-setup.sh` installs the Plymouth boot splash (using `assets/splash-boot.png`) and sets the Wayland session wallpaper via `wbg` (using `assets/splash.png`). Can be run standalone. `assets/splash-boot.png` should be pre-rotated to appear correctly during boot (before the OS applies display rotation); `assets/splash.png` is in normal orientation.

`scripts/motion-sensor-setup.sh` is optional — installs the `fam-bam-motion` systemd service. Only needed when a PIR sensor is wired to GPIO pin 17.
