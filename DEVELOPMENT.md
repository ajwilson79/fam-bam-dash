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
# Open http://localhost:12000
```

## Project Structure

```
fam-bam-dash/
├── app/
│   ├── data/                     # Server-persisted data (gitignored)
│   │   ├── settings.json         # App settings backup
│   │   └── todos.json            # Todo lists backup
│   ├── public/
│   │   └── uploads/              # Uploaded photos (served at /uploads/)
│   ├── src/
│   │   ├── lib/                  # Business logic
│   │   │   ├── settings.ts       # Settings type, localStorage + server persistence, pub/sub
│   │   │   ├── weather.ts        # Open-Meteo fetch, ZIP→lat/lon lookup, icon mapping
│   │   │   ├── gcal.ts           # Calendar priority chain (OAuth → iCal → JSON API)
│   │   │   ├── gapi.ts           # Google Calendar REST API calls (OAuth)
│   │   │   ├── oauth.ts          # Google OAuth 2.0 PKCE flow, token storage
│   │   │   ├── ical.ts           # iCal parser (no external library)
│   │   │   ├── photos.ts         # Photo loading (bundled + uploaded + Google Photos)
│   │   │   ├── todo.ts           # Todo state, pub/sub, auto-remove, drag reorder
│   │   │   ├── retry.ts          # withRetry() helper for fetch calls
│   │   │   └── utils.ts          # debounce and other shared utilities
│   │   ├── widgets/              # React components
│   │   │   ├── Clock.tsx               # Real-time clock and date
│   │   │   ├── Weather.tsx             # Current conditions + hourly + 5-day forecast
│   │   │   ├── Calendar.tsx            # Upcoming calendar events, color-coded by calendar
│   │   │   ├── TodoPanel.tsx           # Dashboard to-do columns
│   │   │   ├── PhotoSlideshow.tsx      # Full-image slideshow with blur backdrop
│   │   │   ├── SettingsPanel.tsx       # 4-tab settings modal
│   │   │   ├── CalendarAdmin.tsx       # OAuth connect + calendar toggle UI
│   │   │   ├── PhotoUpload.tsx         # Drag-and-drop photo upload UI
│   │   │   └── TodoAdmin.tsx           # Add/rename/delete lists and items
│   │   ├── App.tsx               # Root layout, theme, OAuth callback handling
│   │   ├── main.tsx              # React entry point
│   │   └── index.css             # All CSS (layout grid, widget styles, themes)
│   ├── package.json
│   ├── vite.config.ts            # Vite + server-side plugins (settings, todos, photos, iCal, gcal proxy, OAuth)
│   ├── tsconfig.app.json
│   └── tsconfig.node.json        # includes "types": ["node"] for vite plugins
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Vite Server Plugins

`vite.config.ts` registers middleware plugins that run during `npm run dev` **and** `vite preview` (the production mode). All routes are handled by the same Node.js process — there is no separate backend.

| Route | Plugin | Purpose |
|-------|--------|---------|
| `GET /api/sse` | `settingsPlugin` | Server-Sent Events stream; holds connection open and pushes `reload:<tabId>` to all tabs when settings or todos are saved |
| `GET /api/settings` | `settingsPlugin` | Returns saved settings from `data/settings.json` |
| `POST /api/settings` | `settingsPlugin` | Writes settings to `data/settings.json`; broadcasts reload to all other tabs |
| `GET /api/todos` | `todosPlugin` | Returns saved todos from `data/todos.json` |
| `POST /api/todos` | `todosPlugin` | Writes todos to `data/todos.json`; broadcasts reload to all other tabs |
| `GET /api/photos/list` | `photosPlugin` | Lists files in `public/uploads/` |
| `POST /api/photos/upload?name=file.jpg` | `photosPlugin` | Saves binary body to `public/uploads/` |
| `DELETE /api/photos/delete?name=file.jpg` | `photosPlugin` | Deletes file from `public/uploads/` |
| `GET /api/ical` | `icalProxyPlugin` | Fetches `GCAL_ICAL_URL` server-side (avoids browser CORS) |
| `GET /api/gcal/*` | `gcalProxyPlugin` | Proxies Google Calendar REST API (avoids browser CORS) |
| `POST /api/auth/token` | `oauthPlugin` | Exchanges OAuth code for tokens using `GOOGLE_CLIENT_SECRET` |
| `POST /api/auth/refresh` | `oauthPlugin` | Refreshes an OAuth access token |

## Live Multi-Screen Sync (SSE)

All open browser tabs connect to `GET /api/sse` on startup and hold a persistent Server-Sent Events connection. Whenever any tab saves settings or todos, the server broadcasts `reload:<tabId>` to every connected tab. Each tab compares the received `tabId` against its own (stored in `sessionStorage`) — if they differ, the tab reloads. This means:

