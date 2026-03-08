# Frequently Asked Questions (FAQ)

## General Questions

### What is Fam Bam Dash?
Fam Bam Dash is a self-hosted family dashboard that displays useful information like calendar events, weather, photos, and to-do lists. It's designed for wall-mounted tablets, smart displays, or any always-on screen in your home.

### Is it free?
Yes! Fam Bam Dash is completely free and open source. The only costs are for hosting (if you use cloud services) and optional API usage (Google Calendar/Photos are free for personal use).

### Do I need coding experience?
No! If you can follow instructions to run Docker commands, you can set this up. The setup scripts make it even easier.

### What devices can I use?
- Raspberry Pi (any model with network)
- Old tablets (Android/iPad)
- Dedicated smart displays
- Old laptops/computers
- Any device with a web browser

## Setup & Installation

### Do I need a server?
You need something to run Docker on. This can be:
- Your home server (Unraid, TrueNAS, etc.)
- Raspberry Pi
- Your main computer
- Cloud server (DigitalOcean, AWS, etc.)

### Can I run it without Docker?
Yes! See [DEVELOPMENT.md](DEVELOPMENT.md) for running locally with Node.js. However, Docker is recommended for easier deployment.

### How much storage does it need?
- Docker image: ~50MB
- With photos: Depends on your photo collection
- Recommended: 500MB+ free space

### How much RAM does it need?
Very little! The app runs in a browser and the Docker container uses minimal resources:
- Minimum: 256MB RAM
- Recommended: 512MB+ RAM

## API Keys & Configuration

### Do I need Google API keys?
- Calendar: Yes, if you want calendar integration
- Photos: No, you can use local photos only
- Weather: No, uses free Open-Meteo API

### Are the API keys free?
Yes! Google Calendar and Photos APIs are free for personal use within reasonable limits.

