# Deployment Guide

This guide covers deploying Fam Bam Dash to various platforms.

## 🐳 Docker Deployment (Recommended)

The app runs as a single container using `vite preview`, which serves the built frontend **and** runs the server-side API plugins (todos, settings, Google Calendar proxy, OAuth, photos, iCal).

### Prerequisites
- Docker and Docker Compose installed
- `app/.env.local` configured with at minimum `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (if using Google Calendar OAuth)

### Quick Deploy

1. Clone the repository:
```bash
git clone <your-repo-url>
cd fam-bam-dash
```

2. Create your environment file:
```bash
# Create app/.env.local and fill in your values:
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GCAL_ICAL_URL=https://calendar.google.com/calendar/ical/...
VITE_TIMEZONE=America/New_York
```

3. Build and start:
```bash
docker-compose up -d --build
```

4. Access at `http://localhost:12000`

### Custom Port

Edit `docker-compose.yml` to change the host port:
```yaml
ports:
  - "8080:12000"  # Change 8080 to your desired host port
```

The container always listens internally on port 12000.

### Persistent Data

The `docker-compose.yml` maps two named volumes so your data survives container updates:

| Data | Container path |
|------|---------------|
| Todos + settings | `/app/data` |
| Uploaded photos | `/app/public/uploads` |

## 🖥️ Unraid Deployment

See **[UNRAID_DOCKER.md](UNRAID_DOCKER.md)** for the full step-by-step Unraid guide, including how to set up the container via the Unraid Docker UI and configure volume paths under `/mnt/user/appdata/`.

### Quick reference — Unraid Docker UI settings

| Field | Value |
|-------|-------|
| Repository | `yourdockerhubuser/fam-bam-dash:latest` |
| Port | Host `12000` → Container `12000` |
| Path `/app/data` | `/mnt/user/appdata/fam-bam-dash/data` |
| Path `/app/public/uploads` | `/mnt/user/appdata/fam-bam-dash/uploads` |
| Variable `GOOGLE_CLIENT_SECRET` | your secret |
| Variable `GCAL_ICAL_URL` | your iCal URL |
| Variable `TZ` | `America/New_York` |

## 🍓 Raspberry Pi Deployment

### Option 1: Docker on Raspberry Pi

```bash
# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker pi

# Deploy
git clone <your-repo-url>
cd fam-bam-dash
# Create app/.env.local with your values
docker-compose up -d --build
```

Access at `http://localhost:12000`.

### Option 2: Kiosk Mode Setup

After deploying, set up Chromium in kiosk mode:

1. Install Chromium:
```bash
sudo apt-get update
sudo apt-get install chromium-browser unclutter
```

2. Create autostart script:
```bash
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart
```

3. Add these lines:
```
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:12000
@unclutter -idle 0.1 -root
```

4. Reboot:
```bash
sudo reboot
```

## ☁️ Cloud / Remote Deployment

### DigitalOcean / Linode / AWS EC2

1. Create a droplet/instance with Docker pre-installed
2. SSH into your server
3. Clone and deploy:
```bash
git clone <your-repo-url>
cd fam-bam-dash
# Create app/.env.local with your values
docker-compose up -d --build
```

4. Configure firewall to allow port 12000
5. Add your server's public URL as an authorized redirect URI in Google Cloud Console
6. (Optional) Set up a reverse proxy with Nginx/Caddy for HTTPS

### Reverse Proxy Example (Nginx)

```nginx
server {
    listen 80;
    server_name dashboard.yourdomain.com;

    location / {
        proxy_pass http://localhost:12000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔧 Configuration

### Google Calendar OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Google Calendar API**
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:12000` (local dev)
   - `http://your-server-ip:12000` (Docker/Unraid)
   - `https://dashboard.yourdomain.com` (if using a domain)
6. Set `VITE_GOOGLE_CLIENT_ID` (build arg) and `GOOGLE_CLIENT_SECRET` (runtime env) in `app/.env.local`
7. Open Settings → 📅 Calendars → Connect Google Account

### Google Photos Setup (Optional)

1. In the same Google Cloud project, enable **Google Photos Library API**
2. Go to **Credentials → OAuth 2.0 Client ID** (same client as above)
3. Find your album ID from the Google Photos URL: `https://photos.google.com/album/ALBUM_ID_HERE`
4. Set `VITE_GOOGLE_PHOTOS_ALBUM_ID=ALBUM_ID_HERE` in `app/.env.local`

### Weather Location

Enter your US ZIP code in **Settings → ⚙️ Settings → ZIP Code** and click **Look up**. The app resolves it to coordinates automatically. No environment variable needed.

## 🔄 Updating

To update to the latest version:

```bash
cd fam-bam-dash
git pull
docker-compose up -d --build
```

Your data (todos, settings, photos) is preserved in Docker volumes and will not be affected.

## 🐛 Troubleshooting

### Container won't start
```bash
docker-compose logs -f
```

### Calendar not loading
- Open Settings → 📅 Calendars and connect a Google account
- Or set `GCAL_ICAL_URL` in `app/.env.local` for the iCal fallback

### OAuth redirect fails
- Confirm the redirect URI in Google Cloud Console exactly matches your access URL (e.g., `http://your-unraid-ip:12000`)

### Photos not showing
- Upload via Settings → 🖼️ Photos, or copy files directly to `app/public/uploads/`
- Ensure the uploads volume is mounted correctly

## 📱 Display Optimization

### Full-Screen Browser
- Press F11 in most browsers
- Or use the browser's full-screen option

### Prevent Screen Sleep

**Windows:**
```
Settings → System → Power & Sleep → Screen: Never
```

**macOS:**
```
System Preferences → Energy Saver → Prevent display from sleeping
```

**Linux:**
```bash
xset s off
xset -dpms
```

## 🔒 Security Notes

- Keep `app/.env.local` out of version control (it's in `.gitignore`)
- `GOOGLE_CLIENT_SECRET` and `GCAL_ICAL_URL` have no `VITE_` prefix — they stay server-side and are never sent to the browser
- Use HTTPS in production (via reverse proxy)
- For public-facing deployments, add authentication at the reverse proxy level
