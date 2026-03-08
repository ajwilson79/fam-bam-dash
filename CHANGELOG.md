# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-XX-XX

### Added
- Initial release of Fam Bam Dash
- Real-time clock and date display
- Weather widget with current conditions and 5-day forecast (Open-Meteo API)
- Google Calendar integration with upcoming events
- Photo slideshow with local and Google Photos support
- Interactive to-do lists with multiple list support
- Settings panel for runtime configuration
- localStorage persistence for settings and todos
- Docker deployment support with docker-compose
- Nginx configuration for production
- Responsive layout optimized for touch screens
- Dark theme with slate color palette
- Comprehensive documentation (README, DEPLOYMENT, DEVELOPMENT, CONTRIBUTING)
- Setup scripts for Windows and Linux
- GitHub Actions workflow for Docker builds

### Features
- Touch-friendly UI with large tap targets
- Auto-refresh for weather and calendar (15 min intervals)
- Customizable photo slideshow interval and shuffle
- Multiple todo lists with add/delete/complete functionality
- Export settings as JSON
- Environment variable configuration
- Build-time defaults with runtime overrides

### Technical
- React 19 with TypeScript
- Vite for fast development and building
- Tailwind CSS 4 for styling
- Multi-stage Docker build for optimized images
- Nginx for production serving
- No backend required - fully client-side

## [Unreleased]

### Planned Features
- Additional widgets (news, stocks, etc.)
- Theme customization
- Widget layout customization
- Mobile app version
- Offline support with service workers
- Multi-language support
- Voice control integration
- Smart home device integration

---

## Version History

- **1.0.0** - Initial release with core features
