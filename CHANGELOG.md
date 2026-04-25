# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- **Photo thumbnails in admin panel** – Settings → 🖼️ Photos now loads fast 400×300 JPEG previews (`/api/photos/thumb`) instead of full-resolution images. Thumbnails are generated on first request using `sharp` and cached in `public/uploads/.thumbs/`. Deleting a photo also removes its cached thumbnail.
- **Idle screensaver / picture frame mode** – after a configurable timeout (default 5 min) with no user interaction, the display switches to a fullscreen photo slideshow with Ken Burns animation; any mouse move, click, touch, or keypress returns to the dashboard. Configured in Settings → ⚙️ Settings → 💤 Screensaver
- **Ken Burns effect** – photos in the slideshow have a gentle zoom/pan animation with four alternating variants
- **Live multi-screen sync** – Server-Sent Events (`/api/sse`) push a reload to all open browser tabs whenever settings or todos are saved; the tab that made the change is excluded so the editor is never disrupted
- **Photo change sync via SSE** – uploading or deleting a photo broadcasts `photos-changed` over SSE so the slideshow on all connected tabs (including the Pi's display) refreshes immediately without a page reload
- **Configurable todo auto-remove delay** – Settings → ⚙️ Settings → To-Do; default 10 minutes, range 1–1440
- **Calendar color coding** – each event shows a colored dot matching its Google Calendar color
- **Hourly weather forecast** – scrollable 24-hour strip above the 5-day forecast
- **Server-persisted settings** – settings saved to `app/data/settings.json`; always restored from server on startup (server is authoritative over localStorage)
- **Calendar shows current day forward only** – past days filtered out; 30-day window
- Weather units toggle (°F/mph ↔ °C/km/h) in Settings → ⚙️ Settings

### Fixed
- **Remote browser todos/settings always in sync** – `syncFromServer()` and `syncSettingsFromServer()` now always apply the server state on startup instead of only when localStorage was empty. Fixes stale data on remote browsers (e.g. PC accessing the Pi dashboard) after items are added or removed on the Pi.
- **Uploaded photos visible immediately in preview mode** – `vite preview` only serves `dist/` (a build snapshot), so new uploads were unreachable until a rebuild. A middleware now serves `public/uploads/` directly in preview mode.
- Settings panel Close button is now clearly visible in dark mode (explicit text color + border)

## [1.1.0] - 2026-04-19

### Added
- **ZIP code weather** – Enter a US ZIP code in Settings; app resolves it to lat/lon via Zippopotam.us (free, no key). Manual coordinate entry moved to a collapsible "advanced" section.
- **Dark / Light mode** – Toggle with the ☀/☾ floating button. Theme persists in settings.
- **To-do lists** – Per-person columns on the dashboard. Checkboxes with 10-minute auto-remove (countdown badge shown). Drag-and-drop column reordering via ⠿ handle.
- **To-Do admin tab** – Add, rename, and delete lists and items in Settings → ✅ To-Do.
- **Photo upload** – Drag-and-drop upload directly from the browser in Settings → 🖼️ Photos. No server restart or file placement needed.
- **Full-image slideshow** – `object-contain` foreground + blurred backdrop fill. No cropping.
- **Calendar admin tab** – Connect Google accounts via OAuth in Settings → 📅 Calendars. Sync calendar list, toggle individual calendars on/off.
- **iCal proxy** – Vite server plugin fetches the Google Calendar iCal feed server-side (no CORS). Set `GCAL_ICAL_URL` in `.env.local`.
- **Google OAuth 2.0 with PKCE** – Client secret never reaches the browser. Token exchange and refresh via Vite server plugins at `/api/auth/token` and `/api/auth/refresh`.
- **Settings panel tabs** – ⚙️ Settings | 📅 Calendars | 🖼️ Photos | ✅ To-Do.
- `lib/retry.ts` – `withRetry()` wraps all external API fetches.
- `lib/utils.ts` – `debounce()` utility.
- `lib/oauth.ts` – Google OAuth PKCE flow, token storage, auto-refresh.
- `lib/gapi.ts` – Google Calendar REST API calls using OAuth tokens.
- `lib/ical.ts` – Minimal iCal parser (no npm dependency).

### Changed
- **Portrait layout** – Two-column grid (30%/70%) with `grid-template-rows` on the right column. Font sizes use `clamp(min(vw,vh))` for portrait scaling.
- Weather widget subscribes to settings changes and reloads when location or units change.
- Calendar uses a priority chain: OAuth accounts → iCal proxy → Google Calendar JSON API.

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Real-time clock and date display
- Weather widget with current conditions and 5-day forecast (Open-Meteo API)
- Google Calendar integration via JSON API (API key)
- Photo slideshow with local and Google Photos support
- Basic to-do lists with add/delete/complete
- Settings panel for runtime configuration
- localStorage persistence for settings and todos
- Docker deployment with docker-compose and Nginx
- Dark theme
