# Troubleshooting Guide

## General Debugging

### Check Browser Console
1. Press F12 → Console tab
2. Look for red error messages
3. Check the Network tab for failed requests (401, 404, CORS errors)

### Check Dev Server Logs
The terminal running `npm run dev` shows server-side errors (iCal proxy, OAuth token exchange, photo upload errors).

### Check Docker Logs
```bash
docker-compose logs -f
```

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
2. **iCal proxy** – check that `GCAL_ICAL_URL` is set in `.env.local` and the dev server was restarted after adding it.
3. **JSON API** – verify `VITE_GCAL_API_KEY` and `VITE_GCAL_CALENDAR_ID` are set correctly.

### OAuth connect button does nothing / redirect fails
- Verify `VITE_GOOGLE_CLIENT_ID` is set in `.env.local`
- In Google Cloud Console → Credentials → your OAuth client, confirm the redirect URI matches your current URL exactly (e.g., `http://localhost:5173`)
- Check the browser didn't block the popup

### OAuth token exchange returns 400 or 401
- Verify `GOOGLE_CLIENT_SECRET` is set in `.env.local` (no `VITE_` prefix)
- Make sure the dev server was restarted after adding the secret
- Confirm the OAuth client type is **Web application** (not Desktop)

### Calendar shows events but not from a specific calendar
Open Settings → 📅 Calendars → **Sync Calendars** to refresh the list, then toggle the desired calendar on.

### iCal proxy returns 502 or empty
- Make sure `GCAL_ICAL_URL` uses the **secret** iCal address (Settings → your calendar → Integrate calendar → "Secret address in iCal format")
- The URL must start with `https://calendar.google.com/calendar/ical/`
- Restart the dev server after changing `.env.local`

## Photos

### Photos not appearing in slideshow
1. Upload via Settings → 🖼️ Photos, or copy files directly to `app/public/uploads/`
2. Supported formats: jpg, jpeg, png, gif, webp, avif
3. Check the browser console for 404 errors on `/uploads/` paths

### Photo upload fails
1. Check the terminal running `npm run dev` for error output
2. Confirm `app/public/uploads/` directory exists and is writable
3. Try uploading a smaller file to rule out size limits

### Slideshow doesn't show newly uploaded photos
The slideshow listens for a `photos-changed` DOM event fired after upload. If it doesn't update, hard-refresh the page (Ctrl+Shift+R).

## To-Do Lists

### Todo items not persisting across reloads
- Todo state lives in `localStorage` under `fam-bam-todo`
- Open the browser console and run `localStorage.getItem('fam-bam-todo')` to verify it's being written
- Incognito/private mode may not persist `localStorage`

### Checked items not auto-removing
Items auto-remove 10 minutes after being checked. The cleanup runs on a 30-second timer. If items never disappear, check the browser console for JavaScript errors.

### Can't drag to reorder lists
Drag must start from the **⠿ handle** on the left side of each list header, not from the list body.

## Settings

### Settings reset after reload
- `localStorage` must be enabled in your browser
- Test: open the console and run `localStorage.setItem('test','1'); localStorage.getItem('test')` – should return `'1'`
- Private/incognito mode often doesn't persist `localStorage`

## Display / Layout

### Layout looks wrong
- The layout is optimized for **portrait** orientation (taller than wide)
- If on a landscape screen, try rotating or zooming to see the intended two-column layout
- Minimum recommended resolution: 768×1024

### Dark/light mode toggle missing
The theme toggle button (☀ / ☾) is a floating action button in the **bottom-left corner** of the dashboard. If you don't see it, check that nothing is overlapping it.

## Docker

### Container won't start
```bash
docker-compose logs -f
docker ps -a   # check exit code
```

### Build fails
```bash
docker system prune -a          # clear cache
docker-compose build --no-cache
```

### Photo uploads don't persist across container restarts
Mount `app/public/uploads/` as a Docker volume:
```yaml
volumes:
  - ./app/public/uploads:/app/public/uploads
```

## Environment Variables

### Changes to .env.local have no effect
Vite reads `.env.local` at startup. Restart the dev server after any change:
```bash
# Ctrl+C to stop, then:
npm run dev
```

### Server-side variables not available
Variables without the `VITE_` prefix (e.g. `GOOGLE_CLIENT_SECRET`, `GCAL_ICAL_URL`) are only available in Vite server plugins, not in the browser bundle. If a server endpoint is returning errors, verify these are set without the `VITE_` prefix.

## Still Having Issues?

1. Collect browser console errors (screenshot)
2. Collect dev server terminal output
3. Run `npm run build` – TypeScript errors appear here
4. Open a GitHub issue with: clear description, steps to reproduce, expected vs actual behavior, and the above output
