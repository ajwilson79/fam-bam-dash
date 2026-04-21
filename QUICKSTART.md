# Quick Start Guide

Get Fam Bam Dash running in 5 minutes.

## Quick Start

```bash
cd app
npm install
npm run dev
# Open http://localhost:12000
```

No API keys are required to start. Weather works immediately with default coordinates; enter your ZIP code in Settings to switch to your location.

## First-Run Configuration

Once the app is open:

1. Click the **⚙️ gear button** (bottom-right corner) to open Settings
2. Go to the **⚙️ Settings** tab:
   - Enter your **ZIP code** and click **Look up** – the app resolves it to coordinates and shows the city name
   - Choose **°F / mph** or **°C / km/h** under Units
   - Under **💤 Screensaver**, enable picture frame mode and set your preferred idle timeout (default 5 minutes)
   - Under **🚶 Motion Sensor**, configure night hours and screen-off timeouts (only relevant if you have a PIR sensor on GPIO pin 17)
3. Go to the **📅 Calendars** tab to connect a Google account (requires OAuth setup – see below)
4. Go to the **🖼️ Photos** tab to upload family photos directly from the browser
5. Go to the **✅ To-Do** tab to create lists for each family member

## Environment Variables (Optional)

Create `app/.env.local` to set build-time defaults:

```bash
# Google OAuth (for the Calendars admin tab)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret   # no VITE_ prefix – never sent to browser

# iCal feed proxy (server-side – no VITE_ prefix keeps it out of the browser bundle)
GCAL_ICAL_URL=https://calendar.google.com/calendar/ical/you%40gmail.com/private-xxx/basic.ics

# Timezone for calendar display
VITE_TIMEZONE=America/New_York

# Fallback coordinates before a ZIP is entered
VITE_LAT=37.7749
VITE_LON=-122.4194
```

Restart the dev server after editing `.env.local`.

## Setting Up Google Calendar

### Option A – OAuth (recommended, supports multiple calendars)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project
2. Enable the **Google Calendar API**
3. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URIs: `http://localhost:12000` (and your production URL/IP)
5. Copy the Client ID and Client Secret into `.env.local`
6. In the app: Settings → 📅 Calendars → **Connect Google Account**
7. After authorizing, click **Sync Calendars** and toggle which ones to show

### Option B – iCal Feed (simpler, single calendar)

1. Open Google Calendar → Settings → your calendar → **Integrate calendar**
2. Copy the **Secret address in iCal format** URL
3. Paste it as `GCAL_ICAL_URL=` in `.env.local` (no `VITE_` prefix)
4. Restart the dev server – the calendar widget will populate automatically

## Adding Photos

**Browser upload (easiest):** Settings → 🖼️ Photos → drag-and-drop or click to upload.

Photos land in `app/public/uploads/` and appear in the slideshow immediately.

## To-Do Lists

Settings → ✅ To-Do:
- **Add list** – creates a column on the dashboard (one per person works well)
- **Add items** to each list
- On the dashboard, check off items; they disappear automatically after the configured delay (default 10 minutes, adjustable in Settings → ⚙️ Settings)
- Drag the **⠿** handle to reorder columns on the dashboard or in the admin panel

## Common Commands

```bash
# Start dev server
npm run dev

# Type-check and build
npm run build

# Run production build locally
npm run preview
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Weather shows wrong city | Enter ZIP code in Settings → ⚙️ Settings |
| Calendar empty | Connect Google account in Settings → 📅 Calendars, or set `GCAL_ICAL_URL` in `.env.local` |
| Photos not showing | Upload via Settings → 🖼️ Photos, or copy files to `app/public/uploads/` |
| Screensaver won't dismiss | Move the mouse, click, tap the screen, or press any key |
| Screensaver never activates | Check Settings → ⚙️ Settings → 💤 Screensaver — make sure it's enabled |
| Settings reset on reload | Settings are also server-persisted; make sure the server is running |
| OAuth redirect fails | Check the redirect URI in Google Cloud Console matches `http://localhost:12000` exactly |

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more detail.
