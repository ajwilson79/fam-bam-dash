# Development Guide

## Prerequisites

- Node.js 20+
- npm
- Git

## Local Setup

```bash
git clone <your-repo-url>
cd fam-bam-dash/app
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
# Open http://localhost:5173
```

## Project Structure

```
fam-bam-dash/
├── app/
│   ├── public/
│   │   └── uploads/          # Uploaded photos (served at /uploads/)
│   ├── src/
│   │   ├── assets/
│   │   │   └── photos/       # Bundled photos (imported at build time)
│   │   ├── lib/              # Business logic
│   │   │   ├── settings.ts   # Settings type, localStorage persistence, pub/sub
│   │   │   ├── weather.ts    # Open-Meteo fetch, ZIP→lat/lon lookup, icon mapping
│   │   │   ├── gcal.ts       # Calendar priority chain (OAuth → iCal → JSON API)
│   │   │   ├── gapi.ts       # Google Calendar REST API calls (OAuth)
│   │   │   ├── oauth.ts      # Google OAuth 2.0 PKCE flow, token storage
│   │   │   ├── ical.ts       # iCal parser (no external library)
│   │   │   ├── photos.ts     # Photo loading (bundled + uploaded + Google Photos)
│   │   │   ├── todo.ts       # Todo state, pub/sub, auto-remove, drag reorder
│   │   │   ├── retry.ts      # withRetry() helper for fetch calls
│   │   │   └── utils.ts      # debounce and other shared utilities
│   │   ├── widgets/          # React components
│   │   │   ├── Clock.tsx           # Real-time clock and date
│   │   │   ├── Weather.tsx         # Current conditions + 5-day forecast
│   │   │   ├── Calendar.tsx        # Upcoming calendar events
│   │   │   ├── TodoPanel.tsx       # Dashboard to-do columns
│   │   │   ├── PhotoSlideshow.tsx  # Full-image slideshow with blur backdrop
│   │   │   ├── SettingsPanel.tsx   # 4-tab settings modal
│   │   │   ├── CalendarAdmin.tsx   # OAuth connect + calendar toggle UI
│   │   │   ├── PhotoUpload.tsx     # Drag-and-drop photo upload UI
│   │   │   └── TodoAdmin.tsx       # Add/rename/delete lists and items
│   │   ├── App.tsx           # Root layout, theme, OAuth callback handling
│   │   ├── main.tsx          # React entry point
│   │   └── index.css         # All CSS (layout grid, widget styles, themes)
│   ├── package.json
│   ├── vite.config.ts        # Vite + three server-side plugins (photos, iCal, OAuth)
│   ├── tsconfig.app.json
│   └── tsconfig.node.json    # includes "types": ["node"] for vite plugins
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── README.md
```

## Vite Server Plugins

`vite.config.ts` registers three middleware plugins that run during `npm run dev` (and are needed for production if you run the Vite preview server). For static hosting (e.g., Nginx serving the `dist/` build), you need a separate Node.js backend to handle these routes.

| Route | Plugin | Purpose |
|-------|--------|---------|
| `POST /api/photos/upload?name=file.jpg` | `photosPlugin` | Saves binary body to `public/uploads/` |
| `GET /api/photos/list` | `photosPlugin` | Returns JSON array of uploaded filenames |
| `DELETE /api/photos/delete?name=file.jpg` | `photosPlugin` | Deletes file from `public/uploads/` |
| `GET /api/ical` | `icalProxyPlugin` | Fetches `GCAL_ICAL_URL` server-side (avoids browser CORS) |
| `POST /api/auth/token` | `oauthPlugin` | Exchanges OAuth code for tokens using `GOOGLE_CLIENT_SECRET` |
| `POST /api/auth/refresh` | `oauthPlugin` | Refreshes an OAuth access token |

The OAuth endpoints use `node:https` directly (no `node-fetch`) so they work without extra dependencies.

## State Management

### Settings (`lib/settings.ts`)
- Type: `Settings` – weather, calendar, slideshow, theme
- Stored in `localStorage` under `fam-bam-settings`
- Pub/sub: `subscribeSettings(fn)` / `setSettings(s)` – all widgets re-render on change
- Validation: `validateSettings()` clamps values to safe ranges on load

