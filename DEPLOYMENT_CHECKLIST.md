# Deployment Checklist

Use this checklist to ensure a smooth deployment of Fam Bam Dash.

## ☑️ Pre-Deployment

### System Requirements
- [ ] Docker installed and running
- [ ] Docker Compose installed
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
- [ ] `VITE_LAT` / `VITE_LON` set as fallback coordinates (optional — can use ZIP code in-app instead)
- [ ] `VITE_GOOGLE_CLIENT_ID` set (if using OAuth calendar)
- [ ] `GOOGLE_CLIENT_SECRET` set without `VITE_` prefix (if using OAuth calendar)
- [ ] `GCAL_ICAL_URL` set without `VITE_` prefix (if using iCal feed)
- [ ] `VITE_GCAL_API_KEY` + `VITE_GCAL_CALENDAR_ID` set (if using JSON API fallback)
- [ ] Port configured in `docker-compose.yml` (if not using 3000)

## ☑️ Build & Deploy

### Build
- [ ] Docker image built: `docker-compose build`
- [ ] Build completed without errors
- [ ] Image size reasonable (~50-100MB)

### Deploy
- [ ] Container started: `docker-compose up -d`
- [ ] Container running: `docker ps` shows fam-bam-dash
- [ ] No errors in logs: `docker-compose logs -f`

### Verify
- [ ] Dashboard accessible at `http://localhost:3000`
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
- [ ] 📅 Calendars tab: OAuth connect flow completes (if configured)
- [ ] 📅 Calendars tab: Calendar toggle saves and takes effect
- [ ] 🖼️ Photos tab: Photo upload works; photos appear in slideshow
- [ ] ✅ To-Do tab: Can add lists and items
- [ ] Settings persist after page reload
- [ ] Can export settings as JSON
- [ ] Can reset to defaults

### Weather Widget
- [ ] Current temperature displays
- [ ] Weather icon shows
- [ ] Wind speed displays
- [ ] 5-day forecast shows
- [ ] Updates after 15 minutes (or on settings change)

### Calendar Widget
- [ ] Events load (if API key configured)
- [ ] Event times display correctly
- [ ] Event locations show (if present)
- [ ] Updates after 15 minutes

### Photo Slideshow
- [ ] Photos display (if added)
- [ ] Photos transition smoothly
- [ ] Slideshow advances automatically
- [ ] Shuffle works (if enabled)
- [ ] Google Photos load (if configured)

### Todo Widget
- [ ] Lists created in Settings → ✅ To-Do appear as columns
- [ ] Can check off items; checked items show countdown badge
- [ ] Checked items auto-remove after 10 minutes
- [ ] Unchecking before 10 minutes restores the item
- [ ] Drag ⠿ handle reorders columns
- [ ] Tasks persist after page reload

## ☑️ Display Setup

### Browser Configuration
- [ ] Display rotated to **portrait** orientation
- [ ] Browser set to full-screen (F11)
- [ ] Bookmarked for easy access
- [ ] Auto-start configured (if desired)
- [ ] Screen sleep disabled
- [ ] Screen brightness adjusted
- [ ] Dark or light mode selected (☀/☾ button bottom-left)

### Device Configuration
- [ ] Device positioned properly
- [ ] Power cable secured
- [ ] Network connection stable
- [ ] Touch screen calibrated (if applicable)
- [ ] Auto-start on boot configured (if desired)

## ☑️ Network & Security

### Local Network
- [ ] Dashboard accessible from other devices
- [ ] Port forwarding configured (if remote access needed)
- [ ] Firewall rules configured (if needed)

### Security (if public-facing)
- [ ] HTTPS configured via reverse proxy
- [ ] API keys restricted in Google Cloud Console
- [ ] Authentication implemented (if needed)
- [ ] Regular updates scheduled

## ☑️ Optimization

### Performance
- [ ] Page loads quickly (<3 seconds)
- [ ] Transitions are smooth
- [ ] No lag when interacting
- [ ] Memory usage reasonable
- [ ] CPU usage low

### Troubleshooting
- [ ] Logs checked for warnings
- [ ] Browser console checked for errors
- [ ] All features tested
- [ ] Backup of `.env` created
- [ ] Documentation reviewed

## ☑️ Maintenance Plan

### Regular Tasks
- [ ] Update schedule planned (monthly recommended)
- [ ] Photo refresh schedule planned
- [ ] Backup strategy defined
- [ ] Monitoring setup (optional)

### Documentation
- [ ] README.md reviewed
- [ ] DEPLOYMENT.md reviewed
- [ ] FAQ.md reviewed for common issues
- [ ] Contact info for support noted

## ☑️ Final Checks

### Functionality
- [ ] All widgets working as expected
- [ ] Settings persist correctly
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
- [ ] Memory leaks checked
- [ ] Network issues handled gracefully
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
2. Review FAQ.md
3. Search GitHub issues
4. Open new issue if needed

### Share Your Success
- Star the repo on GitHub
- Share photos of your setup
- Contribute improvements
- Help others in discussions

---

**Congratulations on your successful deployment!** 🎊
