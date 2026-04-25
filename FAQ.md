# Frequently Asked Questions

## General

### What is Fam Bam Dash?
A self-hosted family dashboard that displays calendar events, weather, photos, and to-do lists on a wall-mounted display. Built with React/TypeScript, optimized for portrait-oriented screens.

### Is it free?
Yes. All APIs it uses are free for personal use (Open-Meteo for weather, Zippopotam.us for ZIP lookup, Google Calendar API free tier).

### Do I need coding experience?
No coding experience is required to run it. If you can run `npm install && npm run dev`, you're good.

### What devices can I use?
Any device with a modern browser: Raspberry Pi, old tablet, wall-mounted TV, laptop. Portrait orientation works best.

## Setup & Installation

### Do I need a server?
For local use: just Node.js on your machine. For always-on display: a Raspberry Pi running Node.js with a systemd service.

### What port does it run on?
`http://localhost:12000` (configured in `vite.config.ts`).

### Does it need a separate backend?
No. The app runs as a single Node.js process using `vite preview`. All server-side routes (todos, settings, Google Calendar proxy, OAuth, photos, live sync) are handled by Vite plugins in the same process.

### I have a wall display (Raspberry Pi) and a separate PC for admin. Will the display update automatically?
Yes. Every open browser tab connects to a Server-Sent Events stream (`/api/sse`). Whenever you save settings or add/edit todos on your PC, the server immediately pushes a reload signal to all other open tabs. The Pi display reloads within a second — no keyboard or manual interaction needed. The tab that made the change is never reloaded.

## Weather

### How do I set my location?
Open Settings (⚙️ bottom-right) → ⚙️ Settings tab → enter your US ZIP code → click **Look up**. The app resolves it to coordinates automatically and shows the city/state as confirmation.

### Can I use coordinates instead of a ZIP?
Yes. In the Settings weather section, expand **Manual coordinates (advanced)** to enter latitude/longitude directly.

### Can I switch between Fahrenheit and Celsius?
Yes. Settings → ⚙️ Settings → Units: choose **°F / mph** or **°C / km/h**. The weather widget reloads immediately.