- A change made on your **PC** immediately refreshes the **Pi display** without manual intervention
- The **PC tab** that made the change is never disrupted mid-edit
- The tab ID is generated once per browser session in `settings.ts → getTabId()` and included as the `X-Tab-Id` header on every POST

The `sseClients` set and `broadcast()` function live at module scope in `vite.config.ts` so both `settingsPlugin` and `todosPlugin` can share them.

## State Management

### Settings (`lib/settings.ts`)
- Type: `Settings` – weather, calendar, slideshow, todo, theme
- Stored in `localStorage` under `fam-bam-settings`; also synced to `/api/settings` on every save
- On startup, `syncSettingsFromServer()` restores from `data/settings.json` if localStorage is empty
- Pub/sub: `subscribeSettings(fn)` / `setSettings(s)` – all widgets re-render on change
- Validation: `validateSettings()` clamps values to safe ranges on load

### Todo (`lib/todo.ts`)
- Type: `TodoState` – `{ lists: TodoList[] }`, each list has `{ id, name, items[] }`
- Each item: `{ id, text, done, updatedAt, checkedAt? }`
- Stored in `localStorage` under `fam-bam-todo`; also synced to `/api/todos` on every save
- On startup, `syncFromServer()` restores from `data/todos.json` if localStorage is empty
- Pub/sub: `subscribeTodo(fn)` / `saveState(s)` – keeps dashboard and admin in sync
- `toggleItem()` sets `checkedAt` when checked; `autoRemoveExpired(state, ms)` removes items older than the configured delay (default 10 min, configurable in Settings)
- `reorderLists()` is pure (no mutation)

### OAuth Tokens (`lib/oauth.ts`)
- Stored in `localStorage` under `fam-bam-gcal-accounts`
- PKCE flow: `startOAuthFlow()` generates code verifier/challenge; `handleOAuthCallback()` exchanges code via `/api/auth/token`
- `getValidToken(account)` auto-refreshes if the access token is within 5 minutes of expiry

## Calendar Data Flow

```
gcal.ts fetchEvents()
  1. Load OAuth accounts from localStorage
     → gapi.ts fetchAllOAuthEvents()
       → /api/gcal/* proxy → Google Calendar REST API
       → events tagged with calendarColor from CalendarEntry
  2. If no OAuth accounts: fetch /api/ical
     → ical.ts parseIcal() → parse and filter events
  3. If iCal fails: Google Calendar JSON API (VITE_GCAL_API_KEY)
```

## Photo Data Flow

```
photos.ts loadAllPhotos()
  1. import.meta.glob('./assets/photos/*', { query: '?url' })  – bundled at build time
  2. GET /api/photos/list                                       – uploaded at runtime
  3. Google Photos API (if VITE_GOOGLE_PHOTOS_ALBUM_ID set)
```

The slideshow listens for a `photos-changed` custom DOM event dispatched by `notifyPhotosChanged()` after any upload or delete.

## Theming

CSS custom properties are set on `:root` (dark, default) or `[data-theme="light"]` in `index.css`:

```css
:root {
  --bg: #0f172a;
  --color-card: #1e293b;
  --color-elevated: #334155;
  --color-accent: #38bdf8;
  --color-text: #f1f5f9;
  --color-muted: #94a3b8;
}
[data-theme="light"] { ... }
```

The `data-theme` attribute is toggled on `.dash-root` from `App.tsx`. Tailwind classes like `bg-theme-card` map to `var(--color-card)` via the `@theme` block.

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
  grid-template-rows: 44vh minmax(17vh, auto) 1fr;
}
.dash-middle {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
}
.dash-weather-full {
  grid-column: 1 / -1;   /* spans full width of dash-middle */
}
```

Left column: calendar. Right column top: photo slideshow; middle: clock + weather (current, hourly, 5-day); bottom: to-do panel.

Font sizes use `clamp(..., min(Xvw, Xvh), ...)` so the UI scales correctly on both landscape and portrait screens without reflow.

## Adding a New Widget

1. Create `src/widgets/MyWidget.tsx`
2. Import and place it in `App.tsx`
3. If it needs settings, add a field to the `Settings` type in `lib/settings.ts` (add validation in `validateSettings` and a default in `defaultSettings`)
4. If it needs a settings UI, add a section to `SettingsPanel.tsx`
5. If it needs a server-side API, add a plugin to `vite.config.ts`

## Scripts

```bash
npm run dev       # Vite dev server with HMR on port 12000
npm run build     # tsc + vite build → dist/
npm run preview   # Serve dist/ with all API plugins on port 12000
npm run lint      # ESLint
npm run test      # Vitest
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
