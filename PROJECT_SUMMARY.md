# Fam Bam Dash – Project Summary

## What It Is

A self-hosted family dashboard React app optimized for portrait-oriented wall displays. Single-page application served by a Vite server (`vite preview` in production). No separate backend service — all server-side routes are handled by Vite plugins running in the same Node.js process.

## Feature Set

### Widgets
| Widget | Description |
|--------|-------------|
| **Clock** | Real-time clock and date, portrait-scaled with `clamp(min(vw,vh))` |
| **Weather** | Current conditions + scrollable 24-hour hourly + 5-day forecast via Open-Meteo; US ZIP code lookup via Zippopotam.us; switchable °F/mph ↔ °C/km/h |
| **Calendar** | Upcoming events (today + 30 days) from Google Calendar; color-coded by calendar; supports OAuth, iCal proxy, or JSON API fallback |
| **Photo Slideshow** | `object-contain` full-image display with blurred backdrop fill; in-browser drag-and-drop upload |
| **To-Do Panel** | Per-person columns, real checkboxes, configurable auto-remove delay, drag-to-reorder |

### Settings Panel (4 tabs)
- **⚙️ Settings** – ZIP code weather, units, slideshow interval/shuffle, to-do auto-remove delay, dark/light theme, export JSON
- **📅 Calendars** – Google OAuth connect, calendar sync, per-calendar toggles
- **🖼️ Photos** – Drag-and-drop upload, thumbnail grid with delete
- **✅ To-Do** – Add/rename/delete lists and items, drag-to-reorder, export/import backup

## Architecture

```
Browser (React SPA)
  └── Vite Server (Node.js — dev and vite preview)
        ├── /api/sse          – Server-Sent Events; pushes reload to all tabs on any save
        ├── /api/settings     – read/write app/data/settings.json + broadcast reload
        ├── /api/todos        – read/write app/data/todos.json + broadcast reload
        ├── /api/photos/*     – upload/list/delete → app/public/uploads/
        ├── /api/ical         – proxies GCAL_ICAL_URL (avoids CORS)
        ├── /api/gcal/*       – proxies Google Calendar REST API (avoids CORS)
        ├── /api/auth/token   – Google OAuth code exchange
        └── /api/auth/refresh – Google OAuth token refresh
```

## Key Libraries

| What | How |
|------|-----|
| Weather | Open-Meteo (free, no key) |
| ZIP → lat/lon | Zippopotam.us (free, no key) |
| Google Calendar | OAuth 2.0 PKCE (no client secret in browser), iCal parser (no npm dep), JSON API fallback |
| Photos | Browser File API + `fetch` POST to `/api/photos/upload` |
| State sync | Pub/sub pattern in `settings.ts` and `todo.ts` |
| Retry | `withRetry()` in `lib/retry.ts` wraps all external fetches |

## Persistence

| Data | Storage | Notes |
|------|---------|-------|
| App settings | `localStorage: fam-bam-settings` + `data/settings.json` | Server file restores localStorage on startup |
| To-do lists | `localStorage: fam-bam-todo` + `data/todos.json` | Server file restores localStorage on startup |
| OAuth tokens | `localStorage: fam-bam-gcal-accounts` | Auto-refreshed when <5 min from expiry |
| Uploaded photos | `app/public/uploads/` | Served as static files at `/uploads/` |

## Environment Variables

| Variable | Purpose | In browser? |
|----------|---------|-------------|
| `VITE_LAT` / `VITE_LON` | Fallback weather coordinates | Yes |
| `VITE_GOOGLE_CLIENT_ID` | OAuth client ID | Yes (intentionally public) |
| `VITE_GCAL_API_KEY` | Calendar JSON API key | Yes |
| `VITE_GCAL_CALENDAR_ID` | Default calendar ID | Yes |
| `VITE_GOOGLE_PHOTOS_ALBUM_ID` | Google Photos album | Yes |
| `VITE_TIMEZONE` | Calendar display timezone | Yes |
| `GOOGLE_CLIENT_SECRET` | OAuth token exchange | **No** (server only) |
| `GCAL_ICAL_URL` | iCal feed URL | **No** (server only) |

## File Map (key files)

```
app/src/
  App.tsx              – root layout, theme toggle, OAuth callback handling
  index.css            – portrait grid, CSS custom properties, all component styles
  lib/
    settings.ts        – Settings type, defaultSettings, validateSettings, pub/sub, server sync
    weather.ts         – fetchWeather (imperial flag), zipToLatLon, codeToIcon
    gcal.ts            – fetchEvents priority chain; GCalEvent type with calendarColor
    gapi.ts            – Google Calendar REST API calls; tags events with calendar color
    oauth.ts           – PKCE flow, token storage, getValidToken
    ical.ts            – minimal iCal parser (no npm dependency)
    photos.ts          – loadAllPhotos, loadUploadedPhotos, notifyPhotosChanged
    todo.ts            – TodoState, toggleItem, autoRemoveExpired(state, ms), reorderLists
    retry.ts           – withRetry()
    utils.ts           – debounce()
  widgets/
    Clock.tsx               – clock + date
    Weather.tsx             – compact current (default export) + WeatherFull with hourly + forecast
    Calendar.tsx            – agenda view, color-coded dots per calendar
    PhotoSlideshow.tsx      – slideshow, listens for photos-changed event
    TodoPanel.tsx           – dashboard columns, drag handles, countdown badge
    SettingsPanel.tsx       – 4-tab modal
    CalendarAdmin.tsx       – OAuth connect, sync, toggle
    PhotoUpload.tsx         – upload zone, progress, thumbnail grid
    TodoAdmin.tsx           – list/item CRUD, drag reorder, export/import
  vite.config.ts       – module-level sseClients + broadcast(); settingsPlugin (settings
                         persistence + /api/sse endpoint), todosPlugin, photosPlugin,
                         icalProxyPlugin, gcalProxyPlugin, oauthPlugin
```
