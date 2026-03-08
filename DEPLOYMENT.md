# Deployment Guide

This guide covers deploying Fam Bam Dash to various platforms.

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- API keys configured (see Configuration section)

### Quick Deploy

1. Clone the repository:
```bash
git clone <your-repo-url>
cd fam-bam-dash
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Build and start:
```bash
docker-compose up -d
```

4. Access at `http://localhost:3000`

### Custom Port

Edit `docker-compose.yml` to change the port:
```yaml
ports:
  - "8080:80"  # Change 8080 to your desired port
```

## 🖥️ Unraid Deployment

### Method 1: Docker Compose Manager

1. Install "Docker Compose Manager" plugin from Community Applications
2. Create a new stack
3. Paste the contents of `docker-compose.yml`
4. Add your environment variables in the UI
5. Click "Compose Up"

### Method 2: Unraid Docker Template

1. Go to Docker tab in Unraid
2. Click "Add Container"
3. Configure:
   - Name: `fam-bam-dash`
   - Repository: `your-dockerhub-username/fam-bam-dash`
   - Port: `3000` → `80`
   - Add environment variables:
     - `VITE_LAT`
     - `VITE_LON`
     - `VITE_GCAL_API_KEY`
     - `VITE_GCAL_CALENDAR_ID`
     - (Optional) `VITE_GOOGLE_CLIENT_ID`
     - (Optional) `VITE_GOOGLE_PHOTOS_ALBUM_ID`

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
cp .env.example .env
# Edit .env
docker-compose up -d
```

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
@chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:3000
@unclutter -idle 0.1 -root
```

4. Reboot:
```bash
sudo reboot
```

## ☁️ Cloud Deployment

### DigitalOcean / Linode / AWS EC2

1. Create a droplet/instance with Docker pre-installed
2. SSH into your server
3. Clone and deploy:
```bash
git clone <your-repo-url>
cd fam-bam-dash
cp .env.example .env
# Edit .env with your values
docker-compose up -d
```

4. Configure firewall to allow port 3000
5. (Optional) Set up reverse proxy with Nginx/Caddy for HTTPS

### Reverse Proxy Example (Nginx)

```nginx
server {
    listen 80;
    server_name dashboard.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔧 Configuration

### Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Google Calendar API"
4. Go to Credentials → Create Credentials → API Key
5. Copy the API key to your `.env` file

### Google Photos API Setup (Optional)

1. In the same Google Cloud project, enable "Google Photos Library API"
2. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
3. Choose "Web application"
4. Add authorized JavaScript origins:
   - `http://localhost:3000` (for local dev)
   - `http://your-server-ip:3000` (for production)
5. Copy the Client ID to your `.env` file
6. Find your album ID:
   - Open Google Photos
   - Navigate to the album
   - Copy the ID from the URL: `https://photos.google.com/album/ALBUM_ID_HERE`

### Finding Your Coordinates

For weather location:
1. Go to [Google Maps](https://maps.google.com)
2. Right-click your location
3. Click the coordinates to copy them
4. Add to `.env` as `VITE_LAT` and `VITE_LON`

## 🔄 Updating

To update to the latest version:

```bash
cd fam-bam-dash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🐛 Troubleshooting

### Container won't start
```bash
docker-compose logs -f
```

### Calendar not loading
- Verify `VITE_GCAL_API_KEY` is set correctly
- Check that Google Calendar API is enabled in Cloud Console
- Verify calendar ID is correct (usually your Gmail address)

### Photos not showing
- Ensure photos are in `app/src/assets/photos/`
- Rebuild the Docker image after adding photos
- Check browser console for errors

### Google Photos not working
- Verify OAuth Client ID is correct
- Check authorized JavaScript origins in Cloud Console
- Try the consent flow again in Settings panel

## 📱 Display Optimization

### Full-Screen Browser
- Press F11 in most browsers
- Or use browser's full-screen option

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

### Touch Screen Calibration

For touch screens, you may need to calibrate:
```bash
sudo apt-get install xinput-calibrator
xinput_calibrator
```

## 🔒 Security Notes

- Keep your API keys secure and never commit them to git
- Use HTTPS in production (via reverse proxy)
- Consider restricting API key usage in Google Cloud Console
- For public-facing deployments, implement authentication
- Regularly update Docker images for security patches
