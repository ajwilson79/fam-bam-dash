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
    ├── /api/settings        → reads/writes data/settings.json
    ├── /api/todos           → reads/writes data/todos.json
    ├── /api/photos/list     → list uploaded photos from public/uploads/
    ├── /api/photos/upload   → write file to public/uploads/ (PIN gated)
    ├── /api/photos/delete   → delete file from public/uploads/ (PIN gated)
    ├── /api/photos/thumb    → generate/serve 400×300 JPEG thumbnail (cached in public/uploads/.thumbs/)
    ├── /uploads/*           → serve public/uploads/ directly (preview mode only; dev serves it natively)
    ├── /api/sse             → Server-Sent Events (multi-tab sync + display mode + photo changes)
    ├── /api/admin/verify    → check admin PIN status; returns { ok, pinConfigured }
    ├── /api/display-mode    → accepts POST from motion sensor; broadcasts via SSE
    ├── /api/ical            → server-side proxy for iCal feed (bypasses CORS)
    ├── /api/gcal/*          → server-side proxy for Google Calendar API
    ├── /api/auth/*          → OAuth PKCE token exchange & refresh
    ├── /api/calendar-cache  → read/write cached upcoming events (GET/POST; remote browser + offline fallback)
    ├── /api/countdowns      → read/write countdown timer list (GET/POST; no PIN gate; SSE-synced)
    └── /api/quit-kiosk      → kill Chromium kiosk process (POST, PIN gated)

scripts/motion_sensor.py (optional, Raspberry Pi only)
    → reads settings from /api/settings every 60s
    → POSTs to /api/display-mode on motion state change
    → controls screen power directly via wlopm (Wayland DPMS)
```

## State Management

No external state library. Two custom pub/sub modules handle all shared state:

- **`lib/settings.ts`** — `Settings` type (weather, calendar, slideshow, todo, motionSensor, theme), `subscribeSettings()` / `setSettings()`. Persists to `localStorage` + `/api/settings` (server backup). Restored from server on startup via `syncSettingsFromServer()`.
- **`lib/todo.ts`** — `TodoState` type, `subscribeTodo()` / `saveState()`. Same dual-persistence pattern. Checked items auto-remove after a configurable delay via `autoRemoveExpired()`.

Multi-tab sync: All tabs connect to `/api/sse`. The SSE stream carries four event types:
- `reload:<tabId>` — broadcast when settings/todos are saved; tabs with a different `tabId` reload
- `display-mode:dashboard` / `display-mode:screensaver` — broadcast when the motion sensor script POSTs to `/api/display-mode`; all tabs switch mode immediately
- `photos-changed` — broadcast when a photo is uploaded or deleted; all tabs reload the slideshow immediately
- `countdowns-changed` — broadcast when the countdown list is saved; all tabs reload countdown state immediately

Server sync on startup: both `syncFromServer()` (todos) and `syncSettingsFromServer()` always apply the server state over any cached localStorage — the server is the authoritative source. Local state is only kept if it is byte-for-byte identical to the server copy.

## Code Structure

```
app/src/
├── App.tsx                # Root layout, theme, OAuth callback handler, idle screensaver, pointer-drag scroll
├── index.css              # All CSS: portrait grid, widget styles, CSS custom property themes
├── lib/
│   ├── settings.ts        # Settings pub/sub + server sync
│   ├── todo.ts            # Todo pub/sub + auto-remove logic
│   ├── admin.ts           # Admin PIN storage, adminHeaders(), verifyAdminAccess()
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
- **Photo thumbnails** — The admin panel (`PhotoUpload.tsx`) fetches `/api/photos/thumb?name=<file>` instead of full-size URLs. The server generates a 400×300 JPEG on first request using `sharp` and caches it in `public/uploads/.thumbs/`. The slideshow always uses full-size originals. Thumbnails are deleted alongside their originals.
- **HEIC upload conversion** — HEIC/HEIF files (iPhone default format) are accepted on upload and converted to JPEG server-side by `heif-convert` (from `libheif-examples`). `sharp`'s bundled libvips on ARM is compiled with AV1/AVIF support only — it cannot decode HEVC-encoded HEIC. `heif-convert` handles HEVC decoding, ICC color profiles, and HEIF rotation metadata correctly. iOS Safari converts HEIC to JPEG before uploading but keeps the `.heic` filename — the server detects this via magic bytes (`FF D8 FF`) and renames directly without conversion. `pi-setup.sh` installs `libheif-examples` automatically.
- **Preview mode static files** — `vite preview` only serves `dist/` (a build snapshot), so the `photosPlugin` registers a middleware in `configurePreviewServer` that serves newly uploaded files from `public/uploads/` directly at `/uploads/*`. Dev mode is unaffected (Vite serves `public/` natively).
- **Countdown timers** — `widgets/Calendar.tsx` shows a ⏱ toggle on each future event. Active countdowns persist to `data/countdowns.json` via `/api/countdowns` (no PIN required — dashboard-facing state, not admin-gated). Changes broadcast `countdowns-changed` via SSE so all devices update instantly. Past-event countdowns auto-remove on each calendar refresh. The calendar fetches 90 days ahead so countdowns can be set on events beyond the default schedule window.
- **Touch-drag scroll (Pi/Wayland)** — Pi touch screens on Wayland report gestures as pointer events, not Web Touch Events, so `touch-action: pan-y` has no effect. `App.tsx` attaches a `pointerdown`/`pointermove` handler to `.dash-left` that manually updates `scrollTop`. An 8 px movement threshold distinguishes taps (pointer not captured; click fires normally) from scroll drags (pointer captured; subsequent clicks suppressed).

## Environment Variables

Defined in `app/.env.local` (gitignored). Use `app/.env.example` as a template.

| Variable | Where used | Purpose |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Browser | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Server only | OAuth token exchange (never sent to browser) |
| `VITE_LAT` / `VITE_LON` | Browser | Fallback weather coordinates |
| `VITE_GCAL_API_KEY` | Browser | Calendar JSON API fallback key |
| `VITE_GCAL_CALENDAR_ID` | Browser | Default calendar ID (e.g. `user@gmail.com`) |
| `VITE_TIMEZONE` | Browser | Calendar display timezone (e.g. `America/New_York`) |
| `GCAL_ICAL_URL` | Server only | iCal feed URL (proxied to avoid CORS) |
| `VITE_GOOGLE_PHOTOS_ALBUM_ID` | Browser | Google Photos album ID |
| `FAM_BAM_ADMIN_PIN` | Server only | If set, gates admin mutations (settings write, photo upload/delete, OAuth token exchange) behind an `X-Admin-Pin` header. Dashboard reads and todo writes stay open. Blank = disabled. |

## Adding Features

**New API route:** Add middleware in `vite.config.ts` using both `configureServer` and `configurePreviewServer` hooks (required for dev and production preview).

**New persistent data:** Add to `Settings` type in `lib/settings.ts` or `TodoState` in `lib/todo.ts`, then handle persistence in the corresponding `vite.config.ts` plugin. For dashboard-facing state that should not require admin PIN (e.g. user-toggled preferences), add a standalone plugin with its own data file — see `countdownsPlugin` as a reference pattern.

**New widget:** Create `src/widgets/MyWidget.tsx`, place it in `App.tsx` layout grid, style in `index.css`.

## Tests

Unit tests live in `app/src/__tests__/` covering `gcal`, `todo`, `settings`, `weather`, and `retry`. Tests mock external APIs and `localStorage`. The test setup is in `app/vitest.config.ts` (or inherited from `vite.config.ts`).

## Production (Raspberry Pi)

Run `npm run build` then `npm run preview` — `vite preview` serves `dist/` and runs the `vite.config.ts` API plugins, so the full API surface is available without a separate server process.

The systemd service is named **`fam-bam-dash`**. Deploy command (fetch → reset → install → build → reboot):

```bash
ssh fam-bam-pi "cd ~/fam-bam-dash && git fetch && git reset --hard origin/main && cd app && npm install && npm run build && sudo reboot"
```

`npm install` is needed whenever `package.json` changes. Safe to include on every deploy.

Persistent data lives in `app/data/` (settings, todos, countdowns, calendar cache), `app/public/uploads/` (photos), and `app/public/uploads/.thumbs/` (auto-generated thumbnails) — back up `data/` and `uploads/` (`.thumbs/` is regenerated automatically).

`pi-setup.sh` is the single entry point for a full Pi install (9 steps): Node.js, `libheif-examples` (HEIC photo support), build, app service, kiosk mode, boot splash, session wallpaper, display rotation, optional motion sensor, and optional weekly reboot schedule — all in one script.

`kiosk-setup.sh` configures Chromium kiosk mode (called by `pi-setup.sh`, can also be run standalone). Launches Chromium with `--ozone-platform=wayland` and `--touch-events=enabled` — the latter is required on Pi/Wayland where touch input is reported as pointer events and native touch-scroll would otherwise not work.

`scripts/splash-setup.sh` installs the Plymouth boot splash (using `assets/splash-boot.png`) and sets the Wayland session wallpaper via `swaybg` (using `assets/splash.png`). Can be run standalone. `assets/splash-boot.png` should be pre-rotated to appear correctly during boot (before the OS applies display rotation); `assets/splash.png` is in normal orientation.

`scripts/motion-sensor-setup.sh` is optional — installs the `fam-bam-motion` systemd service. Only needed when a PIR sensor is wired to GPIO pin 17. It also installs `wlopm`, adds the run user to the `gpio` group, and appends `video=HDMI-A-1:1920x1080@60e` to `/boot/firmware/cmdline.txt` so the kernel ignores HPD-disconnect during DPMS sleep — without this kernel parameter, panels that drop HPD on power-off (e.g. Acer UT241Y) make wlroots hot-unplug the output and the screen can't be woken without a reboot. A reboot is required after first install.
