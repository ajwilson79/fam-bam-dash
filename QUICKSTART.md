# Quick Start Guide

Get Fam Bam Dash running in 5 minutes!

## 🚀 Fastest Way (Docker)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd fam-bam-dash

# 2. Setup (creates .env and builds)
./setup.sh        # Linux/Mac
# or
./setup.ps1       # Windows

# 3. Start
docker-compose up -d

# 4. Open browser
# http://localhost:3000
```

## 📝 Manual Setup

### Prerequisites
- Docker & Docker Compose installed
- API keys ready (optional, can add later)

### Steps

1. **Get the code**
```bash
git clone <your-repo-url>
cd fam-bam-dash
```

2. **Configure**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Build & Run**
```bash
docker-compose up -d
```

4. **Access**
Open `http://localhost:3000` in your browser

## ⚙️ Quick Configuration

### In the App
1. Click "Settings" button in top-right
2. Update your location (lat/lon)
3. Add your Google Calendar ID
4. Adjust photo slideshow settings
5. Click "Close"

### Environment Variables (Optional)
Edit `.env` file:
```bash
VITE_LAT=37.7749              # Your latitude
VITE_LON=-122.4194            # Your longitude
VITE_GCAL_API_KEY=your_key    # Google Calendar API key
VITE_GCAL_CALENDAR_ID=your@email.com
```

## 🔑 Getting API Keys

### Google Calendar (5 minutes)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable "Google Calendar API"
3. Create API Key
4. Add to `.env` or Settings panel

### Google Photos (Optional, 10 minutes)
1. Same project → Enable "Google Photos Library API"
2. Create OAuth 2.0 Client ID
3. Add authorized origins: `http://localhost:3000`
4. Add Client ID to `.env`
5. Enable in Settings panel (requires consent)

## 📍 Finding Your Location

1. Go to [Google Maps](https://maps.google.com)
2. Right-click your location
3. Click coordinates to copy
4. Add to Settings or `.env`

## 🖼️ Adding Photos

Place photos in `app/src/assets/photos/` then rebuild:
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## 🎯 Common Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Rebuild after changes
docker-compose build --no-cache
docker-compose up -d

# Update to latest
git pull
docker-compose down
docker-compose build
docker-compose up -d
```

## 🐛 Troubleshooting

### Dashboard won't load
```bash
docker-compose logs -f
# Check for errors
```

### Calendar not showing
- Verify API key in Settings
- Check calendar ID is correct
- Ensure Google Calendar API is enabled

### Weather not loading
- Check lat/lon coordinates
- Verify internet connection

### Photos not appearing
- Ensure photos are in `app/src/assets/photos/`
- Rebuild Docker image
- Check browser console for errors

## 📱 Full Screen Mode

- Press `F11` in browser
- Or use browser's full-screen option
- For kiosk mode, see [DEPLOYMENT.md](DEPLOYMENT.md)

## 🎨 Customization

All settings are in the Settings panel:
- Weather location
- Calendar settings
- Photo slideshow timing
- Todo lists

## 📚 More Help

- [README.md](README.md) - Full overview
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment options
- [DEVELOPMENT.md](DEVELOPMENT.md) - Development guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute

## 💡 Tips

- Use a public/shared Google Calendar for family events
- Add photos regularly to keep slideshow fresh
- Set browser to auto-start on boot for dedicated displays
- Use landscape orientation for best layout
- Disable screen sleep for always-on displays

## 🎉 You're Done!

Your family dashboard is ready. Enjoy! 🏠
