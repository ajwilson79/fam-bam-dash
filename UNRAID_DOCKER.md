# Running Fam Bam Dash on Unraid

This guide covers two ways to run the app on your Unraid server:

1. **Community Applications / Docker UI** — manual container setup, no build required if you push a pre-built image
2. **Build and run yourself** — clone the repo on Unraid (or build on another machine and push to a registry)

---

## How the container works

The app runs `vite preview` inside the container. This serves the pre-built frontend **and** runs the server-side plugins that handle:

- `/api/todos` — todo persistence (`data/todos.json`)
- `/api/settings` — settings persistence (`data/settings.json`)
- `/api/gcal/*` — Google Calendar API proxy (eliminates CORS)
- `/api/auth/*` — Google OAuth token exchange (keeps your client secret server-side)
- `/api/photos/*` — photo upload and management
- `/api/ical` — iCal feed proxy

Port **12000** is the only port exposed.

---

## Option A — Build on your PC, push to a registry, pull on Unraid

This is the recommended approach. You build once on your development machine and push the image to Docker Hub (or any registry). Unraid then pulls and runs it.

### 1. Create a `.env` file in the project root

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GCAL_CALENDAR_ID=you@gmail.com
VITE_TIMEZONE=America/New_York
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret
GCAL_ICAL_URL=https://calendar.google.com/calendar/ical/...
```

The `VITE_` variables are baked into the JavaScript bundle at build time.  
`GOOGLE_CLIENT_SECRET` and `GCAL_ICAL_URL` are runtime-only — they are never sent to the browser.

### 2. Build and push the image

```bash
# From the repo root (where Dockerfile lives)
docker build \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
  --build-arg VITE_GCAL_CALENDAR_ID=you@gmail.com \
  --build-arg VITE_TIMEZONE=America/New_York \
  -t yourdockerhubuser/fam-bam-dash:latest .

docker push yourdockerhubuser/fam-bam-dash:latest
```

### 3. Add the container in Unraid

Go to **Docker → Add Container** and fill in:

| Field | Value |
|-------|-------|
| Name | `fam-bam-dash` |
| Repository | `yourdockerhubuser/fam-bam-dash:latest` |
| Network Type | `Bridge` |
| Port Mapping | Host `12000` → Container `12000` (TCP) |
| Restart Policy | `Unless Stopped` |

**Add the following Environment Variables** (click "Add another Path, Port, Variable..."):

| Type | Name | Value |
|------|------|-------|
| Variable | `GOOGLE_CLIENT_SECRET` | `GOCSPX-your-secret` |
| Variable | `GCAL_ICAL_URL` | your private iCal URL |
| Variable | `TZ` | `America/New_York` |

**Add Volume Mappings** (so your data survives container updates):

| Type | Container Path | Host Path | Access |
|------|---------------|-----------|--------|
| Path | `/app/data` | `/mnt/user/appdata/fam-bam-dash/data` | Read/Write |
| Path | `/app/public/uploads` | `/mnt/user/appdata/fam-bam-dash/uploads` | Read/Write |

Click **Apply**. The app will be available at `http://your-unraid-ip:12000`.

---

## Option B — Build directly on Unraid

If you have the Unraid terminal open and git/docker available:

```bash
cd /mnt/user/appdata   # or wherever you keep source code
git clone https://github.com/your-username/fam-bam-dash.git
cd fam-bam-dash

# Create your environment file
cp app/.env.local.example app/.env.local   # then edit it
# or create it manually (see Option A step 1 for the variables)

# Build and start
docker compose up -d --build
```

The `docker-compose.yml` reads variables from the `.env` file in the project root.

To update later:
```bash
git pull
docker compose up -d --build
```

---

## Google OAuth redirect URI

The Google Cloud Console must list your Unraid server's URL as an authorized redirect URI, or OAuth sign-in will fail.

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Open your OAuth 2.0 client
3. Under **Authorized redirect URIs**, add:
   - `http://your-unraid-ip:12000`
   - `http://your-unraid-hostname:12000` (if you use a hostname)
4. Click **Save**

You do **not** need to rebuild the image after changing redirect URIs — this is a Google-side setting.

---

## Data persistence

All user data is stored in two directories that are mapped to Unraid host paths:

| Data | Container path | Suggested host path |
|------|---------------|---------------------|
| Todos & settings | `/app/data` | `/mnt/user/appdata/fam-bam-dash/data` |
| Uploaded photos | `/app/public/uploads` | `/mnt/user/appdata/fam-bam-dash/uploads` |

These survive container restarts, updates, and re-pulls. **Back up these folders** if you want to keep your data safe.

To restore a backup, stop the container, copy your files back into the host paths, and restart.

---

## Updating the app

### If using a pre-built image (Option A)

1. On your dev machine: pull latest code, rebuild, push
2. On Unraid: Docker → click the container → **Update** (or Force Update)

### If building on Unraid (Option B)

```bash
cd /mnt/user/appdata/fam-bam-dash
git pull
docker compose up -d --build
```

---

## Viewing logs

```bash
docker logs fam-bam-dash
docker logs -f fam-bam-dash   # follow (live tail)
```

Or in the Unraid UI: Docker → click the container name → **Logs**.

---

## Troubleshooting

**App loads but calendar shows "No calendar source configured"**  
→ Open the ⚙ Settings panel → Calendars tab → connect your Google account.

**OAuth sign-in fails with "redirect_uri_mismatch"**  
→ Add `http://your-unraid-ip:12000` to your OAuth client's authorized redirect URIs (see above).

**Todos or settings reset after a container update**  
→ The volume mappings are missing or pointing to the wrong path. Check that `/app/data` is mapped to a persistent host directory.

**Photos don't appear**  
→ Check that `/app/public/uploads` is mapped and the host directory is writable by the container.

**Port 12000 is already in use**  
→ Change the host port in Unraid (e.g. `12001:12000`). The container always listens on 12000 internally.