### What weather API does it use?
[Open-Meteo](https://open-meteo.com/) — free, no API key required.

### What does the weather section show?
Current conditions (temperature, wind speed, icon), a scrollable 24-hour hourly forecast, and a 5-day daily forecast.

## Calendar

### How do I connect my Google Calendar?
Settings → 📅 Calendars → **Connect Google Account**. This uses Google OAuth; you'll be redirected to Google to authorize access, then returned to the dashboard.

Requires `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `app/.env.local`. See [QUICKSTART.md](QUICKSTART.md) for setup steps.

### Can I show multiple calendars?
Yes. You can connect multiple Google accounts, and for each account you can toggle individual calendars on or off from the 📅 Calendars tab. Each calendar's events are color-coded with that calendar's color from Google.

### I don't want to set up OAuth. Can I still show my calendar?
Yes. Add your Google Calendar's **secret iCal URL** as `GCAL_ICAL_URL` in `app/.env.local`. The server proxies it server-side so there are no CORS issues. Find the URL in Google Calendar → Settings → your calendar → Integrate calendar → "Secret address in iCal format".

### How far ahead does the calendar show?
30 days, starting from today. Past events are not shown.

### How often does the calendar refresh?
Every 15 minutes by default. Configurable in Settings → ⚙️ Settings.

## Photos

### How do I add photos?
Open Settings → 🖼️ Photos and drag-and-drop image files or click to browse. Photos are uploaded to `app/public/uploads/` and appear in the slideshow immediately — no restart required.

### Can I delete uploaded photos?
Yes. In Settings → 🖼️ Photos, hover over any photo thumbnail and click the **×** button.

### What formats are supported?
JPG, JPEG, PNG, GIF, WEBP, AVIF.

### Why do photos have a blurred background?
The slideshow uses `object-contain` to show the full image without cropping. The blurred backdrop fills the letterbox areas so the panel looks full rather than having black bars.

### What is the Ken Burns effect?
Photos gently zoom and pan while displayed — a subtle animation that makes the slideshow feel alive without being distracting. Four different zoom/pan variants cycle through your photos automatically.

### Can I use Google Photos?
Yes, if `VITE_GOOGLE_PHOTOS_ALBUM_ID` is set in `app/.env.local`. The slideshow merges uploaded photos and Google Photos album photos.

## To-Do Lists

### How do I set up to-do lists?
Settings → ✅ To-Do → **Add list**. Create one list per person (e.g., "Mom", "Dad", "Kids"). Add items to each list.

### How do the checkboxes work?
Check an item on the dashboard to mark it done. It stays visible for the configured auto-remove delay so you can uncheck it if it was checked accidentally. After that delay it's removed automatically.

### How long until checked items disappear?
10 minutes by default. Configurable in Settings → ⚙️ Settings → To-Do → "Auto-remove checked items after (minutes)".

### Can I reorder the lists?
Yes. On the dashboard, drag the **⠿** handle on a list column to move it. You can also reorder them in Settings → ✅ To-Do using the same drag handle.

### Are todos backed up?
Yes. Every save writes to both `localStorage` and `app/data/todos.json` on the server. If your browser clears localStorage, the app restores from the server file on next load.

## Screensaver / Picture Frame Mode

### How do I enable picture frame mode?
Open Settings (⚙️ bottom-right) → ⚙️ Settings tab → 💤 Screensaver section. Toggle **Enable picture frame mode when idle** on and set your preferred idle timeout in minutes (default 5). After that period of no interaction, the display switches to a fullscreen photo slideshow. Any mouse move, click, touch, or keypress brings the dashboard back.

### What is the minimum/maximum idle timeout?
1 minute minimum, 1440 minutes (24 hours) maximum.

### Why don't photos appear in screensaver mode?
Make sure you have photos uploaded first — Settings → 🖼️ Photos. The screensaver uses the same photo library as the dashboard slideshow.

### Can I disable the screensaver?
Yes. Settings → ⚙️ Settings → 💤 Screensaver → uncheck **Enable picture frame mode when idle**.

## Appearance

### How do I toggle dark/light mode?
Click the **☀ / ☾** floating button in the bottom-right corner of the dashboard (next to the gear icon).

### Is the layout customizable?
The current layout is a fixed two-column portrait grid. The left column shows the calendar; the right column shows photos, clock + weather, and to-do lists. To change the layout, edit `App.tsx` and `index.css`.

## Privacy & Security

### Where is my data stored?
Settings and to-do lists are in your browser's `localStorage` and backed up to `app/data/` on the server. Uploaded photos are in `app/public/uploads/` on the server. Nothing is sent to any third-party service except:
- Weather coordinates → Open-Meteo
- ZIP code → Zippopotam.us
- OAuth tokens → Google (if calendar is connected)

### Are my API keys secure?
`GOOGLE_CLIENT_SECRET` and `GCAL_ICAL_URL` use environment variable names **without** the `VITE_` prefix, so Vite never bundles them into the browser build. They only exist in the Node.js server process.

`VITE_GOOGLE_CLIENT_ID` is intentionally public (it's the OAuth client ID, not secret).

### Can others access my dashboard?
If you run it on your home network and don't expose the port externally, only devices on your LAN can reach it. For public-facing deployments, add authentication via a reverse proxy.

## Performance

### How much bandwidth does it use?
After initial load:
- Weather: ~15 KB every 15 minutes
- Calendar (iCal): ~50–200 KB every 15 minutes
- Photos: loaded once and cached

### How can I improve performance?
- Increase the slideshow interval (Settings → ⚙️ Settings → Interval)
- Reduce the number of uploaded photos
- Increase calendar/weather refresh intervals in Settings

## Boot Splash & Wallpaper

### Can I show a custom image while the Pi is booting?
Yes. Place your image at `assets/splash-boot.png` in the repo and run `scripts/splash-setup.sh` (or re-run `pi-setup.sh`). The script installs a Plymouth theme that centres and scales the image on a black background during boot. Because Plymouth runs before the OS applies display rotation, `splash-boot.png` should be pre-rotated to appear correctly on your portrait display.

### Can I show a custom image while the dashboard is loading?
Yes. Place your image at `assets/splash.png` and run `scripts/splash-setup.sh`. The script installs `swaybg` (a Wayland wallpaper tool) and adds it to the labwc autostart so the wallpaper appears as soon as the Wayland session starts — before Chromium opens. This image should be in normal (un-rotated) orientation, since the OS handles rotation at this point.

### How are the two splash images different?
| Image | File | When shown | Orientation |
|-------|------|-----------|-------------|
| Boot splash | `assets/splash-boot.png` | During OS boot (Plymouth, pre-rotation) | Pre-rotated |
| Session wallpaper | `assets/splash.png` | After Wayland starts, while dashboard loads | Normal |

### How do I update the splash images after initial setup?
Replace the files in `assets/` and re-run `scripts/splash-setup.sh`. The script copies updated images to their installed locations and deduplicates autostart entries on re-run.

## Admin PIN

### What is the admin PIN?
A PIN that gates admin actions — opening Settings, uploading or deleting photos, and connecting Google accounts. The dashboard (clock, weather, calendar, photos, checking off todos) works without it, so a kiosk user can keep using the display normally.

### How do I set the PIN?
Add `FAM_BAM_ADMIN_PIN=1234` (any value you choose) to `app/.env.local` and restart the server. Leaving it blank — or omitting the line entirely — disables the PIN.

### I entered the PIN once, do I have to enter it again?
Only if you switch devices, clear the browser's localStorage, or change the PIN in `.env.local`. Each device that unlocks Settings stores the PIN locally.

### I forgot my PIN
Edit `app/.env.local` on the Pi and change `FAM_BAM_ADMIN_PIN` to a new value. Restart the server. On any device that had the old PIN stored, you'll be prompted for the new one next time you click ⚙.

### Does the PIN encrypt anything?
No. It's a shared-secret check on admin API endpoints — fine for protecting a household dashboard against accidental taps and casual LAN tampering, not a defence against a determined attacker on your network. For stronger isolation, put the app behind Tailscale or bind it to localhost.

## Motion Sensor

### Do I need a motion sensor?
No. It's entirely optional. The dashboard and all other features work without one.

### What hardware is required?
A PIR (passive infrared) motion sensor wired to **GPIO pin 17** on your Raspberry Pi. The script uses the `gpiozero` Python library, which is standard on Raspberry Pi OS.

### How do I set it up?
Run `scripts/motion-sensor-setup.sh` on the Pi. It installs `gpiozero` and `wlopm`, adds your user to the `gpio` group, ensures `/boot/firmware/cmdline.txt` has the kernel parameter needed for reliable HDMI DPMS wake, and creates a `fam-bam-motion` systemd service that starts automatically on boot. A reboot is required if the cmdline was modified.

### What does the motion sensor do exactly?
- **Day hours + motion** → wakes the screen and shows the full dashboard
- **Night hours + motion** → wakes the screen and shows the picture frame screensaver (less jarring at 2am)
- **No motion for configured timeout** → turns the screen off via `wlopm` (Wayland DPMS)

### How do I configure the night hours and timeouts?
In the app: Settings → ⚙️ Settings → 🚶 Motion Sensor. Changes take effect within 60 seconds without restarting the script.

### The motion sensor script says "not available" and exits
Check that your sensor is wired to GPIO pin 17, the Pi has the GPIO header accessible, and `python3-gpiozero` is installed (`sudo apt-get install python3-gpiozero`).

## Still Have Questions?

Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or open a GitHub issue.