### Todo (`lib/todo.ts`)
- Type: `TodoState` – `{ lists: TodoList[] }`, each list has `{ id, name, items[] }`
- Each item: `{ id, text, done, updatedAt, checkedAt? }`
- Stored in `localStorage` under `fam-bam-todo`
- Pub/sub: `subscribeTodo(fn)` / `saveState(s)` – keeps dashboard and admin in sync
- `toggleItem()` sets `checkedAt` when checked; `autoRemoveExpired()` removes items where `Date.now() - checkedAt > 10 min`
- `reorderLists()` is pure (no mutation)

### OAuth Tokens (`lib/oauth.ts`)
- Stored in `localStorage` under `fam-bam-gcal-accounts`
- PKCE flow: `startOAuthFlow()` generates code verifier/challenge; `handleOAuthCallback()` exchanges code via `/api/auth/token`
- `getValidToken(account)` auto-refreshes if the access token is within 5 minutes of expiry

## Calendar Data Flow

```
gcal.ts fetchEvents()
  1. Load OAuth accounts from localStorage
     → gapi.ts fetchAllOAuthEvents() → Google Calendar REST API
  2. If no OAuth accounts: fetch /api/ical
     → ical.ts parseIcal() → parse and filter events
  3. If iCal fails: Google Calendar JSON API (VITE_GCAL_API_KEY)
```

## Photo Data Flow

```
photos.ts loadAllPhotos()
  1. import.meta.glob('./assets/photos/*')  – bundled at build time
  2. GET /api/photos/list                   – uploaded at runtime
  3. Google Photos API (if VITE_GOOGLE_PHOTOS_ALBUM_ID set)
```

The slideshow listens for a `photos-changed` custom DOM event dispatched by `notifyPhotosChanged()` after any upload or delete.

## Theming

CSS custom properties are set on `:root` or `.theme-light` in `index.css`:

```css
:root {                          /* dark (default) */
  --bg: #0f172a;
  --color-card: #1e293b;
  --color-elevated: #334155;
  --color-accent: #38bdf8;
  --color-text: #f1f5f9;
  --color-muted: #94a3b8;
}
.theme-light { ... }
```

The theme class is toggled on `document.documentElement` from `App.tsx`. Tailwind classes like `bg-theme-card` map to `var(--color-card)` via the `@theme` block.

## Portrait Layout

The root grid in `index.css`:

```css
.dash-root {
  display: grid;
  grid-template-columns: 30% 70%;
  height: 100dvh;
}
.dash-right {
  display: grid;
  grid-template-rows: 44vh 17vh 1fr;
}
```

Left column: clock + weather. Right column top: photo slideshow; middle: calendar header; bottom: to-do panel.

Font sizes use `clamp(..., min(Xvw, Xvh), ...)` so the UI scales correctly on both landscape and portrait screens without reflow.

## Adding a New Widget

1. Create `src/widgets/MyWidget.tsx`
2. Import and place it in `App.tsx`
3. If it needs settings, add a field to the `Settings` type in `lib/settings.ts` (remember to add validation in `validateSettings` and a default in `defaultSettings`)
4. If it needs a settings UI, add a section to `SettingsPanel.tsx`

## Scripts

```bash
npm run dev       # Vite dev server with HMR
npm run build     # tsc + vite build → dist/
npm run preview   # Serve dist/ locally
npm run lint      # ESLint
```

## Environment Variables Reference

| Variable | Where used | Required |
|----------|-----------|----------|
| `VITE_LAT` / `VITE_LON` | Fallback weather coordinates | No |
| `VITE_GCAL_API_KEY` | Google Calendar JSON API | No |
| `VITE_GCAL_CALENDAR_ID` | Default calendar for JSON API | No |
| `VITE_GOOGLE_CLIENT_ID` | OAuth client ID (browser) | For OAuth |
| `GOOGLE_CLIENT_SECRET` | OAuth token exchange (server) | For OAuth |
| `GCAL_ICAL_URL` | iCal feed URL (server-side proxy) | No |
| `VITE_GOOGLE_PHOTOS_ALBUM_ID` | Google Photos album | No |
| `VITE_TIMEZONE` | Calendar display timezone | No |

Variables without `VITE_` prefix are never bundled into the browser build.
