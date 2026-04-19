# Deployment Checklist

Use this checklist to ensure a smooth deployment of Fam Bam Dash.

## ☑️ Pre-Deployment

### System Requirements
- [ ] Docker and Docker Compose installed
- [ ] Git installed (for cloning)
- [ ] 500MB+ free disk space
- [ ] 512MB+ free RAM
- [ ] Internet connection

### Calendar (Optional but Recommended)
- [ ] Decided on calendar method: OAuth, iCal feed, or JSON API key
- [ ] If OAuth: Google Cloud project created, Calendar API enabled, OAuth 2.0 client ID + secret obtained
- [ ] If iCal: secret iCal URL copied from Google Calendar settings
- [ ] If JSON API: API key and calendar ID obtained

### Photos (Optional)
- [ ] Photos collected and in supported formats (JPG, PNG, GIF, WEBP, AVIF)
- [ ] Will upload via browser after launch (Settings → 🖼️ Photos)

## ☑️ Initial Setup

### Clone Repository
- [ ] Repository cloned: `git clone <repo-url>`
- [ ] Changed to project directory: `cd fam-bam-dash`

### Configuration
- [ ] `app/.env.local` file created
- [ ] `VITE_GOOGLE_CLIENT_ID` set (if using OAuth calendar)
- [ ] `GOOGLE_CLIENT_SECRET` set without `VITE_` prefix (if using OAuth calendar)
- [ ] `GCAL_ICAL_URL` set without `VITE_` prefix (if using iCal feed)
- [ ] `VITE_TIMEZONE` set to your timezone (e.g. `America/New_York`)
- [ ] OAuth redirect URI `http://your-server-ip:12000` added in Google Cloud Console (if using OAuth)
- [ ] Port configured in `docker-compose.yml` (if not using default 12000)

### Volume Paths (Docker / Unraid)
- [ ] Host path for `/app/data` created and mapped (e.g. `/mnt/user/appdata/fam-bam-dash/data`)
- [ ] Host path for `/app/public/uploads` created and mapped (e.g. `/mnt/user/appdata/fam-bam-dash/uploads`)

## ☑️ Build & Deploy

### Build
- [ ] Docker image built: `docker-compose build`
- [ ] Build completed without errors

### Deploy
- [ ] Container started: `docker-compose up -d`
- [ ] Container running: `docker ps` shows fam-bam-dash
- [ ] No errors in logs: `docker-compose logs -f`

### Verify
- [ ] Dashboard accessible at `http://localhost:12000` (or your server IP)
- [ ] Page loads without errors
- [ ] Clock displays and updates
- [ ] Weather loads (or shows error if not configured)
- [ ] Calendar loads (or shows error if not configured)
- [ ] Photos display (or shows placeholder if none added)
- [ ] Todo lists work (add/delete/complete)
- [ ] Settings panel opens and saves

## ☑️ Configuration Testing

### Settings Panel
- [ ] Settings button (⚙️ bottom-right) opens panel
- [ ] ⚙️ Settings tab: ZIP code lookup resolves city/state
- [ ] ⚙️ Settings tab: Units toggle (°F/mph or °C/km/h) works
- [ ] ⚙️ Settings tab: To-Do auto-remove delay saves and takes effect
- [ ] 📅 Calendars tab: OAuth connect flow completes (if configured)
- [ ] 📅 Calendars tab: Calendar toggle saves and takes effect
- [ ] 🖼️ Photos tab: Photo upload works; photos appear in slideshow
- [ ] ✅ To-Do tab: Can add lists and items
- [ ] Settings persist after page reload
- [ ] Settings persist after container restart (volume mapped)
- [ ] Can export settings as JSON
- [ ] Can reset to defaults

### Weather Widget
- [ ] Current temperature displays
- [ ] Weather icon shows
- [ ] Wind speed displays
- [ ] 24-hour hourly forecast scrolls
- [ ] 5-day forecast shows
- [ ] Updates after the configured interval

### Calendar Widget
- [ ] Events load from today forward (30-day window)
- [ ] Event times display correctly in your timezone
- [ ] Events are color-coded by calendar (if using OAuth)
- [ ] Updates after the configured interval

### Photo Slideshow
- [ ] Photos display (if added)
- [ ] Photos transition smoothly
- [ ] Slideshow advances automatically
- [ ] Shuffle works (if enabled)

### Todo Widget
- [ ] Lists created in Settings → ✅ To-Do appear as columns
- [ ] Only lists with items are shown on the dashboard
- [ ] Can check off items; checked items show countdown badge
- [ ] Checked items auto-remove after configured delay
- [ ] Unchecking before delay restores the item
- [ ] Drag ⠿ handle reorders columns
- [ ] Tasks persist after page reload
- [ ] Tasks persist after container restart (volume mapped)

## ☑️ Display Setup

### Browser Configuration
- [ ] Display rotated to **portrait** orientation
- [ ] Browser set to full-screen (F11)
- [ ] Bookmarked for easy access
- [ ] Screen sleep disabled
- [ ] Screen brightness adjusted
- [ ] Dark or light mode selected (☀/☾ button bottom-right)

### Device Configuration
- [ ] Device positioned properly
- [ ] Power cable secured
- [ ] Network connection stable
- [ ] Touch screen calibrated (if applicable)
- [ ] Auto-start on boot configured (if desired)

## ☑️ Network & Security

### Local Network
- [ ] Dashboard accessible from other devices on the LAN
- [ ] Port forwarding configured (if remote access needed)
- [ ] Firewall rules configured (if needed)

### Security (if public-facing)
- [ ] HTTPS configured via reverse proxy
- [ ] `app/.env.local` not committed to git
- [ ] Authentication implemented at proxy level (if needed)

## ☑️ Maintenance Plan

### Regular Tasks
- [ ] Update schedule planned (monthly recommended)
- [ ] Photo refresh schedule planned
- [ ] Backup strategy for `app/data/` and `app/public/uploads/` defined

### Documentation
- [ ] README.md reviewed
- [ ] DEPLOYMENT.md reviewed
- [ ] FAQ.md reviewed for common issues

## ☑️ Final Checks

### Functionality
- [ ] All widgets working as expected
- [ ] Settings persist correctly (browser reload + container restart)
- [ ] Data refreshes automatically
- [ ] Touch interactions work smoothly
- [ ] No console errors

### User Experience
- [ ] Layout looks good on target display
- [ ] Text is readable from viewing distance
- [ ] Colors are appropriate for environment
- [ ] Brightness is comfortable
- [ ] Information is useful and relevant

### Production Ready
- [ ] Tested for at least 24 hours
- [ ] No crashes or freezes
- [ ] Ready for family use!

## 🎉 Deployment Complete!

Once all items are checked, your Fam Bam Dash is ready for production use!

### Next Steps
1. Monitor for first few days
2. Gather family feedback
3. Adjust settings as needed
4. Add more photos regularly
5. Enjoy your dashboard!

### If Issues Arise
1. Check logs: `docker-compose logs -f`
2. Review TROUBLESHOOTING.md
3. Review FAQ.md
4. Open a GitHub issue if needed
