# Troubleshooting Guide

## General Debugging

### Check Browser Console
1. Press F12 → Console tab
2. Look for red error messages
3. Check the Network tab for failed requests (401, 404, CORS errors)

### Check Server Logs
The terminal running `npm run dev` (or `npm run preview`) shows server-side errors: iCal proxy, OAuth token exchange, photo upload errors, todos/settings API errors.

## Weather

### Weather won't load
1. Verify internet access: `curl "https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m"`
2. Check Settings → ⚙️ Settings → the ZIP lookup resolved valid coordinates
3. Check [Open-Meteo status](https://status.open-meteo.com/)

### ZIP code lookup fails
1. Only US ZIP codes are supported (uses zippopotam.us)
2. Try a 5-digit ZIP without spaces
3. Check internet connection – the lookup hits `api.zippopotam.us`

### Temperatures showing in wrong units
Open Settings → ⚙️ Settings → Units and select **°F / mph** or **°C / km/h**.

## Calendar

### Calendar shows no events

The app tries three sources in order:

1. **OAuth accounts** – open Settings → 📅 Calendars. If no accounts are listed, connect one.
2. **iCal proxy** – check that `GCAL_ICAL_URL` is set in `app/.env.local` and the server was restarted after adding it.
3. **JSON API** – verify `VITE_GCAL_API_KEY` and `VITE_GCAL_CALENDAR_ID` are set correctly.

### OAuth connect button does nothing / redirect fails
- Verify `VITE_GOOGLE_CLIENT_ID` is set in `app/.env.local`
- In Google Cloud Console → Credentials → your OAuth client, confirm the redirect URI matches your current URL exactly (e.g., `http://localhost:12000` or `http://your-pi-ip:12000`)
- Check the browser didn't block the popup

### OAuth token exchange returns 400 or 401
- Verify `GOOGLE_CLIENT_SECRET` is set in `app/.env.local` (no `VITE_` prefix)
- Make sure the server was restarted after adding the secret
- Confirm the OAuth client type is **Web application** (not Desktop)

### Calendar shows events but not from a specific calendar
Open Settings → 📅 Calendars → **Sync Calendars** to refresh the list, then toggle the desired calendar on.

### iCal proxy returns 502 or empty
- Make sure `GCAL_ICAL_URL` uses the **secret** iCal address (Google Calendar → Settings → your calendar → Integrate calendar → "Secret address in iCal format")
- The URL must start with `https://calendar.google.com/calendar/ical/`
- Restart the server after changing `app/.env.local`

## Photos

### Photos not appearing in slideshow
1. Upload via Settings → 🖼️ Photos, or copy files directly to `app/public/uploads/`
2. Supported formats: jpg, jpeg, png, gif, webp, avif
3. Check the browser console for 404 errors on `/uploads/` paths

### Photo upload fails
1. Check the server logs for error output
2. Confirm `app/public/uploads/` directory exists and is writable
3. Try uploading a smaller file to rule out size limits

### Slideshow doesn't show newly uploaded photos
The slideshow listens for a `photos-changed` DOM event fired after upload. If it doesn't update, hard-refresh the page (Ctrl+Shift+R).

## To-Do Lists

### Todo items not persisting across reloads
- Todo state is saved to `localStorage` and also synced to `app/data/todos.json` on the server
- If both are lost, check that the server's `data/` directory is writable

### Checked items not auto-removing
Items auto-remove after the configured delay (default 10 minutes, adjustable in Settings → ⚙️ Settings → To-Do). The cleanup runs on a 30-second timer. If items never disappear, check the browser console for JavaScript errors.

### Can't drag to reorder lists
Drag must start from the **⠿ handle** on the left side of each list header, not from the list body.

## Screensaver / Picture Frame Mode

### Screensaver never activates
1. Open Settings → ⚙️ Settings → 💤 Screensaver and confirm **Enable picture frame mode when idle** is checked
2. Confirm the timeout value is what you expect (default 5 minutes)
3. Any mouse movement, click, touch, or keypress resets the timer — make sure the display is truly idle

### Screensaver activates but shows no photos
Upload photos first: Settings → 🖼️ Photos. The screensaver uses the same library as the dashboard slideshow.

### Screensaver won't dismiss
Any of the following should wake the dashboard: move the mouse, click anywhere, tap the screen, or press any key. If the page becomes completely unresponsive, a browser refresh (F5) will also reset it.

### Screensaver timeout changed but old timeout is still being used
The new timeout takes effect on the next interaction that resets the timer. Move the mouse once after saving to start a fresh countdown.

## Settings

### Settings reset after reload
- Settings are saved to both `localStorage` and `app/data/settings.json`
- On startup the app restores from the server file if localStorage is empty
- If settings keep resetting, check that the server's `data/` directory is writable

## Display / Layout

### Layout looks wrong
- The layout is optimized for **portrait** orientation (taller than wide)
- If on a landscape screen, try rotating or zooming to see the intended two-column layout
- Minimum recommended resolution: 768×1024

### Dark/light mode toggle missing
The theme toggle button (☀ / ☾) is a floating action button in the **bottom-right corner** of the dashboard alongside the settings gear.

## Live Sync (SSE)

### Display screen doesn't reload when I make changes on another device
1. Make sure both devices are accessing the **same server** (same IP/hostname and port)
2. Open the browser console on the Pi and check for a successful `GET /api/sse` request in the Network tab — it should show as "pending" (kept open), not failed
3. Some reverse proxies buffer SSE streams. If you're behind Nginx or similar, add these headers to your proxy config:
   ```nginx
   proxy_buffering off;
   proxy_cache off;
   proxy_set_header Connection '';
   chunked_transfer_encoding on;
   ```
4. Verify the server is running — if it restarted, the Pi needs to reload once to re-establish the SSE connection

### SSE connection drops frequently
The server sends a keep-alive ping every 25 seconds. If the connection still drops, check for a timeout setting on your reverse proxy (`proxy_read_timeout` in Nginx should be at least 60 seconds).

## Environment Variables

### Changes to .env.local have no effect
Vite reads `app/.env.local` at startup. Restart the server after any change:
```bash
# Ctrl+C to stop, then:
npm run dev
```

### Server-side variables not available
Variables without the `VITE_` prefix (e.g. `GOOGLE_CLIENT_SECRET`, `GCAL_ICAL_URL`) are only available in Vite server plugins, not in the browser bundle. If a server endpoint is returning errors, verify these are set **without** the `VITE_` prefix.

## Motion Sensor (optional hardware)

### Script exits immediately with "Motion sensor not available"
- Confirm the PIR sensor is wired to GPIO pin 17
- Install the library: `sudo apt-get install python3-gpiozero`
- Run the script manually to see the full error: `python3 scripts/motion_sensor.py`

### Screen doesn't turn on when motion is detected
- Verify `DISPLAY=:0` is set in the systemd service environment (required for `xset` to find the display)
- Test `xset dpms force on` manually in a terminal on the Pi to confirm `xset` works
- Check logs: `journalctl -u fam-bam-motion -f`

### App doesn't switch to dashboard/screensaver mode when motion is detected
- Confirm the fam-bam-dash server is running and reachable at `http://localhost:12000`
- The script POSTs to `/api/display-mode` — test it manually:
  ```bash
  curl -X POST http://localhost:12000/api/display-mode -H "Content-Type: application/json" -d '{"mode":"dashboard"}'
  ```
- Check that the browser tab has an active SSE connection (Network tab → `/api/sse` should be "pending")

### Motion sensor settings changes aren't taking effect
The script polls `/api/settings` every 60 seconds. Wait up to a minute after saving in the UI, or restart the service: `sudo systemctl restart fam-bam-motion`.

### Screen turns off too quickly / not quickly enough at night
Adjust **Night: screen off after** in Settings → ⚙️ Settings → 🚶 Motion Sensor. Changes are picked up within 60 seconds.

## Still Having Issues?

1. Collect browser console errors (screenshot or copy)
2. Collect server terminal output (the `npm run dev` or `npm run preview` terminal)
3. Run `npm run build` — TypeScript errors appear here
4. Open a GitHub issue with: clear description, steps to reproduce, expected vs actual behavior, and the above output
