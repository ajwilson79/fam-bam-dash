# fam-bam-dash

[![React](https://img.shields.io/badge/react-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Fam Bam Dash is a customizable, touch-friendly smart home dashboard designed to be a centralized hub of information for your household. It brings together the essentials your family needs—calendar, weather, photos, and to-do lists—all in one sleek, self-hosted, web-based interface optimized for portrait-oriented screens (wall-mounted tablets, vertical TVs).

## Key Features

- **Google Calendar Integration** – Connect one or more Google accounts via OAuth; toggle individual calendars on/off from the Calendars admin tab; events are color-coded by calendar
- **Real-Time Clock and Date** – Always know what time it is
- **Weather with US ZIP Code** – Enter a ZIP code and the app resolves it to coordinates automatically; supports °F/mph or °C/km/h; shows current conditions, 24-hour hourly scroll, and 5-day forecast
- **Photo Slideshow** – Upload photos directly from the browser (drag-and-drop); displays full images with a blurred backdrop fill and Ken Burns zoom/pan animation
- **Idle Screensaver / Picture Frame Mode** – After a configurable idle timeout (default 5 minutes), the display switches to a fullscreen photo slideshow; any touch, click, or keypress returns to the dashboard
- **Motion Sensor Integration (optional)** – A PIR sensor on GPIO pin 17 wakes the screen on motion; configurable day/night behaviour (dashboard vs picture frame) and per-period screen-off timeouts, all adjustable from the browser
- **Interactive To-Do Lists** – Per-person lists with checkboxes; checked items auto-remove after a configurable delay (default 10 minutes)
- **Countdown Timers** – Tap the ⏱ button next to any future calendar event to add a countdown; cards appear at the top of the schedule showing time remaining; persist across restarts and sync instantly to all connected devices
- **Exit Kiosk** – A PIN-gated "Exit Kiosk" button in the ⚙️ Settings tab closes Chromium so you can access the Pi desktop without a hard reboot
- **Live Multi-Screen Sync** – Any change (settings, todos, or countdowns) made on one device instantly reloads all other open screens via Server-Sent Events; the screen that made the change is never disrupted
- **Dark / Light Mode** – Toggle from the floating button on the dashboard
- **Portrait-Optimized Layout** – Two-column grid scaled for tall screens
- **Self-Hosted** – Runs entirely on Node.js; no separate backend required

## Quick Start

```bash
cd app
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
# Open http://localhost:12000
```

## Configuration

### In-App Settings

Click the gear icon (bottom-right) to open Settings. The panel has four tabs:

| Tab | What you configure |
|-----|-------------------|
| ⚙️ Settings | Weather ZIP code, units (°F/mph or °C/km/h), refresh interval, slideshow interval & shuffle, screensaver idle timeout, motion sensor night hours & screen-off timeouts, to-do auto-remove delay, dark/light theme, exit kiosk (PIN gated) |
| 📅 Calendars | Connect Google accounts via OAuth, sync calendar list, toggle individual calendars on/off |
| 🖼️ Photos | Drag-and-drop photo upload; delete uploaded photos |
| ✅ To-Do | Add/rename/delete lists and items; drag to reorder lists |

Settings are persisted to `localStorage` and synced to `app/data/settings.json` on the server (survives browser clears). To-do state is stored under `fam-bam-todo` in `localStorage` and synced to `app/data/todos.json`.

### Environment Variables

Create `app/.env.local` (never commit this file):

```bash
# Google OAuth (for the Calendars admin tab)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret   # no VITE_ prefix – never sent to browser

# Google Calendar – iCal feed (server-side proxy, key has no VITE_ prefix)
GCAL_ICAL_URL=https://calendar.google.com/calendar/ical/you%40gmail.com/private-xxx/basic.ics

# Optional: Google Calendar JSON API key (fallback when no OAuth account is connected)
VITE_GCAL_API_KEY=
VITE_GCAL_CALENDAR_ID=you@gmail.com

# Optional: Google Photos
VITE_GOOGLE_PHOTOS_ALBUM_ID=

# Timezone for calendar display
VITE_TIMEZONE=America/New_York

# Weather location fallback (used before a ZIP is entered in Settings)
VITE_LAT=37.7749
VITE_LON=-122.4194

# Admin PIN — gates Settings, photo upload/delete, and OAuth. Blank = disabled.
FAM_BAM_ADMIN_PIN=
```

Variables **without** the `VITE_` prefix (e.g. `GOOGLE_CLIENT_SECRET`, `GCAL_ICAL_URL`, `FAM_BAM_ADMIN_PIN`) are server-side only and are never bundled into the browser build.

### Admin PIN

`FAM_BAM_ADMIN_PIN` gates the admin surface of the app — opening Settings, uploading or deleting photos, and connecting Google accounts. The dashboard itself (calendar, weather, photos, checking off to-do items) stays open so anyone walking up to the kiosk can still use it normally.

When set, clicking the ⚙ gear prompts for the PIN once per device; the browser remembers it for future visits. Leave blank in `.env.local` to disable.

### Google Calendar Setup

The app tries calendar sources in priority order:

1. **OAuth accounts** connected via the 📅 Calendars tab (recommended)
2. **iCal feed proxy** – set `GCAL_ICAL_URL` in `.env.local`; the server fetches the feed server-side to avoid CORS issues
3. **Google Calendar JSON API** – set `VITE_GCAL_API_KEY` and `VITE_GCAL_CALENDAR_ID`

For OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project
2. Enable the **Google Calendar API**
3. Create an **OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URIs: `http://localhost:12000` (dev) and your production URL
5. Set `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
6. Open Settings → 📅 Calendars → Connect Google Account

### Adding Photos

**Option A – Upload in browser (recommended):**
Open Settings → 🖼️ Photos, then drag-and-drop or click to upload. Photos are saved to `app/public/uploads/` and served at `/uploads/`.

**Option B – Place files manually:**
Copy files to `app/public/uploads/`. Supported formats: jpg, jpeg, png, gif, webp, avif. HEIC/HEIF files uploaded via the browser are automatically converted to JPEG server-side (`heif-convert` is installed by `pi-setup.sh`).

## Raspberry Pi Setup

Run a single script on a fresh Pi OS (Bookworm) installation:

```bash
chmod +x pi-setup.sh
./pi-setup.sh
```

This installs Node.js 20, walks through `app/.env.local` configuration, builds the app, installs it as a systemd service, sets up Chromium kiosk mode, configures a Plymouth boot splash and session wallpaper (if images are present in `assets/`), optionally rotates the display to portrait, optionally installs the PIR motion sensor service, and optionally configures a weekly reboot schedule for long-running kiosk health.

## Display Setup (non-Pi)

The layout is optimized for portrait orientation (taller than wide):

1. Rotate your display to portrait mode
2. Open the dashboard full-screen (F11)
3. Disable screen sleep in your OS settings

## Tech Stack

- React 19 + TypeScript
- Vite (dev server and `vite preview` both run server-side API plugins)
- Tailwind CSS 4
- Open-Meteo API (weather, free, no key)
- Zippopotam.us API (ZIP-to-coordinates, free, no key)
- Google OAuth 2.0 with PKCE (calendar)
- systemd + `vite preview` (production on Raspberry Pi)

## Architecture

```
Browser (React SPA)
  ├── Clock widget
  ├── Weather widget  ──────────────────────► Open-Meteo API
  ├── Calendar widget ─┬────────────────────► /api/gcal/* proxy → Google Calendar API
  │                    ├── /api/ical proxy ──► Google Calendar iCal feed
  │                    └────────────────────► Google Calendar JSON API (fallback)
  ├── Photo Slideshow ─┬── /uploads/*  (uploaded files)
  │                    └── /api/photos/*  (list/upload/delete)
  ├── Todo Panel       ── localStorage + /api/todos (server-persisted)
  ├── Settings Panel   ── localStorage + /api/settings (server-persisted)
  │     └── /api/auth/*  (OAuth token exchange, server-side)
  └── SSE listener     ── /api/sse → reloads page when another tab saves

Vite Server (Node.js — runs in dev and vite preview)
  ├── /api/sse               – Server-Sent Events; broadcasts reload to all tabs on any save
  ├── /api/settings          – reads/writes app/data/settings.json + broadcasts reload
  ├── /api/todos             – reads/writes app/data/todos.json + broadcasts reload
  ├── /api/photos/upload     – saves to app/public/uploads/
  ├── /api/photos/list       – lists app/public/uploads/
  ├── /api/photos/delete     – deletes from app/public/uploads/
  ├── /api/photos/thumb      – generates/serves 400×300 JPEG thumbnails (cached in .thumbs/)
  ├── /api/admin/verify      – checks admin PIN; returns { ok, pinConfigured }
  ├── /api/calendar-cache    – reads/writes app/data/calendar-cache.json (remote + offline fallback)
  ├── /api/countdowns        – reads/writes app/data/countdowns.json (no PIN; SSE-synced)
  ├── /api/quit-kiosk        – kills Chromium kiosk process (PIN gated)
  ├── /api/ical              – proxies GCAL_ICAL_URL (server-side, avoids CORS)
  ├── /api/gcal/*            – proxies Google Calendar REST API (server-side, avoids CORS)
  ├── /api/auth/token        – exchanges OAuth code for tokens (uses GOOGLE_CLIENT_SECRET)
  ├── /api/auth/refresh      – refreshes OAuth access tokens
  └── /api/display-mode      – accepts POST from motion sensor script; broadcasts mode via SSE

Motion Sensor (optional, scripts/motion_sensor.py)
  └── Reads settings from /api/settings, POSTs to /api/display-mode, controls screen power via wlopm (Wayland DPMS)
```

## Documentation

- **[Quick Start Guide](QUICKSTART.md)** – Get running in 5 minutes
- **[Development Guide](DEVELOPMENT.md)** – Project structure, adding widgets, contributing
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** – Common issues and solutions
- **[FAQ](FAQ.md)** – Frequently asked questions
- **[Changelog](CHANGELOG.md)** – Version history

## License

See LICENSE file for details.
