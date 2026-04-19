# fam-bam-dash

[![React](https://img.shields.io/badge/react-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Fam Bam Dash is a customizable, touch-friendly smart home dashboard designed to be a centralized hub of information for your household. It brings together the essentials your family needs—calendar, weather, photos, and to-do lists—all in one sleek, self-hosted, web-based interface optimized for portrait-oriented screens (wall-mounted tablets, vertical TVs).

## Key Features

- **Google Calendar Integration** – Connect one or more Google accounts via OAuth; toggle individual calendars on/off from the Calendars admin tab
- **Real-Time Clock and Date** – Always know what time it is
- **Weather with US ZIP Code** – Enter a ZIP code and the app resolves it to coordinates automatically; supports °F/mph or °C/km/h
- **Photo Slideshow** – Upload photos directly from the browser (drag-and-drop); displays full images with a blurred backdrop fill
- **Interactive To-Do Lists** – Per-person lists with checkboxes; checked items auto-remove after 10 minutes
- **Dark / Light Mode** – Toggle from the floating button on the dashboard
- **Portrait-Optimized Layout** – Two-column grid scaled for tall screens
- **Self-Hosted** – Runs on Node.js (Vite dev server) or behind any static host + Node proxy

## Quick Start

### Local Development

```bash
cd app
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
# Open http://localhost:5173
```

### Docker

```bash
docker-compose up -d
# Open http://localhost:3000
```

## Configuration

### In-App Settings

Click the gear icon (bottom-right) to open Settings. The panel has four tabs:

| Tab | What you configure |
|-----|-------------------|
| ⚙️ Settings | Weather ZIP code, units (°F/mph or °C/km/h), refresh interval, slideshow interval & shuffle, dark/light theme |
| 📅 Calendars | Connect Google accounts via OAuth, sync calendar list, toggle individual calendars on/off |
| 🖼️ Photos | Drag-and-drop photo upload; delete uploaded photos |
| ✅ To-Do | Add/rename/delete lists and items; drag to reorder lists |

Settings are saved to `localStorage` under the key `fam-bam-settings`. To-do state is saved under `fam-bam-todo`.

### Environment Variables

Create `app/.env.local` (never commit this file):

```bash
# Weather location fallback (used before a ZIP is entered)
VITE_LAT=37.7749
VITE_LON=-122.4194

# Google Calendar – iCal feed (server-side proxy, key has no VITE_ prefix)
GCAL_ICAL_URL=https://calendar.google.com/calendar/ical/you%40gmail.com/private-xxx/basic.ics

# Google OAuth (for the Calendars admin tab)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret   # no VITE_ prefix – never sent to browser

# Optional: Google Calendar JSON API key (fallback when no OAuth account is connected)
VITE_GCAL_API_KEY=
VITE_GCAL_CALENDAR_ID=you@gmail.com

# Optional: Google Photos
VITE_GOOGLE_PHOTOS_ALBUM_ID=

# Timezone for calendar display
VITE_TIMEZONE=America/New_York
```

Variables **without** the `VITE_` prefix (e.g. `GOOGLE_CLIENT_SECRET`, `GCAL_ICAL_URL`) are server-side only and are never bundled into the browser build.

### Google Calendar Setup

The app tries calendar sources in priority order:

1. **OAuth accounts** connected via the 📅 Calendars tab (recommended)
2. **iCal feed proxy** – set `GCAL_ICAL_URL` in `.env.local`; the Vite dev server fetches the feed server-side to avoid CORS issues
3. **Google Calendar JSON API** – set `VITE_GCAL_API_KEY` and `VITE_GCAL_CALENDAR_ID`

For OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project
2. Enable the **Google Calendar API**
3. Create an **OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URIs: `http://localhost:5173` (dev) and your production URL
5. Set `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
6. Open Settings → 📅 Calendars → Connect Google Account

### Adding Photos

**Option A – Upload in browser (recommended):**
Open Settings → 🖼️ Photos, then drag-and-drop or click to upload. Photos are saved to `app/public/uploads/` and served at `/uploads/`.

**Option B – Place files manually:**
Copy files to `app/public/uploads/`. Supported formats: jpg, jpeg, png, gif, webp, avif.

## Display Setup

The layout is optimized for portrait orientation (taller than wide):

1. Rotate your display to portrait mode
2. Open the dashboard full-screen (F11)
3. Disable screen sleep in your OS settings
4. For Raspberry Pi, use Chromium kiosk mode (see [DEPLOYMENT.md](DEPLOYMENT.md))

## Tech Stack

- React 19 + TypeScript
- Vite (dev server doubles as API proxy for iCal, OAuth, and photo uploads)
- Tailwind CSS 4
- Open-Meteo API (weather, free, no key)
- Zippopotam.us API (ZIP-to-coordinates, free, no key)
- Google OAuth 2.0 with PKCE (calendar)
- Docker + Nginx (production)

## Architecture

```
Browser (React SPA)
  ├── Clock widget
  ├── Weather widget  ──────────────────────► Open-Meteo API
  ├── Calendar widget ─┬────────────────────► Google Calendar API (OAuth)
  │                    ├── /api/ical proxy ──► Google Calendar iCal feed
  │                    └────────────────────► Google Calendar JSON API
  ├── Photo Slideshow ─┬── /uploads/*  (uploaded files)
  │                    └── /api/photos/*  (list/upload/delete)
  ├── Todo Panel       ── localStorage only
  └── Settings Panel
        └── /api/auth/*  (OAuth token exchange, server-side)

Vite Dev Server (Node.js)
  ├── /api/photos/upload   – saves to app/public/uploads/
  ├── /api/photos/list     – lists app/public/uploads/
  ├── /api/photos/delete   – deletes from app/public/uploads/
  ├── /api/ical            – proxies GCAL_ICAL_URL (server-side, avoids CORS)
  ├── /api/auth/token      – exchanges OAuth code for tokens (uses GOOGLE_CLIENT_SECRET)
  └── /api/auth/refresh    – refreshes OAuth access tokens
```

## Documentation

- **[Quick Start Guide](QUICKSTART.md)** – Get running in 5 minutes
- **[Deployment Guide](DEPLOYMENT.md)** – Docker, Unraid, Raspberry Pi, reverse proxy
- **[Development Guide](DEVELOPMENT.md)** – Project structure, adding widgets, contributing
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** – Common issues and solutions
- **[FAQ](FAQ.md)** – Frequently asked questions
- **[Changelog](CHANGELOG.md)** – Version history

## License

See LICENSE file for details.
