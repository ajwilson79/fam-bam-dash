# fam-bam-dash

[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![React](https://img.shields.io/badge/react-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Fam Bam Dash is a customizable, touch-friendly smart home dashboard designed to be a centralized hub of information for your household. It brings together the essentials your family needs—calendar, weather, photos, and to-do lists—all in one sleek, self-hosted, web-based interface.

## 📋 Key Features

- 📅 Google Calendar Integration – Stay on top of events and appointments
- ⏰ Real-Time Clock and Date – Always know what time it is
- 🌦 Current Weather and Forecast – Know what to wear before you head out
- 🖼 Photo Slideshow – Display your favorite family photos
- ✅ Interactive To-Do Lists – Check off tasks directly from a touch screen
- 📌 Modular Layout – Built with React and Tailwind CSS for easy customization
- 💻 Runs in a Browser – Ideal for use with Raspberry Pi, wall-mounted tablets, or smart displays
- 🐳 Docker Ready – Easy deployment with Docker and docker-compose

## 🎯 Goal

To create a self-hosted family dashboard that can be deployed in a Docker container and displayed full-screen in a browser—perfect for a hallway, kitchen, or living room screen.

## 🚀 Quick Start

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <your-repo-url>
cd fam-bam-dash
```

2. Copy the environment file and configure your settings:
```bash
cp .env.example .env
# Edit .env with your API keys and preferences
```

3. Build and run with docker-compose:
```bash
docker-compose up -d
```

4. Open your browser to `http://localhost:3000`

### Local Development

1. Navigate to the app directory:
```bash
cd app
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment file:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Start the development server:
```bash
npm run dev
```

## ⚙️ Configuration

### Settings and Persistence

- Runtime settings are editable via the Settings button in the app header
- Settings are persisted in localStorage under key: `fam-bam-settings`
  - Weather: latitude, longitude
  - Calendar: calendarId, maxEvents
  - Slideshow: intervalMs, shuffle, useGooglePhotos
- To-do lists persist under localStorage key: `fam-bam-todo`

### Environment Variables

Build-time defaults can be set via environment variables:

- `VITE_LAT` / `VITE_LON` - Default location for weather
- `VITE_GCAL_API_KEY` - Google Calendar API key
- `VITE_GCAL_CALENDAR_ID` - Default calendar ID
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID (for Photos)
- `VITE_GOOGLE_PHOTOS_ALBUM_ID` - Google Photos album ID

If env values are not provided, reasonable fallbacks are used.

### Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create an API key in Credentials
5. Add the API key to your `.env` file as `VITE_GCAL_API_KEY`
6. Set your calendar ID (usually your Gmail address) as `VITE_GCAL_CALENDAR_ID`

### Google Photos Setup (Optional)

1. In Google Cloud Console, enable the Google Photos Library API
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized JavaScript origins (e.g., `http://localhost:3000`)
4. Add the client ID to your `.env` file as `VITE_GOOGLE_CLIENT_ID`
5. Find your album ID from the album URL and add as `VITE_GOOGLE_PHOTOS_ALBUM_ID`
6. Enable Google Photos in the Settings panel (requires one-time consent)

### Adding Local Photos

Place your photos in `app/src/assets/photos/` directory. Supported formats: jpg, jpeg, png, gif, webp, avif.

## 🖥️ Deployment on Unraid

1. Install the Docker Compose Manager plugin (if not already installed)
2. Create a new stack with the contents of `docker-compose.yml`
3. Set your environment variables in the Unraid UI
4. Deploy the stack
5. Access the dashboard at `http://your-unraid-ip:3000`

Alternatively, use the Unraid Docker template system:
- Repository: `your-dockerhub-username/fam-bam-dash`
- Port: `3000:80`
- Add environment variables as needed

## 📱 Display Setup

For a wall-mounted display:

1. Set your browser to full-screen mode (F11)
2. Disable screen sleep in your OS settings
3. Consider using a browser extension to prevent screen dimming
4. For Raspberry Pi, use kiosk mode with Chromium

## 🛠️ Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Open-Meteo API (weather)
- Google Calendar API
- Google Photos API (optional)
- Docker & Nginx

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Fam Bam Dash (React App)               │   │
│  │                                                       │   │
│  │  ┌──────┐  ┌─────────┐  ┌──────────┐  ┌──────┐    │   │
│  │  │Clock │  │ Weather │  │ Calendar │  │Photos│    │   │
│  │  └──────┘  └─────────┘  └──────────┘  └──────┘    │   │
│  │  ┌──────┐  ┌──────────────────────────────────┐   │   │
│  │  │ Todo │  │      Settings Panel              │   │   │
│  │  └──────┘  └──────────────────────────────────┘   │   │
│  │                                                       │   │
│  │  localStorage: Settings & Todos                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Docker Container                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Nginx (Port 80)                     │   │
│  │              Serves Static Files                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    External APIs                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Open-Meteo   │  │Google Calendar│ │Google Photos │     │
│  │  (Weather)   │  │     API       │ │     API      │     │
│  │   (Free)     │  │  (Free tier)  │ │ (Free tier)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get running in 5 minutes
- **[Deployment Guide](DEPLOYMENT.md)** - Detailed deployment instructions
- **[Development Guide](DEVELOPMENT.md)** - For developers and customization
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions
- **[FAQ](FAQ.md)** - Frequently asked questions
- **[Contributing](CONTRIBUTING.md)** - How to contribute
- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment checklist
- **[Changelog](CHANGELOG.md)** - Version history

## 📄 License

See LICENSE file for details.

