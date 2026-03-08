# Troubleshooting Guide

Common issues and their solutions.

## 🔍 General Debugging

### Check Docker Logs
```bash
docker-compose logs -f
```
Look for error messages or warnings.

### Check Browser Console
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Look for red error messages
4. Check Network tab for failed requests

### Verify Container is Running
```bash
docker ps
```
Should show `fam-bam-dash` container running.

## 🐛 Common Issues

### Dashboard Won't Load

**Symptom:** Blank page or "Cannot connect" error

**Solutions:**
1. Check if container is running:
   ```bash
   docker ps
   ```

2. Check logs for errors:
   ```bash
   docker-compose logs -f
   ```

3. Verify port is not in use:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # Linux/Mac
   lsof -i :3000
   ```

4. Try rebuilding:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

5. Check firewall settings

### Calendar Shows "Calendar failed"

**Symptom:** Red error message in calendar widget

**Solutions:**
1. Verify API key is correct in Settings or `.env`
2. Check calendar ID is correct (usually your Gmail)
3. Ensure Google Calendar API is enabled:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - APIs & Services → Library
   - Search "Google Calendar API"
   - Ensure it's enabled

4. Check API key restrictions:
   - Go to Credentials in Cloud Console
   - Click your API key
   - Check "API restrictions" allows Calendar API
   - Check "Application restrictions" allows your domain

5. Test API key manually:
   ```bash
   curl "https://www.googleapis.com/calendar/v3/calendars/YOUR_CALENDAR_ID/events?key=YOUR_API_KEY&maxResults=1"
   ```

6. Check browser console for specific error message

### Weather Not Loading

**Symptom:** "Weather failed" or loading forever

**Solutions:**
1. Verify coordinates are correct:
   - Latitude: -90 to 90
   - Longitude: -180 to 180

2. Check internet connection

3. Test Open-Meteo API:
   ```bash
   curl "https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m"
   ```

4. Check if Open-Meteo is down: https://status.open-meteo.com/

5. Clear browser cache and reload

### Photos Not Showing

**Symptom:** "Add images" message or blank slideshow

**Solutions:**
1. Verify photos are in correct location:
   ```
   app/src/assets/photos/
   ```

2. Check file formats are supported:
   - Supported: .jpg, .jpeg, .png, .gif, .webp, .avif
   - Not supported: .bmp, .tiff, .svg

3. Rebuild Docker image after adding photos:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

4. Check file permissions (Linux/Mac):
   ```bash
   chmod -R 644 app/src/assets/photos/*
   ```

5. Check browser console for loading errors

### Google Photos Not Working

**Symptom:** Photos don't load or consent popup fails

**Solutions:**
1. Verify OAuth Client ID is correct in `.env`

2. Check authorized JavaScript origins in Cloud Console:
   - Go to Credentials → OAuth 2.0 Client IDs
   - Click your client ID
   - Add authorized origins:
     - `http://localhost:3000`
     - `http://your-server-ip:3000`

3. Ensure Google Photos Library API is enabled

4. Try consent flow again:
   - Open Settings
   - Toggle "Use Google Photos" off then on
   - Complete consent popup

5. Check browser blocks popups (allow for your domain)

6. Clear browser cache and cookies

### Settings Not Saving

**Symptom:** Settings reset after page reload

**Solutions:**
1. Check browser localStorage is enabled:
   - Open browser console
   - Type: `localStorage.setItem('test', '1')`
   - Type: `localStorage.getItem('test')`
   - Should return '1'

2. Check if in private/incognito mode (localStorage may not persist)

3. Try different browser

4. Check browser storage quota:
   - Chrome: Settings → Privacy → Site Settings → Storage
   - Firefox: about:preferences#privacy

5. Clear browser data and try again

### Todo Lists Not Persisting

**Symptom:** Todos disappear after reload

**Solutions:**
Same as "Settings Not Saving" above - uses localStorage.

### Docker Build Fails

**Symptom:** Error during `docker-compose build`

**Solutions:**
1. Check disk space:
   ```bash
   df -h  # Linux/Mac
   # or check in File Explorer (Windows)
   ```

2. Clean Docker cache:
   ```bash
   docker system prune -a
   ```

3. Check Docker is running:
   ```bash
   docker --version
   docker ps
   ```

4. Check for syntax errors in Dockerfile or docker-compose.yml

5. Try building without cache:
   ```bash
   docker-compose build --no-cache
   ```

6. Check Docker logs:
   ```bash
   docker-compose logs
   ```

### Container Keeps Restarting

**Symptom:** Container starts then stops repeatedly

**Solutions:**
1. Check logs for crash reason:
   ```bash
   docker-compose logs -f
   ```

2. Check resource limits (RAM, CPU)

3. Verify nginx.conf syntax:
   ```bash
   docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf nginx nginx -t
   ```

4. Check port conflicts

5. Try running without restart policy:
   ```bash
   docker-compose up
   # (without -d flag to see output)
   ```

## ⚡ Performance Issues

### Dashboard is Slow

**Solutions:**
1. Reduce number of photos
2. Increase slideshow interval
3. Disable Google Photos (use local only)
4. Check device resources (RAM, CPU)
5. Close other browser tabs
6. Restart container:
   ```bash
   docker-compose restart
   ```

### High Memory Usage

**Solutions:**
1. Restart browser
2. Reduce photo count
3. Check for memory leaks in browser console
4. Restart container
5. Upgrade device RAM if consistently high

### Slow Network Requests

**Solutions:**
1. Check internet speed
2. Increase refresh intervals in Settings
3. Use local photos instead of Google Photos
4. Check if APIs are slow (test with curl)

## 🔒 Security Issues

### API Key Exposed

**Solutions:**
1. Regenerate API key in Google Cloud Console
2. Update `.env` file
3. Rebuild and redeploy:
   ```bash
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```
4. Add API restrictions in Cloud Console

### Unauthorized Access

**Solutions:**
1. Change port in docker-compose.yml
2. Set up reverse proxy with authentication
3. Use firewall rules to restrict access
4. Implement VPN for remote access

## 🌐 Network Issues

### Can't Access from Other Devices

**Solutions:**
1. Check firewall allows port 3000
2. Verify container is bound to 0.0.0.0:
   ```bash
   docker ps
   # Should show 0.0.0.0:3000->80/tcp
   ```

3. Use server's IP address, not localhost:
   ```
   http://192.168.1.100:3000
   ```

4. Check network connectivity between devices

### HTTPS Not Working

**Solutions:**
1. Set up reverse proxy (Nginx/Caddy)
2. Get SSL certificate (Let's Encrypt)
3. Configure proxy to forward to port 3000
4. See DEPLOYMENT.md for reverse proxy examples

## 🔄 Update Issues

### Update Failed

**Solutions:**
1. Check git status:
   ```bash
   git status
   git pull
   ```

2. If conflicts, stash changes:
   ```bash
   git stash
   git pull
   git stash pop
   ```

3. Rebuild completely:
   ```bash
   docker-compose down
   docker system prune -a
   docker-compose build --no-cache
   docker-compose up -d
   ```

### New Features Not Showing

**Solutions:**
1. Hard refresh browser: Ctrl+Shift+R (Cmd+Shift+R on Mac)
2. Clear browser cache
3. Verify you pulled latest code:
   ```bash
   git log -1
   ```
4. Rebuild Docker image:
   ```bash
   docker-compose build --no-cache
   ```

## 📱 Display Issues

### Layout Broken on Display

**Solutions:**
1. Check display resolution
2. Try different zoom level (Ctrl+/Ctrl-)
3. Rotate display if needed
4. Check browser compatibility
5. Update browser to latest version

### Touch Not Working

**Solutions:**
1. Calibrate touch screen
2. Check touch drivers are installed
3. Test touch in other apps
4. Try different browser
5. Check for browser touch settings

### Screen Goes to Sleep

**Solutions:**
1. Disable screen sleep in OS settings
2. Use browser extension to prevent sleep
3. Set up screensaver prevention script
4. Check power management settings

## 🆘 Still Having Issues?

### Collect Debug Information

1. Docker logs:
   ```bash
   docker-compose logs > logs.txt
   ```

2. Browser console output (screenshot)

3. System information:
   - OS and version
   - Docker version
   - Browser and version
   - Device specs (RAM, CPU)

4. Configuration (remove sensitive data):
   - docker-compose.yml
   - .env (remove API keys)

### Get Help

1. Check [FAQ.md](FAQ.md)
2. Search [GitHub Issues](https://github.com/your-repo/issues)
3. Open new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Debug information above
   - Screenshots if applicable

### Emergency Reset

If all else fails, complete reset:

```bash
# Stop and remove everything
docker-compose down -v
docker system prune -a

# Remove local changes
git reset --hard
git pull

# Fresh start
cp .env.example .env
# Edit .env with your settings
docker-compose build --no-cache
docker-compose up -d
```

## 💡 Prevention Tips

1. **Regular Updates:** Update monthly
2. **Backups:** Backup `.env` and settings
3. **Monitoring:** Check logs occasionally
4. **Testing:** Test after updates
5. **Documentation:** Keep notes of customizations

## 📞 Support Channels

- GitHub Issues: Bug reports and feature requests
- GitHub Discussions: Questions and community help
- Documentation: README, FAQ, guides

---

**Most issues can be solved by checking logs and rebuilding!** 🔧