### How do I get a Google Calendar API key?
See [QUICKSTART.md](QUICKSTART.md#getting-api-keys) for step-by-step instructions.

### Can I use multiple calendars?
Currently, one calendar at a time. You can change it in Settings. Future versions may support multiple calendars.

### Where do I find my calendar ID?
Usually it's your Gmail address (e.g., `yourname@gmail.com`). For shared calendars, go to Calendar Settings → Integrate Calendar → Calendar ID.

## Features & Usage

### Can I customize the layout?
Currently, the layout is fixed but responsive. Future versions will support drag-and-drop customization. You can modify the code if you're comfortable with React.

### Can I add more widgets?
Yes! See [CONTRIBUTING.md](CONTRIBUTING.md) for how to create custom widgets. Ideas: news, stocks, traffic, smart home controls.

### How often does data refresh?
- Clock: Every second
- Weather: Every 15 minutes
- Calendar: Every 15 minutes
- Photos: Based on slideshow interval (default 12 seconds)
- Todo: Instant (saved to localStorage)

### Can I use it offline?
Partially. Todo lists work offline. Weather and Calendar require internet. Future versions may add offline support with service workers.

### Does it work on mobile?
Yes! The UI is responsive and works on phones/tablets. However, it's optimized for larger screens (tablets, monitors).

## Photos

### Where do I put my photos?
Place them in `app/src/assets/photos/` directory. You can organize them in subfolders.

### What photo formats are supported?
JPG, JPEG, PNG, GIF, WEBP, AVIF

### How do I add photos after deployment?
1. Add photos to `app/src/assets/photos/`
2. Rebuild: `docker-compose build`
3. Restart: `docker-compose up -d`

### Can I use Google Photos?
Yes! Set up OAuth credentials and enable in Settings. See [DEPLOYMENT.md](DEPLOYMENT.md) for setup instructions.

### How many photos can I add?
No hard limit, but keep it reasonable (100-500 photos). Too many may slow down the build process.

## Deployment

### Can I access it from outside my home?
Yes, but you'll need to:
1. Set up port forwarding on your router
2. Use a reverse proxy with HTTPS (recommended)
3. Consider security implications

### How do I use HTTPS?
Use a reverse proxy like Nginx or Caddy. See [DEPLOYMENT.md](DEPLOYMENT.md#reverse-proxy-example-nginx) for examples.

### Can I run multiple instances?
Yes! Just change the port in `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Second instance
```

### How do I update to the latest version?
```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Dashboard shows blank screen
1. Check browser console for errors (F12)
2. Check Docker logs: `docker-compose logs -f`
3. Verify port 3000 is not in use
4. Try rebuilding: `docker-compose build --no-cache`

### Calendar shows "Calendar failed"
- Verify API key is correct
- Check calendar ID is correct
- Ensure Google Calendar API is enabled
- Check browser console for specific error

### Weather not loading
- Verify lat/lon coordinates are correct
- Check internet connection
- Open-Meteo API might be down (rare)

### Photos not showing
- Ensure photos are in correct directory
- Rebuild Docker image after adding photos
- Check file formats are supported
- Look for errors in browser console

### Settings not saving
- Check browser localStorage is enabled
- Try different browser
- Check browser console for errors

### Docker build fails
- Ensure Docker is running
- Check disk space
- Try: `docker system prune` to free space
- Check Docker logs for specific error

## Performance

### Why is the dashboard slow?
- Too many photos (optimize/reduce)
- Slow internet (affects weather/calendar)
- Underpowered device (upgrade RAM)
- Browser issues (try different browser)

### How can I improve performance?
- Reduce photo count
- Increase refresh intervals
- Use local photos instead of Google Photos
- Close other browser tabs
- Restart the container

### Does it use a lot of bandwidth?
No! After initial load:
- Weather: ~10KB every 15 minutes
- Calendar: ~5KB every 15 minutes
- Photos: Only when loading new ones
- Total: <1MB per hour

## Privacy & Security

### Is my data private?
Yes! Everything runs locally. Your data never leaves your network except:
- Weather API calls (location only)
- Google Calendar API calls (if enabled)
- Google Photos API calls (if enabled)

### Are API keys secure?
API keys are embedded in the built app. For public-facing deployments:
- Use API key restrictions in Google Cloud Console
- Implement authentication
- Use HTTPS

### Can others see my calendar?
Only if they can access your dashboard. Secure your network and consider authentication for public access.

## Customization

### Can I change the colors?
Yes! Edit `app/src/index.css` and component files. The app uses Tailwind CSS. Future versions may have theme support.

### Can I change the font?
Yes! Add your font to `app/index.html` and update CSS. See Tailwind documentation for font configuration.

### Can I hide widgets I don't use?
Currently, you'd need to edit `app/src/App.tsx` to remove widgets. Future versions may have toggle options.

### Can I change the layout?
Yes, by editing `app/src/App.tsx`. The layout uses CSS Grid. Requires React/CSS knowledge.

## Support

### Where can I get help?
1. Check this FAQ
2. Read the documentation (README, DEPLOYMENT, DEVELOPMENT)
3. Search existing GitHub issues
4. Open a new GitHub issue
5. Join discussions on GitHub

### How do I report a bug?
Open a GitHub issue with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/OS information
- Console errors

### How do I request a feature?
Open a GitHub issue with:
- Feature description
- Use case explanation
- Examples or mockups
- Why it would be useful

### Can I contribute?
Absolutely! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. All contributions welcome!

## Future Plans

### What features are planned?
- More widgets (news, stocks, traffic, etc.)
- Drag-and-drop layout customization
- Theme support
- Multi-language support
- Mobile app version
- Offline support
- Voice control
- Smart home integration

### When will feature X be added?
This is an open-source project. Features are added as time permits. Contributions are welcome!

### Can I sponsor development?
Not currently set up, but may be added in the future. Best way to help is to contribute code or documentation!

## Still Have Questions?

- Check the [documentation](README.md)
- Search [GitHub issues](https://github.com/your-repo/issues)
- Open a [new issue](https://github.com/your-repo/issues/new)
- Start a [discussion](https://github.com/your-repo/discussions)
